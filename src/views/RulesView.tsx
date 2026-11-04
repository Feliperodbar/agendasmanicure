import React from 'react';
import { SeasonalBanner } from '../components/SeasonalBanner';
import { ShieldCheck, Clock, RefreshCw, AlertOctagon } from 'lucide-react';

export function RulesView() {
  const rules = [
    {
      titulo: '1. Sinal Obrigatório de 50%',
      gatilho: 'Cliente seleciona serviço e conclui passo 3 do agendamento.',
      condicoes: 'Horário e data livres, anti-double-booking validado no servidor.',
      acoes: 'Gera código sequencial NM-####. Agendamento nasce com status "pendente". Quando a manicure confirma o recebimento do Pix, o status vira "confirmado".',
      responsavel: 'Cliente (envio do Pix) / Manicure (confirmação no admin)',
      icon: ShieldCheck,
    },
    {
      titulo: '2. Cancelamento e Estorno do Sinal',
      gatilho: 'Cliente solicita cancelamento pelo aplicativo.',
      condicoes: 'Antecedência de 24 horas ou mais: elegível a estorno. Menos de 24 horas: sem estorno do sinal.',
      acoes: 'Cancela o agendamento no banco e SEMPRE libera o horário na hora para a fila de espera. Registra se tem direito a estorno ou não.',
      responsavel: 'Cliente / Sistema',
      icon: RefreshCw,
    },
    {
      titulo: '3. Remarcação',
      gatilho: 'Cliente ou Manicure deseja alterar data/hora.',
      condicoes: 'Pela cliente: mínimo de 24 horas de antecedência. Pela manicure: pode remarcar a qualquer momento como exceção.',
      acoes: 'Atualiza o horário e envia notificação simulada com a nova data.',
      responsavel: 'Cliente (>= 24h) / Manicure (livre)',
      icon: Clock,
    },
    {
      titulo: '4. Tolerância a Atrasos e Falta (Não Compareceu)',
      gatilho: 'Cliente atrasa mais de 10 minutos ou não comparece ao horário marcado.',
      condicoes: 'Tolerância máxima de 10 minutos estritamente observada.',
      acoes: 'A manicure pode cancelar o agendamento ou marcar "falta". O sinal de 50% NÃO é estornado em nenhuma hipótese.',
      responsavel: 'Manicure (Natália)',
      icon: AlertOctagon,
    },
  ];

  return (
    <div className="pb-28 pt-4 px-4 max-w-[430px] mx-auto space-y-4">
      <header>
        <h1 className="font-heading font-extrabold text-2xl text-gray-900 tracking-tight">Regras de Atendimento</h1>
        <p className="text-xs text-gray-600 mt-1 font-medium leading-relaxed">
          Transparência e respeito ao tempo de cada cliente.
        </p>
      </header>

      {/* Aviso Sazonal Âmbar */}
      <SeasonalBanner />

      <div className="space-y-3">
        {rules.map((r, index) => {
          const Icon = r.icon;
          return (
            <div key={index} className="p-4 bg-white rounded-3xl border border-gray-200 shadow-2xs space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#F7C4D0]/30 text-[#A82647] flex items-center justify-center shrink-0">
                  <Icon size={16} />
                </div>
                <h2 className="font-heading font-bold text-sm text-gray-900">{r.titulo}</h2>
              </div>

              <div className="space-y-1.5 text-xs text-gray-600 font-medium pt-1">
                <p>
                  <strong className="text-gray-900 uppercase text-[10px] tracking-wider block text-gray-400">Gatilho:</strong>
                  {r.gatilho}
                </p>
                <p>
                  <strong className="text-gray-900 uppercase text-[10px] tracking-wider block text-gray-400">Condições:</strong>
                  {r.condicoes}
                </p>
                <p>
                  <strong className="text-gray-900 uppercase text-[10px] tracking-wider block text-gray-400">Ações:</strong>
                  {r.acoes}
                </p>
                <div className="pt-1.5 border-t border-gray-100 flex items-center justify-between text-[11px]">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Responsável:</span>
                  <span className="font-bold text-[#A82647]">{r.responsavel}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
