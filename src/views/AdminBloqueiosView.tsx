import React, { useState, useEffect } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatInSaoPaulo, toSaoPauloISO } from '../utils/timezone';
import { ShieldAlert, Plus, Trash2, Calendar, Clock } from 'lucide-react';

export function AdminBloqueiosView() {
  const [bloqueios, setBloqueios] = useState<any[]>([]);
  const [dataInicio, setDataInicio] = useState('');
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFim, setHoraFim] = useState('18:00');
  const [diaInteiro, setDiaInteiro] = useState(false);
  const [motivo, setMotivo] = useState('');

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadBloqueios();
    const today = new Date().toISOString().split('T')[0];
    setDataInicio(today);
  }, []);

  const loadBloqueios = async () => {
    try {
      const res = await fetch('/api/admin/bloqueios');
      const data = await res.json();
      setBloqueios(data.bloqueios || []);
    } catch {
      setFeedback({ text: 'Erro ao carregar bloqueios.', type: 'error' });
    }
  };

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataInicio) return;

    const startISO = diaInteiro ? toSaoPauloISO(dataInicio, '00:00') : toSaoPauloISO(dataInicio, horaInicio);
    const endISO = diaInteiro ? toSaoPauloISO(dataInicio, '23:59') : toSaoPauloISO(dataInicio, horaFim);

    try {
      const res = await fetch('/api/admin/bloqueios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataInicio: startISO,
          dataFim: endISO,
          motivo: motivo || 'Compromisso pessoal',
          diaInteiro,
        }),
      });

      if (res.ok) {
        setFeedback({ text: 'Bloqueio aplicado! Os horários foram indisponibilizados na agenda.', type: 'success' });
        setMotivo('');
        loadBloqueios();
      } else {
        setFeedback({ text: 'Erro ao registrar bloqueio.', type: 'error' });
      }
    } catch {
      setFeedback({ text: 'Falha de conexão.', type: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/admin/bloqueios/${deleteId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setFeedback({ text: 'Bloqueio removido com sucesso.', type: 'success' });
        loadBloqueios();
      } else {
        setFeedback({ text: 'Erro ao remover bloqueio.', type: 'error' });
      }
    } catch {
      setFeedback({ text: 'Erro de conexão.', type: 'error' });
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="pb-28 pt-3 px-4 max-w-[430px] mx-auto space-y-4">
      <header>
        <h1 className="font-heading font-extrabold text-xl text-gray-900 tracking-tight">Bloqueios de Horário</h1>
        <p className="text-[11px] text-gray-500 font-medium">
          Zere a disponibilidade para folgas, almoço ou compromissos.
        </p>
      </header>

      {feedback && (
        <div
          role="status"
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2 shadow-2xs ${
            feedback.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-red-50 text-red-900 border border-red-200'
          }`}
        >
          <span>{feedback.text}</span>
          <button type="button" onClick={() => setFeedback(null)} className="opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Formulário de Criação de Bloqueio */}
      <form onSubmit={handleCreateBlock} className="p-4 bg-white rounded-3xl border border-gray-200 space-y-3 shadow-2xs">
        <h2 className="font-heading font-bold text-sm text-gray-900">Novo Bloqueio</h2>

        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1">Data:</label>
          <input
            type="date"
            lang="pt-BR"
            required
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm font-semibold"
          />
        </div>

        <div className="flex items-center gap-2 py-1">
          <input
            type="checkbox"
            id="dia-inteiro"
            checked={diaInteiro}
            onChange={(e) => setDiaInteiro(e.target.checked)}
            className="w-4 h-4 rounded text-[#A82647] accent-[#A82647]"
          />
          <label htmlFor="dia-inteiro" className="text-xs font-bold text-gray-800">
            Bloquear o dia inteiro
          </label>
        </div>

        {!diaInteiro && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Início</label>
              <input
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm font-semibold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Fim</label>
              <input
                type="time"
                value={horaFim}
                onChange={(e) => setHoraFim(e.target.value)}
                className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm font-semibold"
              />
            </div>
          </div>
        )}

        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1">Motivo</label>
          <input
            type="text"
            placeholder="Ex: Consulta médica / Intervalo de almoço"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm font-medium"
          />
        </div>

        <button
          type="submit"
          className="w-full h-11 bg-gray-900 text-white font-bold text-xs rounded-xl hover:bg-black active:scale-[0.99] transition-all shadow-xs"
        >
          Aplicar Bloqueio
        </button>
      </form>

      {/* Lista de Bloqueios Existentes */}
      <section className="space-y-2.5">
        <h2 className="font-heading font-bold text-sm text-gray-900">Bloqueios Ativos</h2>
        {bloqueios.length === 0 ? (
          <div className="p-6 text-center bg-white rounded-3xl border border-gray-200 text-xs text-gray-500 font-medium">
            Nenhum bloqueio registrado.
          </div>
        ) : (
          bloqueios.map((b) => (
            <div key={b.id} className="p-3.5 bg-white rounded-2xl border border-gray-200 flex items-center justify-between shadow-2xs">
              <div>
                <h3 className="font-heading font-bold text-xs text-gray-900">{b.motivo}</h3>
                <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5 font-medium">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} /> {formatInSaoPaulo(b.data_inicio, { day: '2-digit', month: '2-digit' })}
                  </span>
                  <span>·</span>
                  <span>
                    {b.dia_inteiro ? 'Dia Inteiro' : `${formatInSaoPaulo(b.data_inicio, { hour: '2-digit', minute: '2-digit' })} às ${formatInSaoPaulo(b.data_fim, { hour: '2-digit', minute: '2-digit' })}`}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDeleteId(b.id)}
                aria-label="Remover bloqueio"
                className="p-2 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))
        )}
      </section>

      {/* Modal Interno de Exclusão de Bloqueio */}
      <ConfirmDialog
        isOpen={!!deleteId}
        title="Remover Bloqueio?"
        message="Deseja liberar este período novamente na agenda para as clientes?"
        confirmLabel="Sim, Liberar"
        cancelLabel="Voltar"
        isDestructive={false}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
