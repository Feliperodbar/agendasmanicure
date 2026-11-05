-- ============================================================
-- 001_schema.sql
-- Aplicativo de Agendamento: Natália Marcela | Nail designer
-- Tabelas: clientes, servicos, configuracoes, agendamentos,
--          bloqueios, admin_auth, sessoes, lista_espera, notificacoes
-- ============================================================

-- Habilitar extensão para geração de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CLIENTES
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  whatsapp VARCHAR(11) NOT NULL UNIQUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT timezone('America/Sao_Paulo', now()),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT timezone('America/Sao_Paulo', now())
);

CREATE INDEX IF NOT EXISTS idx_clientes_whatsapp ON clientes(whatsapp);

-- 2. SERVICOS
CREATE TABLE IF NOT EXISTS servicos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  preco NUMERIC(10, 2) NOT NULL,
  duracao_minutos INTEGER NOT NULL,
  descricao TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT timezone('America/Sao_Paulo', now()),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT timezone('America/Sao_Paulo', now())
);

-- 3. CONFIGURACOES
CREATE TABLE IF NOT EXISTS configuracoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chave TEXT UNIQUE NOT NULL,
  valor JSONB NOT NULL,
  descricao TEXT,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT timezone('America/Sao_Paulo', now())
);

-- 4. AGENDAMENTOS
CREATE TABLE IF NOT EXISTS agendamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR(10) UNIQUE NOT NULL, -- Ex: NM-0001
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  servico_id UUID NOT NULL REFERENCES servicos(id) ON DELETE RESTRICT,
  data_hora_inicio TIMESTAMPTZ NOT NULL,
  data_hora_fim TIMESTAMPTZ NOT NULL,
  duracao_snapshot INTEGER NOT NULL,
  preco_snapshot NUMERIC(10, 2) NOT NULL,
  valor_sinal NUMERIC(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente', -- pendente, confirmado, concluido, cancelado, falta
  sinal_confirmado BOOLEAN NOT NULL DEFAULT false,
  estorno_elegivel BOOLEAN NOT NULL DEFAULT true,
  observacoes TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT timezone('America/Sao_Paulo', now()),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT timezone('America/Sao_Paulo', now())
);

CREATE INDEX IF NOT EXISTS idx_agendamentos_datas ON agendamentos(data_hora_inicio, data_hora_fim);
CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON agendamentos(status);
CREATE INDEX IF NOT EXISTS idx_agendamentos_codigo ON agendamentos(codigo);

-- 5. BLOQUEIOS
CREATE TABLE IF NOT EXISTS bloqueios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data_inicio TIMESTAMPTZ NOT NULL,
  data_fim TIMESTAMPTZ NOT NULL,
  motivo TEXT NOT NULL,
  dia_inteiro BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT timezone('America/Sao_Paulo', now())
);

CREATE INDEX IF NOT EXISTS idx_bloqueios_datas ON bloqueios(data_inicio, data_fim);

-- 6. ADMIN_AUTH
CREATE TABLE IF NOT EXISTS admin_auth (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pin_hash TEXT NOT NULL,
  tentativas_falhas INTEGER NOT NULL DEFAULT 0,
  bloqueado_ate TIMESTAMPTZ,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT timezone('America/Sao_Paulo', now())
);

-- 7. SESSOES
CREATE TABLE IF NOT EXISTS sessoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_hash TEXT UNIQUE NOT NULL,
  expira_em TIMESTAMPTZ NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT timezone('America/Sao_Paulo', now())
);

CREATE INDEX IF NOT EXISTS idx_sessoes_token_hash ON sessoes(token_hash);

-- 8. LISTA_ESPERA
CREATE TABLE IF NOT EXISTS lista_espera (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  whatsapp VARCHAR(11) NOT NULL,
  data DATE NOT NULL,
  periodo VARCHAR(20) NOT NULL DEFAULT 'qualquer', -- manha, tarde, qualquer
  notificado BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT timezone('America/Sao_Paulo', now())
);

CREATE INDEX IF NOT EXISTS idx_lista_espera_data ON lista_espera(data);

-- 9. NOTIFICACOES
CREATE TABLE IF NOT EXISTS notificacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agendamento_id UUID REFERENCES agendamentos(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL,
  canal VARCHAR(20) NOT NULL, -- whatsapp, sms, email
  mensagem TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'simulado', -- simulado, pendente, enviado, falha
  enviado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT timezone('America/Sao_Paulo', now())
);

-- ============================================================
-- SEED INICIAL (Conforme catálogo oficial do negócio)
-- ============================================================

INSERT INTO servicos (nome, preco, duracao_minutos, descricao, ordem, ativo)
VALUES
  ('Alongamento Molde F1', 130.00, 120, 'Alongamento completo com acabamento impecável e alta durabilidade.', 1, true),
  ('Banho de Gel', 100.00, 90, 'Camada fortalecedora sobre a unha natural para proteger contra quebras.', 2, true),
  ('Manutenção', 95.00, 60, 'Reposição do gel, alinhamento e acabamento perfeito.', 3, true),
  ('Gel no Pé', 65.00, 60, 'Esmaltação e reforço em gel nos pés com durabilidade prolongada.', 4, true),
  ('Esmaltação em Gel', 60.00, 60, 'Brilho intenso e secagem instantânea na cabine UV.', 5, true)
ON CONFLICT DO NOTHING;

-- Configurações de horários e regras operacionais
INSERT INTO configuracoes (chave, valor, descricao)
VALUES
  ('chave_pix', '"nataliamarcela49@gmail.com"', 'Chave Pix para envio do sinal de 50%'),
  ('sinal_percentual', '50', 'Percentual obrigatório de sinal antecipado'),
  ('buffer_minutos', '10', 'Tempo de buffer entre atendimentos em minutos'),
  ('tolerancia_atraso_minutos', '10', 'Tolerância máxima de atraso antes de cancelamento sem estorno'),
  ('antecedencia_estorno_horas', '24', 'Horas mínimas de antecedência para cancelamento com direito a estorno'),
  ('antecedencia_remarcacao_horas', '24', 'Horas mínimas de antecedência para cliente remarcar'),
  ('horarios_funcionamento', '{
    "0": null,
    "1": {"inicio": "09:00", "fim": "18:00"},
    "2": {"inicio": "09:00", "fim": "18:00"},
    "3": {"inicio": "09:00", "fim": "18:00"},
    "4": {"inicio": "09:00", "fim": "18:00"},
    "5": {"inicio": "09:00", "fim": "18:00"},
    "6": {"inicio": "09:00", "fim": "18:00"}
  }', 'Horários de funcionamento por dia da semana (0=Domingo fechado, 1-6=Segunda a Sábado)')
ON CONFLICT (chave) DO NOTHING;
