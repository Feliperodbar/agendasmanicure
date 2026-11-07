import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidPushSubscription } from '../server/push-subscriptions';

const subscription = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/endpoint',
  keys: { p256dh: 'A'.repeat(87), auth: 'B'.repeat(22) },
};

test('aceita provedores conhecidos de push e chaves no formato esperado', () => {
  assert.equal(isValidPushSubscription(subscription), true);
  assert.equal(isValidPushSubscription({ ...subscription, endpoint: 'https://web.push.apple.com/example' }), true);
  assert.equal(isValidPushSubscription({ ...subscription, endpoint: 'https://updates.push.services.mozilla.com/example' }), true);
});

test('rejeita endpoints inseguros, domínios falsos e chaves inválidas', () => {
  assert.equal(isValidPushSubscription({ ...subscription, endpoint: 'http://fcm.googleapis.com/example' }), false);
  assert.equal(isValidPushSubscription({ ...subscription, endpoint: 'https://fcm.googleapis.com.attacker.test/example' }), false);
  assert.equal(isValidPushSubscription({ ...subscription, endpoint: 'https://127.0.0.1/example' }), false);
  assert.equal(isValidPushSubscription({ ...subscription, keys: { ...subscription.keys, auth: 'invalid' } }), false);
});
