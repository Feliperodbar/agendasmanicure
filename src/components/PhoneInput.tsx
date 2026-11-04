import React from 'react';
import { formatWhatsApp, validateWhatsApp } from '../utils/phone';

interface PhoneInputProps {
  value: string;
  onChange: (formatted: string, isValid: boolean) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
}

export function PhoneInput({
  value,
  onChange,
  label = 'WhatsApp / Celular',
  required = true,
  disabled = false,
  id = 'phone-input',
}: PhoneInputProps) {
  const validation = validateWhatsApp(value);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatWhatsApp(raw);
    const result = validateWhatsApp(formatted);
    onChange(formatted, result.valid);
  };

  const hasTyped = value.replace(/\D/g, '').length > 0;
  const showError = hasTyped && !validation.valid;

  return (
    <div className="w-full text-left">
      <label htmlFor={id} className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
        {label} {required && <span className="text-[#A82647]">*</span>}
      </label>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        placeholder="(11) 98765-4321"
        value={value}
        disabled={disabled}
        onChange={handleInputChange}
        className={`w-full h-12 px-3.5 rounded-xl border text-base font-medium outline-none transition-all ${
          showError
            ? 'border-red-400 bg-red-50/40 text-red-950 focus:ring-2 focus:ring-red-200'
            : validation.valid
            ? 'border-emerald-400 bg-emerald-50/20 text-gray-900 focus:ring-2 focus:ring-emerald-200'
            : 'border-gray-200 focus:border-[#A82647] focus:ring-2 focus:ring-[#F7C4D0]/50 bg-white'
        }`}
      />
      {showError && (
        <p className="text-xs text-red-600 font-semibold mt-1 flex items-center gap-1">
          <span>⚠️</span> {validation.error}
        </p>
      )}
      {validation.valid && (
        <p className="text-[11px] text-emerald-700 font-bold mt-1">
          ✓ Celular válido
        </p>
      )}
    </div>
  );
}
