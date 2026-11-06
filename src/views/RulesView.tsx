import React from 'react';
import { SeasonalBanner } from '../components/SeasonalBanner';
import { ArrowLeft } from 'lucide-react';

export function RulesView({ onBack }: { onBack?: () => void }) {
  const rules = [
    {
      titulo: 'Cancelamento',
      orientacoes: [
        'Você pode cancelar pelo aplicativo em "Meus horários".',
        'Ao cancelar, o horário fica livre para outra cliente. Avise assim que souber!',
      ],
    },
    {
      titulo: 'Remarcação',
      orientacoes: [
        'Peça a remarcação com pelo menos 24 horas de antecedência.',
        'Em caso de imprevisto, fale com a manicure pelo WhatsApp que ela avalia com você.',
      ],
    },
    {
      titulo: 'Atrasos',
      orientacoes: [
        'Chegue no horário combinado para não prejudicar seu atendimento nem o das outras clientes.',
        'A tolerância de atraso é de 10 minutos.',
        'Passando disso, o atendimento pode ser cancelado ou ajustado.',
      ],
    },
  ];

  return (
    <div className="pb-28 pt-4 px-4 max-w-[430px] mx-auto space-y-4">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-gray-900"
        >
          <ArrowLeft size={16} /> Voltar
        </button>
      )}
      <header>
        <h1 className="font-heading font-extrabold text-2xl text-gray-900 tracking-tight">Regras de Atendimento</h1>
        <p className="text-xs text-gray-600 mt-1 font-medium leading-relaxed">
          Combinados simples para o seu atendimento ser tranquilo e pontual.
        </p>
      </header>

      {/* Aviso Sazonal Âmbar */}
      <SeasonalBanner />

      <div className="p-4 bg-white rounded-3xl border border-gray-200 shadow-2xs space-y-4">
        {rules.map((r) => (
          <section key={r.titulo} className="space-y-1.5">
            <h2 className="font-heading font-bold text-sm text-gray-900">{r.titulo}</h2>
            <ul className="list-disc pl-4 space-y-1 text-xs text-gray-600 font-medium">
              {r.orientacoes.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>    </div>
  );
}
