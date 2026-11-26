// System & Mobile Notification Utility with Firebase for OWNGO
import { logFirebaseEvent, requestFcmToken, onMessageListener } from '../firebase';

// ── 1. Modern Web Audio Notification Chime (No audio file required) ──
let audioCtx = null;

export const playNotificationChime = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.25); // D6

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(audioCtx.destination);

    osc1.start(now);
    osc1.stop(now + 0.15);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.45);
  } catch (err) {
    // Audio context may be restricted before first user interaction
  }
};

// ── 2. Vibration Feedback for Mobile Phones ──
export const triggerMobileVibration = (pattern = [150, 80, 150]) => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {}
  }
};

// ── 3. Device & Platform Detection (Apple iOS, Safari, Mac, PWA) ──
export const isIos = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
};

export const isStandalonePwa = () => {
  if (typeof window === 'undefined') return false;
  return (
    window.navigator.standalone === true ||
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
  );
};

export const isMac = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /Macintosh|MacIntel|MacPPC|Mac68K/.test(navigator.userAgent) && !isIos();
};

export const isSafari = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /^((?!chrome|android).)*safari/i.test(ua);
};

// ── 4. Register Firebase & CRM Service Worker on App Initialization ──
export const registerServiceWorker = async () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
    console.log('🔥 [Service Worker] Registered successfully with scope:', registration.scope);
    return registration;
  } catch (err) {
    try {
      const fallback = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      return fallback;
    } catch (fbErr) {
      console.warn('ServiceWorker registration error:', fbErr);
      return null;
    }
  }
};

// ── 5. Request System / Mobile Notification Permission (Safe for Safari & Modern Browsers) ──
export const requestNotificationPermission = async () => {
  if (typeof window === 'undefined') return 'unsupported';

  // Apple iOS WebKit: Notifications strictly require "Add to Home Screen" PWA mode
  if (isIos() && !isStandalonePwa() && !('Notification' in window)) {
    return 'ios_pwa_required';
  }

  if (!('Notification' in window)) {
    return 'unsupported';
  }

  try {
    let result;
    // Dual syntax support: Safari legacy callback + Promise
    const p = Notification.requestPermission((status) => {
      result = status;
    });
    if (p && typeof p.then === 'function') {
      result = await p;
    }
    const finalPerm = result || Notification.permission;
    if (finalPerm === 'granted') {
      requestFcmToken().catch(() => {});
      import('./webPushManager').then(({ subscribeToWebPush }) => {
        subscribeToWebPush().catch(() => {});
      }).catch(() => {});
    }
    return finalPerm;
  } catch (err) {
    console.warn('Notification permission error:', err);
    return Notification.permission || 'denied';
  }
};

export const isUserNotificationEnabled = () => {
  if (typeof window === 'undefined') return false;
  try {
    const userJson = localStorage.getItem('crm_user');
    if (userJson) {
      const u = JSON.parse(userJson);
      const val = localStorage.getItem(`crm_notif_enabled_${u.id}`);
      if (val === 'false') return false; // User explicitly muted
      if (val === 'true') {
        // If on iOS browser tabs, allow in-app sound/toast alerts
        if (isIos() && !('Notification' in window)) return true;
        // Otherwise requires granted browser permission
        return 'Notification' in window ? Notification.permission === 'granted' : true;
      }
    }
  } catch {}
  return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
};

// ── 6. Show System Notification (Mac / Windows / Android / iOS Standalone + In-App Fallback) ──
export const showSystemNotification = async (title, {
  body = '',
  icon = '/icon-192.png',
  tag = `crm-${Date.now()}`,
  link = '/chat',
  silent = false,
  type = 'general',
  showInAppToast = true
} = {}) => {
  // Check user mute preference
  try {
    const userJson = localStorage.getItem('crm_user');
    if (userJson) {
      const u = JSON.parse(userJson);
      const val = localStorage.getItem(`crm_notif_enabled_${u.id}`);
      if (val === 'false') return; // Explicitly muted by user
    }
  } catch {}

  // 1. Play pleasant audio ping & trigger mobile vibration
  if (!silent) {
    playNotificationChime();
    triggerMobileVibration();
  }

  // 2. Track in Firebase Analytics
  logFirebaseEvent('crm_notification_shown', {
    notification_title: title,
    notification_type: type,
    target_link: link,
    timestamp: new Date().toISOString()
  });

  const hasSysNotif = typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';

  // Always use raster PNG for Apple WebKit (Safari throws Invalid icon URL on SVG)
  const safeIcon = (icon && !icon.endsWith('.svg')) ? icon : '/icon-192.png';

  // 3. Fallback for iOS browser tabs & browsers where permission is pending / denied:
  // Render an interactive in-app toast notification so users NEVER miss a message!
  if (!hasSysNotif && showInAppToast) {
    try {
      import('react-hot-toast').then(({ default: toast }) => {
        const toastMsg = body ? `${title}\n${body}` : title;
        toast(toastMsg, {
          id: tag,
          icon: '🔔',
          duration: 6000,
          style: {
            background: '#0f172a',
            color: '#fff',
            border: '1px solid var(--border-hover)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
            borderRadius: '12px',
            padding: '10px 14px',
            fontSize: '0.84rem',
            lineHeight: 1.4,
            cursor: 'pointer'
          }
        });
      }).catch(() => {});
    } catch {}
    return;
  }

  if (!hasSysNotif) return;

  // 4. Try Service Worker showNotification (Best for Android / macOS / iOS PWA)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        const notifOptions = {
          body,
          icon: safeIcon,
          badge: safeIcon,
          tag,
          renotify: true,
          data: { url: link }
        };
        // Only include vibrate on platforms that support it (Safari macOS throws on vibrate)
        if ('vibrate' in navigator) {
          notifOptions.vibrate = [200, 100, 200];
        }
        await reg.showNotification(title, notifOptions);
        return;
      }
    } catch (swErr) {
      console.warn('SW notification fallback to window.Notification:', swErr);
    }
  }

  // 5. Desktop Fallback (Mac Notification Center / Windows Action Center)
  try {
    const notif = new Notification(title, {
      body,
      icon: safeIcon,
      tag,
      requireInteraction: true
    });
    notif.onclick = () => {
      window.focus();
      if (link) {
        window.location.href = link;
      }
      notif.close();
    };
    setTimeout(() => notif.close(), 15000);
  } catch (desktopErr) {
    console.warn('Desktop Notification error:', desktopErr);
  }
};

// ── 7. Setup Firebase Foreground Push Receiver ──
export const initFirebaseForegroundReceiver = (onNotificationReceived) => {
  return onMessageListener((payload) => {
    const title = payload.notification?.title || payload.data?.title || 'OWNGO Notification';
    const body = payload.notification?.body || payload.data?.body || '';
    const link = payload.data?.url || payload.data?.link || '/chat';
    const type = payload.data?.type || 'push';

    showSystemNotification(title, {
      body,
      icon: '/icon-192.png',
      link,
      type
    });

    if (onNotificationReceived) {
      onNotificationReceived({ title, body, link, type, data: payload.data });
    }
  });
};
