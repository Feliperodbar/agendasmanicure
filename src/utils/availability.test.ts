import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchAvailableDays, fetchAvailableSlots } from './availability';

test('consulta a disponibilidade sem cache para a data, serviço e manicure', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () =>
    new Response(JSON.stringify({ slots: [{ time: '10:00', available: true }] }), { status: 200 }),
  );
  assert.deepEqual(await fetchAvailableSlots('2026-12-04', 'serviço 1', 'manicure'), [{ time: '10:00', available: true }]);
  const [url, options] = fetchMock.mock.calls[0].arguments;
  assert.match(String(url), /data=2026-12-04/);
  assert.match(String(url), /servicoId=servi%C3%A7o\+1/);
  assert.equal(options?.cache, 'no-store');
});

test('falhas HTTP e respostas inválidas não são tratadas como dia sem horários', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () =>
    new Response(JSON.stringify({ error: 'Erro de disponibilidade' }), { status: 502 }),
  );
  await assert.rejects(fetchAvailableSlots('2026-12-04', '1', 'manicure'), /Erro de disponibilidade/);
  fetchMock.mock.mockImplementation(async () => new Response(JSON.stringify({ slots: null }), { status: 200 }));
  await assert.rejects(fetchAvailableSlots('2026-12-04', '1', 'manicure'), /inválida/);
});

test('consulta a disponibilidade do mês em uma única requisição', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () =>
    new Response(JSON.stringify({ days: [{ date: '2026-12-04', available: true }] }), { status: 200 }),
  );
  assert.deepEqual(await fetchAvailableDays('2026-12', 'serviço 1', 'manicure'), [
    { date: '2026-12-04', available: true },
  ]);
  const [url, options] = fetchMock.mock.calls[0].arguments;
  assert.match(String(url), /\/api\/disponibilidade\/mes\?/);
  assert.match(String(url), /mes=2026-12/);
  assert.match(String(url), /servicoId=servi%C3%A7o\+1/);
  assert.equal(options?.cache, 'no-store');
});

test('resposta mensal inválida é informada', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    new Response(JSON.stringify({ days: null }), { status: 200 }),
  );
  await assert.rejects(fetchAvailableDays('2026-12', '1', 'manicure'), /mensal inválida/);
});
