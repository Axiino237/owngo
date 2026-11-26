# Background Web Push Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable background system push notifications that deliver and pop up on desktop and mobile even when the browser or CRM tab is completely closed, compatible with Google Chrome (PC & Android), Microsoft Edge, and Apple Safari (macOS & iOS 16.4+ PWA), and deploy live to `169.58.78.11`.

**Architecture:** Standard W3C Web Push with VAPID (RFC 8292). The backend generates a VAPID keypair and stores user device subscriptions in `crm_push_subscriptions`. The frontend service worker (`sw.js` and `firebase-messaging-sw.js`) listens for the native `'push'` event and wakes up in the background to show native OS notifications. The backend dispatches notifications during attendance reminders, chat messages, and lead updates.

**Tech Stack:** Node.js, Express, `web-push`, PostgreSQL (Sequelize), React 18, Vite, Service Workers, PM2, Paramiko (SSH deployment).

---

## Global Constraints

- Must work across Chrome (Desktop/Android), Edge, Safari (macOS 16+), and Safari iOS 16.4+ (Standalone PWA mode).
- No external private JSON credentials required (VAPID keypair generated dynamically and saved in `.env`).
- Database table `crm_push_subscriptions` must support multiple devices per user (e.g. user laptop + user mobile).
- Must automatically delete expired or unsubscribed push subscriptions (HTTP 404/410 Gone from Google/Apple push servers).
- Must deploy cleanly to live production server `169.58.78.11` without downtime.

## Review Focus

1. **Browser completely closed:** Verify Service Worker handles the `push` event and calls `self.registration.showNotification()` with title, body, icon, and click-target URL.
2. **Notification click behavior:** Verify clicking a notification opens/focuses the CRM window and navigates to the target URL.
3. **Multi-device dispatch:** Verify a single user logged into both desktop and mobile receives notifications on both devices.
4. **Expired endpoint cleanup:** Verify backend gracefully catches 410 Gone / 404 from Google/Apple push gateways and removes stale subscriptions.
5. **Safari iOS PWA compatibility:** Verify manifest `display: standalone` and PNG icons are used so Apple WebKit does not reject notifications.

---

### Task 1: Backend Setup & VAPID Key Generation

**Files:**
- Create: `backend/utils/webPush.js`
- Modify: `backend/package.json`
- Modify: `backend/.env` & server `.env`

- [ ] **Step 1: Install `web-push` in `backend`**
  Run: `npm install web-push` in `backend/`
- [ ] **Step 2: Generate VAPID keypair**
  Generate `publicKey` and `privateKey` using `web-push.generateVAPIDKeys()`.
- [ ] **Step 3: Create `backend/utils/webPush.js`**
  Implement VAPID initialization, `sendPushToUser(userId, payload)`, and `sendPushToUsers(userIds, payload)` with automatic stale subscription cleanup.

---

### Task 2: Push Subscription Database Model

**Files:**
- Create: `backend/models/PushSubscription.js`
- Modify: `backend/models/index.js`

- [ ] **Step 1: Create `backend/models/PushSubscription.js`**
  Define `crm_push_subscriptions` schema: `userId`, `endpoint`, `p256dh`, `auth`, `userAgent`, `deviceType`.
- [ ] **Step 2: Register association in `backend/models/index.js`**
  Link `User.hasMany(PushSubscription)` and `PushSubscription.belongsTo(User)`.

---

### Task 3: Backend Push API Routes & Event Integration

**Files:**
- Create: `backend/routes/notifications.js`
- Modify: `backend/server.js`
- Modify: `backend/utils/attendanceReminder.js`
- Modify: `backend/routes/chat.js`
- Modify: `backend/routes/leads.js`

- [ ] **Step 1: Create `backend/routes/notifications.js`**
  Implement endpoints:
  - `GET /api/notifications/vapid-key`: Public key for frontend subscription.
  - `POST /api/notifications/subscribe`: Save/update device push subscription.
  - `POST /api/notifications/unsubscribe`: Remove push subscription.
  - `POST /api/notifications/test-push`: Send instant test push to verify background delivery.
- [ ] **Step 2: Mount routes in `backend/server.js`**
- [ ] **Step 3: Trigger push in `attendanceReminder.js`, `chat.js`, and `leads.js`**
  Dispatch background push notifications so reminders and messages wake up the user's device even when the tab/browser is closed.

---

### Task 4: Frontend Service Worker & Push Manager

**Files:**
- Modify: `frontend/public/firebase-messaging-sw.js`
- Modify: `frontend/public/sw.js`
- Create: `frontend/src/utils/webPushManager.js`
- Modify: `frontend/src/App.jsx` (or main layout to auto-subscribe upon login)

- [ ] **Step 1: Update Service Workers with W3C `push` and `notificationclick` listeners**
  Add background push handler that handles payloads from both Chrome (FCM) and Safari/Apple (APNs).
- [ ] **Step 2: Create `frontend/src/utils/webPushManager.js`**
  Implement subscription workflow: check browser support, request permission, fetch VAPID key, subscribe via `pushManager.subscribe`, and send subscription to backend.
- [ ] **Step 3: Auto-subscribe authenticated users**
  Call subscription manager on login or app mount so the device is registered with the backend.
- [ ] **Step 4: Build frontend**
  Run: `npm run build` in `frontend/`.

---

### Task 5: Live Server Deployment to `169.58.78.11` & Verification

**Files:**
- Modify/Execute: `deploy_to_169.py`

- [ ] **Step 1: Upload updated backend files and database migration**
- [ ] **Step 2: Update server `.env` with VAPID keys**
- [ ] **Step 3: Upload rebuilt frontend `dist/` to `/var/www/crm/frontend/dist`**
- [ ] **Step 4: Install `web-push` on server and restart PM2 `crm-backend`**
- [ ] **Step 5: Verify health and execute end-to-end push test via API**
