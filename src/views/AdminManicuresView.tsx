import React, { useEffect, useState } from 'react';
import { Plus, UserRound, Instagram, Link, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Manicure } from '../types';

interface AdminManicuresViewProps {
  onLogout?: () => void;
}

async function readApiResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    throw new Error(`O servidor respondeu sem dados (HTTP ${response.status}). Tente novamente.`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`O servidor respondeu em formato inválido (HTTP ${response.status}).`);
  }
}

export function AdminManicuresView({ onLogout }: AdminManicuresViewProps) {
  const [manicures, setManicures] = useState<Manicure[]>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [instagram, setInstagram] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [pin, setPin] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadManicures = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/manicures', { credentials: 'include' });
      if (response.status === 401) {
        onLogout?.();
        return;
      }
      const data = await readApiResponse(response);
      if (!data || typeof data !== 'object') throw new Error('Resposta inválida do servidor.');
      if (!response.ok) {
        const message = 'error' in data && typeof data.error === 'string' ? data.error : 'Não foi possível carregar as manicures.';
        throw new Error(message);
      }
      setManicures(Array.isArray(data) ? data as Manicure[] : []);
    } catch (error) {
      setFeedback({ text: error instanceof Error ? error.message : 'Erro ao carregar manicures.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadManicures();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch(editingId ? `/api/admin/manicures/${editingId}` : '/api/admin/manicures', {
        method: editingId ? 'PATCH' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { name, slug, instagram, photo_url: photoUrl } : { name, slug, instagram, photo_url: photoUrl, pin }),
      });
      if (response.status === 401) {
        onLogout?.();
        return;
      }
      const data = await readApiResponse(response);
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('Resposta inválida do servidor.');
      }
      if (!response.ok) {
        const message = 'error' in data && typeof data.error === 'string' ? data.error : 'Não foi possível cadastrar a manicure.';
        throw new Error(message);
      }
      setManicures((current) => (editingId
        ? current.map((item) => item.id === editingId ? data as Manicure : item)
        : [...current, data as Manicure]
      ).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
      setName('');
      setSlug('');
      setInstagram('');
      setPhotoUrl('');
      setPin('');
      setEditingId(null);
      setFeedback({ text: 'Manicure cadastrada com sucesso!', type: 'success' });
    } catch (error) {
      setFeedback({ text: error instanceof Error ? error.message : 'Erro ao cadastrar manicure.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-28 pt-4 px-4 max-w-[430px] mx-auto space-y-4">
      <div>
        <h1 className="font-heading font-extrabold text-xl text-gray-900 tracking-tight">Manicures</h1>
        <p className="text-xs text-gray-500 mt-1">Cadastre profissionais e personalize o link de agendamento.</p>
      </div>

      {feedback && (
        <div
          role="status"
          className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-red-50 text-red-900 border border-red-200'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {feedback.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-4 bg-white rounded-3xl border border-pink-200 space-y-3 shadow-2xs">
        <h2 className="font-heading font-bold text-sm text-gray-900 flex items-center gap-2">
          <Plus size={17} className="text-[#A82647]" />           {editingId ? 'Editar manicure' : 'Nova manicure'}
        </h2>
        <label className="block text-xs font-bold text-gray-700">
          Nome
          <input required minLength={3} value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full h-11 px-3 rounded-xl border border-gray-200 text-sm" placeholder="Ex.: Juliana Santos" />
        </label>
        <label className="block text-xs font-bold text-gray-700">
          Slug do link
          <input value={slug} onChange={(event) => setSlug(event.target.value)} className="mt-1 w-full h-11 px-3 rounded-xl border border-gray-200 text-sm" placeholder="Ex.: juliana" />
          <span className="block mt-1 text-[11px] text-gray-500">Será usado no endereço personalizado da agenda.</span>
        </label>
        <label className="block text-xs font-bold text-gray-700">
          Instagram
          <input value={instagram} onChange={(event) => setInstagram(event.target.value)} className="mt-1 w-full h-11 px-3 rounded-xl border border-gray-200 text-sm" placeholder="Ex.: julianaunhas" />
        </label>
        <label className="block text-xs font-bold text-gray-700">
          PIN de acesso
          {!editingId && <input required pattern="\d{4}" inputMode="numeric" maxLength={4} type="password" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))} className="mt-1 w-full h-11 px-3 rounded-xl border border-gray-200 text-sm" placeholder="4 números" />}
          <span className="block mt-1 text-[11px] text-gray-500">Será usado pela manicure para entrar na agenda.</span>
        </label>
        <label className="block text-xs font-bold text-gray-700">
          URL da foto (opcional)
          <input type="url" value={photoUrl} onChange={(event) => setPhotoUrl(event.target.value)} className="mt-1 w-full h-11 px-3 rounded-xl border border-gray-200 text-sm" placeholder="https://..." />
        </label>
        <button type="submit" disabled={saving} className="w-full h-11 rounded-xl bg-[#802334] text-white text-sm font-bold disabled:opacity-60">
          {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Cadastrar manicure'}
        </button>
        {editingId && <button type="button" onClick={() => { setEditingId(null); setName(''); setSlug(''); setInstagram(''); setPhotoUrl(''); }} className="w-full h-10 text-sm font-semibold text-gray-600">Cancelar edição</button>}
      </form>

      <section className="space-y-2">
        <h2 className="font-heading font-bold text-sm text-gray-900">Profissionais cadastradas</h2>
        {loading ? (
          <p className="p-4 text-center text-xs text-gray-500">Carregando...</p>
        ) : manicures.length === 0 ? (
          <p className="p-4 text-center text-xs text-gray-500 border border-dashed rounded-2xl">Nenhuma manicure cadastrada.</p>
        ) : (
          manicures.map((manicure) => (
            <article key={manicure.id} className="p-3.5 rounded-2xl border border-gray-200 bg-white flex items-center gap-3">
              {manicure.photo_url ? (
                <img src={manicure.photo_url} alt="" className="w-11 h-11 rounded-full object-cover" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-[#F7C4D0] flex items-center justify-center text-[#802334]">
                  <UserRound size={20} />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-bold text-sm text-gray-900 truncate">{manicure.name}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1"><Link size={12} /> /{manicure.slug}</p>
                {manicure.instagram && <p className="text-xs text-[#802334] flex items-center gap-1"><Instagram size={12} /> @{manicure.instagram.replace(/^@/, '')}</p>}
              </div>
              <button type="button" onClick={() => { setEditingId(manicure.id); setName(manicure.name); setSlug(manicure.slug); setInstagram(manicure.instagram || ''); setPhotoUrl(manicure.photo_url || ''); }} className="ml-auto text-xs font-bold text-[#802334]">Editar</button>
              <button type="button" onClick={async () => {
                const response = await fetch(`/api/admin/manicures/${manicure.id}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !manicure.active }) });
                if (response.ok) setManicures((current) => current.map((item) => item.id === manicure.id ? { ...item, active: !manicure.active } : item));
              }} className="text-xs font-bold text-gray-600">{manicure.active ? 'Desativar' : 'Ativar'}</button>
              <button type="button" onClick={async () => {
                if (!window.confirm(`Excluir a manicure "${manicure.name}"? Serviços, bloqueios e o PIN dela serão apagados.`)) return;
                const response = await fetch(`/api/admin/manicures/${manicure.id}`, { method: 'DELETE', credentials: 'include' });
                if (response.ok) {
                  setManicures((current) => current.filter((item) => item.id !== manicure.id));
                  setFeedback({ text: 'Manicure excluída.', type: 'success' });
                  return;
                }
                const data = await response.json().catch(() => null) as { error?: string } | null;
                setFeedback({ text: data?.error || 'Não foi possível excluir a manicure.', type: 'error' });
              }} className="text-xs font-bold text-red-700">Excluir</button>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
