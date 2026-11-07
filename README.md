<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/3ce515a5-ef52-45ef-bc3f-09c283b94315

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Notificações push

O push usa service worker, VAPID e duas Edge Functions. Ele requer HTTPS
(ou localhost para desenvolvimento), um Supabase configurado e a migração de
assinaturas aplicada. Clientes recebem textos genéricos, pois nome e WhatsApp
não comprovam a posse do telefone. A ativação da manicure exige uma sessão de
PIN. A proprietária deve escolher uma manicure ativa para o aparelho; uma
assinatura não recebe avisos de outras profissionais.

Para configurar um ambiente:

1. Gere um par VAPID fora do repositório, por exemplo com
   `npx web-push generate-vapid-keys`. Não salve a chave privada no Git.
2. Configure `VAPID_PUBLIC_KEY` no servidor Vercel. Configure nas Edge
   Functions `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` e um
   `PUSH_WEBHOOK_SECRET` aleatório e exclusivo; configure esse mesmo segredo
   também no servidor Vercel para a confirmação após ativação. O Supabase
   fornece `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` às funções.
3. Aplique a migração de push ao banco apropriado e publique as funções
   `push-agendamentos` e `processar-lembretes`. Ambas dispensam JWT no gateway,
   mas exigem o cabeçalho privado `x-push-secret`; nunca disponibilize esse
   valor ao cliente.
4. Configure um Database Webhook para `INSERT` e `UPDATE` de `agendamentos`,
   chamando `push-agendamentos` com esse cabeçalho. Configure também um job
   `*/15 * * * *` para chamar `processar-lembretes` com o mesmo cabeçalho.
   Guarde credenciais no Vault, não na migration ou em scripts versionados.
   Consulte as instruções oficiais de
   [Database Webhooks](https://supabase.com/docs/guides/database/webhooks) e
   [agendamento de Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions).
5. Teste os dois destinos com dispositivos autorizados. No iPhone, instale o
   PWA na Tela de Início antes de solicitar permissão.

O banco registra cada tentativa de envio em `notificacoes`; um serviço de push
confirmar o recebimento não garante a exibição no aparelho. Para falhas
temporárias, uma nova execução do webhook ou do cron pode repetir a tentativa;
confira os logs das Edge Functions e o status de cada registro.

**Limitação pendente:** o cancelamento atual marca entradas da lista de espera
como notificadas de forma independente do webhook. Como a execução do webhook
é assíncrona, um aviso de vaga pode não ser enviado se a marcação ocorrer
primeiro. A entrega real em aparelhos, a remarcação pela cliente e uma tela de
notificações da manicure ainda precisam ser implementadas ou validadas antes
de considerar o fluxo completo.
