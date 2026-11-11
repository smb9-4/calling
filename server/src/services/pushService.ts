import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const webpush = require('web-push');
import { db } from '../database.js';
import { config } from '../config.js';

export const pushService = {
  init() {
    if (config.vapid.publicKey && config.vapid.privateKey) {
      webpush.setVapidDetails(
        config.vapid.email,
        config.vapid.publicKey,
        config.vapid.privateKey
      );
      console.log('[WebPush] VAPID configured successfully.');
    }
  },

  getPublicKey() {
    return config.vapid.publicKey;
  },

  saveSubscription(userUid: string, subscription: any) {
    if (!subscription || !subscription.endpoint || !subscription.keys) return;

    db.prepare(`
      INSERT INTO push_subscriptions (user_uid, endpoint, p256dh, auth)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(endpoint) DO UPDATE SET
        user_uid = excluded.user_uid,
        p256dh = excluded.p256dh,
        auth = excluded.auth
    `).run(userUid, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth);
  },

  async sendCallNotification(parentUid: string, studentName: string, studentRoll: string, callId: string) {
    const subs = db.prepare(`
      SELECT * FROM push_subscriptions WHERE user_uid = ?
    `).all(parentUid) as any[];

    if (!subs || subs.length === 0) return;

    const payload = JSON.stringify({
      title: `📞 Incoming Call from ${studentName}`,
      body: `Roll No: ${studentRoll || 'N/A'}. Tap to answer or view call on portal.`,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      tag: `incoming-call-${callId}`,
      renotify: true,
      requireInteraction: true,
      data: {
        callId,
        studentName,
        url: `/?callId=${callId}`
      }
    });

    for (const sub of subs) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, payload, {
          TTL: 60, // Short time-to-live for live call alerts
          urgency: 'high'
        });
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          // Subscription expired or unsubscribed
          db.prepare(`DELETE FROM push_subscriptions WHERE endpoint = ?`).run(sub.endpoint);
        }
        console.warn(`[WebPush] Notification to ${parentUid} failed:`, err.message);
      }
    }
  }
};
