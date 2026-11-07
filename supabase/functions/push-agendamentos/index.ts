import { authorized, db, deliver, details, dateParts, type Booking } from '../_shared/send.ts';
import { classifyBookingPushEvents, type BookingPushEvent } from '../_shared/events.ts';

Deno.serve(async (request) => {
  try {
    if (request.method !== 'POST') return new Response('Método não permitido', { status: 405 });
    if (!authorized(request)) return new Response('Não autorizado', { status: 401 });
    const payload = await request.json();
    if (payload.action === 'activation') {
      if (typeof payload.bookingId !== 'string' || typeof payload.subscriptionId !== 'string') {
        return new Response('Evento inválido', { status: 400 });
      }
      const { data: booking, error } = await db.from('agendamentos').select('*').eq('id', payload.bookingId).single();
      if (error) throw error;
      await deliver(booking as Booking, 'confirmacao', 'cliente', 'Aviso da agenda', 'Abra a agenda para conferir seus horários.', `${booking.id}:confirmacao`, payload.subscriptionId);
      return new Response('OK');
    }
    const event = payload as BookingPushEvent & { table?: string; schema?: string };
    if (event.table !== 'agendamentos' || event.schema !== 'public' || !['INSERT', 'UPDATE'].includes(event.type)) {
      return new Response('Evento inválido', { status: 400 });
    }
    const booking = event.record as Booking;
    const types = classifyBookingPushEvents(event);
    if (!types.length) return new Response('Sem alterações relevantes');
    const old = event.old_record;
    const info = await details(booking);
    const { day, time } = dateParts(booking.data_hora_inicio);
    const eventKey = event.type === 'INSERT' ? booking.id : `${booking.id}:${booking.atualizado_em}`;
    const previous = old ? dateParts(old.data_hora_inicio) : null;
    for (const type of types) {
      if (type === 'novo_agendamento') {
        await deliver(booking, type, 'manicure', '💅 Novo agendamento', `${info.client} · ${info.service} · ${day} às ${time} (${booking.codigo})`, `${eventKey}:${type}`);
      } else if (type === 'remarcacao') {
        await deliver(booking, type, 'manicure', '🔁 Remarcação', `${info.client} mudou de ${previous?.day} às ${previous?.time} para ${day} às ${time} (${booking.codigo})`, `${eventKey}:${type}`);
      } else if (type === 'cancelamento') {
        await deliver(booking, type, 'manicure', '❌ Horário liberado', `${info.client} · ${info.service} · ${day} às ${time} (${booking.codigo})`, `${eventKey}:${type}`);
      } else {
        await deliver(booking, type, 'cliente', 'Aviso da agenda', 'Abra a agenda para conferir seus horários.', `${eventKey}:${type}`);
      }
    }
    if (types.includes('cancelamento') && booking.manicure_id) {
      const local = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(new Date(booking.data_hora_inicio));
      const hour = Number(new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Sao_Paulo', hour: '2-digit', hourCycle: 'h23',
      }).format(new Date(booking.data_hora_inicio)));
      const period = hour < 12 ? 'manha' : 'tarde';
      const { data: waiting, error } = await db.from('lista_espera').select('whatsapp')
        .eq('manicure_id', booking.manicure_id).eq('data', local)
        .eq('notificado', false).in('periodo', [period, 'qualquer']);
      if (error) throw error;
      const phones = [...new Set((waiting || []).map((item) => item.whatsapp))];
      if (phones.length) {
        const { data: clients, error: clientsError } = await db.from('clientes').select('id').in('whatsapp', phones);
        if (clientsError) throw clientsError;
        for (const client of clients || []) {
          await deliver(
            { ...booking, cliente_id: client.id }, 'vaga_liberada', 'cliente',
            'Aviso da agenda', 'Abra a agenda para conferir seus horários.',
            `${booking.id}:vaga_liberada:${client.id}`,
          );
        }
      }
    }
    return new Response('OK');
  } catch (error) {
    console.error('Erro ao processar evento de push:', error);
    return new Response('Erro ao processar evento', { status: 500 });
  }
});
