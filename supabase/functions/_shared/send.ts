import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import webpush from 'npm:web-push@3.6.7';

function required(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Variável ${name} não configurada.`);
  return value;
}

export const db = createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
});
webpush.setVapidDetails(required('VAPID_SUBJECT'), required('VAPID_PUBLIC_KEY'), required('VAPID_PRIVATE_KEY'));

export function authorized(request: Request): boolean {
  const provided = request.headers.get('x-push-secret') || '';
  const expected = required('PUSH_WEBHOOK_SECRET');
  const a = new TextEncoder().encode(provided);
  const b = new TextEncoder().encode(expected);
  if (a.length !== b.length) return false;
  let different = 0;
  for (let i = 0; i < a.length; i++) different |= a[i] ^ b[i];
  return different === 0;
}

export interface Booking {
  id: string;
  codigo: string;
  cliente_id: string;
  manicure_id: string | null;
  servico_id: string;
  data_hora_inicio: string;
  status: string;
  pagamento_status?: string;
  atualizado_em: string;
}

interface Subscription {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function deliver(
  booking: Booking,
  type: string,
  role: 'cliente' | 'manicure',
  title: string,
  body: string,
  eventKey: string,
  onlySubscriptionId?: string,
): Promise<void> {
  const targetId = role === 'cliente' ? booking.cliente_id : booking.manicure_id;
  if (!targetId) throw new Error(`Destinatário ${role} ausente no agendamento ${booking.id}.`);
  let query = db.from('push_assinaturas').select('id,endpoint,p256dh,auth')
    .eq('papel', role).eq('ativo', true)
    .eq(role === 'cliente' ? 'cliente_id' : 'manicure_id', targetId);
  if (onlySubscriptionId) query = query.eq('id', onlySubscriptionId);
  const { data: subscriptions, error } = await query;
  if (error) throw error;

  const targets: (Subscription | null)[] = subscriptions?.length ? subscriptions : [null];
  let failed = false;
  for (const subscription of targets) {
    const key = `${eventKey}:${role}:${subscription?.id || 'sem-assinatura'}`;
    const entry = {
      agendamento_id: booking.id,
      manicure_id: booking.manicure_id,
      tipo: type,
      canal: 'push',
      mensagem: `${title} — ${body}`,
      status: subscription ? 'pendente' : 'sem_assinatura',
      chave_idempotencia: key,
    };
    let { data: log, error: insertError } = await db.from('notificacoes').insert(entry).select('id').single();
    if (insertError?.code === '23505' && subscription) {
      const retry = await db.from('notificacoes').update({ status: 'pendente' })
        .eq('chave_idempotencia', key).eq('status', 'falha').select('id').maybeSingle();
      if (retry.error) throw retry.error;
      log = retry.data;
      insertError = null;
    }
    if (insertError?.code === '23505') continue;
    if (insertError) throw insertError;
    if (!log) continue;
    if (!subscription) continue;

    try {
      const localDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(new Date(booking.data_hora_inicio));
      await webpush.sendNotification(
        { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
        JSON.stringify({ title, body, url: role === 'cliente' ? '/?push=meus-horarios' : `/?push=admin&dia=${localDate}` }),
        { TTL: 3600 },
      );
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        const { error: disableError } = await db.from('push_assinaturas').update({ ativo: false }).eq('id', subscription.id);
        if (disableError) {
          failed = true;
          console.error('Falha ao desativar assinatura:', disableError);
        }
      } else {
        failed = true;
      }
      const { error: logError } = await db.from('notificacoes').update({ status: 'falha' }).eq('id', log.id);
      if (logError) throw logError;
      console.error('Falha no envio push, status:', status || 'erro de rede');
      continue;
    }
    const { error: updateError } = await db.from('notificacoes').update({
      status: 'enviado', enviado_em: new Date().toISOString(),
    }).eq('id', log.id);
    if (updateError) throw updateError;
  }
  if (failed) throw new Error('Uma ou mais entregas push falharam.');
}

export function dateParts(value: string) {
  const date = new Date(value);
  const day = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' }).format(date);
  const time = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
  return { day, time };
}

export async function details(booking: Booking) {
  const [client, service] = await Promise.all([
    db.from('clientes').select('nome').eq('id', booking.cliente_id).single(),
    db.from('servicos').select('nome').eq('id', booking.servico_id).single(),
  ]);
  if (client.error) throw client.error;
  if (service.error) throw service.error;
  return { client: client.data.nome.split(' ')[0], service: service.data.nome };
}
