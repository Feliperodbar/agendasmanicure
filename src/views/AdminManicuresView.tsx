import React, { useEffect, useState } from 'react';
import { Plus, UserRound, Instagram, Link, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Manicure } from '../types';

interface AdminManicuresViewProps {
  onLogout?: () => void;
}

export function AdminManicuresView({ onLogout }: AdminManicuresViewProps) {
  const [manicures, setManicures] = useState<Manicure[]>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [instagram, setInstagram] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
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
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível carregar as manicures.');
      setManicures(Array.isArray(data) ? data : []);
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
      const response = await fetch('/api/admin/manicures', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, instagram, photo_url: photoUrl }),
      });
      if (response.status === 401) {
        onLogout?.();
        return;
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível cadastrar a manicure.');
      setManicures((current) => [...current, data].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
      setName('');
      setSlug('');
      setInstagram('');
      setPhotoUrl('');
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
          <Plus size={17} className="text-[#A82647]" /> Nova manicure
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
          URL da foto (opcional)
          <input type="url" value={photoUrl} onChange={(event) => setPhotoUrl(event.target.value)} className="mt-1 w-full h-11 px-3 rounded-xl border border-gray-200 text-sm" placeholder="https://..." />
        </label>
        <button type="submit" disabled={saving} className="w-full h-11 rounded-xl bg-[#802334] text-white text-sm font-bold disabled:opacity-60">
          {saving ? 'Salvando...' : 'Cadastrar manicure'}
        </button>
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
            </article>
          ))
        )}
      </section>
    </div>
  );
}
