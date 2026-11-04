import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { Lock, AlertCircle } from 'lucide-react';

interface AdminLoginViewProps {
  onSuccess: () => void;
  mode: 'client' | 'admin';
  onModeChange: (mode: 'client' | 'admin') => void;
}

export function AdminLoginView({ onSuccess, mode, onModeChange }: AdminLoginViewProps) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [setupStep, setSetupStep] = useState<1 | 2>(1);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetch('/api/admin/check-setup')
      .then((res) => res.json())
      .then((data) => setHasPin(data.hasPin))
      .catch(() => setHasPin(false));
  }, []);

  const handlePinChange = (value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, 4);
    setPin(clean);
    setErrorMsg('');
  };

  const processPin = async (completedPin: string) => {
    setErrorMsg('');

    // Primeiro acesso: Definir PIN
    if (hasPin === false) {
      if (setupStep === 1) {
        setConfirmPin(completedPin);
        setPin('');
        setSetupStep(2);
      } else {
        if (completedPin !== confirmPin) {
          setErrorMsg('Os PINs digitados não são iguais. Tente novamente.');
          setPin('');
          setConfirmPin('');
          setSetupStep(1);
          return;
        }

        setLoading(true);
        try {
          const res = await fetch('/api/admin/setup-pin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: completedPin }),
          });
          const data = await res.json();
          if (res.ok) {
            onSuccess();
          } else {
            setErrorMsg(data.error || 'Erro ao registrar PIN.');
            setPin('');
          }
        } catch {
          setErrorMsg('Erro de conexão com o servidor.');
          setPin('');
        } finally {
          setLoading(false);
        }
      }
      return;
    }

    // Login com PIN existente
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: completedPin }),
      });
      const data = await res.json();
      if (res.ok) {
        onSuccess();
      } else {
        setErrorMsg(data.error || 'PIN incorreto.');
        setPin('');
      }
    } catch {
      setErrorMsg('Erro de conexão ao validar PIN.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length === 4) {
      processPin(pin);
    }
  };

  const handleKeyClick = (num: string) => {
    if (loading) return;
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      setErrorMsg('');
      if (nextPin.length === 4) {
        processPin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    if (loading) return;
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  if (hasPin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xs text-gray-400 font-medium">
        Carregando segurança...
      </div>
    );
  }

  const isSetup = hasPin === false;

  return (
    <div className="pb-28 pt-3 px-4 max-w-[430px] mx-auto space-y-4">
      {/* Top Header with Avatar, Link, Seasonal Banner, and Role Switcher */}
      <Header mode={mode} onModeChange={onModeChange} />

      {/* Card Container (Image 5) */}
      <div className="bg-white rounded-3xl border border-pink-200/80 p-5 text-center space-y-4 shadow-2xs">
        {/* Soft pink circle icon */}
        <div className="w-12 h-12 bg-[#F7C4D0]/50 text-[#802334] rounded-full flex items-center justify-center mx-auto shadow-2xs">
          <Lock size={22} />
        </div>

        <div>
          <h2 className="font-heading font-extrabold text-xl text-[#1a1012]">
            {isSetup
              ? setupStep === 1
                ? 'Crie seu PIN de 4 números'
                : 'Confirme seu novo PIN'
              : 'Área da manicure'}
          </h2>
          <p className="text-xs text-gray-600 font-medium mt-1 leading-relaxed px-2">
            {isSetup
              ? 'Defina o seu código de segurança para proteger a agenda.'
              : 'Digite seu PIN de 4 números para abrir a agenda, os serviços e as configurações. Só você tem acesso.'}
          </p>
        </div>

        {errorMsg && (
          <div role="alert" className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs font-semibold rounded-2xl flex items-center justify-center gap-1.5">
            <AlertCircle size={15} className="shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-4 pt-1">
          {/* 4 Bolinhas/Caixas do PIN preenchendo conforme digita */}
          <div className="relative max-w-[220px] mx-auto">
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => handlePinChange(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer text-center"
              autoFocus
            />

            <div className="grid grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((idx) => {
                const isFilled = pin.length > idx;
                const isCurrent = pin.length === idx;
                return (
                  <div
                    key={idx}
                    className={`h-13 rounded-2xl border-2 flex items-center justify-center text-xl font-heading font-extrabold transition-all ${
                      isFilled
                        ? 'border-[#802334] bg-[#F7C4D0] text-[#1a1012] shadow-2xs'
                        : isCurrent
                        ? 'border-[#802334] bg-white ring-2 ring-[#F7C4D0]'
                        : 'border-pink-200 bg-white text-gray-300'
                    }`}
                  >
                    {isFilled ? '•' : ''}
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-[11px] text-gray-400 font-semibold">
            {pin.length}/4 números
          </p>

          {/* Teclado numérico grande na própria página */}
          <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto pt-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeyClick(num)}
                className="h-12 rounded-2xl bg-gray-50 border border-gray-200 text-lg font-heading font-bold text-gray-900 active:bg-[#F7C4D0] active:scale-95 transition-all shadow-2xs"
              >
                {num}
              </button>
            ))}
            <div className="h-12" />
            <button
              type="button"
              onClick={() => handleKeyClick('0')}
              className="h-12 rounded-2xl bg-gray-50 border border-gray-200 text-lg font-heading font-bold text-gray-900 active:bg-[#F7C4D0] active:scale-95 transition-all shadow-2xs"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              aria-label="Apagar dígito"
              className="h-12 rounded-2xl bg-gray-100 border border-gray-200 text-sm font-bold text-gray-700 active:bg-gray-200 active:scale-95 transition-all flex items-center justify-center shadow-2xs"
            >
              ⌫
            </button>
          </div>

          <button
            type="submit"
            disabled={pin.length < 4 || loading}
            className={`w-full h-12 rounded-2xl font-extrabold text-xs transition-all ${
              pin.length === 4
                ? 'bg-[#F7C4D0] text-[#1a1012] hover:bg-[#f3b0c0] active:scale-[0.99] shadow-xs'
                : 'bg-[#F7C4D0]/40 text-gray-500 cursor-not-allowed'
            }`}
          >
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-[11px] text-gray-500 font-medium leading-relaxed pt-2 border-t border-pink-100">
          Depois de entrar, este aparelho continua conectado até você tocar em <strong className="font-bold text-gray-800">Sair</strong> (na aba Horários). Errou o PIN 5 vezes seguidas? O acesso trava por 5 minutos, por segurança.
        </p>
      </div>
    </div>
  );
}
