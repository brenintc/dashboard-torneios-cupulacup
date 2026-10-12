-- =====================================================================
-- Cúpula Cup | Fase 3: contas vinculadas e admin blindado
-- Rode DEPOIS do schema.sql e do fase2.sql. Pode ser executado mais de uma vez.
-- =====================================================================

-- 1. is_admin(): só vale para sessões abertas com E-MAIL E SENHA ---------
-- O JWT tem a claim "amr" com os métodos usados no login. Se o admin entrar
-- por Discord ou Google, a sessão NÃO tem poder de admin (nem no site, nem na API).
create or replace function public.is_admin() returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid())
     and exists (
       select 1
       from jsonb_array_elements(coalesce(auth.jwt() -> 'amr', '[]'::jsonb)) m
       where m ->> 'method' = 'password'
     )
     -- OPCIONAL (recomendado): exigir também 2º fator TOTP. Só descomente depois
     -- de cadastrar o TOTP do admin, senão ele fica sem acesso:
     -- and (auth.jwt() ->> 'aal') = 'aal2'
$$;

-- Ninguém escreve na tabela admins pela API. Admins só entram pelo SQL Editor.
revoke insert, update, delete on public.admins from anon, authenticated;

-- 2. Discord do capitão vem da IDENTIDADE vinculada ---------------------
-- Antes usávamos user_metadata.provider_id, que para quem entra pelo Google
-- seria o ID do Google. Agora lemos a identidade "discord" de verdade.
create or replace function public.sincronizar_discord() returns text
language plpgsql security definer set search_path = public
as $$
declare v_discord text;
begin
  if auth.uid() is null then raise exception 'Faça login primeiro'; end if;

  select coalesce(identity_data ->> 'provider_id', identity_data ->> 'sub') into v_discord
  from auth.identities where user_id = auth.uid() and provider = 'discord' limit 1;

  update public.teams set captain_discord_id = v_discord where captain_user_id = auth.uid();
  return v_discord;
end $$;

create or replace function public.criar_equipe(p_nome text, p_tag text)
returns bigint
language plpgsql security definer set search_path = public
as $$
declare
  v_id bigint; v_discord text;
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

  select coalesce(identity_data ->> 'provider_id', identity_data ->> 'sub') into v_discord
  from auth.identities where user_id = auth.uid() and provider = 'discord' limit 1;

  insert into teams (name, tag, captain_discord_id, captain_user_id)
  values (v_nome, v_tag, v_discord, auth.uid())
  returning id into v_id;

  return v_id;
end $$;

-- 3. Funções só para usuários logados (anon não executa nada) -----------
revoke execute on function
  public.criar_equipe(text, text),
  public.inscrever_equipe(bigint, bigint),
  public.cancelar_inscricao(bigint, bigint),
  public.excluir_equipe(bigint),
  public.sincronizar_discord(),
  public.sortear_grupos(bigint),
  public.gerar_mata_mata(bigint),
  public.registrar_resultado(bigint, int, int)
from public, anon;

grant execute on function
  public.criar_equipe(text, text),
  public.inscrever_equipe(bigint, bigint),
  public.cancelar_inscricao(bigint, bigint),
  public.excluir_equipe(bigint),
  public.sincronizar_discord()
to authenticated;

-- as 3 abaixo ainda checam is_admin() por dentro (defesa em profundidade)
grant execute on function
  public.sortear_grupos(bigint),
  public.gerar_mata_mata(bigint),
  public.registrar_resultado(bigint, int, int)
to authenticated;

-- 4. Criando o admin ------------------------------------------------------
-- a) Dashboard → Authentication → Users → Add user → Create new user
--    (e-mail + senha forte, marque "Auto Confirm User").
-- b) Copie o UUID dele e rode:
--      insert into admins (user_id) values ('UUID-DO-ADMIN');
-- c) Se você era admin pelo Discord, remova a linha antiga:
--      delete from admins where user_id = 'UUID-ANTIGO';
