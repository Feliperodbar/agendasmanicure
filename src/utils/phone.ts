export interface PhoneValidationResult {
  valid: boolean;
  clean: string;
  formatted: string;
  error?: string;
}

export const VALID_DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19,
  21, 22, 24, 27, 28,
  31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49,
  51, 53, 54, 55,
  61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79,
  81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99
]);

/**
 * Formata um número em tempo real para a máscara brasileira (DD) 9XXXX-XXXX
 * Aceita números com prefixo +55 e normaliza automaticamente.
 */
export function formatWhatsApp(value: string): string {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length > 11) {
    digits = digits.slice(2);
  }
  const d = digits.slice(0, 11);

  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
}

/**
 * Validação estrita de celular brasileiro:
 * - Deve ter exatamente 11 dígitos com DDD
 * - DDD válido no Brasil (11 a 99)
 * - Primeiro dígito após DDD deve ser 9
 */
export function validateWhatsApp(value: string): PhoneValidationResult {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length > 11) {
    digits = digits.slice(2);
  }

  if (digits.length === 0) {
    return { valid: false, clean: '', formatted: '', error: 'Informe o número do celular com DDD.' };
  }

  if (digits.length < 11) {
    const diff = 11 - digits.length;
    return {
      valid: false,
      clean: digits,
      formatted: formatWhatsApp(digits),
      error: `Faltam ${diff} dígito${diff > 1 ? 's' : ''}. Celular brasileiro deve ter 11 dígitos com DDD.`
    };
  }

  if (digits.length > 11) {
    return {
      valid: false,
      clean: digits,
      formatted: formatWhatsApp(digits),
      error: 'Número com mais de 11 dígitos. Informe apenas DDD + celular.'
    };
  }

  const ddd = parseInt(digits.slice(0, 2), 10);
  if (!VALID_DDDS.has(ddd)) {
    return {
      valid: false,
      clean: digits,
      formatted: formatWhatsApp(digits),
      error: `DDD (${ddd}) inválido no Brasil.`
    };
  }

  if (digits[2] !== '9') {
    return {
      valid: false,
      clean: digits,
      formatted: formatWhatsApp(digits),
      error: 'Celular inválido: deve começar com 9 após o DDD.'
    };
  }

  return {
    valid: true,
    clean: digits,
    formatted: formatWhatsApp(digits)
  };
}
