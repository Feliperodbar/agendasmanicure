import React, { useEffect, useState } from 'react';

type Props = { role: 'manicure'; manicureId?: string } | { role: 'cliente'; nome: string; whatsapp: string; bookingId?: string };

function isIOSWithoutInstallation(): boolean {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

function decodeVapidKey(value: string): Uint8Array<ArrayBuffer> {
  const padded = (value + '='.repeat((4 - value.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

export function PushActivation(props: Props) {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [existingSubscription, setExistingSubscription] = useState<PushSubscription | null>(null);
  const name = props.role === 'cliente' ? props.nome : '';
  const phone = props.role === 'cliente' ? props.whatsapp : '';
  const bookingId = props.role === 'cliente' ? props.bookingId : undefined;
  const manicureId = props.role === 'manicure' ? props.manicureId : undefined;
  const requiresInstallation = isIOSWithoutInstallation();
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  useEffect(() => {
    if (!supported || requiresInstallation) return;
    const controller = new AbortController();
    void fetch('/api/push/config', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const config = await response.json();
        if (!response.ok || typeof config.publicKey !== 'string') throw new Error(config.error || 'Notificações indisponíveis.');
        setPublicKey(config.publicKey);
      })
      .catch(() => {
        if (!controller.signal.aborted) setMessage('Notificações indisponíveis neste ambiente.');
      });
    return () => controller.abort();
  }, [supported, requiresInstallation]);

  useEffect(() => {
    if (!publicKey || !supported || requiresInstallation) return;
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout>;
    void navigator.serviceWorker.register('/sw.js')
      .then(async (registered) => {
        const ready = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<never>((_, reject) => {
            timeout = setTimeout(() => reject(new Error('Não foi possível iniciar as notificações.')), 15000);
          }),
        ]);
        if (ready.scope !== registered.scope) throw new Error('Service worker inesperado.');
        const subscription = await ready.pushManager.getSubscription();
        if (!cancelled) {
          setExistingSubscription(subscription);
          setRegistration(ready);
        }
      })
      .catch(() => {
        if (!cancelled) setMessage('Não foi possível iniciar as notificações neste aparelho.');
      })
      .finally(() => clearTimeout(timeout));
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [publicKey, supported, requiresInstallation]);

  useEffect(() => {
    let cancelled = false;
    setActive(false);
    if (!supported || requiresInstallation || Notification.permission !== 'granted') return;
    void navigator.serviceWorker.getRegistration('/').then(async (registration) => {
      const subscription = await registration?.pushManager.getSubscription();
      if (!subscription) return;
      const response = await fetch('/api/push/assinaturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ subscription: subscription.toJSON(), papel: props.role, nome: name, whatsapp: phone, manicureId, checkOnly: true }),
      });
      if (!response.ok) throw new Error('Não foi possível verificar as notificações deste aparelho.');
      const result = await response.json();
      if (!cancelled) setActive(result.active === true);
    }).catch(() => {
      if (!cancelled) setMessage('Não foi possível verificar as notificações deste aparelho.');
    });
    return () => { cancelled = true; };
  }, [props.role, name, phone, manicureId, supported, requiresInstallation]);

  const activate = async () => {
    setLoading(true);
    setMessage('');
    try {
      if (Notification.permission === 'denied') {
        setMessage('Notificações desligadas neste aparelho. Você pode ativá-las nas configurações do navegador.');
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setMessage('Notificações desligadas neste aparelho. Você pode ativá-las nas configurações do navegador.');
        return;
      }
      if (!registration) throw new Error('Não foi possível iniciar as notificações.');
      const subscription = existingSubscription ||
        await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeVapidKey(publicKey) });
      setExistingSubscription(subscription);
      const saved = await fetch('/api/push/assinaturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ subscription: subscription.toJSON(), papel: props.role, nome: name, whatsapp: phone, bookingId, manicureId }),
      });
      const result = await saved.json();
      if (!saved.ok) throw new Error(result.error || 'Não foi possível ativar as notificações.');
      setActive(true);
      if (typeof result.warning === 'string') setMessage(result.warning);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível ativar as notificações.');
    } finally {
      setLoading(false);
    }
  };

  if (requiresInstallation) return <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-950">No iPhone: toque em Compartilhar &gt; Adicionar à Tela de Início, abra a agenda pelo ícone novo e volte aqui para ativar.</p>;
  if (!supported) return <p className="text-xs text-gray-600">Este navegador não oferece notificações push.</p>;
  return (
    <div className="space-y-2">
      <button type="button" disabled={loading || active || !publicKey || !registration} onClick={activate} className="min-h-12 w-full rounded-2xl border border-pink-200 bg-white px-4 text-xs font-bold text-[#802334] disabled:opacity-70">
        {active ? 'Notificações ativadas ✓' : loading ? 'Ativando notificações...' : props.role === 'manicure' ? 'Ativar notificações' : 'Receber lembretes no celular'}
      </button>
      {message && <p role="status" className="text-xs text-red-700">{message}</p>}
    </div>
  );
}
