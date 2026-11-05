-- ============================================================
-- 004_manicures.sql — Fase 1 do suporte a várias manicures
-- Cria a tabela manicures, adiciona manicure_id (nullable) nas
-- tabelas existentes e faz backfill com o perfil padrão (Natália).
-- Nenhum comportamento atual é alterado: as colunas são opcionais.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.manicures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  instagram TEXT,
  photo_url TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sem policies: acesso apenas via servidor (service_role), como nas demais tabelas
ALTER TABLE public.manicures ENABLE ROW LEVEL SECURITY;

INSERT INTO public.manicures (slug, name, instagram, active)
VALUES ('natalia', 'Natália Marcela', 'nataliamarcelanail', TRUE)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE public.servicos      ADD COLUMN IF NOT EXISTS manicure_id UUID REFERENCES public.manicures(id) ON DELETE SET NULL;
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS manicure_id UUID REFERENCES public.manicures(id) ON DELETE SET NULL;
ALTER TABLE public.agendamentos  ADD COLUMN IF NOT EXISTS manicure_id UUID REFERENCES public.manicures(id) ON DELETE SET NULL;
ALTER TABLE public.bloqueios     ADD COLUMN IF NOT EXISTS manicure_id UUID REFERENCES public.manicures(id) ON DELETE SET NULL;
ALTER TABLE public.admin_auth    ADD COLUMN IF NOT EXISTS manicure_id UUID REFERENCES public.manicures(id) ON DELETE SET NULL;
ALTER TABLE public.sessoes       ADD COLUMN IF NOT EXISTS manicure_id UUID REFERENCES public.manicures(id) ON DELETE SET NULL;
ALTER TABLE public.lista_espera  ADD COLUMN IF NOT EXISTS manicure_id UUID REFERENCES public.manicures(id) ON DELETE SET NULL;
ALTER TABLE public.notificacoes  ADD COLUMN IF NOT EXISTS manicure_id UUID REFERENCES public.manicures(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_servicos_manicure_id      ON public.servicos(manicure_id);
CREATE INDEX IF NOT EXISTS idx_configuracoes_manicure_id ON public.configuracoes(manicure_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_manicure_id  ON public.agendamentos(manicure_id);
CREATE INDEX IF NOT EXISTS idx_bloqueios_manicure_id     ON public.bloqueios(manicure_id);
CREATE INDEX IF NOT EXISTS idx_admin_auth_manicure_id    ON public.admin_auth(manicure_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_manicure_id       ON public.sessoes(manicure_id);
CREATE INDEX IF NOT EXISTS idx_lista_espera_manicure_id  ON public.lista_espera(manicure_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_manicure_id  ON public.notificacoes(manicure_id);

-- Backfill: tudo o que já existe pertence à manicure padrão
DO $$
DECLARE
  default_id UUID;
BEGIN
  SELECT id INTO default_id FROM public.manicures WHERE slug = 'natalia';

  UPDATE public.servicos      SET manicure_id = default_id WHERE manicure_id IS NULL;
  UPDATE public.configuracoes SET manicure_id = default_id WHERE manicure_id IS NULL;
  UPDATE public.agendamentos  SET manicure_id = default_id WHERE manicure_id IS NULL;
  UPDATE public.bloqueios     SET manicure_id = default_id WHERE manicure_id IS NULL;
  UPDATE public.admin_auth    SET manicure_id = default_id WHERE manicure_id IS NULL;
  UPDATE public.sessoes       SET manicure_id = default_id WHERE manicure_id IS NULL;
  UPDATE public.lista_espera  SET manicure_id = default_id WHERE manicure_id IS NULL;
  UPDATE public.notificacoes  SET manicure_id = default_id WHERE manicure_id IS NULL;
END $$;