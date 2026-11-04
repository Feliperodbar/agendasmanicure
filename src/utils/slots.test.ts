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

test('serviço de 120 min às 17:00 que fecha às 18:00 não pode ser oferecido', () => {
  // 2026-11-09 é Segunda-feira (09:00 às 18:00)
  const slots = calculateAvailableSlots({
    dateStr: '2026-11-09',
    serviceDurationMinutes: 120, // 2 horas
    nowReference: new Date('2026-11-01T08:00:00-03:00'),
  });

  const slotTimes = slots.map((s) => s.time);
  // O último horário possível para 120min deve ser 16:00 (termina às 18:00)
  assert.ok(slotTimes.includes('16:00'));
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
