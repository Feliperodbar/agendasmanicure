# Contexto do projeto

## Visão geral

Aplicação de agendamento para manicures, construída com React, TypeScript, Express, Vite, Supabase e Vercel.

O sistema suporta múltiplas manicures no mesmo domínio. A cliente escolhe uma profissional na página inicial e visualiza os serviços, horários e agendamentos relacionados ao perfil escolhido.

## Execução

```bash
npm install
npm run dev
```

Validações disponíveis:

```bash
npm run lint
npm run build
npm test
```

As variáveis de ambiente ficam em `.env` localmente e nas configurações da Vercel. Nunca inserir valores secretos neste arquivo ou no código-fonte.

## Arquitetura

- `server.ts`: servidor Express, autenticação, APIs públicas e administrativas.
- `src/App.tsx`: estado principal, modos cliente/admin e roteamento visual.
- `src/views/HomeView.tsx`: página inicial e seleção da manicure.
- `src/views/ClientBookingView.tsx`: catálogo, disponibilidade e criação de agendamentos.
- `src/views/ClientMyBookingsView.tsx`: consulta de agendamentos da cliente.
- `src/views/AdminLoginView.tsx`: login administrativo por PIN.
- `src/views/AdminAgendaView.tsx`: agenda e atualização de status.
- `src/views/AdminManicuresView.tsx`: cadastro de manicures e definição de PIN individual.
- `src/components/BottomNav.tsx`: navegação inferior do cliente e da manicure.
- `src/components/Header.tsx`: cabeçalho contextual do perfil selecionado.
- `src/server/db.ts`: modelos, hidratação, persistência e integração com Supabase.
- `src/utils/slots.ts`: cálculo de disponibilidade.
- `supabase/migrations/`: esquema e evolução do banco.
- `api/`: handlers usados pelo runtime serverless da Vercel.

## Fluxo da cliente

1. A página inicial carrega `GET /api/manicures`.
2. Cada manicure é exibida em um cartão com nome, foto e Instagram.
3. Ao selecionar uma profissional, a aplicação usa o slug do perfil nas chamadas:
   - `GET /api/servicos?manicure=<slug>`
   - `GET /api/disponibilidade?manicure=<slug>`
   - `POST /api/agendamentos`
4. A cliente pode trocar de profissional pela opção **Trocar manicure** na barra inferior.

Não há domínio ou URL separado por manicure.

## Fluxo administrativo

1. A opção **Sou manicure** abre a tela de PIN.
2. O PIN é comparado por hash PBKDF2; nunca é salvo em texto aberto.
3. A sessão usa cookie HTTP-only `nm_session`.
4. Após o login, a manicure acessa agenda, serviços, bloqueios, horários e regras.
5. O cadastro de uma nova manicure é protegido por sessão administrativa e recebe um PIN individual.

O PIN principal é configurado externamente no banco/ambiente de produção e não deve ser documentado neste arquivo.

## Banco de dados

O Supabase contém, entre outras, as tabelas:

- `manicures`
- `admin_auth`
- `sessoes`
- `servicos`
- `clientes`
- `agendamentos`
- `bloqueios`
- `configuracoes`
- `lista_espera`
- `notificacoes`

Os registros relacionados podem usar `manicure_id`. O perfil padrão existente é a manicure Natália, com slug `natalia`.

## Regras atuais

- Atendimento padrão: segunda a sábado, das 09:00 às 18:00.
- Domingo: fechado.
- Buffer entre agendamentos: configurável, atualmente 10 minutos por padrão.
- Sinal padrão: 50%.
- Rotas administrativas sem sessão devem responder `401`.
- O cadastro de manicure deve validar nome, slug e PIN de quatro dígitos.
- PINs de manicures devem ser únicos.

## Deploy

O projeto é publicado na Vercel a partir da branch `main`.

Ao adicionar uma rota administrativa nova, criar também um handler explícito em `api/admin/` quando o roteamento catch-all não for suficiente. Rotas dinâmicas conflitantes na Vercel devem ser evitadas.

## Estado recente

- Página inicial com seleção visual de manicure.
- PIN individual no cadastro de manicure.
- Atalhos do cliente movidos para a barra inferior.
- Cadastro administrativo com tratamento de respostas vazias ou inválidas.
- Login administrativo atualizado para recarregar os PINs persistidos.

## Próximas evoluções recomendadas

- **Isolamento de Tenant:** Implementado nas sessões administrativas e nas rotas de dashboard, configurações, serviços, bloqueios, exportação e sincronização, usando `manicure_id`.
- **Gerenciamento de Perfis:** Implementados edição, desativação (soft delete) e reativação de manicures para o proprietário.
- Associar explicitamente cada sessão administrativa à manicure autenticada.
- Criar testes de API para login por PIN, isolamento entre manicures e cadastro de perfis.
- Atualizar o README com instruções específicas de Supabase e Vercel.
