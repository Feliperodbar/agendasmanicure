import test from 'node:test';
import assert from 'node:assert/strict';
import { validateWhatsApp, formatWhatsApp } from './phone';

test('formata celular brasileiro com máscara e remove prefixo 55', () => {
  assert.equal(formatWhatsApp('11987654321'), '(11) 98765-4321');
  assert.equal(formatWhatsApp('5511987654321'), '(11) 98765-4321');
  assert.equal(formatWhatsApp('+55 (11) 98765-4321'), '(11) 98765-4321');
});

test('valida celular de 11 dígitos com DDD válido e nono dígito 9', () => {
  const result = validateWhatsApp('(11) 98765-4321');
  assert.equal(result.valid, true);
  assert.equal(result.clean, '11987654321');
  assert.equal(result.formatted, '(11) 98765-4321');
});

test('rejeita telefone com menos de 11 dígitos', () => {
  const result = validateWhatsApp('1198765432'); // 10 dígitos
  assert.equal(result.valid, false);
  assert.match(result.error || '', /Faltam 1 dígito/);
});

test('rejeita DDD inexistente', () => {
  const result = validateWhatsApp('01987654321'); // DDD 01 não existe
  assert.equal(result.valid, false);
  assert.match(result.error || '', /DDD \(1\) inválido/);
});

test('rejeita celular sem o 9 inicial pós DDD', () => {
  const result = validateWhatsApp('11887654321'); // Começa com 8 após DDD
  assert.equal(result.valid, false);
  assert.match(result.error || '', /deve começar com 9/);
});
