import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAvailableSlots } from './slots';

test('domingo fechado não deve retornar nenhum slot', () => {
  // 2026-11-08 é Domingo
  const slots = calculateAvailableSlots({
    dateStr: '2026-11-08',
    serviceDurationMinutes: 60,
    nowReference: new Date('2026-11-01T08:00:00-03:00'),
  });

  assert.equal(slots.length, 0);
});

test('libera domingos em dezembro no horário normal e mantém fechados nos outros meses', () => {
  const decemberSlots = calculateAvailableSlots({
    dateStr: '2026-12-06',
    serviceDurationMinutes: 60,
    nowReference: new Date('2026-11-01T08:00:00-03:00'),
  });
  const januarySlots = calculateAvailableSlots({
    dateStr: '2027-01-03',
    serviceDurationMinutes: 60,
    nowReference: new Date('2026-11-01T08:00:00-03:00'),
  });

  assert.ok(decemberSlots.some((slot) => slot.time === '09:00'));
  assert.equal(januarySlots.length, 0);
});

test('aceita horários de funcionamento armazenados como JSON textual', () => {
  const slots = calculateAvailableSlots({
    dateStr: '2026-11-13',
    serviceDurationMinutes: 120,
    businessHours: '{"5":{"inicio":"09:00","fim":"19:00"}}',
    nowReference: new Date('2026-11-04T12:00:00-03:00'),
  });

  assert.equal(slots[0]?.time, '09:00');
  assert.equal(slots.at(-1)?.time, '19:00');
});

test('permite agendar às 18:00, mas não permite horários anteriores que ultrapassem o fechamento', () => {
  // 2026-11-09 é Segunda-feira (09:00 às 18:00)
  const slots = calculateAvailableSlots({
    dateStr: '2026-11-09',
    serviceDurationMinutes: 120, // 2 horas
    nowReference: new Date('2026-11-01T08:00:00-03:00'),
  });

  const slotTimes = slots.map((s) => s.time);
  // 18:00 é permitido como início do último atendimento, mesmo que termine depois do fechamento.
  assert.ok(slotTimes.includes('16:00'));
  assert.ok(slotTimes.includes('18:00'));
  assert.equal(slotTimes.includes('16:30'), false);
  assert.equal(slotTimes.includes('17:00'), false);
  assert.equal(slotTimes.includes('17:30'), false);
});

test('respeita buffer de 10 min entre agendamentos', () => {
  // Segunda-feira 2026-11-09, agendamento de 60min às 10:00 (termina 11:00)
  // Com buffer de 10min, ocupa até 11:10
  // Próximo slot a cada 30min: 10:30 conflita, 11:00 conflita com o buffer! 11:30 está livre.
  const slots = calculateAvailableSlots({
    dateStr: '2026-11-09',
    serviceDurationMinutes: 60,
    bufferMinutes: 10,
    existingBookings: [
      {
        data_hora_inicio: '2026-11-09T10:00:00.000-03:00',
        data_hora_fim: '2026-11-09T11:00:00.000-03:00',
        status: 'confirmado',
      },
    ],
    nowReference: new Date('2026-11-01T08:00:00-03:00'),
  });

  const slotTimes = slots.map((s) => s.time);
  assert.equal(slotTimes.includes('10:00'), false);
  assert.equal(slotTimes.includes('10:30'), false);
  assert.equal(slotTimes.includes('11:00'), false); // Bloqueado pelo buffer de 10min!
  assert.ok(slotTimes.includes('11:30'));
});

test('agendamento cancelado libera o horário na hora', () => {
  const slots = calculateAvailableSlots({
    dateStr: '2026-11-09',
    serviceDurationMinutes: 60,
    existingBookings: [
      {
        data_hora_inicio: '2026-11-09T10:00:00.000-03:00',
        data_hora_fim: '2026-11-09T11:00:00.000-03:00',
        status: 'cancelado',
      },
    ],
    nowReference: new Date('2026-11-01T08:00:00-03:00'),
  });

  const slotTimes = slots.map((s) => s.time);
  assert.ok(slotTimes.includes('10:00'));
});

test('reserva Pix vencida libera o horário mesmo antes da rotina de expiração', () => {
  const slots = calculateAvailableSlots({
    dateStr: '2026-11-09',
    serviceDurationMinutes: 60,
    existingBookings: [
      {
        data_hora_inicio: '2026-11-09T10:00:00.000-03:00',
        data_hora_fim: '2026-11-09T11:00:00.000-03:00',
        status: 'pendente',
        pagamento_status: 'aguardando',
        expires_at: '2026-11-05T13:00:00.000Z',
      },
    ],
    nowReference: new Date('2026-11-05T13:00:01.000Z'),
  });

  assert.ok(slots.some((slot) => slot.time === '10:00'));
});

test('não oferece horários do dia que já passaram segundo o instante atual', () => {
  const slots = calculateAvailableSlots({
    dateStr: '2026-11-09',
    serviceDurationMinutes: 60,
    nowReference: new Date('2026-11-09T10:01:00-03:00'),
  });
  const slotTimes = slots.map((slot) => slot.time);

  assert.equal(slotTimes.includes('09:00'), false);
  assert.equal(slotTimes.includes('10:00'), false);
  assert.ok(slotTimes.includes('10:30'));
});
