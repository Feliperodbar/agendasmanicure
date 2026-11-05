import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PhoneInput } from '../components/PhoneInput';
import { formatInSaoPaulo } from '../utils/timezone';
import { getDepositPercentageForDate } from '../utils/rules';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  Plus,
  Trash2,
  Calendar,
  Clock,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface DayStatus {
  color: 'green' | 'orange' | null;
  total: number;
  pendentes: number;
}

interface AdminAgendaViewProps {
  mode: 'client' | 'admin';
  onModeChange: (mode: 'client' | 'admin') => void;
  onLogout: () => void;
}

export function AdminAgendaView({ mode, onModeChange, onLogout }: AdminAgendaViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());
  const [monthStatus, setMonthStatus] = useState<Record<number, DayStatus>>({});

  const [dayBookings, setDayBookings] = useState<any[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const [loadingDay, setLoadingDay] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modais internos
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [rescheduleItem, setRescheduleItem] = useState<any | null>(null);
  const [newRescheduleDate, setNewRescheduleDate] = useState('');
  const [newRescheduleTime, setNewRescheduleTime] = useState('');

  // Agendamento Manual
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualNome, setManualNome] = useState('');
  const [manualZap, setManualZap] = useState('');
  const [manualZapValid, setManualZapValid] = useState(false);
  const [manualServicoId, setManualServicoId] = useState('');
  const [manualHorario, setManualHorario] = useState('09:00');
  const [manualStatus, setManualStatus] = useState<'confirmado' | 'pendente'>('confirmado');
  const [services, setServices] = useState<any[]>([]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const manualDate = `${year}-${String(month).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
  const manualDepositPercentage = getDepositPercentageForDate(manualDate);

  const handleAdminResponse = (res: Response): boolean => {
    if (res.status === 401) {
      onLogout();
      return false;
    }
    return true;
  };

  useEffect(() => {
    fetch('/api/servicos')
      .then((r) => r.json())
      .then((d) => {
        setServices(d);
        if (d.length > 0) setManualServicoId(d[0].id);
      });
  }, []);

  useEffect(() => {
    loadMonth();
  }, [currentDate]);

  useEffect(() => {
    loadDayBookings();
  }, [selectedDay, currentDate]);

  const loadMonth = async () => {
    try {
      const res = await fetch(`/api/admin/mes-status?ano=${year}&mes=${month}`, {
        credentials: 'include',
      });
      if (!handleAdminResponse(res)) return;
      const data = await res.json();
      if (res.ok) {
        setMonthStatus(data.dayStatus || {});
      }
    } catch {
      //
    }
  };

  const loadDayBookings = async () => {
    setLoadingDay(true);
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    try {
      const res = await fetch(`/api/admin/dia-agendamentos?data=${dateStr}`, {
        credentials: 'include',
      });
      if (!handleAdminResponse(res)) return;
      const data = await res.json();
      if (res.ok) {
        setDayBookings(data.agendamentos || []);
      }
    } catch {
      setFeedbackMsg({ text: 'Erro ao carregar agendamentos do dia.', type: 'error' });
    } finally {
      setLoadingDay(false);
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
    setSelectedDay(1);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
    setSelectedDay(1);
  };

  const handleUpdateStatus = async (id: string, status: string, sinal_confirmado?: boolean) => {
    try {
      const res = await fetch(`/api/admin/agendamentos/${id}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, sinal_confirmado }),
      });
      if (!handleAdminResponse(res)) return;
      if (res.ok) {
        setFeedbackMsg({ text: 'Status atualizado com sucesso!', type: 'success' });
        loadMonth();
        loadDayBookings();
      } else {
        setFeedbackMsg({ text: 'Erro ao alterar status.', type: 'error' });
      }
    } catch {
      setFeedbackMsg({ text: 'Erro de conexão.', type: 'error' });
    }
  };

  const handleDeleteBooking = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/admin/agendamentos/${deleteId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!handleAdminResponse(res)) return;
      if (res.ok) {
        setFeedbackMsg({ text: 'Agendamento excluído do banco.', type: 'success' });
        loadMonth();
        loadDayBookings();
      } else {
        setFeedbackMsg({ text: 'Erro ao excluir agendamento.', type: 'error' });
      }
    } catch {
      setFeedbackMsg({ text: 'Erro ao excluir.', type: 'error' });
    } finally {
      setDeleteId(null);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleItem || !newRescheduleDate || !newRescheduleTime) return;
    try {
      const res = await fetch(`/api/admin/agendamentos/${rescheduleItem.id}/remarcar`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          novaData: newRescheduleDate,
          novoHorario: newRescheduleTime,
        }),
      });
      if (!handleAdminResponse(res)) return;
      if (res.ok) {
        setFeedbackMsg({ text: `Remarcado para ${newRescheduleDate} às ${newRescheduleTime}.`, type: 'success' });
        loadMonth();
        loadDayBookings();
      } else {
        setFeedbackMsg({ text: 'Erro ao remarcar horário.', type: 'error' });
      }
    } catch {
      setFeedbackMsg({ text: 'Falha de rede ao remarcar.', type: 'error' });
    } finally {
      setRescheduleItem(null);
    }
  };

  const handleManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualZapValid || !manualNome.trim()) {
      setFeedbackMsg({ text: 'Preencha o nome e um celular válido.', type: 'error' });
      return;
    }

    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    try {
      const res = await fetch('/api/admin/agendamentos/manual', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          servicoId: manualServicoId,
          data: dateStr,
          horario: manualHorario,
          nomeCliente: manualNome,
          whatsappCliente: manualZap,
          status: manualStatus,
        }),
      });

      if (res.ok) {
        setFeedbackMsg({ text: 'Agendamento manual registrado!', type: 'success' });
        setShowManualModal(false);
        setManualNome('');
        setManualZap('');
        loadMonth();
        loadDayBookings();
      } else {
        const d = await res.json();
        setFeedbackMsg({ text: d.error || 'Erro ao criar agendamento.', type: 'error' });
      }
    } catch {
      setFeedbackMsg({ text: 'Erro de conexão.', type: 'error' });
    }
  };

  // Cálculos para o Card Resumo (Image 6):
  // 1. NO DIA (total de ativos do dia selecionado)
  // 2. PENDENTES (total de sem sinal do dia)
  // 3. NO DIA* (soma de confirmados + concluídos do dia selecionado)
  const activeDayBookings = dayBookings.filter((b) => b.status !== 'cancelado');
  const countNoDia = activeDayBookings.length;
  const countPendentes = activeDayBookings.filter((b) =>
    Number(b.valor_sinal) > 0 && (b.status === 'pendente' || !b.sinal_confirmado)
  ).length;
  const sumRevenueNoDia = activeDayBookings
    .filter((b) => b.status === 'confirmado' || b.status === 'concluido')
    .reduce((acc, b) => acc + Number(b.preco_snapshot || 0), 0);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayWeekday = new Date(year, month - 1, 1).getDay(); // 0 = Domingo
  const monthTitle = formatInSaoPaulo(currentDate, { month: 'long', year: 'numeric' });

  const nowSP = new Date();
  const isCurrentMonth = nowSP.getFullYear() === year && nowSP.getMonth() + 1 === month;
  const todayDay = nowSP.getDate();

  // Título do Dia Selecionado em Formato pt-BR (ex: "Qua, 4 de nov")
  const selectedDateObj = new Date(year, month - 1, selectedDay, 12, 0, 0);
  const dayOfWeekFormatted = formatInSaoPaulo(selectedDateObj, { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div className="pb-28 pt-3 px-4 max-w-[430px] mx-auto space-y-4">
      {/* Header com avatar, instagram, aviso sazonal e role switcher */}
      <Header mode={mode} onModeChange={onModeChange} />

      {/* Sub-bar: Área da manicure — conectada neste aparelho | [Sair] */}
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>Área da manicure — conectada neste aparelho</span>
        <button
          type="button"
          onClick={onLogout}
          className="rounded-full border border-gray-300 px-3.5 py-1 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 active:scale-95 transition-all shadow-2xs"
        >
          Sair
        </button>
      </div>

      {feedbackMsg && (
        <div
          role="status"
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2 shadow-2xs ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : 'bg-red-50 border border-red-200 text-red-900'
          }`}
        >
          <span>{feedbackMsg.text}</span>
          <button type="button" onClick={() => setFeedbackMsg(null)} className="opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Counter Summary Cards (Image 6) */}
      <div className="bg-white rounded-2xl border border-pink-200/80 p-3 shadow-2xs">
        <div className="grid grid-cols-3 divide-x divide-gray-200 text-center">
          {/* NO DIA */}
          <div className="px-2">
            <span className="font-heading font-extrabold text-2xl text-gray-900 block leading-tight">
              {countNoDia}
            </span>
            <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider block mt-1">
              NO DIA
            </span>
          </div>

          {/* PENDENTES */}
          <div className="px-2">
            <span className="font-heading font-extrabold text-2xl text-[#D97706] block leading-tight">
              {countPendentes}
            </span>
            <span className="text-[10px] font-extrabold text-[#D97706] uppercase tracking-wider block mt-1">
              PENDENTES
            </span>
          </div>

          {/* NO DIA* */}
          <div className="px-2">
            <span className="font-heading font-extrabold text-2xl text-[#047857] block leading-tight">
              R$ {sumRevenueNoDia.toFixed(2).replace('.', ',')}
            </span>
            <span className="text-[10px] font-extrabold text-[#047857] uppercase tracking-wider block mt-1">
              NO DIA*
            </span>
          </div>
        </div>

        <p className="text-[10px] text-gray-400 font-medium text-center mt-2.5 pt-2 border-t border-gray-100">
          * Soma de confirmados + concluídos do dia selecionado.
        </p>
      </div>

      {/* CALENDÁRIO MENSAL COMPLETO (Image 6 & 7) */}
      <section aria-label="Calendário Mensal" className="bg-white p-4 rounded-3xl border border-pink-200/80 shadow-2xs space-y-3">
        {/* Navegação Mês e Ano */}
        <div className="flex items-center justify-between pb-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            aria-label="Mês anterior"
            className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="font-heading font-extrabold text-base text-gray-900 capitalize tracking-wide">
            {monthTitle}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="Próximo mês"
            className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Cabeçalho dos Dias da Semana */}
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-extrabold text-gray-500 uppercase">
          <span>DOM</span>
          <span>SEG</span>
          <span>TER</span>
          <span>QUA</span>
          <span>QUI</span>
          <span>SEX</span>
          <span>SÁB</span>
        </div>

        {/* Grade dos Dias */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayWeekday }).map((_, i) => (
            <div key={`empty-${i}`} className="h-11" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const status = monthStatus[dayNum];
            const isSelected = selectedDay === dayNum;
            const isToday = isCurrentMonth && todayDay === dayNum;

            // CORES ESTRITAS:
            // Verde: todos com sinal ok
            // Laranja: pelo menos um sem sinal de 50%
            let colorClasses = 'bg-white text-gray-800 border-gray-200 hover:bg-pink-50/40';
            if (status?.color === 'orange') {
              colorClasses = 'bg-[#F97316] text-white border-[#F97316] font-extrabold shadow-2xs';
            } else if (status?.color === 'green') {
              colorClasses = 'bg-[#00B87C] text-white border-[#00B87C] font-extrabold shadow-2xs';
            }

            return (
              <button
                key={dayNum}
                type="button"
                onClick={() => setSelectedDay(dayNum)}
                aria-label={`Dia ${dayNum} de ${monthTitle}`}
                className={`h-11 rounded-2xl flex flex-col items-center justify-center text-xs border transition-all relative overflow-hidden ${colorClasses} ${
                  isSelected ? 'ring-2 ring-black font-extrabold scale-105 z-10' : ''
                }`}
              >
                <span className="leading-tight">{dayNum}</span>
                {status && status.total > 0 && (
                  <span className="text-[8px] font-bold leading-none mt-0.5 opacity-90">
                    {status.total} {status.pendentes > 0 ? `(${status.pendentes}!)` : 'agend.'}
                  </span>
                )}
                {isToday && (
                  <svg className="absolute top-0 right-0 w-4 h-4 pointer-events-none" viewBox="0 0 10 10" aria-label="Hoje">
                    <polygon points="0,0 10,0 10,10" fill={status?.color ? '#FFFFFF' : '#802334'} />
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {/* Legenda Estrita */}
        <div className="space-y-1.5 pt-2.5 border-t border-pink-100 text-[11px] font-medium text-gray-600">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-md bg-[#00B87C] inline-block" />
            <span><strong className="font-bold text-gray-900">Verde</strong> = agendamentos sem pendências</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-md bg-[#F97316] inline-block" />
            <span><strong className="font-bold text-gray-900">Laranja</strong> = agendamento aguardando sinal</span>
          </div>
        </div>
      </section>

      {/* Date Picker Input & Agendar Manualmente Button (Image 7) */}
      <div className="space-y-2.5">
        <input
          type="date"
          lang="pt-BR"
          value={`${year}-${String(month).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`}
          onChange={(e) => {
            if (e.target.value) {
              const parts = e.target.value.split('-').map(Number);
              setCurrentDate(new Date(parts[0], parts[1] - 1, parts[2]));
              setSelectedDay(parts[2]);
            }
          }}
          className="w-full h-12 px-3.5 rounded-2xl border border-pink-200 bg-white text-base font-semibold text-gray-900 outline-none focus:border-[#802334]"
        />

        <button
          type="button"
          onClick={() => setShowManualModal(true)}
          className="w-full h-12 rounded-2xl bg-white border border-gray-200 font-bold text-xs text-gray-800 hover:bg-gray-50 active:scale-[0.99] transition-all shadow-2xs flex items-center justify-center gap-1.5"
        >
          <span>+ Agendar manualmente (pedido por fora do app)</span>
        </button>
      </div>

      {/* LISTA DE AGENDAMENTOS DO DIA SELECIONADO (Image 7) */}
      <section aria-label="Atendimentos do Dia" className="space-y-3">
        <h2 className="font-heading font-extrabold text-lg text-[#1a1012] capitalize">
          {dayOfWeekFormatted}
        </h2>

        {loadingDay ? (
          <div className="p-8 text-center text-xs text-gray-400 font-medium bg-white rounded-3xl border border-pink-100">
            Carregando atendimentos...
          </div>
        ) : activeDayBookings.length === 0 ? (
          <div className="p-6 text-center text-xs font-semibold text-gray-600 bg-white rounded-2xl border border-dashed border-pink-200">
            Nenhum agendamento neste dia. Dia livre ✨
          </div>
        ) : (
          <div className="space-y-2.5">
            {activeDayBookings.map((b) => {
              const hasDeposit = Number(b.valor_sinal) > 0;
              const isPendente = hasDeposit && (b.status === 'pendente' || !b.sinal_confirmado);

              return (
                <div key={b.id} className="p-4 bg-white rounded-3xl border border-pink-200/80 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-heading font-extrabold text-xs text-[#802334] tracking-wider">{b.codigo}</span>

                    <div className="flex items-center gap-1.5">
                      {isPendente && (
                        <span className="bg-amber-100 text-amber-950 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-amber-300 shadow-2xs">
                          Sem sinal
                        </span>
                      )}

                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                          b.status === 'confirmado'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : b.status === 'concluido'
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {b.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-heading font-bold text-base text-gray-900">{b.cliente_nome}</h3>
                    <p className="text-xs text-gray-600 font-medium">
                      {b.servico_nome} · R$ {Number(b.preco_snapshot).toFixed(0)} ({b.duracao_snapshot} min)
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-700 mt-1 font-semibold">
                      <span>
                        ⏰ {formatInSaoPaulo(b.data_hora_inicio, { hour: '2-digit', minute: '2-digit' })} às {formatInSaoPaulo(b.data_hora_fim, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span>·</span>
                      <span>WhatsApp: {b.cliente_whatsapp}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {hasDeposit
                        ? `Sinal antecipado: R$ ${Number(b.valor_sinal).toFixed(2).replace('.', ',')}`
                        : 'Sinal não exigido'}
                    </span>
                    <span className="font-semibold text-gray-700">
                      {hasDeposit
                        ? b.sinal_confirmado ? '✓ Sinal Identificado' : 'Aguardando Pix'
                        : 'Dispensado em novembro'}
                    </span>
                  </div>

                  {/* AÇÕES POR AGENDAMENTO */}
                  <div className="pt-2 border-t border-gray-100 flex flex-wrap gap-1.5">
                    {isPendente && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(b.id, 'confirmado', true)}
                        className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1 shadow-2xs"
                      >
                        <CheckCircle2 size={13} /> Confirmar Sinal
                      </button>
                    )}

                    {b.status === 'confirmado' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(b.id, 'concluido')}
                        className="h-8 px-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold"
                      >
                        Concluir
                      </button>
                    )}

                    {b.status !== 'concluido' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(b.id, 'falta')}
                          className="h-8 px-2.5 bg-purple-50 text-purple-900 border border-purple-200 rounded-xl text-xs font-bold"
                        >
                          Falta
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setRescheduleItem(b);
                            setNewRescheduleDate(b.data_hora_inicio.split('T')[0]);
                            setNewRescheduleTime(formatInSaoPaulo(b.data_hora_inicio, { hour: '2-digit', minute: '2-digit' }));
                          }}
                          className="h-8 px-2.5 bg-blue-50 text-blue-900 border border-blue-200 rounded-xl text-xs font-bold"
                        >
                          Remarcar
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(b.id, 'cancelado')}
                          className="h-8 px-2.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-bold"
                        >
                          Cancelar
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => setDeleteId(b.id)}
                      className="h-8 px-2 bg-gray-100 hover:text-red-700 rounded-xl text-xs font-bold text-gray-500 ml-auto"
                      title="Excluir Agendamento"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Modal Interno de Exclusão de Agendamento */}
      <ConfirmDialog
        isOpen={!!deleteId}
        title="Excluir agendamento?"
        message="Tem certeza que deseja apagar permanentemente este agendamento do banco de dados?"
        confirmLabel="Sim, Excluir"
        cancelLabel="Cancelar"
        isDestructive={true}
        onConfirm={handleDeleteBooking}
        onCancel={() => setDeleteId(null)}
      />

      {/* Modal Interno de Remarcação pela Manicure */}
      {rescheduleItem && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm space-y-3.5 shadow-2xl">
            <h3 className="font-heading font-bold text-base text-gray-900">
              Remarcar Horário (Exceção Manicure)
            </h3>
            <p className="text-xs text-gray-600">
              Cliente: <strong>{rescheduleItem.cliente_nome}</strong> ({rescheduleItem.codigo})
            </p>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Nova Data:</label>
              <input
                type="date"
                lang="pt-BR"
                value={newRescheduleDate}
                onChange={(e) => setNewRescheduleDate(e.target.value)}
                className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm font-semibold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Novo Horário (HH:mm):</label>
              <input
                type="time"
                value={newRescheduleTime}
                onChange={(e) => setNewRescheduleTime(e.target.value)}
                className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm font-semibold"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRescheduleItem(null)}
                className="flex-1 h-11 border border-gray-200 rounded-xl text-xs font-bold text-gray-600"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleReschedule}
                className="flex-1 h-11 bg-[#F7C4D0] text-gray-900 rounded-xl text-xs font-extrabold"
              >
                Salvar Horário
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Agendamento Manual / Encaixe */}
      {showManualModal && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form onSubmit={handleManualBooking} className="bg-white rounded-3xl p-5 w-full max-w-sm space-y-3 shadow-2xl">
            <h3 className="font-heading font-bold text-base text-gray-900">
              Novo Agendamento Manual / Encaixe
            </h3>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Nome da Cliente</label>
              <input
                type="text"
                required
                value={manualNome}
                onChange={(e) => setManualNome(e.target.value)}
                className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm font-medium"
              />
            </div>

            <PhoneInput
              value={manualZap}
              onChange={(f, v) => {
                setManualZap(f);
                setManualZapValid(v);
              }}
            />

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Serviço</label>
              <select
                value={manualServicoId}
                onChange={(e) => setManualServicoId(e.target.value)}
                className="w-full h-11 px-3 border border-gray-200 rounded-xl text-xs font-semibold bg-white"
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome} - R$ {Number(s.preco).toFixed(0)} ({s.duracao_minutos} min)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Horário (HH:mm)</label>
                <input
                  type="time"
                  required
                  value={manualHorario}
                  onChange={(e) => setManualHorario(e.target.value)}
                  className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Status Inicial</label>
                {manualDepositPercentage === 0 ? (
                  <p className="text-xs text-emerald-800 bg-emerald-50 rounded-xl p-3">
                    Sem sinal em novembro; o agendamento será confirmado automaticamente.
                  </p>
                ) : (
                  <select
                    value={manualStatus}
                    onChange={(e: any) => setManualStatus(e.target.value)}
                    className="w-full h-11 px-3 border border-gray-200 rounded-xl text-xs font-semibold bg-white"
                  >
                    <option value="confirmado">Confirmado (Sinal OK)</option>
                    <option value="pendente">Pendente (Sem sinal)</option>
                  </select>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="flex-1 h-11 border border-gray-200 rounded-xl text-xs font-bold text-gray-600"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!manualZapValid || !manualNome.trim()}
                className="flex-1 h-11 bg-[#F7C4D0] text-gray-900 rounded-xl text-xs font-extrabold disabled:opacity-40"
              >
                Criar Agendamento
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
