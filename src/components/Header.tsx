import React from 'react';
import { ExternalLink, Instagram } from 'lucide-react';
import { isSeasonalPeriod, SEASONAL_WARNING_MESSAGE } from '../utils/timezone';
import type { Manicure } from '../types';

interface HeaderProps {
  mode: 'client' | 'admin';
  onModeChange: (mode: 'client' | 'admin') => void;
  manicure?: Manicure | null;
  global?: boolean;
  login?: boolean;
}

export function Header({ mode, onModeChange, manicure, global = false, login = false }: HeaderProps) {
  const showSeasonalWarning = !login && isSeasonalPeriod();

  return (
    <header className="space-y-3 mb-5 pt-2">
      {/* Top Title Bar: Avatar circular rosa à esquerda + título & @nataliamarcelanail */}
      <div className="flex items-center gap-3">
        {/* N Avatar Circle à esquerda */}
        {!global && manicure?.photo_url ? (
          <img src={manicure.photo_url} alt="" className="w-11 h-11 rounded-full object-cover shrink-0 shadow-2xs" />
        ) : (
          <div className="w-11 h-11 rounded-full bg-[#F7C4D0] text-[#1a1012] font-heading font-extrabold text-lg flex items-center justify-center shrink-0 shadow-2xs">
            {(global ? 'M' : manicure?.name || 'Natália Marcela').charAt(0)}
          </div>
        )}

        <div>
          <h1 className="font-heading font-extrabold text-[21px] leading-tight text-[#1a1012] tracking-tight">
            {login ? 'Acesso profissional' : global ? 'Meus horários' : `${manicure?.name || 'Natália Marcela'} | Nail designer`}
          </h1>
          {!global && !login && <div className="flex items-center gap-3 mt-1.5">
            <a
              href={`https://instagram.com/${(manicure?.instagram || 'nataliamarcelanail').replace(/^@/, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-[#802334] underline hover:text-[#5c1724] inline-flex items-center gap-0.5"
            >
              <Instagram size={13} aria-hidden="true" />
              @{(manicure?.instagram || 'nataliamarcelanail').replace(/^@/, '')}
              <ExternalLink size={11} className="inline ml-0.5" />
            </a>
          </div>}
        </div>
      </div>

      {/* Alternância entre os dois lados posicionada diretamente abaixo do texto "Nail Designer" */}
      <div className="bg-white border border-[#F7C4D0]/80 rounded-full p-1 flex items-center shadow-2xs">
        <button
          type="button"
          onClick={() => onModeChange('client')}
          className={`flex-1 min-h-[40px] py-2 text-xs font-bold rounded-full transition-all text-center ${
            mode === 'client'
              ? 'bg-[#F7C4D0] text-[#1a1012] shadow-2xs'
              : 'bg-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Cliente
        </button>
      </div>

      {/* Caixa de aviso em destaque âmbar */}
      {showSeasonalWarning && (
        <div className="bg-[#FFFDE7] border border-[#FACC15] rounded-2xl p-3.5 text-xs text-gray-800 leading-relaxed shadow-2xs">
          <span className="font-extrabold text-gray-900">Atenção — novembro e dezembro:</span>{' '}
          em caso de falta ou de cancelamento com menos de 24 horas de antecedência, o pagamento antecipado{' '}
          <strong className="font-bold text-gray-900">não será estornado</strong>.
        </div>
      )}
    </header>
  );
}
