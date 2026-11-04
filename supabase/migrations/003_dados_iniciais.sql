-- ============================================================
-- 003_dados_iniciais.sql — Dados iniciais (seed)
-- Rode depois do 002_seguranca_rls.sql.
-- Serviços e valores reais da Natália Marcela (nov/dez).
-- Durações: só a do Molde F1 (120 min) estava confirmada;
-- as demais são valores de partida, ajustáveis no admin
-- (tela de Serviços) sem tocar neste arquivo.
-- O PIN da manicure NÃO entra aqui: ela define no primeiro
-- acesso pelo app, que grava só o pin_hash em admin_auth.
-- ============================================================

insert into public.servicos (nome, descricao, preco, duracao_min, ordem) values
  ('Alongamento Molde F1', 'Alongamento com molde F1',        130.00, 120, 1),
  ('Banho de Gel',         'Banho de gel nas unhas naturais', 100.00,  90, 2),
  ('Manutenção',           'Manutenção do alongamento',        95.00,  60, 3),
  ('Gel no Pé',            'Esmaltação em gel nos pés',        65.00,  60, 4),
  ('Esmaltação em Gel',    'Esmaltação em gel nas mãos',       60.00,  60, 5)
on conflict do nothing;

insert into public.configuracoes (
  id, nome_exibicao, instagram, chave_pix,
  buffer_min, antecedencia_estorno_horas, antecedencia_remarcar_horas,
  sinal_percentual, tolerancia_atraso_min, horarios
) values (
  1,
  'Natália Marcela | Nail designer',
  '@nataliamarcelanail',
  'nataliamarcela49@gmail.com',
  10, 24, 24, 50, 10,
  '{
     "seg": {"aberto": true,  "inicio": "09:00", "fim": "18:00"},
     "ter": {"aberto": true,  "inicio": "09:00", "fim": "18:00"},
     "qua": {"aberto": true,  "inicio": "09:00", "fim": "18:00"},
     "qui": {"aberto": true,  "inicio": "09:00", "fim": "18:00"},
     "sex": {"aberto": true,  "inicio": "09:00", "fim": "18:00"},
     "sab": {"aberto": true,  "inicio": "09:00", "fim": "18:00"},
     "dom": {"aberto": false, "inicio": null,    "fim": null}
   }'::jsonb
)
on conflict (id) do nothing;
