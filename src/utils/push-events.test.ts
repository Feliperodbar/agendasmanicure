import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyBookingPushEvents, type PushBookingState } from './push-events';

const pending: PushBookingState = {
  id: 'booking-1',
  status: 'pendente',
  pagamento_status: 'aguardando',
  data_hora_inicio: '2026-12-04T10:00:00-03:00',
};

test('um novo agendamento gera os dois eventos previstos', () => {
  assert.deepEqual(classifyBookingPushEvents({ type: 'INSERT', record: pending, old_record: null }), [
    'novo_agendamento', 'confirmacao',
  ]);
});

test('cancelamento tem prioridade sobre remarcação e confirmação de sinal', () => {
  assert.deepEqual(classifyBookingPushEvents({
    type: 'UPDATE',
    old_record: pending,
    record: { ...pending, status: 'cancelado', data_hora_inicio: '2026-12-05T10:00:00-03:00' },
  }), ['cancelamento', 'cancelamento_confirmado']);
});

test('remarcação identifica mudança de instante e não diferença de representação', () => {
  assert.deepEqual(classifyBookingPushEvents({
    type: 'UPDATE', old_record: pending,
    record: { ...pending, data_hora_inicio: '2026-12-04T13:00:00Z' },
  }), []);
  assert.deepEqual(classifyBookingPushEvents({
    type: 'UPDATE', old_record: pending,
    record: { ...pending, data_hora_inicio: '2026-12-05T10:00:00-03:00' },
  }), ['remarcacao', 'remarcacao_confirmada']);
});

test('confirmação de sinal só ocorre quando pagamento aguardado é confirmado', () => {
  assert.deepEqual(classifyBookingPushEvents({
    type: 'UPDATE', old_record: pending,
    record: { ...pending, status: 'confirmado', pagamento_status: 'confirmado' },
  }), ['sinal_confirmado']);
  assert.deepEqual(classifyBookingPushEvents({
    type: 'UPDATE', old_record: { ...pending, pagamento_status: 'nao_requerido' },
    record: { ...pending, status: 'confirmado', pagamento_status: 'nao_requerido' },
  }), []);
});

test('atualizações de cancelados e mudanças de outros campos são ignoradas', () => {
  assert.deepEqual(classifyBookingPushEvents({
    type: 'UPDATE', old_record: pending, record: { ...pending },
  }), []);
  assert.deepEqual(classifyBookingPushEvents({
    type: 'UPDATE', old_record: { ...pending, status: 'cancelado' },
    record: { ...pending, status: 'cancelado', data_hora_inicio: '2026-12-05T10:00:00-03:00' },
  }), []);
});

test('dados inconsistentes não geram uma notificação enganosa', () => {
  assert.throws(() => classifyBookingPushEvents({
    type: 'UPDATE', old_record: pending, record: { ...pending, id: 'outro' },
  }));
  assert.throws(() => classifyBookingPushEvents({
    type: 'UPDATE', old_record: pending, record: { ...pending, data_hora_inicio: 'inválido' },
  }));
});
