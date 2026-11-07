import type { SlotResult } from './slots';

export async function fetchAvailableSlots(
  date: string,
  serviceId: string,
  manicureSlug: string,
  signal?: AbortSignal,
): Promise<SlotResult[]> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  else signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, 15000);

  try {
    const params = new URLSearchParams({ data: date, servicoId: serviceId, manicure: manicureSlug });
    const response = await fetch(`/api/disponibilidade?${params}`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Não foi possível carregar os horários.');
    if (!Array.isArray(data.slots) || !data.slots.every(
      (slot: unknown) => typeof slot === 'object' && slot !== null &&
        typeof (slot as SlotResult).time === 'string' &&
        typeof (slot as SlotResult).available === 'boolean',
    )) {
      throw new Error('Resposta de disponibilidade inválida.');
    }
    return data.slots;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}
