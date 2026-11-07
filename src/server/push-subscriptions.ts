export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export function isValidPushSubscription(value: unknown): value is PushSubscriptionInput {
  if (!value || typeof value !== 'object') return false;
  const subscription = value as Partial<PushSubscriptionInput>;
  if (typeof subscription.endpoint !== 'string' || subscription.endpoint.length > 2048) return false;
  let url: URL;
  try {
    url = new URL(subscription.endpoint);
  } catch {
    return false;
  }
  const allowedHosts = [
    'fcm.googleapis.com',
    'updates.push.services.mozilla.com',
    'web.push.apple.com',
  ];
  if (
    url.protocol !== 'https:' || url.username || url.password || url.port ||
    !allowedHosts.some((host) => url.hostname === host || (host === 'web.push.apple.com' && url.hostname.endsWith(`.${host}`)))
  ) return false;
  const keys = subscription.keys;
  if (!keys || typeof keys.p256dh !== 'string' || typeof keys.auth !== 'string') return false;
  return /^[A-Za-z0-9_-]{87}$/.test(keys.p256dh) && /^[A-Za-z0-9_-]{22}$/.test(keys.auth);
}
