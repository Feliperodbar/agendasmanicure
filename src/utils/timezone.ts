export const TIMEZONE = 'America/Sao_Paulo';

/**
 * Retorna a data/hora atual no fuso America/Sao_Paulo
 */
export function getNowInSaoPaulo(): Date {
  const now = new Date();
  const spString = now.toLocaleString('en-US', { timeZone: TIMEZONE });
  return new Date(spString);
}

/**
 * Formata data e hora no padrão brasileiro e no fuso America/Sao_Paulo
 */
export function formatInSaoPaulo(date: Date | string, options: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', { ...options, timeZone: TIMEZONE }).format(d);
}

/**
 * Converte data (YYYY-MM-DD) e hora (HH:mm) para string ISO no fuso America/Sao_Paulo (UTC-3)
 */
export function toSaoPauloISO(dateStr: string, timeStr: string): string {
  return `${dateStr}T${timeStr}:00.000-03:00`;
}

/**
 * Regra do aviso sazonal:
 * Ativo nos meses de Novembro (mês 10, index 0) e Dezembro (mês 11, index 0)
 */
export function isSeasonalPeriod(referenceDate?: Date): boolean {
  const date = referenceDate || getNowInSaoPaulo();
  const month = date.getMonth(); // 10 = Nov, 11 = Dez
  return month === 10 || month === 11;
}

export const SEASONAL_WARNING_MESSAGE =
  'Em dezembro será cobrado um sinal de 50% dos serviços agendados para confirmação do agendamento, falta ou desistência com menos de 24hrs não haverá estorno do sinal!';

export const CLIENT_DEPOSIT_SEASONAL_MESSAGE =
  'Em dezembro será cobrado um sinal de 50% dos serviços agendados para confirmação do agendamento, falta ou desistência com menos de 24hrs não haverá estorno do sinal!';
