-- =====================================================================
-- Cúpula Cup | Banco de dados (Supabase → SQL Editor)
-- Pode ser executado mais de uma vez. Mantém as tabelas e dados atuais.
-- ATENÇÃO: o bloco 3 apaga as políticas RLS antigas das 5 tabelas e
-- recria as corretas.
-- =====================================================================

-- 1. Colunas novas -----------------------------------------------------
alter table tournaments add column if not exists edition     text default 'FC 26';
alter table tournaments add column if not exists prize       text;
alter table tournaments add column if not exists entry_fee   numeric default 0;
alter table tournaments add column if not exists starts_at   timestamptz;
alter table tournaments add column if not exists description text;

alter table teams add column if not exists captain_user_id uuid
  references auth.users(id) on delete set null;
alter table teams add column if not exists created_at timestamptz default now();

-- 2. Admins ------------------------------------------------------------
create table if not exists admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create or replace function public.is_admin() returns boolean
language sql security definer set search_path = public stable
as $$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;

-- 3. RLS ---------------------------------------------------------------
alter table tournaments              enable row level security;
alter table teams                    enable row level security;
alter table team_members             enable row level security;
alter table tournament_registrations enable row level security;
alter table admins                   enable row level security;

do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('tournaments','teams','team_members','tournament_registrations','admins')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- admins: cada um só enxerga a própria linha
create policy "admins: ler o próprio" on admins for select
  using (user_id = auth.uid());

-- tournaments: todos leem, só admin escreve
create policy "torneios: leitura publica" on tournaments for select using (true);
create policy "torneios: admin escreve"   on tournaments for all
  using (public.is_admin()) with check (public.is_admin());

-- teams: todos leem; criar/excluir só pelas funções abaixo; admin faz tudo
create policy "equipes: leitura publica" on teams for select using (true);
create policy "equipes: admin escreve"   on teams for all
  using (public.is_admin()) with check (public.is_admin());

-- team_members: só o capitão da equipe e admins (protege os IDs do Discord)
create policy "membros: capitao ou admin" on team_members for all
  using (exists (select 1 from teams t where t.id = team_id
                 and (t.captain_user_id = auth.uid() or public.is_admin())))
  with check (exists (select 1 from teams t where t.id = team_id
                 and (t.captain_user_id = auth.uid() or public.is_admin())));

-- inscrições: todos leem; usuários só alteram pelas funções; admin faz tudo
create policy "inscricoes: leitura publica" on tournament_registrations for select using (true);
create policy "inscricoes: admin escreve"   on tournament_registrations for all
  using (public.is_admin()) with check (public.is_admin());

-- 4. Funções (o "back-end" que os usuários comuns usam) ----------------

-- Criar equipe
create or replace function public.criar_equipe(p_nome text, p_tag text)
returns bigint
language plpgsql security definer set search_path = public
as $$
declare
  v_id   bigint;
  v_nome text := trim(p_nome);
  v_tag  text := upper(trim(p_tag));
begin
  if auth.uid() is null then raise exception 'Faça login primeiro'; end if;
  if char_length(v_nome) < 3 or char_length(v_nome) > 40 then
    raise exception 'O nome deve ter entre 3 e 40 caracteres';
  end if;
  if char_length(v_tag) < 2 or char_length(v_tag) > 5 then
    raise exception 'A TAG deve ter entre 2 e 5 caracteres';
  end if;
  if exists (select 1 from teams where upper(tag) = v_tag) then
    raise exception 'Essa TAG já está em uso';
  end if;
  if exists (select 1 from teams where lower(name) = lower(v_nome)) then
    raise exception 'Já existe uma equipe com esse nome';
  end if;
  if (select count(*) from teams where captain_user_id = auth.uid()) >= 5 then
    raise exception 'Limite de 5 equipes por conta';
  end if;

  insert into teams (name, tag, captain_discord_id, captain_user_id)
  values (
    v_nome, v_tag,
    coalesce(auth.jwt() -> 'user_metadata' ->> 'provider_id', auth.uid()::text),
    auth.uid()
  )
  returning id into v_id;

  return v_id;
end $$;

-- Inscrever uma equipe existente num campeonato
create or replace function public.inscrever_equipe(p_torneio_id bigint, p_team_id bigint)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_max int; v_status text; v_count int;
begin
  if auth.uid() is null then raise exception 'Faça login primeiro'; end if;

  if not exists (select 1 from teams where id = p_team_id and captain_user_id = auth.uid()) then
    raise exception 'Você não é o capitão desta equipe';
  end if;

  select max_teams, status into v_max, v_status
  from tournaments where id = p_torneio_id for update;
  if not found then raise exception 'Campeonato não encontrado'; end if;
  if v_status <> 'aberto' then raise exception 'As inscrições deste campeonato estão fechadas'; end if;

  if exists (select 1 from tournament_registrations
             where tournament_id = p_torneio_id and team_id = p_team_id) then
    raise exception 'Esta equipe já está inscrita';
  end if;

  select count(*) into v_count from tournament_registrations where tournament_id = p_torneio_id;
  if v_max is not null and v_count >= v_max then raise exception 'Campeonato lotado'; end if;

  insert into tournament_registrations (tournament_id, team_id, status, wins, losses)
  values (p_torneio_id, p_team_id, 'inscrito', 0, 0);
end $$;

-- Cancelar inscrição (só com inscrições abertas)
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
  if not exists (select 1 from tournaments where id = p_torneio_id and status = 'aberto')
     and not public.is_admin() then
    raise exception 'Só é possível cancelar com as inscrições abertas';
  end if;
  delete from tournament_registrations where tournament_id = p_torneio_id and team_id = p_team_id;
end $$;

-- Excluir equipe
create or replace function public.excluir_equipe(p_team_id bigint)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Faça login primeiro'; end if;
  if not exists (select 1 from teams where id = p_team_id
                 and (captain_user_id = auth.uid() or public.is_admin())) then
    raise exception 'Você não tem permissão para excluir esta equipe';
  end if;
  if not public.is_admin() and exists (
       select 1 from tournament_registrations r
       join tournaments t on t.id = r.tournament_id
       where r.team_id = p_team_id and t.status <> 'aberto') then
    raise exception 'A equipe participa de um campeonato em andamento ou finalizado';
  end if;
  delete from tournament_registrations where team_id = p_team_id;
  delete from team_members where team_id = p_team_id;
  delete from teams where id = p_team_id;
end $$;

grant execute on function public.criar_equipe(text, text)          to authenticated;
grant execute on function public.inscrever_equipe(bigint, bigint)  to authenticated;
grant execute on function public.cancelar_inscricao(bigint, bigint) to authenticated;
grant execute on function public.excluir_equipe(bigint)            to authenticated;

-- 5. Evitar duplicados (se der erro, existem registros duplicados a limpar)
create unique index if not exists reg_unica on tournament_registrations (tournament_id, team_id);
create unique index if not exists membro_unico on team_members (team_id, discord_id);

-- 6. Seu usuário admin --------------------------------------------------
-- Faça login no site uma vez, copie seu UUID em Authentication → Users
-- (ou na tela /admin, que mostra o ID) e rode:
--
--   insert into admins (user_id) values ('SEU-UUID-AQUI');
--
-- Equipes antigas (sem captain_user_id) só o admin consegue gerenciar.
