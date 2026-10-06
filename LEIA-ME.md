# Cúpula Cup, Fase 2

## 1. Banco
No SQL Editor do Supabase, rode nesta ordem: `sql/schema.sql` (se ainda não rodou) e `sql/fase2.sql`.

## 2. Variáveis de ambiente (.env.local e Vercel)
Veja `.env.example`. `SUPABASE_SERVICE_ROLE_KEY` fica em Project Settings → API e NUNCA pode ter o prefixo `NEXT_PUBLIC_`.
Depois de adicionar as variáveis na Vercel, faça um novo deploy.

## 3. Mercado Pago (PIX)
1. mercadopago.com.br/developers → Suas integrações → crie uma aplicação (Checkout Transparente / Pagamentos online).
2. Credenciais de produção → copie o **Access Token** para `MP_ACCESS_TOKEN`.
3. Webhooks → modo produção → URL: `https://SEU-SITE/api/pix/webhook` → evento **Pagamentos**.
   Copie a **chave secreta** para `MP_WEBHOOK_SECRET`.
4. Teste com um campeonato de R$ 1,00 antes de abrir inscrições de verdade.
O PIX é recebido na conta do Mercado Pago. O pagamento dos prêmios é feito por você, manualmente.

## 4. Discord (ready-check)
1. discord.com/developers/applications → New Application.
2. Copie **Application ID** (`DISCORD_APP_ID`) e **Public Key** (`DISCORD_PUBLIC_KEY`).
3. Aba Bot → Reset Token → `DISCORD_BOT_TOKEN`.
4. Aba General Information → **Interactions Endpoint URL**: `https://SEU-SITE/api/discord/interactions`
   (o site precisa estar no ar com as variáveis já configuradas, o Discord testa a URL ao salvar).
5. Convide o bot (OAuth2 → URL Generator → scope `bot`) com as permissões: Manage Channels, Manage Roles,
   View Channels, Send Messages, Read Message History.
6. `DISCORD_GUILD_ID` = ID do seu servidor (modo desenvolvedor → botão direito → Copiar ID).
   `DISCORD_CATEGORY_ID` (opcional) = categoria onde os canais serão criados.
   `DISCORD_STAFF_ROLE_ID` (opcional) = cargo da organização que enxerga todos os canais.
7. Os capitães precisam estar no servidor do Discord.

## 5. Fluxo de um campeonato
1. Admin cria o campeonato (taxa, prêmio, equipes por grupo, quantas avançam).
2. Equipes se inscrevem e pagam o PIX. A vaga só conta como confirmada após o pagamento.
3. Admin muda o status para "Em andamento"/fecha inscrições e, em Admin → Grupos e mata-mata, clica em **Sortear grupos**.
4. Para cada jogo: define o horário, cria o canal no Discord e registra o resultado.
5. Com todos os jogos de grupo finalizados, clica em **Gerar mata-mata**.
6. Ao registrar o resultado da final, o campeonato vira "Finalizado" e o campeão entra no Hall da Fama.

## 6. Antes de publicar
Preencha os campos entre colchetes em `src/app/termos/page.tsx` e `src/app/privacidade/page.tsx`
e peça a revisão de um advogado.
