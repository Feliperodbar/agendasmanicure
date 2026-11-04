import React, { useState, useEffect } from 'react';
import { LogOut, Save, KeyRound, Clock, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

interface AdminHorariosViewProps {
  onLogout: () => void;
}

export function AdminHorariosView({ onLogout }: AdminHorariosViewProps) {
  const [pixKey, setPixKey] = useState('nataliamarcela49@gmail.com');
  const [buffer, setBuffer] = useState('10');
  const [sinalPct, setSinalPct] = useState('50');
  const [tolerancia, setTolerancia] = useState('10');
  const [antecedenciaEstorno, setAntecedenciaEstorno] = useState('24');
  const [antecedenciaRemarcacao, setAntecedenciaRemarcacao] = useState('24');

  // Troca de PIN
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');

  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetch('/api/admin/configuracoes')
      .then((r) => r.json())
      .then((d) => {
        if (d.configs) {
          if (d.configs.chave_pix) setPixKey(d.configs.chave_pix);
          if (d.configs.buffer_minutos) setBuffer(String(d.configs.buffer_minutos));
          if (d.configs.sinal_percentual) setSinalPct(String(d.configs.sinal_percentual));
          if (d.configs.tolerancia_atraso_minutos) setTolerancia(String(d.configs.tolerancia_atraso_minutos));
          if (d.configs.antecedencia_estorno_horas) setAntecedenciaEstorno(String(d.configs.antecedencia_estorno_horas));
          if (d.configs.antecedencia_remarcacao_horas) setAntecedenciaRemarcacao(String(d.configs.antecedencia_remarcacao_horas));
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveConfigs = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/configuracoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configs: {
            chave_pix: pixKey,
            buffer_minutos: Number(buffer),
            sinal_percentual: Number(sinalPct),
            tolerancia_atraso_minutos: Number(tolerancia),
            antecedencia_estorno_horas: Number(antecedenciaEstorno),
            antecedencia_remarcacao_horas: Number(antecedenciaRemarcacao),
          },
        }),
      });

      if (res.ok) {
        setFeedback({ text: 'Configurações de horários e regras salvas!', type: 'success' });
      } else {
        setFeedback({ text: 'Erro ao salvar configurações.', type: 'error' });
      }
    } catch {
      setFeedback({ text: 'Erro de conexão.', type: 'error' });
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(newPin)) {
      setFeedback({ text: 'O novo PIN deve ter exatamente 4 números.', type: 'error' });
      return;
    }
    if (newPin !== pinConfirm) {
      setFeedback({ text: 'A confirmação do novo PIN não confere.', type: 'error' });
      return;
    }

    try {
      const res = await fetch('/api/admin/trocar-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPin, newPin }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('PIN alterado com sucesso! A sessão anterior foi revogada. Faça login novamente.');
        onLogout();
      } else {
        setFeedback({ text: data.error || 'Erro ao alterar PIN.', type: 'error' });
      }
    } catch {
      setFeedback({ text: 'Erro de conexão.', type: 'error' });
    }
  };

  const handleLogoutClick = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {}
    onLogout();
  };

  return (
    <div className="pb-28 pt-3 px-4 max-w-[430px] mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-extrabold text-xl text-gray-900 tracking-tight">Horários & Ajustes</h1>
          <p className="text-[11px] text-gray-500 font-medium">Regras de negócio, Pix e PIN</p>
        </div>

        <button
          type="button"
          onClick={handleLogoutClick}
          className="h-9 px-3 rounded-xl border border-red-200 text-red-700 bg-red-50/50 hover:bg-red-50 text-xs font-bold flex items-center gap-1.5 transition-colors"
        >
          <LogOut size={14} /> Sair
        </button>
      </div>

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

      {/* Regras e Pix */}
      <form onSubmit={handleSaveConfigs} className="p-4 bg-white rounded-3xl border border-gray-200 space-y-3.5 shadow-2xs">
        <h2 className="font-heading font-bold text-sm text-gray-900 flex items-center gap-1.5">
          <Clock size={16} className="text-[#A82647]" /> Parâmetros de Agendamento
        </h2>

        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1">Chave Pix para Recebimento do Sinal</label>
          <input
            type="text"
            required
            value={pixKey}
            onChange={(e) => setPixKey(e.target.value)}
            className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm font-semibold text-[#A82647]"
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">Buffer pós-serviço (min)</label>
            <input
              type="number"
              required
              value={buffer}
              onChange={(e) => setBuffer(e.target.value)}
              className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm font-semibold"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">% do Sinal Antecipado</label>
            <input
              type="number"
              required
              value={sinalPct}
              onChange={(e) => setSinalPct(e.target.value)}
              className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm font-semibold"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">Tolerância Atraso (min)</label>
            <input
              type="number"
              required
              value={tolerancia}
              onChange={(e) => setTolerancia(e.target.value)}
              className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm font-semibold"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">Mín. Estorno (horas)</label>
            <input
              type="number"
              required
              value={antecedenciaEstorno}
              onChange={(e) => setAntecedenciaEstorno(e.target.value)}
              className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm font-semibold"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full h-11 bg-[#F7C4D0] text-gray-900 font-extrabold text-xs rounded-xl hover:bg-[#f3b0c0] active:scale-[0.99] transition-all shadow-xs"
        >
          Salvar Regras Operacionais
        </button>
      </form>

      {/* Alterar PIN */}
      <form onSubmit={handleChangePin} className="p-4 bg-white rounded-3xl border border-gray-200 space-y-3 shadow-2xs">
        <h2 className="font-heading font-bold text-sm text-gray-900 flex items-center gap-1.5">
          <KeyRound size={16} className="text-[#A82647]" /> Trocar PIN de Acesso
        </h2>

        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1">PIN Atual (4 dígitos)</label>
          <input
            type="password"
            maxLength={4}
            required
            placeholder="••••"
            value={currentPin}
            onChange={(e) => setCurrentPin(e.target.value)}
            className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm font-heading font-bold text-center tracking-widest"
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">Novo PIN</label>
            <input
              type="password"
              maxLength={4}
              required
              placeholder="••••"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm font-heading font-bold text-center tracking-widest"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">Confirmar Novo PIN</label>
            <input
              type="password"
              maxLength={4}
              required
              placeholder="••••"
              value={pinConfirm}
              onChange={(e) => setPinConfirm(e.target.value)}
              className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm font-heading font-bold text-center tracking-widest"
            />
          </div>
        </div>

        <p className="text-[11px] text-gray-500 font-medium">
          Ao trocar o PIN, todas as sessões anteriores nos outros aparelhos serão revogadas.
        </p>

        <button
          type="submit"
          className="w-full h-11 bg-gray-900 text-white font-bold text-xs rounded-xl hover:bg-black active:scale-[0.99] transition-all shadow-xs"
        >
          Atualizar PIN de Segurança
        </button>
      </form>
    </div>
  );
}
