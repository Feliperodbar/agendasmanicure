-- ============================================================
-- 002_seguranca_rls.sql — Segurança (Row Level Security)
-- Rode depois do 001_schema.sql.
--
-- Como este app funciona:
--   * NENHUM acesso direto do celular/navegador às tabelas.
--   * Todo acesso passa pelo SERVIDOR do app, que usa a chave
--     secreta (service_role). Ela ignora o RLS — por isso ela
--     NUNCA pode aparecer em código do navegador/celular.
--   * O servidor é quem confere: nome + WhatsApp da cliente
--     (ela só vê/cancela os próprios agendamentos) e a sessão
--     da manicure (login por PIN) para tudo o que é admin.
--
-- Com o RLS ligado e NENHUMA política liberando acesso, o
-- comportamento padrão do Supabase é NEGAR tudo para as chaves
-- pública (anon) e de usuário logado. É exatamente o desenho
-- acima: sem política = sem acesso direto. Seguro por padrão.
-- ============================================================

alter table public.clientes      enable row level security;
alter table public.servicos      enable row level security;
alter table public.configuracoes enable row level security;
alter table public.agendamentos  enable row level security;
alter table public.bloqueios     enable row level security;
alter table public.admin_auth    enable row level security;
alter table public.sessoes       enable row level security;
alter table public.lista_espera  enable row level security;
alter table public.notificacoes  enable row level security;

-- Nenhuma policy é criada de propósito neste script.
-- Se um dia o app passar a falar direto com o Supabase pelo
-- navegador, crie policies específicas e revisadas para isso —
-- nunca uma policy "libera tudo" (using (true)) em produção.
