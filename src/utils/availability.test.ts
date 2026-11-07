import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchAvailableSlots } from './availability';

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
