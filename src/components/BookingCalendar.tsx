import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { fetchAvailableDays } from '../utils/availability';
import { monthDates, shiftMonth, todayInSaoPaulo } from '../utils/calendar';

interface BookingCalendarProps {
  date: string;
  serviceId: string;
  manicureSlug: string;
  onSelect: (date: string) => void;
  onClose: () => void;
}

type DayStatus = 'available' | 'unavailable' | 'error';
const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function BookingCalendar({ date, serviceId, manicureSlug, onSelect, onClose }: BookingCalendarProps) {
  const [month, setMonth] = useState(() => (date || todayInSaoPaulo()).slice(0, 7));
  const [statuses, setStatuses] = useState<Record<string, DayStatus>>({});
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const today = todayInSaoPaulo();
  const dates = monthDates(month);
  const [year, monthNumber] = month.split('-').map(Number);
  const monthDate = new Date(year, monthNumber - 1, 1, 12);
  const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(monthDate);

  useEffect(() => {
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const controller = new AbortController();
    const pending = monthDates(month).filter((day) => day >= todayInSaoPaulo());
    setStatuses({});
    setLoading(true);

    const loadMonth = async () => {
      try {
        const days = await fetchAvailableDays(month, serviceId, manicureSlug, controller.signal);
        if (!controller.signal.aborted) {
          setStatuses(Object.fromEntries(days.map(({ date: day, available }) => [
            day,
            available ? 'available' : 'unavailable',
          ])));
        }
      } catch {
        if (!controller.signal.aborted) {
          setStatuses(Object.fromEntries(pending.map((day) => [day, 'error'])));
        }
      }
      if (!controller.signal.aborted) setLoading(false);
    };
    void loadMonth();
    return () => controller.abort();
  }, [month, serviceId, manicureSlug, retry]);

  const hasErrors = Object.values(statuses).includes('error');

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="calendar-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 id="calendar-title" className="font-heading text-lg font-bold text-gray-900">Escolha a data</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Fechar calendário" className="flex h-12 w-12 items-center justify-center rounded-xl text-gray-700">
            <X size={20} />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setMonth(shiftMonth(month, -1))} disabled={month <= today.slice(0, 7)} aria-label="Mês anterior" className="flex h-12 w-12 items-center justify-center rounded-xl text-[#802334] disabled:opacity-30">
            <ChevronLeft size={22} />
          </button>
          <p aria-live="polite" className="font-heading font-bold capitalize text-gray-900">{monthName}</p>
          <button type="button" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Próximo mês" className="flex h-12 w-12 items-center justify-center rounded-xl text-[#802334]">
            <ChevronRight size={22} />
          </button>
        </div>
        <div className="grid grid-cols-7 text-center text-xs font-bold text-gray-500">
          {weekdays.map((day) => <span key={day} className="py-2">{day}</span>)}
          {Array.from({ length: monthDate.getDay() }, (_, index) => <span key={`empty-${index}`} />)}
          {dates.map((day) => {
            const available = day >= today && statuses[day] === 'available';
            return (
              <button
                key={day}
                type="button"
                disabled={!available}
                aria-label={`${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(0, 4)}${statuses[day] === 'error' ? ' - erro ao carregar' : ''}`}
                aria-pressed={day === date}
                onClick={() => onSelect(day)}
                className={`min-h-12 rounded-xl text-sm font-bold disabled:text-gray-300 ${day === date && available ? 'bg-[#802334] text-white' : 'text-gray-900 enabled:hover:bg-pink-100'}`}
              >
                {Number(day.slice(8, 10))}
              </button>
            );
          })}
        </div>
        {loading && <p role="status" className="mt-3 text-center text-xs text-gray-600">Consultando dias disponíveis...</p>}
        {hasErrors && (
          <div role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-center text-xs font-semibold text-red-800">
            Não foi possível consultar todos os dias. Os dias com erro permanecem indisponíveis.
            <button type="button" onClick={() => setRetry((value) => value + 1)} className="mt-2 block min-h-12 w-full rounded-xl border border-red-300 bg-white font-bold">
              Tentar novamente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
