import test from 'node:test';
import assert from 'node:assert/strict';
import { monthDates, shiftMonth } from './calendar';

test('gera todos os dias do mês, inclusive fevereiro bissexto', () => {
  assert.equal(monthDates('2028-02').length, 29);
  assert.equal(monthDates('2028-02').at(-1), '2028-02-29');
  assert.equal(monthDates('2027-02').length, 28);
  assert.equal(monthDates('2026-12')[3], '2026-12-04');
});

test('navega entre meses e anos', () => {
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.equal(shiftMonth('2027-01', -1), '2026-12');
});
