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
import { HomeView } from './views/HomeView';
import { PushActivation } from './components/PushActivation';
import type { Manicure } from './types';

export default function App() {
  const pushTarget = new URLSearchParams(window.location.search).get('push');
  const [mode, setMode] = useState<'client' | 'admin'>(pushTarget === 'admin' ? 'admin' : 'client');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [clientTab, setClientTab] = useState<ClientTab>(pushTarget === 'meus-horarios' ? 'meus-horarios' : 'agendar');
  const [adminTab, setAdminTab] = useState<AdminTab>('agenda');
  const [manicures, setManicures] = useState<Manicure[]>([]);
  const [selectedManicure, setSelectedManicure] = useState<Manicure | null>(null);
  const [showHome, setShowHome] = useState(pushTarget !== 'meus-horarios');
  const [rulesBack, setRulesBack] = useState(false);

  // Ao carregar, verifica se já existe sessão de admin ativa
  useEffect(() => {
    fetch('/api/admin/session', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.isLoggedIn) {
          setIsAdminLoggedIn(true);
          const owner = Boolean(data.isOwner);
          setIsOwner(owner);
          setAdminTab(owner ? 'manicures' : 'agenda');
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
    fetch('/api/admin/session', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        const owner = Boolean(data.isOwner);
        setIsOwner(owner);
        setAdminTab(owner ? 'manicures' : 'agenda');
      })
      .catch(() => {
        setIsOwner(false);
        setAdminTab('agenda');
      });
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    setIsOwner(false);
    setMode('client');
    setClientTab('agendar');
  };

  const handleOpenAdmin = async () => {
    await fetch('/api/admin/logout', {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {});
    setIsAdminLoggedIn(false);
    setIsOwner(false);
    setAdminTab('agenda');
    setMode('admin');
  };

  return (
    <div className="min-h-screen bg-[#F8F5F6] text-[#221C1D] flex justify-center selection:bg-[#F7C4D0] selection:text-[#221C1D]">
      <main className="w-full max-w-[430px] min-h-screen bg-white shadow-md flex flex-col relative">
        {/* LADO DA CLIENTE */}
        {mode === 'client' && (
          <div className="flex-1">
            {showHome ? (
              <HomeView
                manicures={manicures}
                onSelectManicure={(profile) => {
                  setSelectedManicure(profile);
                  setShowHome(false);
                }}
                onOpenAdmin={handleOpenAdmin}
              />
            ) : (clientTab === 'agendar' || (clientTab === 'regras' && rulesBack)) && (
              <div className={clientTab === 'regras' ? 'hidden' : undefined}>
                <ClientBookingView
                  key={selectedManicure?.id || 'natalia'}
                  onGoToMyBookings={() => setClientTab('meus-horarios')}
                  onBackToHome={() => setShowHome(true)}
                  onGoToRules={() => {
                    setRulesBack(true);
                    setClientTab('regras');
                  }}
                  mode={mode}
                  onModeChange={(m) => setMode(m)}
                  manicureSlug={selectedManicure?.slug || 'natalia'}
                  manicure={selectedManicure}
                />
              </div>
            )}
            {!showHome && clientTab === 'meus-horarios' && (
              <ClientMyBookingsView
                mode={mode}
                onModeChange={(m) => setMode(m)}
              />
            )}
            {!showHome && clientTab === 'regras' && (
              <RulesView
                onBack={rulesBack ? () => {
                  setRulesBack(false);
                  setClientTab('agendar');
                } : undefined}
              />
            )}
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
                <div className="space-y-2 px-4 pt-3">
                  {isOwner && (
                    <label className="block text-xs font-semibold text-gray-700">
                      Receber avisos da manicure:
                      <select value={selectedManicure?.id || ''} onChange={(event) => setSelectedManicure(manicures.find((profile) => profile.id === event.target.value) || null)} className="mt-1 h-12 w-full rounded-xl border border-pink-200 bg-white px-3 text-sm">
                        {manicures.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
                      </select>
                    </label>
                  )}
                  {(!isOwner || selectedManicure) && <PushActivation role="manicure" manicureId={isOwner ? selectedManicure?.id : undefined} />}
                </div>
                {adminTab === 'agenda' && (
                  <AdminAgendaView
                    mode={mode}
                    onModeChange={(m) => setMode(m)}
                    onLogout={handleAdminLogout}
                  />
                )}
                {adminTab === 'servicos' && <AdminServicosView />}
                {adminTab === 'bloqueios' && <AdminBloqueiosView />}
                {adminTab === 'manicures' && isOwner && <AdminManicuresView onLogout={handleAdminLogout} />}
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
            onSelectClientTab={(tab) => {
              setClientTab(tab);
              if (tab === 'meus-horarios') {
                setShowHome(false);
              }
            }}
            onSelectAdminTab={(tab) => setAdminTab(tab)}
            onChangeManicure={handleOpenAdmin}
            canManageProfiles={isOwner}
          />
        )}
      </main>
    </div>
  );
}
