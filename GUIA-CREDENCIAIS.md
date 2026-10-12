# Guia: de onde vem cada valor do .env

Os menus mudam de nome de vez em quando. Supabase e Mercado Pago foram conferidos na documentação
oficial; Discord e Google estão descritos de memória, então se algum nome estiver diferente, procure o equivalente.

## 1. Supabase (supabase.com/dashboard → seu projeto)
| Variável | Onde achar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Botão **Connect** no topo, ou Project Settings → Data API → *Project URL*. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Settings → API Keys** → aba *Publishable and secret API keys* → **Publishable key** (`sb_publishable_...`). Se aparecer o botão *Create new API keys*, clique nele primeiro. Se preferir a antiga, aba *Legacy API Keys* → `anon`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Mesma tela → **Secret keys** (`sb_secret_...`), ou *Legacy API Keys* → `service_role`. É secreta: só na Vercel/servidor. |

O Supabase vai desativar as chaves legadas (`anon`/`service_role`) até o fim de 2026. Criar as novas não derruba as antigas.
`NEXT_PUBLIC_SITE_URL` é o endereço do seu site (ex.: `https://dashboard-torneios-cupulacup.vercel.app`), sem barra no final.

## 2. Mercado Pago (mercadopago.com.br/developers)
1. **Suas integrações → Criar aplicação** (pagamentos online / Checkout Transparente, PIX).
2. No menu da esquerda: **Produção → Credenciais de produção** → *Ativar credenciais de produção* (reCAPTCHA).
3. Copie o **Access Token** → `MP_ACCESS_TOKEN`. Não use a Public Key.
4. **Webhooks → Configurar notificações**: URL `https://SEU-SITE/api/pix/webhook`, evento **Pagamentos** → Salvar.
5. Revele a **chave secreta** gerada → `MP_WEBHOOK_SECRET`.

## 3. Discord (discord.com/developers/applications)
1. **New Application**. Em *General Information* copie **Application ID** (`DISCORD_APP_ID`) e **Public Key** (`DISCORD_PUBLIC_KEY`).
2. Aba **Bot → Reset Token** → copie (`DISCORD_BOT_TOKEN`). Só aparece uma vez.
3. *General Information → Interactions Endpoint URL*: `https://SEU-SITE/api/discord/interactions`
   (o site já precisa estar no ar com as variáveis acima).
4. Convide o bot: **OAuth2 → URL Generator**, scope `bot`, permissões *Manage Channels, Manage Roles, View Channels, Send Messages, Read Message History*.
5. No Discord: Configurações → Avançado → **Modo desenvolvedor**. Botão direito no servidor → *Copiar ID* (`DISCORD_GUILD_ID`);
   na categoria dos confrontos (`DISCORD_CATEGORY_ID`); no cargo da organização (`DISCORD_STAFF_ROLE_ID`).

## 4. Login com Discord e Google (configurado no Supabase, não no .env)
**URL do retorno do Supabase** (usada nos dois): `https://SEU-PROJETO.supabase.co/auth/v1/callback`
(Supabase → Authentication → Sign In / Providers → Discord/Google mostra essa URL pronta para copiar.)

- **Discord:** Developer Portal → sua aplicação → **OAuth2** → *Redirects* → adicione a URL acima. Copie *Client ID* e *Client Secret*
  e cole em Supabase → Authentication → Sign In / Providers → **Discord** → habilite.
- **Google:** console.cloud.google.com → crie/escolha um projeto → **APIs e serviços → Tela de permissão OAuth** (nome do app, e-mail)
  → **Credenciais → Criar credenciais → ID do cliente OAuth → Aplicativo da Web**. Em *URIs de redirecionamento autorizados* cole a URL acima.
  Copie *ID do cliente* e *Chave secreta* para Supabase → Providers → **Google** → habilite.
  Enquanto a tela de consentimento estiver em "Teste", só e-mails de teste conseguem entrar; publique o app quando for ao ar.
- **Vinculação manual de contas:** Supabase → Authentication → configurações (Sign In / Providers) → ligue **Allow manual linking**.
  Sem isso o botão "Vincular" da página Minha conta retorna erro.
- **Authentication → URL Configuration:** *Site URL* = seu site; *Redirect URLs*: `https://SEU-SITE/**` e `http://localhost:3000/**`.
- **E-mail e senha:** mantenha *Confirm email* ligado e mínimo de senha 8+ (Sign In / Providers → Email).

## 5. Criar o administrador (e-mail e senha)
1. Supabase → **Authentication → Users → Add user → Create new user**: e-mail + senha forte, marque *Auto Confirm User*.
2. Copie o UUID dele e rode no SQL Editor: `insert into admins (user_id) values ('UUID');`
3. Entre em `https://SEU-SITE/admin/login`. Se você era admin pelo Discord, apague a linha antiga em `admins`.

## 6. Colocar no ar
- Vercel → projeto → **Settings → Environment Variables**: cadastre todas e faça **Redeploy**.
- Localmente: copie `.env.example` para `.env.local` e preencha. Nunca faça commit do `.env.local`.
