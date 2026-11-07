export type BookingPushType =
  | 'novo_agendamento'
  | 'confirmacao'
  | 'remarcacao'
  | 'remarcacao_confirmada'
  | 'cancelamento'
  | 'cancelamento_confirmado'
  | 'sinal_confirmado';

export interface PushBookingState {
  id: string;
  status: string;
  data_hora_inicio: string;
  pagamento_status?: string | null;
}

export type BookingPushEvent =
  | { type: 'INSERT'; record: PushBookingState; old_record: null }
  | { type: 'UPDATE'; record: PushBookingState; old_record: PushBookingState };

export function classifyBookingPushEvents(event: BookingPushEvent): BookingPushType[] {
  if (event.type === 'INSERT') {
    return ['novo_agendamento', 'confirmacao'];
  }

  const { record, old_record: previous } = event;
  if (record.id !== previous.id) {
    throw new Error('O evento deve conter versões do mesmo agendamento.');
  }

  if (record.status === 'cancelado' && previous.status !== 'cancelado') {
    return ['cancelamento', 'cancelamento_confirmado'];
  }
  if (record.status === 'cancelado') return [];

  const events: BookingPushType[] = [];
  const start = Date.parse(record.data_hora_inicio);
  const previousStart = Date.parse(previous.data_hora_inicio);
  if (!Number.isFinite(start) || !Number.isFinite(previousStart)) {
    throw new Error('O evento contém uma data de agendamento inválida.');
  }
  if (start !== previousStart) {
    events.push('remarcacao', 'remarcacao_confirmada');
  }
  if (
    previous.status === 'pendente' &&
    record.status === 'confirmado' &&
    previous.pagamento_status === 'aguardando' &&
    record.pagamento_status === 'confirmado'
  ) {
    events.push('sinal_confirmado');
  }
  return events;
}
