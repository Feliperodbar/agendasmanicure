-- ============================================================
-- 001_schema.sql — Agenda Natália Marcela (Supabase / Postgres)
-- Rode no SQL Editor do Supabase, nesta ordem: 001 → 002 → 003
-- Cria as tabelas do app. Tudo em America/Sao_Paulo na exibição;
-- os horários são guardados como timestamptz (com fuso).
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- CLIENTES — identificadas pelo WhatsApp (11 dígitos, único)
-- ------------------------------------------------------------
create table if not exists public.clientes (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  whatsapp    text not null unique check (whatsapp ~ '^[0-9]{11}$'),
  observacoes text,
  criado_em   timestamptz not null default now()
);

-- ------------------------------------------------------------
-- SERVIÇOS — catálogo editável pela manicure
-- ------------------------------------------------------------
create table if not exists public.servicos (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  descricao   text,
  preco       numeric(10,2) not null check (preco >= 0),
  duracao_min integer not null check (duracao_min > 0),
  ativo       boolean not null default true,
  ordem       integer not null default 0,
  criado_em   timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ------------------------------------------------------------
-- CONFIGURAÇÕES — registro único (id = 1): perfil, Pix e regras
-- ------------------------------------------------------------
create table if not exists public.configuracoes (
  id                          integer primary key check (id = 1),
  nome_exibicao               text not null,
  instagram                   text,
  chave_pix                   text,
  buffer_min                  integer not null default 10,
  antecedencia_estorno_horas  integer not null default 24,
  antecedencia_remarcar_horas integer not null default 24,
  sinal_percentual            integer not null default 50
                              check (sinal_percentual between 0 and 100),
  tolerancia_atraso_min       integer not null default 10,
  horarios                    jsonb not null default '{}'::jsonb,
  atualizado_em               timestamptz not null default now()
);

-- ------------------------------------------------------------
-- AGENDAMENTOS — código NM-0001, NM-0002... gerado sozinho.
-- preco_snapshot / duracao_snapshot congelam o valor na hora
-- da marcação: mudar o serviço depois não mexe no passado.
-- ------------------------------------------------------------
create sequence if not exists public.agendamento_codigo_seq;

create table if not exists public.agendamentos (
  id               uuid primary key default gen_random_uuid(),
  codigo           text not null unique
                   default ('NM-' || lpad(nextval('public.agendamento_codigo_seq')::text, 4, '0')),
  cliente_id       uuid not null references public.clientes (id),
  servico_id       uuid references public.servicos (id),
  inicio           timestamptz not null,
  fim              timestamptz not null check (fim > inicio),
  status           text not null default 'pendente'
                   check (status in ('pendente', 'confirmado', 'concluido', 'cancelado', 'falta')),
  preco_snapshot   numeric(10,2) not null,
  duracao_snapshot integer not null,
  sinal_valor      numeric(10,2) not null default 0,
  sinal_pago       boolean not null default false,
  id_externo_sync  text,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);

-- ------------------------------------------------------------
-- BLOQUEIOS — dia inteiro ou um intervalo sem atendimento
-- ------------------------------------------------------------
create table if not exists public.bloqueios (
  id        uuid primary key default gen_random_uuid(),
  inicio    timestamptz not null,
  fim       timestamptz not null check (fim > inicio),
  dia_todo  boolean not null default false,
  motivo    text,
  criado_em timestamptz not null default now()
);

-- ------------------------------------------------------------
-- ADMIN_AUTH — registro único (id = 1). Guarda SÓ o pin_hash
-- (versão embaralhada do PIN). O PIN em texto NUNCA entra aqui.
-- O PIN é definido pela manicure no primeiro acesso pelo app.
-- ------------------------------------------------------------
create table if not exists public.admin_auth (
  id            integer primary key check (id = 1),
  pin_hash      text not null,
  tentativas    integer not null default 0,
  bloqueado_ate timestamptz,
  atualizado_em timestamptz not null default now()
);

-- ------------------------------------------------------------
-- SESSÕES — login da manicure (token guardado como hash).
-- Sessão vale 30 dias no aparelho; Sair revoga na hora.
-- ------------------------------------------------------------
create table if not exists public.sessoes (
  id         uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  criado_em  timestamptz not null default now(),
  expira_em  timestamptz not null,
  revogado   boolean not null default false
);

-- ------------------------------------------------------------
-- LISTA DE ESPERA — cliente aguardando vaga num dia/período
-- ------------------------------------------------------------
create table if not exists public.lista_espera (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null,
  whatsapp  text not null check (whatsapp ~ '^[0-9]{11}$'),
  data      date not null,
  periodo   text not null default 'qualquer'
            check (periodo in ('manha', 'tarde', 'qualquer')),
  status    text not null default 'aguardando'
            check (status in ('aguardando', 'ofertado', 'atendido', 'cancelado')),
  criado_em timestamptz not null default now()
);

-- ------------------------------------------------------------
-- NOTIFICAÇÕES — registro dos avisos (hoje simulados: nenhum
-- provedor real conectado; quando conectar, muda só o status)
-- ------------------------------------------------------------
create table if not exists public.notificacoes (
  id             uuid primary key default gen_random_uuid(),
  agendamento_id uuid references public.agendamentos (id),
  destinatario   text not null check (destinatario in ('cliente', 'manicure')),
  canal          text not null check (canal in ('whatsapp', 'sms', 'email', 'app')),
  modelo         text not null,
  status         text not null default 'simulado',
  agendado_para  timestamptz,
  enviado_em     timestamptz,
  criado_em      timestamptz not null default now()
);

-- ------------------------------------------------------------
-- ÍNDICES — agenda por dia/status e busca da cliente
-- ------------------------------------------------------------
create index if not exists idx_agendamentos_inicio
  on public.agendamentos (inicio);
create index if not exists idx_agendamentos_status
  on public.agendamentos (status);
create index if not exists idx_agendamentos_cliente
  on public.agendamentos (cliente_id);
create index if not exists idx_lista_espera_data
  on public.lista_espera (data);
