-- =====================================================================
-- Cúpula Cup | Fase 2: PIX, grupos, mata-mata, Discord e Hall da Fama
-- Rode DEPOIS do schema.sql. Pode ser executado mais de uma vez.
-- =====================================================================

-- 1. Colunas novas -----------------------------------------------------
alter table tournaments add column if not exists group_size        int default 4;
alter table tournaments add column if not exists advance_per_group int default 2;

alter table tournament_registrations add column if not exists payment_status text not null default 'isento';
alter table tournament_registrations add column if not exists group_name     text;
alter table tournament_registrations add column if not exists created_at     timestamptz default now();

-- 2. Pagamentos (escritos só pelo servidor, com a service_role) ---------
create table if not exists payments (
  id              bigint generated always as identity primary key,
  registration_id bigint not null unique references tournament_registrations(id) on delete cascade,
  mp_payment_id   text unique,
  amount          numeric not null,
  status          text not null default 'pending',   -- pending | approved | cancelled | expired
  qr_code         text,
  qr_code_base64  text,
  expires_at      timestamptz,
  paid_at         timestamptz,
  created_at      timestamptz not null default now()
);
alter table payments enable row level security;
drop policy if exists "pagamentos: capitao ou admin le" on payments;
create policy "pagamentos: capitao ou admin le" on payments for select using (
  exists (select 1 from tournament_registrations r join teams t on t.id = r.team_id
          where r.id = registration_id and (t.captain_user_id = auth.uid() or public.is_admin()))
);

-- 3. Partidas -----------------------------------------------------------
create table if not exists matches (
  id                 bigint generated always as identity primary key,
  tournament_id      bigint not null references tournaments(id) on delete cascade,
  stage              text   not null check (stage in ('grupos','mata_mata')),
  round              int    not null default 1,
  bracket_pos        int,
  group_name         text,
  team_a_id          bigint references teams(id) on delete set null,
  team_b_id          bigint references teams(id) on delete set null,
  score_a            int,
  score_b            int,
  status             text   not null default 'agendada',  -- agendada | finalizada
  winner_team_id     bigint references teams(id) on delete set null,
  scheduled_at       timestamptz,
  played_at          timestamptz,
  next_match_id      bigint references matches(id) on delete set null,
  next_slot          text check (next_slot in ('a','b')),
  discord_channel_id text,
  ready_a            boolean not null default false,
  ready_b            boolean not null default false
);
create index if not exists matches_torneio on matches (tournament_id, stage, round);

alter table matches enable row level security;
drop policy if exists "partidas: leitura publica" on matches;
drop policy if exists "partidas: admin escreve"   on matches;
create policy "partidas: leitura publica" on matches for select using (true);
create policy "partidas: admin escreve"   on matches for all
  using (public.is_admin()) with check (public.is_admin());

-- 4. Inscrição agora devolve o id e reserva a vaga até o pagamento ------
drop function if exists public.inscrever_equipe(bigint, bigint);
create function public.inscrever_equipe(p_torneio_id bigint, p_team_id bigint)
returns bigint
language plpgsql security definer set search_path = public
as $$
declare
  v_max int; v_status text; v_fee numeric; v_count int; v_reg bigint;
begin
  if auth.uid() is null then raise exception 'Faça login primeiro'; end if;

  if not exists (select 1 from teams where id = p_team_id and captain_user_id = auth.uid()) then
    raise exception 'Você não é o capitão desta equipe';
  end if;

  select max_teams, status, entry_fee into v_max, v_status, v_fee
  from tournaments where id = p_torneio_id for update;
  if not found then raise exception 'Campeonato não encontrado'; end if;
  if v_status <> 'aberto' then raise exception 'As inscrições deste campeonato estão fechadas'; end if;

  -- libera vagas de PIX não pagos (o QR Code expira em 30 min)
  delete from tournament_registrations
  where tournament_id = p_torneio_id and payment_status = 'pendente'
    and created_at < now() - interval '35 minutes';

  if exists (select 1 from tournament_registrations
             where tournament_id = p_torneio_id and team_id = p_team_id) then
    raise exception 'Esta equipe já está inscrita';
  end if;

  select count(*) into v_count from tournament_registrations where tournament_id = p_torneio_id;
  if v_max is not null and v_count >= v_max then raise exception 'Campeonato lotado'; end if;

  insert into tournament_registrations (tournament_id, team_id, status, wins, losses, payment_status)
  values (p_torneio_id, p_team_id, 'inscrito', 0, 0,
          case when coalesce(v_fee, 0) > 0 then 'pendente' else 'isento' end)
  returning id into v_reg;

  return v_reg;
end $$;

create or replace function public.cancelar_inscricao(p_torneio_id bigint, p_team_id bigint)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Faça login primeiro'; end if;
  if not exists (select 1 from teams where id = p_team_id
                 and (captain_user_id = auth.uid() or public.is_admin())) then
    raise exception 'Você não é o capitão desta equipe';
  end if;
  if not public.is_admin() then
    if not exists (select 1 from tournaments where id = p_torneio_id and status = 'aberto') then
      raise exception 'Só é possível cancelar com as inscrições abertas';
    end if;
    if exists (select 1 from tournament_registrations
               where tournament_id = p_torneio_id and team_id = p_team_id and payment_status = 'pago') then
      raise exception 'Inscrição já paga. Fale com a organização para cancelar e pedir reembolso';
    end if;
  end if;
  delete from tournament_registrations where tournament_id = p_torneio_id and team_id = p_team_id;
end $$;

-- 5. Sorteio de grupos ---------------------------------------------------
create or replace function public.sortear_grupos(p_torneio_id bigint)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_size int; v_ids bigint[]; v_t bigint[]; v_n int; v_g int;
  i int; g int; a int; b int; m int; mm int; rnd int;
begin
  if not public.is_admin() then raise exception 'Apenas administradores'; end if;

  select group_size into v_size from tournaments where id = p_torneio_id;
  if not found then raise exception 'Campeonato não encontrado'; end if;
  v_size := greatest(coalesce(v_size, 4), 2);

  if exists (select 1 from matches where tournament_id = p_torneio_id and stage = 'mata_mata') then
    raise exception 'O mata-mata já foi gerado';
  end if;
  if exists (select 1 from matches where tournament_id = p_torneio_id
             and stage = 'grupos' and status = 'finalizada') then
    raise exception 'Já existem resultados na fase de grupos';
  end if;

  delete from matches where tournament_id = p_torneio_id and stage = 'grupos';

  select array_agg(team_id order by random()) into v_ids
  from tournament_registrations
  where tournament_id = p_torneio_id and payment_status in ('pago', 'isento');

  v_n := coalesce(array_length(v_ids, 1), 0);
  if v_n < 3 then raise exception 'São necessárias ao menos 3 equipes com inscrição confirmada'; end if;

  v_g := ceil(v_n::numeric / v_size)::int;

  update tournament_registrations set group_name = null where tournament_id = p_torneio_id;
  for i in 1..v_n loop
    update tournament_registrations
    set group_name = chr(64 + ((i - 1) % v_g) + 1)
    where tournament_id = p_torneio_id and team_id = v_ids[i];
  end loop;

  -- todos contra todos em cada grupo (método do círculo)
  for g in 1..v_g loop
    select array_agg(team_id order by team_id) into v_t
    from tournament_registrations
    where tournament_id = p_torneio_id and group_name = chr(64 + g);

    m := coalesce(array_length(v_t, 1), 0);
    mm := m + (m % 2);
    for a in 1..mm loop
      for b in (a + 1)..mm loop
        continue when b > m;
        if (b - 1) < (mm - 1) then rnd := ((a - 1) + (b - 1)) % (mm - 1);
        else rnd := (2 * (a - 1)) % (mm - 1);
        end if;
        insert into matches (tournament_id, stage, round, group_name, team_a_id, team_b_id)
        values (p_torneio_id, 'grupos', rnd + 1, chr(64 + g), v_t[a], v_t[b]);
      end loop;
    end loop;
  end loop;

  update tournaments set status = 'em_andamento' where id = p_torneio_id;
end $$;

-- 6. Mata-mata ------------------------------------------------------------
create or replace function public.gerar_mata_mata(p_torneio_id bigint)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_adv int; v_seeds bigint[]; v_n int; v_size int; v_rounds int;
  v_order int[]; v_new int[]; s int; r int; k int; cnt int;
  v_next bigint; sa int; sb int; ta bigint; tb bigint;
  v_m matches%rowtype; v_w bigint;
begin
  if not public.is_admin() then raise exception 'Apenas administradores'; end if;

  select advance_per_group into v_adv from tournaments where id = p_torneio_id;
  if not found then raise exception 'Campeonato não encontrado'; end if;
  v_adv := greatest(coalesce(v_adv, 2), 1);

  if not exists (select 1 from matches where tournament_id = p_torneio_id and stage = 'grupos') then
    raise exception 'Sorteie os grupos primeiro';
  end if;
  if exists (select 1 from matches where tournament_id = p_torneio_id
             and stage = 'grupos' and status <> 'finalizada') then
    raise exception 'Ainda há jogos da fase de grupos sem resultado';
  end if;
  if exists (select 1 from matches where tournament_id = p_torneio_id and stage = 'mata_mata') then
    raise exception 'O mata-mata já foi gerado';
  end if;

  -- classificados, ordenados: 1ºs colocados primeiro, depois 2ºs...
  with jogos as (
    select group_name, team_a_id as t, score_a as gf, score_b as gc
      from matches where tournament_id = p_torneio_id and stage = 'grupos'
    union all
    select group_name, team_b_id, score_b, score_a
      from matches where tournament_id = p_torneio_id and stage = 'grupos'
  ), tab as (
    select group_name, t,
           sum(case when gf > gc then 3 when gf = gc then 1 else 0 end) as pts,
           sum(gf - gc) as sg, sum(gf) as gp
    from jogos group by group_name, t
  ), pos as (
    select *, row_number() over (partition by group_name order by pts desc, sg desc, gp desc, t) as p
    from tab
  )
  select array_agg(t order by p, pts desc, sg desc, gp desc, t) into v_seeds
  from pos where p <= v_adv;

  v_n := coalesce(array_length(v_seeds, 1), 0);
  if v_n < 2 then raise exception 'Equipes insuficientes para o mata-mata'; end if;

  v_size := 2; v_rounds := 1;
  while v_size < v_n loop v_size := v_size * 2; v_rounds := v_rounds + 1; end loop;

  -- ordem das sementes no chaveamento (1 x último, 2 x penúltimo...)
  v_order := array[1];
  while array_length(v_order, 1) < v_size loop
    v_new := '{}';
    cnt := array_length(v_order, 1);
    foreach s in array v_order loop
      v_new := v_new || s || (2 * cnt + 1 - s);
    end loop;
    v_order := v_new;
  end loop;

  -- cria da final para a primeira rodada, ligando cada jogo ao seguinte
  for r in reverse v_rounds..1 loop
    for k in 0..((v_size >> r) - 1) loop
      select id into v_next from matches
      where tournament_id = p_torneio_id and stage = 'mata_mata' and round = r + 1 and bracket_pos = k / 2;

      ta := null; tb := null;
      if r = 1 then
        sa := v_order[2 * k + 1]; sb := v_order[2 * k + 2];
        if sa <= v_n then ta := v_seeds[sa]; end if;
        if sb <= v_n then tb := v_seeds[sb]; end if;
      end if;

      insert into matches (tournament_id, stage, round, bracket_pos, team_a_id, team_b_id, next_match_id, next_slot)
      values (p_torneio_id, 'mata_mata', r, k, ta, tb, v_next,
              case when v_next is null then null when k % 2 = 0 then 'a' else 'b' end);
    end loop;
  end loop;

  -- vaga direta (bye) para quem não tem adversário na 1ª rodada
  for v_m in
    select * from matches
    where tournament_id = p_torneio_id and stage = 'mata_mata' and round = 1
      and ((team_a_id is null) <> (team_b_id is null))
  loop
    v_w := coalesce(v_m.team_a_id, v_m.team_b_id);
    update matches set status = 'finalizada', winner_team_id = v_w, played_at = now() where id = v_m.id;
    if v_m.next_match_id is not null then
      if v_m.next_slot = 'a' then update matches set team_a_id = v_w where id = v_m.next_match_id;
      else update matches set team_b_id = v_w where id = v_m.next_match_id;
      end if;
    end if;
  end loop;
end $$;

-- 7. Resultado (admin) ----------------------------------------------------
create or replace function public.registrar_resultado(p_match_id bigint, p_a int, p_b int)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  m matches%rowtype; nx matches%rowtype; v_w bigint;
begin
  if not public.is_admin() then raise exception 'Apenas administradores'; end if;

  select * into m from matches where id = p_match_id for update;
  if not found then raise exception 'Partida não encontrada'; end if;
  if p_a is null or p_b is null or p_a < 0 or p_b < 0 then raise exception 'Placar inválido'; end if;
  if m.team_a_id is null or m.team_b_id is null then raise exception 'Este confronto ainda não está definido'; end if;

  if m.stage = 'mata_mata' then
    if p_a = p_b then
      raise exception 'No mata-mata não pode haver empate. Informe o placar final, incluindo pênaltis';
    end if;
    v_w := case when p_a > p_b then m.team_a_id else m.team_b_id end;

    if m.next_match_id is not null then
      select * into nx from matches where id = m.next_match_id;
      if nx.status = 'finalizada' and m.winner_team_id is distinct from v_w then
        raise exception 'O próximo jogo já foi disputado. Corrija-o primeiro';
      end if;
      if m.next_slot = 'a' then update matches set team_a_id = v_w where id = m.next_match_id;
      else update matches set team_b_id = v_w where id = m.next_match_id;
      end if;
    end if;
  end if;

  update matches
  set score_a = p_a, score_b = p_b, status = 'finalizada', winner_team_id = v_w, played_at = now()
  where id = m.id;

  if m.stage = 'mata_mata' and m.next_match_id is null then
    update tournaments set status = 'finalizado' where id = m.tournament_id;
  end if;
end $$;

grant execute on function public.inscrever_equipe(bigint, bigint)     to authenticated;
grant execute on function public.cancelar_inscricao(bigint, bigint)   to authenticated;
grant execute on function public.sortear_grupos(bigint)               to authenticated;
grant execute on function public.gerar_mata_mata(bigint)              to authenticated;
grant execute on function public.registrar_resultado(bigint, int, int) to authenticated;

-- 8. Hall da Fama (campeões dos campeonatos finalizados) ----------------
create or replace view public.hall_da_fama with (security_invoker = true) as
select t.id as tournament_id, t.title, t.edition, t.prize,
       m.played_at, m.score_a, m.score_b,
       w.id as champion_id, w.name as champion_name, w.tag as champion_tag,
       l.name as runner_name, l.tag as runner_tag
from tournaments t
join matches m on m.tournament_id = t.id and m.stage = 'mata_mata'
              and m.next_match_id is null and m.status = 'finalizada'
join teams w on w.id = m.winner_team_id
left join teams l on l.id = case when m.winner_team_id = m.team_a_id then m.team_b_id else m.team_a_id end
where t.status = 'finalizado';

grant select on public.hall_da_fama to anon, authenticated;
