import React from 'react';
import { Instagram, UserRound } from 'lucide-react';
import type { Manicure } from '../types';
import { Logo } from '../components/Logo';

interface HomeViewProps {
  manicures: Manicure[];
  onSelectManicure: (manicure: Manicure) => void;
  onOpenAdmin: () => void;
}

export function HomeView({ manicures, onSelectManicure, onOpenAdmin }: HomeViewProps) {
  return (
    <div className="min-h-screen px-5 pt-10 pb-8 max-w-[430px] mx-auto bg-white">
      <div className="text-center space-y-3">
        <div className="mx-auto w-16 h-16">
          <Logo size={64} />
        </div>
        <h1
          className="font-heading font-bold text-6xl text-[#1a1012] leading-none tracking-tight"
        >
          Nailhub
        </h1>
        <p className="text-sm text-gray-600">Escolha a manicure para ver os serviços e horários disponíveis.</p>
      </div>

      <section className="mt-8 space-y-3">
        <h2 className="font-heading font-extrabold text-base text-gray-900">Escolha sua manicure</h2>
        {manicures.length === 0 ? (
          <p className="rounded-2xl border border-pink-100 bg-pink-50 p-4 text-sm text-gray-600">
            Nenhuma manicure disponível no momento.
          </p>
        ) : (
          manicures.map((manicure) => (
            <button
              key={manicure.id}
              type="button"
              onClick={() => onSelectManicure(manicure)}
              className="w-full text-left rounded-3xl border border-pink-200 bg-white p-4 flex items-center gap-3 shadow-2xs hover:border-[#802334] active:scale-[.99] transition-all"
            >
              {manicure.photo_url ? (
                <img src={manicure.photo_url} alt="" className="w-14 h-14 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-[#F7C4D0] text-[#802334] flex items-center justify-center shrink-0">
                  <UserRound size={24} />
                </div>
              )}
              <span className="min-w-0 flex-1">
                <strong className="block font-heading font-extrabold text-base text-gray-900 truncate">{manicure.name}</strong>
                {manicure.instagram && (
                  <span className="mt-1 flex items-center gap-1 text-xs text-[#802334] truncate">
                    <Instagram size={13} /> @{manicure.instagram.replace(/^@/, '')}
                  </span>
                )}
              </span>
              <span className="text-[#802334] text-xl" aria-hidden="true">›</span>
            </button>
          ))
        )}
      </section>
    </div>
  );
}
