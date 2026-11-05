export interface BookingRuleSummary {
  depositAmount: number;
  depositPercentage: number;
  pixKey: string;
}

export const DEFAULT_PIX_KEY = 'nataliamarcela49@gmail.com';
export const DEFAULT_DEPOSIT_PCT = 50;
export const DEFAULT_CANCEL_HOURS_REFUND = 24;

export function getDepositPercentageForDate(dateValue: string, defaultPercentage: number = DEFAULT_DEPOSIT_PCT): number {
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.test(dateValue);
  let month: number;

  if (dateOnlyMatch) {
    month = Number(dateValue.slice(5, 7));
  } else {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return defaultPercentage;
    month = Number(new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      month: '2-digit',
    }).format(date));
  }

  return month === 11 ? 0 : defaultPercentage;
}

/**
 * Calcula o valor exato do sinal de 50%
 */
export function calculateDeposit(price: number, percentage: number = DEFAULT_DEPOSIT_PCT): number {
  return Number(((price * percentage) / 100).toFixed(2));
}

/**
 * Determina se o cancelamento tem direito a estorno do sinal
 * Regra: >= 24h de antecedência tem direito a estorno. Menos de 24h NÃO tem estorno.
 */
export function checkRefundEligibility(
  appointmentStartISO: string,
  nowDate: Date = new Date(),
  minHoursAdvance: number = DEFAULT_CANCEL_HOURS_REFUND
): { eligible: boolean; diffHours: number } {
  const appDate = new Date(appointmentStartISO);
  const diffHours = (appDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60);

  return {
    eligible: diffHours >= minHoursAdvance,
    diffHours,
  };
}

export type DayCalendarColor = 'orange' | 'green' | null;

/**
 * Determina a cor do dia no calendário da manicure:
 * - VERDE: Todos os agendamentos ativos do dia estão com o sinal confirmado.
 * - LARANJA: Se houver PELO MENOS UM sem sinal (pendente) — tem prioridade sobre o verde.
 * - NULL (Sem cor): Dia sem agendamentos ativos ou dia apenas com cancelados.
 */
export function computeDayCalendarColor(bookings: { status: string; sinal_confirmado?: boolean }[]): {
  color: DayCalendarColor;
  totalActive: number;
  totalPending: number;
} {
  const activeBookings = bookings.filter((b) => b.status !== 'cancelado');

  if (activeBookings.length === 0) {
    return { color: null, totalActive: 0, totalPending: 0 };
  }

  const pendingBookings = activeBookings.filter(
    (b) => b.status === 'pendente' || !b.sinal_confirmado
  );

  if (pendingBookings.length > 0) {
    return {
      color: 'orange',
      totalActive: activeBookings.length,
      totalPending: pendingBookings.length,
    };
  }

  return {
    color: 'green',
    totalActive: activeBookings.length,
    totalPending: 0,
  };
}
