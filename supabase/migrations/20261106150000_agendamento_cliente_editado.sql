-- Nome/celular editados pela manicure valem apenas para o agendamento, sem alterar o cadastro da cliente.
alter table public.agendamentos
  add column if not exists cliente_nome_editado text,
  add column if not exists cliente_whatsapp_editado varchar(11);
