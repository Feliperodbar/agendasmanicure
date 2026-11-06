import React from 'react';
import { Calendar, ListFilter, FileText, Scissors, ShieldAlert, Sliders, UsersRound, LockKeyhole } from 'lucide-react';

export type ClientTab = 'agendar' | 'meus-horarios' | 'regras';
export type AdminTab = 'agenda' | 'servicos' | 'bloqueios' | 'manicures' | 'horarios' | 'regras';

interface BottomNavProps {
  mode: 'client' | 'admin';
  currentClientTab: ClientTab;
  currentAdminTab: AdminTab;
  onSelectClientTab: (tab: ClientTab) => void;
  onSelectAdminTab: (tab: AdminTab) => void;
  onChangeManicure?: () => void;
  canManageProfiles?: boolean;
}

export function BottomNav({
  mode,
  currentClientTab,
  currentAdminTab,
  onSelectClientTab,
  onSelectAdminTab,
  onChangeManicure,
  canManageProfiles = false,
}: BottomNavProps) {
  if (mode === 'admin') {
    const adminItems: { id: AdminTab; label: string; icon: React.ElementType }[] = [
      ...(canManageProfiles ? [{ id: 'manicures' as AdminTab, label: 'Manicures', icon: UsersRound }] : []),
      ...(!canManageProfiles
        ? [
            { id: 'agenda' as AdminTab, label: 'Agenda', icon: Calendar },
            { id: 'servicos' as AdminTab, label: 'Serviços', icon: Scissors },
            { id: 'bloqueios' as AdminTab, label: 'Bloqueios', icon: ShieldAlert },
            { id: 'horarios' as AdminTab, label: 'Horários', icon: Sliders },
            { id: 'regras' as AdminTab, label: 'Regras', icon: FileText },
          ]
        : []),
    ];

    return (
      <nav aria-label="Navegação da Manicure" className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#F7C4D0]/60">
        <div className="max-w-[430px] mx-auto flex items-center justify-around h-16 px-1">
          {adminItems.map((item) => {
            const active = currentAdminTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectAdminTab(item.id)}
                className={`flex flex-col items-center justify-center flex-1 h-12 transition-all ${
                  active
                    ? 'border-2 border-black rounded-lg text-[#802334] font-bold px-1'
                    : 'text-gray-500 hover:text-gray-900 font-medium'
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 1.8} className={active ? 'text-[#802334]' : 'text-gray-500'} />
                <span className={`text-[10px] mt-0.5 ${active ? 'font-bold text-[#802334]' : ''}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  const clientItems: { id: ClientTab | 'trocar'; label: string; icon: React.ElementType }[] = [
    { id: 'agendar', label: 'Agendar', icon: Calendar },
    { id: 'meus-horarios', label: 'Meus horários', icon: ListFilter },
    { id: 'trocar', label: 'Área da manicure', icon: LockKeyhole },
  ];

  return (
    <nav aria-label="Navegação da Cliente" className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#F7C4D0]/60">
      <div className="max-w-[430px] mx-auto flex items-center justify-around h-16 px-3">
        {clientItems.map((item) => {
          const active = currentClientTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (item.id === 'trocar') {
                  onChangeManicure?.();
                } else {
                  onSelectClientTab(item.id);
                }
              }}
              className={`flex flex-col items-center justify-center flex-1 h-12 transition-all ${
                active
                  ? 'border-2 border-black rounded-lg text-[#802334] font-bold px-2'
                  : 'text-gray-500 hover:text-gray-900 font-medium'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} className={active ? 'text-[#802334]' : 'text-gray-500'} />
              <span className={`text-[10px] mt-0.5 ${active ? 'font-bold text-[#802334]' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
