import React, { useRef, useState, useEffect } from 'react';
import { PhoneInput } from '../components/PhoneInput';
import { Header } from '../components/Header';
import { CLIENT_DEPOSIT_SEASONAL_MESSAGE, getNowInSaoPaulo, toSaoPauloISO } from '../utils/timezone';
import { calculateDeposit, getDepositPercentageForDate } from '../utils/rules';
import { Clock, CheckCircle2, ChevronRight, AlertCircle, Copy, Check, ArrowLeft } from 'lucide-react';
import type { Manicure } from '../types';

interface Servico {
  id: string;
  nome: string;
  preco: number;
  duracao_minutos: number;
  descricao?: string;
}

interface ClientBookingViewProps {
  onGoToMyBookings: () => void;
  onGoToRules: () => void;
  onBackToHome?: () => void;
  mode: 'client' | 'admin';
  onModeChange: (mode: 'client' | 'admin') => void;
  manicureSlug?: string;
  manicure?: Manicure | null;
}

const SERVICE_DOT_COLORS: Record<string, string> = {
  'Alongamento Molde F1': '#802334',
  'Esmaltação em Gel': '#B85273',
  'Esmaltação em Gel no Pé': '#C29B38',
  'Banho de Gel': '#7E63A8',
  'Manutenção': '#5B7B63',
};

export function ClientBookingView({ onGoToMyBookings, onGoToRules, onBackToHome, mode, onModeChange, manicureSlug = 'natalia', manicure }: ClientBookingViewProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1: Serviço, 2: Data/Hora, 3: Seus Dados, 4: Sucesso Pix
  const [services, setServices] = useState<Servico[]>([]);
  const [selectedService, setSelectedService] = useState<Servico | null>(null);

  const [date, setDate] = useState<string>('');
  const [slots, setSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [observacoes, setObservacoes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [bookingResult, setBookingResult] = useState<{
    id: string;
    codigo: string;
    valorSinal: number;
    sinalPct: number;
    chavePix: string;
    expiresAt: string | null;
    paymentStatus: 'aguardando' | 'confirmado';
  } | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  // Lista de Espera Modal
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [waitlistPeriod, setWaitlistPeriod] = useState<'manha' | 'tarde' | 'qualquer'>('qualquer');
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const datePickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/servicos?manicure=${encodeURIComponent(manicureSlug)}`)
      .then((res) => res.json())
      .then((data) => setServices(data))
      .catch(() => setErrorMsg('Não foi possível carregar o catálogo de serviços.'));

    const now = getNowInSaoPaulo();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    setDate(todayStr);
  }, [manicureSlug]);

  useEffect(() => {
    const expiresAt = bookingResult?.expiresAt;
    if (
      !bookingResult ||
      !expiresAt ||
      bookingResult.sinalPct === 0 ||
      bookingResult.paymentStatus !== 'aguardando'
    ) return;

    let intervalId: ReturnType<typeof setInterval> | undefined;
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((Date.parse(expiresAt) - Date.now()) / 1000));
      setRemainingSeconds(remaining);
      if (remaining > 0) return false;

      if (intervalId) clearInterval(intervalId);
      setBookingResult(null);
      setSelectedSlot('');
      setStep(2);
      setErrorMsg('Sua reserva expirou. O horário foi liberado.');

      if (selectedService && date) {
        setLoadingSlots(true);
        fetch(`/api/disponibilidade?data=${date}&servicoId=${selectedService.id}&manicure=${encodeURIComponent(manicureSlug)}`)
          .then(async (res) => {
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Não foi possível atualizar os horários.');
            setSlots(data.slots || []);
          })
          .catch(() => setErrorMsg('Sua reserva expirou. O horário foi liberado, mas não foi possível atualizar os horários. Tente novamente.'))
          .finally(() => setLoadingSlots(false));
      }
      return true;
    };

    if (updateCountdown()) return;
    intervalId = setInterval(updateCountdown, 1000);
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [bookingResult?.expiresAt, bookingResult?.sinalPct, selectedService?.id, date, manicureSlug]);

  useEffect(() => {
    if (!date || slots.length === 0) return;

    const hidePastSlots = () => {
      const now = Date.now();
      setSlots((currentSlots) => currentSlots.filter(
        (slot) => Date.parse(toSaoPauloISO(date, slot.time)) > now,
      ));
    };

    hidePastSlots();
    const intervalId = setInterval(hidePastSlots, 30_000);
    return () => clearInterval(intervalId);
  }, [date, slots.length]);

  useEffect(() => {
    if (
      !bookingResult ||
      bookingResult.sinalPct === 0 ||
      bookingResult.paymentStatus !== 'aguardando'
    ) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    let stopped = false;
    const pollPaymentStatus = async () => {
      try {
        const res = await fetch(`/api/agendamentos/${bookingResult.id}/estado-pagamento`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome, whatsapp }),
          cache: 'no-store',
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Não foi possível consultar o pagamento.');

        if (data.pagamento_status === 'confirmado' && data.status === 'confirmado') {
          setErrorMsg('');
          setBookingResult((current) => current?.id === bookingResult.id
            ? { ...current, paymentStatus: 'confirmado', expiresAt: null }
            : current);
          return;
        }

        if (data.pagamento_status === 'expirado' || data.status === 'cancelado') {
          const expired = data.pagamento_status === 'expirado';
          const statusMessage = expired
            ? 'Sua reserva expirou. O horário foi liberado.'
            : 'Seu agendamento foi cancelado. O horário foi liberado.';
          setBookingResult(null);
          setSelectedSlot('');
          setStep(2);
          setErrorMsg(statusMessage);
          if (selectedService && date) {
            try {
              const availability = await fetch(
                `/api/disponibilidade?data=${date}&servicoId=${selectedService.id}&manicure=${encodeURIComponent(manicureSlug)}`,
                { cache: 'no-store' },
              );
              const availabilityData = await availability.json();
              if (!availability.ok) throw new Error(availabilityData.error || 'Não foi possível atualizar os horários.');
              setSlots(availabilityData.slots || []);
            } catch {
              setErrorMsg(`${statusMessage} Não foi possível atualizar os horários. Tente novamente.`);
            }
          }
          return;
        }
      } catch {
        setErrorMsg('Não foi possível verificar o pagamento agora. O cronômetro continua ativo.');
      }

      if (!stopped) timeoutId = setTimeout(pollPaymentStatus, 5000);
    };

    timeoutId = setTimeout(pollPaymentStatus, 5000);
    return () => {
      stopped = true;
      clearTimeout(timeoutId);
    };
  }, [bookingResult?.id, bookingResult?.paymentStatus, bookingResult?.sinalPct, nome, whatsapp, selectedService?.id, date, manicureSlug]);

  const handleSelectService = (srv: Servico) => {
    setSelectedService(srv);
    setStep(2);
    loadSlots(srv.id, date);
  };

  const loadSlots = async (servicoId: string, dt: string) => {
    if (!servicoId || !dt) return;
    setLoadingSlots(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/disponibilidade?data=${dt}&servicoId=${servicoId}&manicure=${encodeURIComponent(manicureSlug)}`);
      const data = await res.json();
      if (res.ok) {
        setSlots(data.slots || []);
        setSelectedSlot('');
      } else {
        setErrorMsg(data.error || 'Erro ao carregar horários livres.');
      }
    } catch {
      setErrorMsg('Falha ao conectar com o servidor.');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleDateChange = (newDate: string) => {
    const now = getNowInSaoPaulo();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (newDate < todayStr) {
      setErrorMsg('Não é possível agendar em uma data passada.');
      setDate(todayStr);
      if (selectedService) loadSlots(selectedService.id, todayStr);
      return;
    }
    setDate(newDate);
    if (selectedService) {
      loadSlots(selectedService.id, newDate);
    }
  };

  const formatDateForDisplay = (value: string) => {
    if (!value) return '';
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year.slice(-2)}`;
  };

  const getTodayString = () => {
    const now = getNowInSaoPaulo();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  const openDatePicker = () => {
    const picker = datePickerRef.current;
    if (!picker) return;
    if (typeof picker.showPicker === 'function') {
      picker.showPicker();
    } else {
      picker.click();
    }
  };

  const handleConfirmBooking = async () => {
    if (!isPhoneValid || !nome.trim() || !selectedService || !selectedSlot) {
      setErrorMsg('Preencha seu nome e um WhatsApp celular brasileiro válido.');
      return;
    }

    const startISO = toSaoPauloISO(date, selectedSlot);
    if (new Date(startISO).getTime() <= Date.now()) {
      setErrorMsg('O horário selecionado já passou. Por favor, escolha um horário futuro.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch(`/api/agendamentos?manicure=${encodeURIComponent(manicureSlug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          servicoId: selectedService.id,
          data: date,
          horario: selectedSlot,
          nomeCliente: nome,
          whatsappCliente: whatsapp,
          observacoes,
        }),
      });

      const dataRes = await res.json();
      if (!res.ok) {
        setErrorMsg(dataRes.error || 'Não foi possível agendar o horário.');
        return;
      }

      setBookingResult({
        id: dataRes.agendamento.id,
        codigo: dataRes.codigo,
        valorSinal: dataRes.valorSinal,
        sinalPct: dataRes.sinalPct,
        chavePix: dataRes.chavePix,
        expiresAt: dataRes.expiresAt || null,
        paymentStatus: dataRes.sinalPct === 0 ? 'confirmado' : 'aguardando',
      });
      setRemainingSeconds(dataRes.expiresAt
        ? Math.max(0, Math.ceil((Date.parse(dataRes.expiresAt) - Date.now()) / 1000))
        : 0);
      setStep(4);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao registrar agendamento. Verifique sua conexão.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinWaitlist = async () => {
    if (!isPhoneValid || !nome.trim()) {
      setErrorMsg('Preencha seu nome e um WhatsApp válido para entrar na fila.');
      return;
    }

    try {
      const res = await fetch('/api/lista-espera', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          whatsapp,
          data: date,
          periodo: waitlistPeriod,
        }),
      });

      if (res.ok) {
        setWaitlistSuccess(true);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Erro ao entrar na lista de espera.');
      }
    } catch {
      setErrorMsg('Falha de conexão.');
    }
  };

  const copyPixKey = () => {
    if (!bookingResult) return;
    navigator.clipboard?.writeText(bookingResult.chavePix);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 3000);
  };

  const stepLabels = ['Serviço', 'Data e horário', 'Seus dados'];
  const formatMoney = (value: number) => `R$ ${Number(value).toFixed(2).replace('.', ',')}`;
  const countdownLabel = `${String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:${String(remainingSeconds % 60).padStart(2, '0')}`;
  const sinalPct = getDepositPercentageForDate(date);
  const morningSlots = slots.filter((slot) => Number(slot.time.slice(0, 2)) < 12);
  const afternoonSlots = slots.filter((slot) => Number(slot.time.slice(0, 2)) >= 12);

  return (
    <div className="pb-28 pt-3 px-4 max-w-[430px] mx-auto">
      {/* Header com avatar, link instagram, aviso sazonal e role switcher */}
      <Header mode={mode} onModeChange={onModeChange} manicure={manicure} />

      {step < 4 && (
        <ol aria-label="Etapas do agendamento" className="mb-5 grid grid-cols-3 gap-1">
          {stepLabels.map((label, index) => {
            const itemStep = index + 1;
            const active = step === itemStep;
            const complete = step > itemStep;
            return (
              <li key={label} className={`text-center text-[10px] font-bold ${active || complete ? 'text-[#802334]' : 'text-gray-400'}`}>
                <span className={`mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full border text-[11px] ${
                  active ? 'border-[#802334] bg-[#F7C4D0]' : complete ? 'border-[#802334] bg-[#802334] text-white' : 'border-gray-300'
                }`}>
                  {complete ? '✓' : itemStep}
                </span>
                {label}
              </li>
            );
          })}
        </ol>
      )}

      {errorMsg && (
        <div role="alert" className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle size={17} className="shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* PASSO 1: Catálogo de Serviços (Image 1) */}
      {step === 1 && (
        <section aria-labelledby="servicos-heading" className="space-y-3">
          {onBackToHome && (
            <button
              type="button"
              onClick={onBackToHome}
              className="flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-gray-900"
            >
              <ArrowLeft size={16} /> Voltar ao início
            </button>
          )}
          <h2 id="servicos-heading" className="font-heading font-extrabold text-xl text-[#1a1012] tracking-tight mb-2">
            Escolha seu serviço
          </h2>

          {services.length === 0 && (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-xs font-medium text-gray-600">
              Esta manicure ainda não cadastrou serviços. Volte ao início para escolher outra profissional.
            </div>
          )}

          <div role="note" className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-950 leading-relaxed">
            <strong>Regra de sinal:</strong> {CLIENT_DEPOSIT_SEASONAL_MESSAGE}
          </div>

          <div className="bg-white rounded-2xl border border-pink-200/80 divide-y divide-pink-100 overflow-hidden shadow-2xs">
            {services.map((srv) => {
              const dotColor = SERVICE_DOT_COLORS[srv.nome] || '#802334';
              const precoFormatado = Number(srv.preco).toFixed(2).replace('.', ',');

              return (
                <button
                  key={srv.id}
                  type="button"
                  onClick={() => handleSelectService(srv)}
                  className="w-full text-left p-3.5 hover:bg-pink-50/30 transition-all flex items-center justify-between active:scale-[0.99]"
                >
                  <div className="flex items-start gap-3 pr-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 mt-1"
                      style={{ backgroundColor: dotColor }}
                    />
                    <div>
                      <h3 className="font-heading font-extrabold text-base text-[#1a1012]">{srv.nome}</h3>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">
                        {sinalPct === 0
                          ? `${srv.duracao_minutos} min • em novembro, você não paga sinal`
                          : `${srv.duracao_minutos} min • você paga sinal de ${sinalPct}%: ${formatMoney(calculateDeposit(srv.preco, sinalPct))}`}
                      </p>
                      {srv.descricao && <p className="mt-1 text-[11px] text-gray-500">{srv.descricao}</p>}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-heading font-extrabold text-lg text-[#802334]">
                      R$ {precoFormatado}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* PASSO 2: Data e Horário em Tempo Real */}
      {step === 2 && selectedService && (
        <section aria-labelledby="horario-heading" className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-pink-200">
            <div>
              <span className="text-[11px] text-gray-500 uppercase font-bold tracking-wider">Serviço selecionado</span>
              <p className="font-heading font-bold text-base text-gray-900">{selectedService.nome} (R$ {Number(selectedService.preco).toFixed(2).replace('.', ',')})</p>
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-xs font-bold text-[#802334] underline py-1"
            >
              Trocar
            </button>
          </div>

          <div>
            <label htmlFor="data-agendamento" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Escolha a data:
            </label>
            <div>
              <button
                type="button"
                onClick={openDatePicker}
                className="w-full h-12 px-3.5 text-left rounded-2xl border border-pink-200 bg-white text-base font-semibold text-gray-900 outline-none focus:border-[#802334] focus:ring-2 focus:ring-[#F7C4D0]/50"
                aria-label="Abrir seletor de data"
              >
                {formatDateForDisplay(date)}
              </button>
              <input
                id="data-agendamento"
                type="date"
                ref={datePickerRef}
                value={date}
                min={getTodayString()}
                onChange={(e) => handleDateChange(e.target.value)}
                aria-label="Selecionar data do agendamento"
                className="sr-only"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Horários Livres ({selectedService.duracao_minutos} min + 10 min buffer):
            </label>

            {loadingSlots ? (
              <div className="p-8 text-center text-xs text-gray-500 font-medium">
                Calculando disponibilidade em tempo real...
              </div>
            ) : slots.length === 0 ? (
              <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-300 text-center space-y-2.5">
                <p className="text-xs text-gray-700 font-semibold">Nenhum horário livre nesta data.</p>
                <p className="text-[11px] text-gray-500">
                  Pode estar esgotado, ser domingo ou bloqueio da manicure.
                </p>
                <button
                  type="button"
                  onClick={() => setShowWaitlist(true)}
                  className="px-4 py-2.5 bg-[#F7C4D0] text-gray-900 font-bold text-xs rounded-2xl shadow-xs active:bg-[#f3b0c0]"
                >
                  Entrar na Lista de Espera deste dia
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  ['Manhã', morningSlots],
                  ['Tarde', afternoonSlots],
                ].map(([period, periodSlots]) => {
                  const availableSlots = periodSlots as { time: string; available: boolean }[];
                  if (!availableSlots.length) return null;
                  return (
                    <div key={period as string}>
                      <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wider text-gray-500">{period as string}</p>
                      <div className="grid grid-cols-3 gap-2">
                        {availableSlots.map((s) => (
                  <button
                    key={s.time}
                    type="button"
                    onClick={() => setSelectedSlot(s.time)}
                    className={`h-12 rounded-2xl text-sm font-bold border transition-all ${
                      selectedSlot === s.time
                        ? 'bg-[#F7C4D0] border-[#802334] text-gray-900 ring-2 ring-[#802334]/30 shadow-xs'
                        : 'bg-white border-pink-200 text-gray-700 hover:border-pink-300 active:scale-[0.98]'
                    }`}
                  >
                    {s.time}
                  </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-2.5 pt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 h-12 rounded-2xl border border-gray-200 font-bold text-gray-700 text-xs active:bg-gray-100"
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={!selectedSlot}
              onClick={() => setStep(3)}
              className="flex-1 h-12 rounded-2xl bg-[#F7C4D0] text-gray-900 font-extrabold text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f3b0c0] shadow-xs"
            >
              Continuar
            </button>
          </div>
        </section>
      )}

      {/* PASSO 3: Seus dados (Image 3) */}
      {step === 3 && selectedService && (
        <section aria-labelledby="confirm-heading" className="space-y-4">
          <h2 id="confirm-heading" className="font-heading font-extrabold text-xl text-[#1a1012] tracking-tight">
            Seus dados
          </h2>

          <div className="rounded-2xl border border-pink-200 bg-pink-50/50 p-3 text-xs">
            <p className="mb-2 font-extrabold text-gray-900">Resumo do agendamento</p>
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-gray-700">
              <span>Manicure</span><strong>{manicure?.name || 'Manicure'}</strong>
              <span>Serviço</span><strong>{selectedService.nome}</strong>
              <span>Data e horário</span><strong>{formatDateForDisplay(date)} às {selectedSlot}</strong>
              <span>Total / sinal</span>
              <strong>
                {formatMoney(selectedService.preco)} / {sinalPct === 0
                  ? 'não há sinal em novembro'
                  : formatMoney(calculateDeposit(selectedService.preco, sinalPct))}
              </strong>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label htmlFor="cliente-nome" className="block text-xs font-semibold text-[#802334] mb-1">
                Seu nome *
              </label>
              <input
                id="cliente-nome"
                type="text"
                placeholder="Ex.: Maria Silva"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full h-12 px-3.5 rounded-2xl border border-pink-200 bg-white text-base font-medium outline-none focus:border-[#802334] focus:ring-2 focus:ring-[#F7C4D0]/50"
              />
            </div>

            <PhoneInput
              id="cliente-zap"
              label="WhatsApp / telefone"
              value={whatsapp}
              onChange={(formatted, valid) => {
                setWhatsapp(formatted);
                setIsPhoneValid(valid);
              }}
            />

            <div>
              <label htmlFor="cliente-obs" className="block text-xs font-semibold text-[#802334] mb-1">
                Observações (opcional)
              </label>
              <textarea
                id="cliente-obs"
                rows={3}
                placeholder="Cor que você quer, referência, alergia..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="w-full p-3 rounded-2xl border border-pink-200 bg-white text-xs font-medium outline-none focus:border-[#802334] focus:ring-2 focus:ring-[#F7C4D0]/50"
              />
            </div>
          </div>

          {/* Yellow Seasonal Banner Inside Form */}
          <div className="bg-[#FFFDE7] border border-[#FACC15] rounded-2xl p-3.5 text-xs text-gray-800 leading-relaxed shadow-2xs">
            <span className="font-extrabold text-gray-900">Atenção — regra de sinal:</span>{' '}
            {CLIENT_DEPOSIT_SEASONAL_MESSAGE}
          </div>

          <p className="text-[11px] text-gray-500 font-medium text-center leading-normal">
            Ao confirmar, o app confere de novo se o horário continua livre. Veja as regras completas na tela de confirmação do agendamento.
          </p>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 h-12 rounded-2xl border border-gray-200 font-bold text-gray-700 text-xs active:bg-gray-100"
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={!isPhoneValid || nome.trim().length < 3 || isSubmitting}
              onClick={handleConfirmBooking}
              className="flex-1 h-12 rounded-2xl bg-[#F7C4D0] text-gray-900 font-extrabold text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f3b0c0] shadow-xs"
            >
              {isSubmitting ? 'Verificando vaga...' : 'Avançar para Pagamento'}
            </button>
          </div>
        </section>
      )}

      {/* PASSO 4: Tela de Confirmação com Código NM-#### e Pix em Destaque */}
      {step === 4 && bookingResult && (
        <section aria-labelledby="sucesso-heading" className="text-center space-y-4 pt-2 animate-fadeIn">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-xs ${
            bookingResult.paymentStatus === 'confirmado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
          }`}>
            {bookingResult.paymentStatus === 'confirmado' ? <CheckCircle2 size={36} /> : <Clock size={36} />}
          </div>

          <h2 id="sucesso-heading" className="font-heading font-extrabold text-2xl text-gray-900 tracking-tight">
            {bookingResult.paymentStatus === 'confirmado' ? 'Agendamento Confirmado!' : 'Reserva aguardando pagamento'}
          </h2>

          <div className="inline-block bg-gray-100 border border-gray-200 px-4 py-1.5 rounded-full font-heading font-extrabold text-lg text-gray-900 tracking-wide">
            {bookingResult.codigo}
          </div>

          {bookingResult.paymentStatus === 'confirmado' ? (
            <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-3xl text-left space-y-2">
              <span className="text-[11px] font-extrabold text-emerald-900 uppercase tracking-wider block">
                {bookingResult.sinalPct === 0 ? 'Nenhum sinal antecipado necessário' : 'Pagamento identificado'}
              </span>
              <p className="text-sm font-semibold text-gray-900 leading-relaxed">
                Seu horário está confirmado.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-3xl text-left space-y-3 shadow-sm">
              <span className="text-[11px] font-extrabold text-amber-900 uppercase tracking-wider block">
                Reserva temporária — sinal de {bookingResult.sinalPct}%
              </span>

              {bookingResult.expiresAt && (
                <p role="timer" aria-live="off" className="rounded-xl bg-white/80 p-3 text-center text-sm font-bold text-amber-950">
                  Pague em até 20 minutos: <span className="font-mono text-lg">{countdownLabel}</span>
                </p>
              )}

              <p className="text-sm font-semibold text-gray-900 leading-relaxed">
                Para garantir o horário, o pagamento antecipado é de {bookingResult.sinalPct}%: <strong className="font-heading font-extrabold text-base text-gray-900">{formatMoney(bookingResult.valorSinal)}</strong> — Enviar o pix para a chave: <span className="font-heading font-bold text-[#802334] select-all bg-amber-100/90 px-1.5 py-0.5 rounded-md border border-amber-200">{bookingResult.chavePix}</span>
              </p>

              <button
                type="button"
                onClick={copyPixKey}
                className="w-full h-11 bg-white border border-amber-300 hover:bg-amber-100/40 rounded-xl font-bold text-xs text-amber-950 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
              >
                {copiedPix ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                {copiedPix ? 'Chave Pix copiada!' : 'Copiar Chave Pix'}
              </button>

              <p className="text-[11px] text-gray-600 leading-normal">
                Envie o comprovante para o WhatsApp da manicure. A reserva será cancelada e o horário liberado se o pagamento não for identificado em 20 minutos.
              </p>
            </div>
          )}

          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={onGoToRules}
              className="w-full h-11 bg-[#F7C4D0] text-gray-900 font-bold text-xs rounded-2xl"
            >
              Ver Regras de Atendimento
            </button>
            <button
              type="button"
              onClick={onGoToMyBookings}
              className="w-full h-12 bg-gray-900 text-white font-bold text-xs rounded-2xl shadow-xs active:bg-black"
            >
              Acompanhar em Meus Horários
            </button>
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setSelectedService(null);
                setSelectedSlot('');
                setBookingResult(null);
              }}
              className="w-full h-11 border border-gray-200 text-gray-700 font-bold text-xs rounded-2xl"
            >
              Fazer Outro Agendamento
            </button>
          </div>
        </section>
      )}

      {/* Modal Lista de Espera */}
      {showWaitlist && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
            <h3 className="font-heading font-bold text-lg text-gray-900">
              Lista de Espera ({date.split('-').reverse().join('/')})
            </h3>

            {waitlistSuccess ? (
              <div className="text-center py-4 space-y-3">
                <CheckCircle2 size={36} className="text-emerald-600 mx-auto" />
                <p className="text-xs font-semibold text-gray-800 leading-relaxed">
                  Você está na fila de espera! Caso ocorra algum cancelamento ou desistência para este dia, avisaremos você no WhatsApp.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowWaitlist(false);
                    setWaitlistSuccess(false);
                  }}
                  className="w-full h-11 bg-gray-900 text-white font-bold rounded-2xl text-xs"
                >
                  Concluir
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-600 font-medium">
                  Deixe seu contato para ser notificada caso alguém cancele este dia:
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Seu Nome</label>
                    <input
                      type="text"
                      placeholder="Nome completo"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-[#802334]"
                    />
                  </div>

                  <PhoneInput
                    value={whatsapp}
                    onChange={(formatted, valid) => {
                      setWhatsapp(formatted);
                      setIsPhoneValid(valid);
                    }}
                  />

                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1 uppercase">Período de preferência:</label>
                    <select
                      value={waitlistPeriod}
                      onChange={(e: any) => setWaitlistPeriod(e.target.value)}
                      className="w-full h-11 px-3 border border-gray-200 rounded-xl text-xs font-semibold bg-white"
                    >
                      <option value="qualquer">Qualquer horário</option>
                      <option value="manha">Manhã</option>
                      <option value="tarde">Tarde</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowWaitlist(false)}
                    className="flex-1 h-11 border border-gray-200 rounded-2xl text-xs font-bold text-gray-600"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    disabled={!isPhoneValid || nome.trim().length < 3}
                    onClick={handleJoinWaitlist}
                    className="flex-1 h-11 bg-[#F7C4D0] text-gray-900 rounded-2xl text-xs font-extrabold disabled:opacity-40"
                  >
                    Entrar na Fila
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
