import React, { useState, useEffect } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Plus, Edit2, Trash2, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

export function AdminServicosView() {
  const [services, setServices] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);

  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [duracao, setDuracao] = useState('');
  const [descricao, setDescricao] = useState('');

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const res = await fetch('/api/admin/servicos');
      if (!res.ok) throw new Error('Erro ao carregar serviços.');
      const data = await res.json();
      setServices(data || []);
    } catch {
      setFeedback({ text: 'Erro ao carregar serviços.', type: 'error' });
    }
  };

  const handleOpenCreate = () => {
    setEditingService(null);
    setNome('');
    setPreco('');
    setDuracao('60');
    setDescricao('');
    setModalOpen(true);
  };

  const handleOpenEdit = (s: any) => {
    setEditingService(s);
    setNome(s.nome);
    setPreco(String(s.preco));
    setDuracao(String(s.duracao_minutos));
    setDescricao(s.descricao || '');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      nome,
      preco: Number(preco),
      duracao_minutos: Number(duracao),
      descricao,
    };

    try {
      let res;
      if (editingService) {
        res = await fetch(`/api/admin/servicos/${editingService.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/admin/servicos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        setFeedback({ text: editingService ? 'Serviço atualizado!' : 'Novo serviço adicionado!', type: 'success' });
        setModalOpen(false);
        await loadServices();
      } else {
        const data = await res.json().catch(() => null);
        setFeedback({ text: data?.error || 'Erro ao salvar serviço.', type: 'error' });
      }
    } catch {
      setFeedback({ text: 'Falha de conexão.', type: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/admin/servicos/${deleteId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setFeedback({ text: 'Serviço excluído do catálogo.', type: 'success' });
        await loadServices();
      } else {
        const data = await res.json().catch(() => null);
        setFeedback({ text: data?.error || 'Erro ao excluir serviço.', type: 'error' });
      }
    } catch {
      setFeedback({ text: 'Erro ao conectar.', type: 'error' });
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="pb-28 pt-3 px-4 max-w-[430px] mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-extrabold text-xl text-gray-900 tracking-tight">Serviços</h1>
          <p className="text-[11px] text-gray-500 font-medium">Catálogo de procedimentos e valores</p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="h-9 px-3 rounded-xl bg-[#F7C4D0] text-gray-900 font-extrabold text-xs flex items-center gap-1 hover:bg-[#f3b0c0] active:scale-95 transition-all shadow-2xs"
        >
          <Plus size={15} /> Novo Procedimento
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

      <div className="space-y-2.5">
        {services.map((s) => (
          <div key={s.id} className="p-4 bg-white rounded-3xl border border-gray-200 flex items-center justify-between shadow-2xs">
            <div className="pr-2">
              <h3 className="font-heading font-bold text-base text-gray-900">{s.nome}</h3>
              <div className="flex items-center gap-2 text-xs text-gray-600 mt-0.5 font-medium">
                <span className="flex items-center gap-1 text-[#A82647] font-bold">
                  <Clock size={13} /> {s.duracao_minutos} min
                </span>
                <span>·</span>
                <span className="font-heading font-extrabold text-sm text-gray-900">
                  R$ {Number(s.preco).toFixed(0)}
                </span>
                <span className="text-[11px] text-gray-400">(Sinal: R$ {(s.preco * 0.5).toFixed(0)})</span>
              </div>
              {s.descricao && (
                <p className="text-[11px] text-gray-500 mt-1 line-clamp-1 leading-relaxed">{s.descricao}</p>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleOpenEdit(s)}
                aria-label={`Editar ${s.nome}`}
                className="p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <Edit2 size={16} />
              </button>
              <button
                type="button"
                onClick={() => setDeleteId(s.id)}
                aria-label={`Excluir ${s.nome}`}
                className="p-2.5 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Interno de Criação / Edição */}
      {modalOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white rounded-3xl p-5 w-full max-w-sm space-y-3.5 shadow-2xl">
            <h3 className="font-heading font-bold text-base text-gray-900">
              {editingService ? 'Editar Procedimento' : 'Novo Procedimento'}
            </h3>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Nome</label>
              <input
                type="text"
                required
                placeholder="Ex: Alongamento Molde F1"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-[#A82647]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Preço Total (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="130"
                  value={preco}
                  onChange={(e) => setPreco(e.target.value)}
                  className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-[#A82647]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Duração (minutos)</label>
                <input
                  type="number"
                  step="5"
                  required
                  placeholder="120"
                  value={duracao}
                  onChange={(e) => setDuracao(e.target.value)}
                  className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-[#A82647]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Descrição curta</label>
              <textarea
                rows={2}
                placeholder="Detalhes ou cuidados do procedimento..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="w-full p-2.5 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-[#A82647]"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex-1 h-11 border border-gray-200 rounded-xl text-xs font-bold text-gray-600"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 h-11 bg-[#F7C4D0] text-gray-900 rounded-xl text-xs font-extrabold"
              >
                Salvar Procedimento
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Interno de Confirmação de Exclusão de Serviço */}
      <ConfirmDialog
        isOpen={!!deleteId}
        title="Excluir Procedimento?"
        message="Tem certeza que deseja inativar ou excluir este procedimento do catálogo?"
        confirmLabel="Sim, Excluir"
        cancelLabel="Voltar"
        isDestructive={true}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
