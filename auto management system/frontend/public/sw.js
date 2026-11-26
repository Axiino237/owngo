// OWNGO Service Worker for Web Push Notifications (Chrome, Edge, Safari Mac, iOS PWA, Android)

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ── Native W3C Web Push Listener (Direct VAPID from Backend) ──
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      try {
        const txt = event.data.text();
        if (txt && txt.trim()) {
          data = { title: 'OWNGO Notification', body: txt };
        }
      } catch (txtErr) {}
    }
  }

  // 1. Strict filter: Ignore empty/internal pings or heartbeat pushes so NO phantom notifications show
  if (!data.title && !data.body && !data.notification?.title && !data.notification?.body) {
    return;
  }

  const title = data.title || data.notification?.title || 'OWNGO Notification';
  const body = data.body || data.notification?.body || '';
  if (!title && !body) return;

  const isVideoCall = data.data?.type === 'video_call' || data.type === 'video_call';
  const rawPath = data.url || data.link || (data.data?.userId ? `/chat?userId=${data.data.userId}` : '/chat');
  
  const iconUrl = new URL((data.icon && !data.icon.endsWith('.svg')) ? data.icon : '/icon-192.png', self.location.origin).href;
  const badgeUrl = new URL('/icon-192.png', self.location.origin).href;

  const isApple = /Macintosh|MacIntel|iPad|iPhone|iPod/.test(navigator.userAgent || '');
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');

  const options = {
    body,
    icon: iconUrl,
    badge: badgeUrl,
    tag: data.tag || (isVideoCall ? `call-${data.data?.callerId || Date.now()}` : `crm-${Date.now()}`),
    renotify: true,
    requireInteraction: isVideoCall ? true : !isMobile,
    data: { 
      url: rawPath,
      userId: data.data?.userId || (data.tag && data.tag.startsWith('chat-') ? data.tag.split('-')[1] : null),
      isVideoCall
    }
  };

  if (isVideoCall) {
    options.actions = [
      { action: 'answer', title: '📞 Answer' },
      { action: 'decline', title: '❌ Decline' }
    ];
  }

  if (!isApple && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    options.vibrate = isVideoCall ? [300, 200, 300, 200, 300] : [200, 100, 200];
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification Click Handler: Accurate Direct Deep-Linking to Chat ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'decline') {
    return;
  }

  let urlPath = event.notification.data?.url;
  // Fallback: extract userId from tag or data if urlPath is missing or generic '/chat'
  if ((!urlPath || urlPath === '/chat') && event.notification.data?.userId) {
    urlPath = `/chat?userId=${event.notification.data.userId}`;
  } else if ((!urlPath || urlPath === '/chat') && event.notification.tag && event.notification.tag.startsWith('chat-')) {
    const parts = event.notification.tag.split('-');
    const uid = parts[1];
    if (uid && uid !== 'general' && uid !== 'alert') {
      urlPath = `/chat?userId=${uid}`;
    }
  }
  if (!urlPath) urlPath = '/chat';

  const targetUrl = new URL(urlPath, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // 1. If an existing tab/window of CRM is open, focus it and tell React Router to navigate
      for (const client of windowClients) {
        if (client.url && client.url.includes(self.location.host) && 'focus' in client) {
          return client.focus().then(() => {
            // Send navigation signal to React Router inside the app
            client.postMessage({ type: 'NAVIGATE_TO', url: urlPath });
            // Only use client.navigate if on a completely different page (not already on /chat)
            if ('navigate' in client) {
              try {
                const currentUrl = new URL(client.url);
                const targetUrlObj = new URL(targetUrl);
                if (currentUrl.pathname !== targetUrlObj.pathname) {
                  return client.navigate(targetUrl).catch(() => {});
                }
              } catch (e) {}
            }
          });
        }
      }

      // 2. If no window is open (browser was closed or tab closed), open directly to target URL
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
