import { authorized, db, deliver, details, dateParts, type Booking } from '../_shared/send.ts';

Deno.serve(async (request) => {
  try {
    if (request.method !== 'POST') return new Response('Método não permitido', { status: 405 });
    if (!authorized(request)) return new Response('Não autorizado', { status: 401 });
    const now = Date.now();
    for (const [type, hours] of [['lembrete_24h', 24], ['lembrete_2h', 2]] as const) {
      const from = new Date(now + (hours * 60 - 15) * 60000).toISOString();
      const to = new Date(now + (hours * 60 + 15) * 60000).toISOString();
      const { data, error } = await db.from('agendamentos').select('*')
        .in('status', ['pendente', 'confirmado']).gte('data_hora_inicio', from).lt('data_hora_inicio', to);
      if (error) throw error;
      for (const booking of data as Booking[]) {
        const info = await details(booking);
        const { time } = dateParts(booking.data_hora_inicio);
        const key = `${booking.id}:${type}:${booking.data_hora_inicio}`;
        await deliver(booking, type, 'cliente', 'Aviso da agenda', 'Abra a agenda para conferir seus horários.', key);
        await deliver(booking, type, 'manicure', hours === 24 ? 'Lembrete de amanhã' : 'Em 2h', `${info.client} · ${info.service} · ${time} (${booking.codigo})${booking.status === 'pendente' ? ' · SEM SINAL' : ''}`, key);
      }
    }
    return new Response('OK');
  } catch (error) {
    console.error('Falha ao processar lembretes:', error);
    return new Response('Erro ao processar lembretes', { status: 500 });
  }
});
