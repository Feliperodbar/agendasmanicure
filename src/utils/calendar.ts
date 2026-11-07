import { getNowInSaoPaulo } from './timezone';

export function todayInSaoPaulo(): string {
  const now = getNowInSaoPaulo();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function monthDates(month: string): string[] {
  const [year, monthNumber] = month.split('-').map(Number);
  const days = new Date(year, monthNumber, 0).getDate();
  return Array.from({ length: days }, (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`);
}

export function shiftMonth(month: string, offset: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(year, monthNumber - 1 + offset, 1, 12);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
