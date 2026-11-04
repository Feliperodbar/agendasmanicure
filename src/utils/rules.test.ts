import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDeposit, checkRefundEligibility, computeDayCalendarColor } from './rules';

test('calcula 50% de sinal com precisão monetária', () => {
  assert.equal(calculateDeposit(130), 65);
  assert.equal(calculateDeposit(95), 47.5);
  assert.equal(calculateDeposit(65), 32.5);
  assert.equal(calculateDeposit(60), 30);
});

test('cancelamento com mais de 24h tem direito a estorno', () => {
  const future = new Date(Date.now() + 25 * 3600 * 1000).toISOString();
  const res = checkRefundEligibility(future);
  assert.equal(res.eligible, true);
});

test('cancelamento com menos de 24h NÃO tem direito a estorno', () => {
  const nearFuture = new Date(Date.now() + 5 * 3600 * 1000).toISOString();
  const res = checkRefundEligibility(nearFuture);
  assert.equal(res.eligible, false);
});

test('calendário: dia com ao menos um pendente fica LARANJA (prioridade sobre verde)', () => {
  const result = computeDayCalendarColor([
    { status: 'confirmado', sinal_confirmado: true },
    { status: 'pendente', sinal_confirmado: false },
  ]);
  assert.equal(result.color, 'orange');
  assert.equal(result.totalActive, 2);
  assert.equal(result.totalPending, 1);
});

test('calendário: dia só com confirmados fica VERDE', () => {
  const result = computeDayCalendarColor([
    { status: 'confirmado', sinal_confirmado: true },
    { status: 'confirmado', sinal_confirmado: true },
  ]);
  assert.equal(result.color, 'green');
  assert.equal(result.totalActive, 2);
  assert.equal(result.totalPending, 0);
});

test('calendário: dia apenas com cancelados NÃO ganha cor', () => {
  const result = computeDayCalendarColor([
    { status: 'cancelado', sinal_confirmado: false },
  ]);
  assert.equal(result.color, null);
  assert.equal(result.totalActive, 0);
});
