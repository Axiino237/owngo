const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { PushSubscription } = require('../models');
const { publicKey, sendPushToUser } = require('../utils/webPush');

/**
 * @route   GET /api/notifications/vapid-key
 * @desc    Get public VAPID key to subscribe browser for Web Push
 * @access  Public / Authenticated
 */
router.get('/vapid-key', (req, res) => {
  res.json({
    success: true,
    publicKey: publicKey || process.env.VAPID_PUBLIC_KEY
  });
});

/**
 * @route   POST /api/notifications/subscribe
 * @desc    Register or update device push subscription for current user
 * @access  Private (gracefully returns 200 unauthenticated if session missing to prevent client reload loops)
 */
router.post('/subscribe', async (req, res) => {
  try {
    // Optional / graceful auth check
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(200).json({
        success: false,
        unauthenticated: true,
        message: 'Push subscription requires active login session'
      });
    }

    const jwt = require('jsonwebtoken');
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtErr) {
      return res.status(200).json({
        success: false,
        unauthenticated: true,
        message: 'Token expired or invalid'
      });
    }

    const { endpoint, keys, userAgent, deviceType } = req.body;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription payload. Endpoint and keys (p256dh, auth) are required.'
      });
    }

    const userId = decoded.id;

    // Check if subscription for this endpoint already exists
    let subscription = await PushSubscription.findOne({ where: { endpoint } });

    if (subscription) {
      // Update existing subscription with current user and keys
      await subscription.update({
        userId,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent || req.headers['user-agent'] || 'Unknown Browser',
        deviceType: deviceType || 'desktop'
      });
    } else {
      // Create new subscription
      subscription = await PushSubscription.create({
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent || req.headers['user-agent'] || 'Unknown Browser',
        deviceType: deviceType || 'desktop'
      });
    }

    res.json({
      success: true,
      message: 'Push subscription registered successfully',
      subscriptionId: subscription.id
    });
  } catch (err) {
    console.error('❌ [Subscribe Route Error]:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route   POST /api/notifications/unsubscribe
 * @desc    Remove device push subscription
 * @access  Private
 */
router.post('/unsubscribe', protect, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ success: false, message: 'Endpoint is required' });
    }

    await PushSubscription.destroy({
      where: {
        endpoint,
        userId: req.user.id
      }
    });

    res.json({ success: true, message: 'Unsubscribed successfully' });
  } catch (err) {
    console.error('❌ [Unsubscribe Route Error]:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route   POST /api/notifications/test-push
 * @desc    Send instant test push notification to verify background delivery
 * @access  Private
 */
router.post('/test-push', protect, async (req, res) => {
  try {
    const user = req.user;
    const result = await sendPushToUser(user.id, {
      title: 'OWNGO - Test Alert 🔔',
      body: `Hello ${user.name || 'there'}! Background push notification is working perfectly even when your browser is closed.`,
      url: '/dashboard',
      tag: 'test-push-alert',
      data: {
        type: 'test_notification',
        timestamp: new Date().toISOString()
      }
    });

    res.json({
      success: true,
      message: result.sentCount > 0 ? 'Push notification delivered to registered device(s)' : 'No active push subscriptions found for your account. Please enable notifications first.',
      details: result
    });
  } catch (err) {
    console.error('❌ [Test Push Error]:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
