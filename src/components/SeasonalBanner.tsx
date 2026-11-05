import React from 'react';
import { isSeasonalPeriod, SEASONAL_WARNING_MESSAGE } from '../utils/timezone';
import { AlertTriangle } from 'lucide-react';

export function SeasonalBanner() {
  if (!isSeasonalPeriod()) return null;

  return (
    <div
      role="alert"
      className="bg-amber-50 border-2 border-amber-300 text-amber-900 rounded-2xl p-3.5 text-xs font-semibold leading-relaxed mb-4 shadow-xs flex items-start gap-2.5"
    >
      <AlertTriangle size={18} className="text-amber-700 shrink-0 mt-0.5" />
      <div>
        <span className="font-extrabold text-amber-800 uppercase tracking-wider block mb-0.5">
          Atenção — Regra de sinal:
        </span>
        <p className="text-amber-900/90 font-medium">{SEASONAL_WARNING_MESSAGE}</p>
      </div>
    </div>
  );
}
