// Web Push Manager for Background Notifications (Chrome, Safari macOS, iOS PWA, Edge, Android)
import api from '../api/axios';

/**
 * Converts a base64 string to a Uint8Array for the VAPID applicationServerKey
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Detects current browser and device environment
 */
export function getDeviceInfo() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { deviceType: 'unknown', userAgent: 'unknown' };
  }

  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = window.navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  const isAndroid = /Android/i.test(ua);
  const isMac = /Macintosh|MacIntel/i.test(ua) && !isIos;
  const isWindows = /Windows/i.test(ua);

  let deviceType = 'desktop';
  if (isIos) {
    deviceType = isStandalone ? 'ios_pwa' : 'ios_browser';
  } else if (isAndroid) {
    deviceType = 'android_mobile';
  } else if (isMac) {
    deviceType = 'mac_desktop';
  } else if (isWindows) {
    deviceType = 'windows_desktop';
  }

  return { deviceType, userAgent: ua, isIos, isStandalone };
}

/**
 * Subscribes the current browser to Web Push notifications and registers the endpoint with the backend
 */
export async function subscribeToWebPush(options = {}) {
  // Guard: NEVER attempt push subscription if user is not authenticated
  const token = typeof window !== 'undefined' ? localStorage.getItem('crm_token') : null;
  if (!token) {
    return { success: false, reason: 'unauthenticated' };
  }

  const { forceRenew = false } = options;
  const { isIos, isStandalone } = getDeviceInfo();

  if (isIos && !isStandalone) {
    return {
      success: false,
      reason: 'ios_pwa_required',
      message: "iPhone-la notifications work aaga, Safari-la Share button ➔ 'Add to Home Screen' click panni install pannunga. Apram Home Screen icon open panni 'Enable' pannunga!"
    };
  }

  if (!('serviceWorker' in navigator)) {
    console.warn('[Web Push] Service workers not supported by this browser.');
    return { success: false, reason: 'sw_unsupported', message: 'Service workers not supported in this browser' };
  }

  if (!('PushManager' in window)) {
    console.warn('[Web Push] Push messaging is not supported in this browser environment.');
    return { success: false, reason: 'push_unsupported', message: 'Push messaging is not supported in this browser environment' };
  }

  try {
    // 1. Request notification permission if not yet granted
    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      console.log('[Web Push] Notification permission not granted:', permission);
      return { success: false, reason: 'permission_denied' };
    }

    // 2. Fetch public VAPID key from backend
    const vapidRes = await api.get('/notifications/vapid-key');
    const publicKey = vapidRes.data?.publicKey;
    if (!publicKey) {
      throw new Error('No VAPID public key returned from server');
    }

    // 3. Obtain service worker registration and check for worker updates
    const registration = await navigator.serviceWorker.ready;
    if (!registration) {
      throw new Error('Service worker is not ready');
    }
    registration.update().catch(() => {});

    // 4. Check for existing subscription or create new
    let subscription = await registration.pushManager.getSubscription();

    if (subscription && forceRenew) {
      console.log('🔔 [Web Push] Explicitly renewing push subscription...');
      try {
        await subscription.unsubscribe();
        subscription = null;
      } catch (unsubErr) {
        console.warn('⚠️ [Web Push] Could not unsubscribe stale subscription:', unsubErr.message);
      }
    }

    if (!subscription) {
      const convertedVapidKey = urlBase64ToUint8Array(publicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });
      console.log('🔔 [Web Push] Subscribed device with current VAPID key.');
    } else {
      console.log('🔔 [Web Push] Reusing active push subscription.');
    }

    // 5. Send subscription to backend
    const rawSub = subscription.toJSON();
    const { deviceType, userAgent } = getDeviceInfo();

    await api.post('/notifications/subscribe', {
      endpoint: rawSub.endpoint,
      keys: rawSub.keys,
      userAgent,
      deviceType
    });

    console.log('✅ [Web Push] Successfully registered background push subscription with CRM backend!');
    return { success: true, subscription };
  } catch (err) {
    console.warn('⚠️ [Web Push] Subscription failed:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Sends a test push notification to verify background delivery
 */
export async function sendTestWebPush() {
  try {
    const res = await api.post('/notifications/test-push');
    return res.data;
  } catch (err) {
    throw err.response?.data || err;
  }
}
