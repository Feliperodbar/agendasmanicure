import React, { useState } from 'react';
import { PhoneInput } from '../components/PhoneInput';
import { Header } from '../components/Header';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatInSaoPaulo } from '../utils/timezone';
import { Calendar, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ClientMyBookingsViewProps {
  mode: 'client' | 'admin';
  onModeChange: (mode: 'client' | 'admin') => void;
}

export function ClientMyBookingsView({ mode, onModeChange }: ClientMyBookingsViewProps) {
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Cancelamento
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<any | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPhoneValid || !nome.trim()) {
      setErrorMsg('Informe seu nome e WhatsApp celular brasileiro válido (11 dígitos).');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setHasSearched(true);

    try {
      const res = await fetch('/api/meus-horarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, whatsapp }),
      });

      const data = await res.json();
      if (res.ok) {
        setBookings(data.items || []);
      } else {
        setErrorMsg(data.error || 'Nenhum agendamento encontrado.');
        setBookings([]);
      }
    } catch {
      setErrorMsg('Erro de conexão ao consultar agendamentos.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!bookingToCancel) return;
    setCancelModalOpen(false);

    try {
      const res = await fetch(`/api/agendamentos/${bookingToCancel.id}/cancelar-cliente`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, whatsapp }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.mensagem || 'Agendamento cancelado com sucesso.');
        const refresh = await fetch('/api/meus-horarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome, whatsapp }),
        });
        const refreshData = await refresh.json();
        if (refresh.ok) setBookings(refreshData.items || []);
      } else {
        setErrorMsg(data.error || 'Erro ao cancelar agendamento.');
      }
    } catch {
      setErrorMsg('Erro ao processar cancelamento.');
    } finally {
      setBookingToCancel(null);
    }
  };

  return (
    <div className="pb-28 pt-3 px-4 max-w-[430px] mx-auto space-y-4">
      {/* Header com avatar, instagram, aviso sazonal e role switcher */}
      <Header mode={mode} onModeChange={onModeChange} />

      <section aria-labelledby="meus-horarios-heading" className="space-y-3">
        <h2 id="meus-horarios-heading" className="font-heading font-extrabold text-xl text-[#1a1012] tracking-tight">
          Meus horários
        </h2>
        <p className="text-xs text-gray-600 font-medium leading-relaxed">
          Digite o <strong className="font-bold text-gray-900">mesmo nome e WhatsApp</strong> usados ao agendar. Só os seus aparecem.
        </p>

        {errorMsg && (
          <div role="alert" className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div role="status" className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Card (Image 2) */}
        <form onSubmit={handleSearch} className="space-y-3.5 bg-white p-4.5 rounded-3xl border border-pink-200/80 shadow-2xs">
          <div>
            <label htmlFor="consulta-nome" className="block text-xs font-semibold text-gray-700 mb-1">
              Seu nome
            </label>
            <input
              id="consulta-nome"
              type="text"
              placeholder="Ex.: Maria Silva"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full h-12 px-3.5 rounded-2xl border border-pink-200 bg-white text-base font-medium outline-none focus:border-[#802334] focus:ring-2 focus:ring-[#F7C4D0]/50"
            />
          </div>

          <PhoneInput
            id="consulta-zap"
            label="WhatsApp"
            value={whatsapp}
            onChange={(formatted, valid) => {
              setWhatsapp(formatted);
              setIsPhoneValid(valid);
            }}
          />

          <button
            type="submit"
            disabled={loading || !isPhoneValid || !nome.trim()}
            className={`w-full h-12 rounded-2xl font-bold text-xs transition-all ${
              isPhoneValid && nome.trim().length >= 3
                ? 'bg-[#F7C4D0] text-[#1a1012] hover:bg-[#f3b0c0] shadow-xs active:scale-[0.99]'
                : 'bg-gray-400 text-white cursor-not-allowed'
            }`}
          >
            {loading ? 'Consultando...' : 'Buscar meus horários'}
          </button>
        </form>

        {hasSearched && (
          <div className="space-y-3 pt-2">
            <h3 className="font-heading font-bold text-base text-gray-900">Seus Agendamentos</h3>

            {bookings.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-pink-100 text-xs text-gray-500 font-medium">
                Nenhum agendamento encontrado para este nome e WhatsApp.
              </div>
            ) : (
              bookings.map((b) => {
                const isCancelado = b.status === 'cancelado';
                const isPendente = b.status === 'pendente' || !b.sinal_confirmado;

                return (
                  <div key={b.id} className="p-4 rounded-3xl border border-pink-200/80 bg-white space-y-2.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-heading font-extrabold text-sm text-[#802334] tracking-wider">{b.codigo}</span>
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                          b.status === 'confirmado'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : isPendente && !isCancelado
                            ? 'bg-amber-50 text-amber-900 border-amber-300'
                            : isCancelado
                            ? 'bg-gray-100 text-gray-600 border-gray-200'
                            : 'bg-blue-50 text-blue-800 border-blue-200'
                        }`}
                      >
                        {isPendente && !isCancelado ? 'Aguardando Sinal' : b.status.toUpperCase()}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-heading font-bold text-base text-gray-900">{b.servico_nome}</h4>
                      <div className="flex items-center gap-3 text-xs text-gray-600 mt-1 font-medium">
                        <span className="flex items-center gap-1">
                          <Calendar size={13} className="text-gray-400" />
                          {formatInSaoPaulo(b.data_hora_inicio, { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={13} className="text-gray-400" />
                          {formatInSaoPaulo(b.data_hora_inicio, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
                      <span>Total: R$ {Number(b.preco_snapshot).toFixed(2).replace('.', ',')}</span>
                      <span className="font-semibold text-gray-800">
                        Sinal (50%): R$ {Number(b.valor_sinal).toFixed(2).replace('.', ',')} ({b.sinal_confirmado ? 'Confirmado' : 'Pendente'})
                      </span>
                    </div>

                    {isCancelado && (
                      <div className="pt-1 text-[11px] font-semibold text-gray-500">
                        Status de estorno:{' '}
                        <strong className={b.estorno_elegivel ? 'text-emerald-700' : 'text-red-700'}>
                          {b.estorno_elegivel ? 'Elegível para estorno (>= 24h)' : 'Sem estorno (< 24h)'}
                        </strong>
                      </div>
                    )}

                    {!isCancelado && b.status !== 'concluido' && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setBookingToCancel(b);
                            setCancelModalOpen(true);
                          }}
                          className="w-full h-10 rounded-2xl border border-red-200 text-red-700 font-bold text-xs hover:bg-red-50 active:bg-red-100 transition-colors"
                        >
                          Cancelar Horário
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </section>

      {/* Modal Interno de Confirmação de Cancelamento */}
      <ConfirmDialog
        isOpen={cancelModalOpen}
        title="Cancelar agendamento?"
        message="Atenção: o cancelamento libera o horário imediatamente para a lista de espera. Conforme as regras, cancelamentos com mais de 24h têm direito ao estorno do sinal; com menos de 24h, o sinal não é estornado."
        confirmLabel="Sim, confirmar cancelamento"
        cancelLabel="Voltar"
        isDestructive={true}
        onConfirm={handleConfirmCancel}
        onCancel={() => {
          setCancelModalOpen(false);
          setBookingToCancel(null);
        }}
      />
    </div>
  );
}
