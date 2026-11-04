import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Voltar',
  isDestructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
    >
      <div className="bg-white rounded-3xl p-5 w-full max-w-sm border border-gray-100 shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
            isDestructive ? 'bg-red-50 text-red-600' : 'bg-[#F7C4D0]/30 text-[#A82647]'
          }`}>
            <AlertCircle size={22} />
          </div>
          <h3 className="font-heading font-bold text-lg text-gray-900 leading-snug">{title}</h3>
        </div>

        <p className="text-xs text-gray-600 leading-relaxed font-medium">{message}</p>

        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-12 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs active:bg-gray-100 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 h-12 rounded-xl font-bold text-xs text-white transition-colors ${
              isDestructive
                ? 'bg-[#A82647] hover:bg-[#8e1f3b] active:scale-[0.98]'
                : 'bg-gray-900 hover:bg-black active:scale-[0.98]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
