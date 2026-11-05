ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS pagamento_status TEXT NOT NULL DEFAULT 'nao_requerido',
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pagamento_confirmado_em TIMESTAMPTZ;

ALTER TABLE public.agendamentos
  ADD CONSTRAINT agendamentos_pagamento_status_check
  CHECK (pagamento_status IN ('nao_requerido', 'aguardando', 'confirmado', 'expirado'));

CREATE INDEX IF NOT EXISTS idx_agendamentos_reservas_pix_expiracao
  ON public.agendamentos (expires_at)
  WHERE pagamento_status = 'aguardando';

CREATE OR REPLACE FUNCTION public.reserve_pix_booking(
  p_id UUID,
  p_codigo TEXT,
  p_cliente_id UUID,
  p_servico_id UUID,
  p_manicure_id UUID,
  p_data_hora_inicio TIMESTAMPTZ,
  p_data_hora_fim TIMESTAMPTZ,
  p_duracao_snapshot INTEGER,
  p_preco_snapshot NUMERIC,
  p_valor_sinal NUMERIC,
  p_estorno_elegivel BOOLEAN,
  p_observacoes TEXT,
  p_buffer_minutos INTEGER
)
RETURNS TABLE (accepted BOOLEAN, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_expires_at TIMESTAMPTZ := now() + interval '20 minutes';
  v_lock_key BIGINT;
BEGIN
  IF p_manicure_id IS NULL THEN
    RAISE EXCEPTION 'manicure_id is required for a temporary reservation';
  END IF;

  v_lock_key := hashtextextended(
    p_manicure_id::text || ':' || (p_data_hora_inicio AT TIME ZONE 'America/Sao_Paulo')::date::text,
    0
  );
  PERFORM pg_advisory_xact_lock(v_lock_key);

  IF EXISTS (
    SELECT 1
    FROM public.agendamentos AS existing
    WHERE (existing.manicure_id = p_manicure_id OR existing.manicure_id IS NULL)
      AND existing.status <> 'cancelado'
      AND existing.pagamento_status <> 'expirado'
      AND NOT (
        existing.pagamento_status = 'aguardando'
        AND existing.expires_at <= now()
      )
      AND p_data_hora_inicio < existing.data_hora_fim + make_interval(mins => p_buffer_minutos)
      AND p_data_hora_fim + make_interval(mins => p_buffer_minutos) > existing.data_hora_inicio
  ) THEN
    RETURN QUERY SELECT false, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  INSERT INTO public.agendamentos (
    id, codigo, cliente_id, servico_id, manicure_id,
    data_hora_inicio, data_hora_fim, duracao_snapshot, preco_snapshot,
    valor_sinal, status, sinal_confirmado, estorno_elegivel, observacoes,
    criado_em, atualizado_em, pagamento_status, expires_at
  ) VALUES (
    p_id, p_codigo, p_cliente_id, p_servico_id, p_manicure_id,
    p_data_hora_inicio, p_data_hora_fim, p_duracao_snapshot, p_preco_snapshot,
    p_valor_sinal, 'pendente', false, p_estorno_elegivel, p_observacoes,
    now(), now(), 'aguardando', v_expires_at
  );

  RETURN QUERY SELECT true, v_expires_at;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_pix_booking(
  UUID, TEXT, UUID, UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER,
  NUMERIC, NUMERIC, BOOLEAN, TEXT, INTEGER
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_pix_booking(
  UUID, TEXT, UUID, UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER,
  NUMERIC, NUMERIC, BOOLEAN, TEXT, INTEGER
) TO service_role;

CREATE OR REPLACE FUNCTION public.confirm_pix_booking(p_booking_id UUID)
RETURNS SETOF public.agendamentos
LANGUAGE sql
SET search_path = ''
AS $$
  UPDATE public.agendamentos
  SET status = 'confirmado',
      sinal_confirmado = TRUE,
      pagamento_status = 'confirmado',
      pagamento_confirmado_em = now(),
      atualizado_em = now()
  WHERE id = p_booking_id
    AND status = 'pendente'
    AND pagamento_status = 'aguardando'
    AND expires_at > now()
  RETURNING *;
$$;

REVOKE ALL ON FUNCTION public.confirm_pix_booking(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_pix_booking(UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.expire_pix_bookings()
RETURNS SETOF public.agendamentos
LANGUAGE sql
SET search_path = ''
AS $$
  UPDATE public.agendamentos
  SET status = 'cancelado',
      pagamento_status = 'expirado',
      atualizado_em = now()
  WHERE pagamento_status = 'aguardando'
    AND expires_at <= now()
    AND status = 'pendente'
  RETURNING *;
$$;

REVOKE ALL ON FUNCTION public.expire_pix_bookings() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_pix_bookings() TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

SELECT cron.schedule(
  'expirar-reservas-pix',
  '* * * * *',
  'SELECT count(*) FROM public.expire_pix_bookings();'
);