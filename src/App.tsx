import React, { useState, useEffect } from 'react';
import { BottomNav, ClientTab, AdminTab } from './components/BottomNav';
import { ClientBookingView } from './views/ClientBookingView';
import { ClientMyBookingsView } from './views/ClientMyBookingsView';
import { RulesView } from './views/RulesView';
import { AdminLoginView } from './views/AdminLoginView';
import { AdminAgendaView } from './views/AdminAgendaView';
import { AdminServicosView } from './views/AdminServicosView';
import { AdminBloqueiosView } from './views/AdminBloqueiosView';
import { AdminHorariosView } from './views/AdminHorariosView';
import { AdminManicuresView } from './views/AdminManicuresView';
import type { Manicure } from './types';

export default function App() {
  const [mode, setMode] = useState<'client' | 'admin'>('client');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [clientTab, setClientTab] = useState<ClientTab>('agendar');
  const [adminTab, setAdminTab] = useState<AdminTab>('agenda');
  const [manicures, setManicures] = useState<Manicure[]>([]);
  const [selectedManicure, setSelectedManicure] = useState<Manicure | null>(null);

  // Ao carregar, verifica se já existe sessão de admin ativa
  useEffect(() => {
    fetch('/api/admin/session', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.isLoggedIn) {
          setIsAdminLoggedIn(true);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/manicures')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const profiles = Array.isArray(data) ? data : [];
        setManicures(profiles);
        setSelectedManicure(profiles[0] || null);
      })
      .catch(() => {});
  }, []);

  const handleAdminSuccess = () => {
    setIsAdminLoggedIn(true);
    setAdminTab('agenda');
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    setMode('client');
    setClientTab('agendar');
  };

  return (
    <div className="min-h-screen bg-[#F8F5F6] text-[#221C1D] flex justify-center selection:bg-[#F7C4D0] selection:text-[#221C1D]">
      <main className="w-full max-w-[430px] min-h-screen bg-white shadow-md flex flex-col relative">
        {/* LADO DA CLIENTE */}
        {mode === 'client' && (
          <div className="flex-1">
            {manicures.length > 1 && (
              <div className="px-4 pt-3">
                <label htmlFor="manicure-select" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Escolha a manicure
                </label>
                <select
                  id="manicure-select"
                  value={selectedManicure?.id || ''}
                  onChange={(event) => {
                    const profile = manicures.find((item) => item.id === event.target.value);
                    setSelectedManicure(profile || null);
                  }}
                  className="w-full h-11 rounded-xl border border-pink-200 px-3 text-sm font-semibold"
                >
                  {manicures.map((profile) => (
                    <option key={profile.id} value={profile.id}>{profile.name}</option>
                  ))}
                </select>
              </div>
            )}
            {clientTab === 'agendar' && (
              <ClientBookingView
                key={selectedManicure?.id || 'natalia'}
                onGoToMyBookings={() => setClientTab('meus-horarios')}
                mode={mode}
                onModeChange={(m) => setMode(m)}
                manicureSlug={selectedManicure?.slug || 'natalia'}
              />
            )}
            {clientTab === 'meus-horarios' && (
              <ClientMyBookingsView
                mode={mode}
                onModeChange={(m) => setMode(m)}
              />
            )}
            {clientTab === 'regras' && <RulesView />}
          </div>
        )}

        {/* LADO DA MANICURE */}
        {mode === 'admin' && (
          <div className="flex-1">
            {!isAdminLoggedIn ? (
              <AdminLoginView
                onSuccess={handleAdminSuccess}
                mode={mode}
                onModeChange={(m) => setMode(m)}
              />
            ) : (
              <div>
                {adminTab === 'agenda' && (
                  <AdminAgendaView
                    mode={mode}
                    onModeChange={(m) => setMode(m)}
                    onLogout={handleAdminLogout}
                  />
                )}
                {adminTab === 'servicos' && <AdminServicosView />}
                {adminTab === 'bloqueios' && <AdminBloqueiosView />}
                {adminTab === 'manicures' && <AdminManicuresView onLogout={handleAdminLogout} />}
                {adminTab === 'horarios' && <AdminHorariosView onLogout={handleAdminLogout} />}
                {adminTab === 'regras' && <RulesView />}
              </div>
            )}
          </div>
        )}

        {/* Barra de Navegação Inferior Fixa */}
        {(mode === 'client' || (mode === 'admin' && isAdminLoggedIn)) && (
          <BottomNav
            mode={mode}
            currentClientTab={clientTab}
            currentAdminTab={adminTab}
            onSelectClientTab={(tab) => setClientTab(tab)}
            onSelectAdminTab={(tab) => setAdminTab(tab)}
          />
        )}
      </main>
    </div>
  );
}
