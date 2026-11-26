// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAnalytics, isSupported as isAnalyticsSupported, logEvent } from "firebase/analytics";
import { getMessaging, getToken, onMessage, isSupported as isMessagingSupported } from "firebase/messaging";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "crmaxiino.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "crmaxiino",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "crmaxiino.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "754528694644",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:754528694644:web:05ffdc1b02603f0ec93c21",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-HQKMWWNFEN"
};

// Initialize Firebase only if an API key is provided
export const app = firebaseConfig.apiKey 
  ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0])
  : null;

// Initialize Analytics safely
let analyticsInstance = null;
if (typeof window !== 'undefined' && app) {
  isAnalyticsSupported().then((supported) => {
    if (supported) {
      analyticsInstance = getAnalytics(app);
      console.log('🔥 [Firebase Analytics] Initialized successfully');
    }
  }).catch((err) => {
    console.warn('Firebase Analytics check:', err);
  });
}
export const analytics = analyticsInstance;

// Helper to log Firebase Analytics events safely
export const logFirebaseEvent = (eventName, params = {}) => {
  try {
    if (analyticsInstance) {
      logEvent(analyticsInstance, eventName, params);
    }
  } catch (err) {
    // Non-blocking
  }
};

// Initialize Messaging instance
let messagingInstance = null;
export const getFirebaseMessaging = async () => {
  if (typeof window === 'undefined' || !app) return null;
  if (messagingInstance) return messagingInstance;
  try {
    const supported = await isMessagingSupported();
    if (supported) {
      messagingInstance = getMessaging(app);
      return messagingInstance;
    }
  } catch (err) {
    console.warn('Firebase Messaging not supported:', err);
  }
  return null;
};

// Request FCM Token for System & Push Notifications
export const requestFcmToken = async (vapidKey) => {
  try {
    const messaging = await getFirebaseMessaging();
    if (!messaging) return null;

    let swRegistration = null;
    if ('serviceWorker' in navigator) {
      swRegistration = await navigator.serviceWorker.ready;
    }

    const tokenOptions = {};
    if (swRegistration) {
      tokenOptions.serviceWorkerRegistration = swRegistration;
    }
    if (vapidKey) {
      tokenOptions.vapidKey = vapidKey;
    }

    const currentToken = await getToken(messaging, tokenOptions);
    if (currentToken) {
      console.log('🔥 [FCM Registration Token]:', currentToken);
      localStorage.setItem('crm_fcm_token', currentToken);
      return currentToken;
    }
    return null;
  } catch (err) {
    console.warn('FCM Token registration error:', err);
    return null;
  }
};

// Foreground message listener
export const onMessageListener = async (callback) => {
  try {
    const messaging = await getFirebaseMessaging();
    if (!messaging) return () => {};
    return onMessage(messaging, (payload) => {
      console.log('🔥 [FCM Foreground Message]:', payload);
      if (callback) callback(payload);
    });
  } catch (err) {
    console.warn('FCM onMessage listener error:', err);
    return () => {};
  }
};

export default app;
