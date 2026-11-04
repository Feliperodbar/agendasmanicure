# Agenda de Manicure — Natália Marcela | Nail designer

App de agendamento mobile first para manicure autônoma solo, com dois lados:

- **Cliente:** vê os serviços e valores, agenda em 3 passos, consulta, cancela e remarca só os próprios horários (nome + WhatsApp), entra na lista de espera quando não há vaga.
- **Manicure:** agenda do dia e calendário mensal, serviços e valores editáveis, bloqueios, horários por dia da semana, regras do negócio e login por PIN de 4 dígitos.

## Estado deste repositório

Base de produção: scripts do banco de dados (Supabase) e arquivos de apoio.
O código do aplicativo entra nas próximas etapas, gerado a partir da especificação do protótipo já validado.

## Estrutura

```
supabase/migrations/
  001_schema.sql          tabelas: clientes, servicos, configuracoes,
                          agendamentos, bloqueios, admin_auth, sessoes,
                          lista_espera e notificacoes
  002_seguranca_rls.sql   trava de segurança (RLS) em todas as tabelas
  003_dados_iniciais.sql  5 serviços com valores reais + configurações padrão
.env.example              modelo das variáveis de ambiente (sem segredos)
```

## Como criar o banco (Supabase)

1. Crie a conta e um projeto em [supabase.com](https://supabase.com) (região São Paulo).
2. Abra o **SQL Editor** do projeto.
3. Rode os scripts na ordem: `001_schema.sql`, depois `002_seguranca_rls.sql`, depois `003_dados_iniciais.sql`.
4. Confira no **Table Editor**: as tabelas, os 5 serviços e o registro de configurações devem aparecer.

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha com os valores do seu projeto
(Supabase → Settings → API):

- `SUPABASE_URL` — endereço do projeto
- `SUPABASE_ANON_KEY` — chave pública, pode ser usada no app
- `SUPABASE_SERVICE_ROLE_KEY` — chave **secreta**: só no servidor, **nunca** no navegador/celular

O arquivo `.env` de verdade nunca deve ser commitado — o `.gitignore` deste repo já bloqueia isso.

## Regras do negócio (já refletidas no banco)

- Sinal antecipado obrigatório de **50%** do valor do serviço para garantir o horário
- Cancelamento com estorno e remarcação: só com **24h** de antecedência ou mais
- Falta ou aviso com menos de 24h: sem estorno (em novembro e dezembro, aviso reforçado às clientes)
- Tolerância de atraso de **10 minutos**; buffer de 10 minutos entre atendimentos
- O PIN da manicure **nunca** é gravado em texto: o banco guarda só o `pin_hash` (versão embaralhada), e o PIN é definido por ela no primeiro acesso pelo app
- Preço e duração ficam **congelados** (`preco_snapshot` / `duracao_snapshot`) em cada agendamento: mudar o valor do serviço depois não altera agendamentos já feitos

## Segurança

- Todas as tabelas têm RLS ativado. Sem política liberando, ninguém acessa pelo app/cliente: todo o acesso passa pelo **servidor** com a chave secreta, que confere nome + WhatsApp da cliente e a sessão da manicure.
- Nunca cole a `service_role` em código que roda no navegador. Se ela vazar, gere outra na hora (Supabase → Settings → API).
