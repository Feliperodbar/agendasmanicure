import { getNowInSaoPaulo, toSaoPauloISO } from './timezone.js';

export interface BusinessDayHours {
  inicio: string; // "09:00"
  fim: string;    // "18:00"
}

export type BusinessHoursMap = Record<number, BusinessDayHours | null>;

export interface BookingInterval {
  data_hora_inicio: string; // ISO
  data_hora_fim: string;    // ISO
  status: string;           // "pendente", "confirmado", "cancelado", etc.
}

export interface BlockInterval {
  data_inicio: string; // ISO
  data_fim: string;    // ISO
  dia_inteiro?: boolean;
}

export interface SlotResult {
  time: string; // "09:00"
  available: boolean;
}

export const DEFAULT_BUSINESS_HOURS: BusinessHoursMap = {
  0: null, // Domingo fechado
  1: { inicio: '09:00', fim: '18:00' },
  2: { inicio: '09:00', fim: '18:00' },
  3: { inicio: '09:00', fim: '18:00' },
  4: { inicio: '09:00', fim: '18:00' },
  5: { inicio: '09:00', fim: '18:00' },
  6: { inicio: '09:00', fim: '18:00' },
};

/**
 * Calcula os horários disponíveis em tempo real com precisão matemática.
 */
export function calculateAvailableSlots(params: {
  dateStr: string;                 // "YYYY-MM-DD"
  serviceDurationMinutes: number;  // Ex: 120
  businessHours?: BusinessHoursMap | string;
  bufferMinutes?: number;          // Default 10
  existingBookings?: BookingInterval[];
  blocks?: BlockInterval[];
  nowReference?: Date;
}): SlotResult[] {
  const {
    dateStr,
    serviceDurationMinutes,
    businessHours = DEFAULT_BUSINESS_HOURS,
    bufferMinutes = 10,
    existingBookings = [],
    blocks = [],
    nowReference = getNowInSaoPaulo(),
  } = params;

  let normalizedBusinessHours: BusinessHoursMap = DEFAULT_BUSINESS_HOURS;
  if (typeof businessHours === 'string') {
    try {
      const parsed = JSON.parse(businessHours) as BusinessHoursMap;
      if (parsed && typeof parsed === 'object') {
        normalizedBusinessHours = parsed;
      }
    } catch {
      normalizedBusinessHours = DEFAULT_BUSINESS_HOURS;
    }
  } else if (businessHours && typeof businessHours === 'object') {
    normalizedBusinessHours = businessHours;
  }

  // 1. Obter dia da semana (0=Domingo, 6=Sábado)
  const [year, month, day] = dateStr.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day, 12, 0, 0);
  const weekday = targetDate.getDay();

  const dayConfig = normalizedBusinessHours[weekday];
  if (!dayConfig || !dayConfig.inicio || !dayConfig.fim) {
    return []; // Domingo ou dia fechado
  }

  // 2. Verificar se há bloqueio de dia inteiro
  const dayStartISO = toSaoPauloISO(dateStr, '00:00');
  const dayEndISO = toSaoPauloISO(dateStr, '23:59');

  const hasFullDayBlock = blocks.some((b) => {
    if (b.dia_inteiro) {
      return b.data_inicio.startsWith(dateStr) || (b.data_inicio <= dayStartISO && b.data_fim >= dayEndISO);
    }
    return b.data_inicio <= dayStartISO && b.data_fim >= dayEndISO;
  });

  if (hasFullDayBlock) {
    return [];
  }

  // 3. Filtrar agendamentos ativos do dia
  const activeBookings = existingBookings.filter((b) => b.status !== 'cancelado');

  // 4. Analisar horários de abertura e fechamento em minutos
  const [startHour, startMin] = dayConfig.inicio.split(':').map(Number);
  const [endHour, endMin] = dayConfig.fim.split(':').map(Number);
  const openMinutes = startHour * 60 + startMin;
  const closeMinutes = endHour * 60 + endMin;

  const totalOpenMinutes = closeMinutes - openMinutes;
  if (totalOpenMinutes <= 0) return [];

  const slots: SlotResult[] = [];

  // Intervalos a cada 30 minutos
  for (let m = 0; m <= totalOpenMinutes; m += 30) {
    const slotStartMinTotal = openMinutes + m;
    const slotEndMinTotal = slotStartMinTotal + serviceDurationMinutes;

    // Regra: Não pode ultrapassar o horário de fechamento
    // (ex: serviço de 120min às 17h quando fecha às 18h é RECUSADO)
    if (slotEndMinTotal > closeMinutes) {
      continue;
    }

    const slotStartH = Math.floor(slotStartMinTotal / 60);
    const slotStartM = slotStartMinTotal % 60;
    const timeString = `${String(slotStartH).padStart(2, '0')}:${String(slotStartM).padStart(2, '0')}`;

    const slotEndH = Math.floor(slotEndMinTotal / 60);
    const slotEndM = slotEndMinTotal % 60;
    const slotEndTimeString = `${String(slotEndH).padStart(2, '0')}:${String(slotEndM).padStart(2, '0')}`;

    const slotStartISO = toSaoPauloISO(dateStr, timeString);
    const slotEndISO = toSaoPauloISO(dateStr, slotEndTimeString);

    // Regra: Não permitir agendamentos no passado
    if (new Date(slotStartISO) <= nowReference) {
      continue;
    }

    // Regra: Bloqueios parciais
    const hasBlockConflict = blocks.some((b) => {
      const bStart = new Date(b.data_inicio).getTime();
      const bEnd = new Date(b.data_fim).getTime();
      const sStart = new Date(slotStartISO).getTime();
      const sEnd = new Date(slotEndISO).getTime();
      return sStart < bEnd && sEnd > bStart;
    });

    if (hasBlockConflict) {
      continue;
    }

    // Regra: Conflito com agendamentos existentes (considerando buffer de 10 min pós-atendimento)
    const hasBookingConflict = activeBookings.some((a) => {
      const aStart = new Date(a.data_hora_inicio).getTime();
      const aEndWithBuffer = new Date(a.data_hora_fim).getTime() + bufferMinutes * 60000;
      const sStart = new Date(slotStartISO).getTime();
      const sEndWithBuffer = new Date(slotEndISO).getTime() + bufferMinutes * 60000;

      // Conflito ocorre se os períodos com buffer se sobrepõem
      return sStart < aEndWithBuffer && sEndWithBuffer > aStart;
    });

    if (!hasBookingConflict) {
      slots.push({ time: timeString, available: true });
    }
  }

  return slots;
}
