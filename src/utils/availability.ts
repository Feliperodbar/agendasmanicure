import type { SlotResult } from './slots';
import { monthDates, todayInSaoPaulo } from './calendar';

export interface AvailableDay {
  date: string;
  available: boolean;
  error?: boolean;
}

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

export async function fetchAvailableDays(
  month: string,
  serviceId: string,
  manicureSlug: string,
  signal?: AbortSignal,
  onDay?: (day: AvailableDay) => void,
): Promise<AvailableDay[]> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  else signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, 2000);

  try {
    const params = new URLSearchParams({ mes: month, servicoId: serviceId, manicure: manicureSlug });
    const response = await fetch(`/api/disponibilidade/mes?${params}`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Não foi possível carregar os dias disponíveis.');
    if (!Array.isArray(data.days) || !data.days.every(
      (day: unknown) => typeof day === 'object' && day !== null &&
        typeof (day as AvailableDay).date === 'string' &&
        typeof (day as AvailableDay).available === 'boolean',
    )) {
      throw new Error('Resposta de disponibilidade mensal inválida.');
    }
    return data.days;
  } catch (error) {
    if (signal?.aborted) throw error;

    console.warn('Falha na consulta mensal; consultando os dias individualmente.', error);
    const pending = monthDates(month).filter((day) => day >= todayInSaoPaulo());
    const results = new Map<string, AvailableDay>();
    let nextIndex = 0;
    let firstDayError: unknown;

    const loadDays = async () => {
      while (nextIndex < pending.length && !signal?.aborted) {
        const day = pending[nextIndex++];
        if (!day) return;
        try {
          const slots = await fetchAvailableSlots(day, serviceId, manicureSlug, signal);
          const result = { date: day, available: slots.some((slot) => slot.available) };
          results.set(day, result);
          onDay?.(result);
        } catch (dayError) {
          if (signal?.aborted) return;
          firstDayError ??= dayError;
          const result = { date: day, available: false, error: true };
          results.set(day, result);
          onDay?.(result);
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(6, pending.length) }, loadDays));
    if (firstDayError) {
      console.error('Não foi possível consultar alguns dias da disponibilidade.', firstDayError);
    }
    return Array.from(results.values());
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}
