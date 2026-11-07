CREATE TABLE public.push_assinaturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  papel text NOT NULL CHECK (papel IN ('manicure', 'cliente')),
  cliente_id uuid REFERENCES public.clientes(id),
  manicure_id uuid REFERENCES public.manicures(id),
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (papel = 'cliente' AND cliente_id IS NOT NULL AND manicure_id IS NULL) OR
    (papel = 'manicure' AND cliente_id IS NULL AND manicure_id IS NOT NULL)
  )
);

ALTER TABLE public.push_assinaturas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.push_assinaturas FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_assinaturas TO service_role;

CREATE INDEX push_assinaturas_cliente_ativo_idx
  ON public.push_assinaturas (cliente_id) WHERE papel = 'cliente' AND ativo;
CREATE INDEX push_assinaturas_manicure_ativo_idx
  ON public.push_assinaturas (manicure_id) WHERE papel = 'manicure' AND ativo;

ALTER TABLE public.notificacoes
  ADD COLUMN chave_idempotencia text UNIQUE;