const webpush = require('web-push');

// Configure VAPID details with keys from environment
const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || 'mailto:admin@crm.axiino.com';

if (publicKey && privateKey) {
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    console.log('🔔 [Web Push] VAPID details initialized successfully.');
  } catch (err) {
    console.error('❌ [Web Push] Failed to set VAPID details:', err.message);
  }
} else {
  console.warn('⚠️ [Web Push] VAPID keys not configured in environment.');
}

/**
 * Sends a web push notification to a specific user across all their registered devices
 * (Desktop Chrome/Edge, Mac Safari, iPhone iOS PWA, Android Chrome).
 * Automatically purges expired subscriptions (HTTP 404/410).
 *
 * @param {string|number} userId
 * @param {object} payload - { title, body, icon, badge, url, tag, data }
 */
async function sendPushToUser(userId, payload) {
  if (!userId) return { success: false, reason: 'No userId provided' };

  try {
    const { PushSubscription } = require('../models');
    if (!PushSubscription) {
      console.warn('⚠️ [Web Push] PushSubscription model not found.');
      return { success: false, reason: 'Model not registered' };
    }

    const subscriptions = await PushSubscription.findAll({
      where: { userId: String(userId) }
    });

    if (!subscriptions || subscriptions.length === 0) {
      return { success: true, sentCount: 0, reason: 'No push subscriptions for user' };
    }

    const formattedPayload = JSON.stringify({
      title: payload.title || 'OWNGO Notification',
      body: payload.body || '',
      icon: payload.icon || '/icon-192.png',
      badge: payload.badge || '/icon-192.png',
      url: payload.url || payload.link || '/',
      tag: payload.tag || `crm-${Date.now()}`,
      timestamp: Date.now(),
      data: payload.data || {}
    });

    const pushPromises = subscriptions.map(async (sub) => {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      try {
        await webpush.sendNotification(pushConfig, formattedPayload, {
          TTL: 60 * 60 * 24, // 24 hours queueing if device is offline
          urgency: 'high',
          headers: {
            'Urgency': 'high'
          }
        });
        return { success: true, id: sub.id };
      } catch (err) {
        // HTTP 404, 410, or 403 means subscription expired, uninstalled, or mismatched credentials -> clean up
        if (err.statusCode === 404 || err.statusCode === 410 || err.statusCode === 403) {
          console.log(`🧹 [Web Push] Purging invalid/expired push subscription ${sub.id} (HTTP ${err.statusCode}: ${err.body || err.message})`);
          await PushSubscription.destroy({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.warn(`⚠️ [Web Push] Failed to push to sub ${sub.id}:`, err.message);
        }
        return { success: false, id: sub.id, error: err.message };
      }
    });

    const results = await Promise.all(pushPromises);
    const sentCount = results.filter(r => r.success).length;

    return { success: true, total: subscriptions.length, sentCount };
  } catch (err) {
    console.error(`❌ [Web Push] sendPushToUser error for user ${userId}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Multicasts a web push notification to a list of users
 * @param {Array<string>} userIds
 * @param {object} payload
 */
async function sendPushToUsers(userIds, payload) {
  if (!Array.isArray(userIds) || userIds.length === 0) return { sentCount: 0 };
  const uniqueIds = [...new Set(userIds.map(id => String(id)))];
  
  const dispatches = uniqueIds.map(uid => sendPushToUser(uid, payload));
  const results = await Promise.all(dispatches);
  const totalSent = results.reduce((acc, r) => acc + (r.sentCount || 0), 0);
  return { totalSent, userCount: uniqueIds.length };
}

module.exports = {
  webpush,
  publicKey,
  sendPushToUser,
  sendPushToUsers
};
