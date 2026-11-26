require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const { connectDB } = require('./config/db');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: true,
    credentials: true
  }
});

// Map of active users: userId -> Set(socket.id)
const activeUsers = new Map();
// Map of active calls: socket.id -> targetUserId
const activeCallPairs = new Map();

// Configure socket authentication middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) return next(new Error('Authentication error: Token missing'));

  try {
    const jwt = require('jsonwebtoken');
    const { User, Role } = require('./models');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findByPk(decoded.id, {
      include: [{ model: Role, as: 'role' }]
    });

    if (!user || !user.isActive) {
      return next(new Error('Authentication error: Invalid or inactive user'));
    }

    socket.user = user;
    next();
  } catch (err) {
    return next(new Error('Authentication error: Token invalid'));
  }
});

// Connection handler
io.on('connection', (socket) => {
  const userId = socket.user.id;
  
  if (!activeUsers.has(userId)) {
    activeUsers.set(userId, new Set());
    // Broadcast user online status change
    io.emit('status_change', { userId, isOnline: true });
  }
  activeUsers.get(userId).add(socket.id);

  // Join personal user room so direct messages reach all sockets for this user
  socket.join(`user_${userId}`);
  socket.join(`user_${String(userId)}`);

  // Join rooms for easy broadcasting
  socket.join(`org_${socket.user.organizationId}`);
  if (socket.user.companyId) {
    socket.join(`company_${socket.user.companyId}`);
  }

  // 🎥 WebRTC Video & Audio Call Signaling
  socket.on('call:initiate', async ({ receiverId, callType = 'video', channelId }) => {
    const caller = socket.user;
    activeCallPairs.set(socket.id, receiverId);

    const callData = {
      callerId: caller.id,
      callerName: caller.name,
      callerAvatar: caller.avatar,
      receiverId,
      callType,
      channelId,
      timestamp: Date.now()
    };

    // Emit cleanly to the recipient's personal user room
    io.to(`user_${receiverId}`).emit('call:incoming', callData);

    // Deliver Web Push notification if receiver is in background / closed
    try {
      const { sendPushToUser } = require('./utils/webPush');
      sendPushToUser(receiverId, {
        title: `🎥 Incoming Video Call from ${caller.name}`,
        body: `Tap to answer the call`,
        url: `/chat?userId=${caller.id}&incomingCall=true`,
        tag: `call-${caller.id}`,
        requireInteraction: true,
        data: {
          type: 'video_call',
          callerId: caller.id,
          callerName: caller.name,
          callType
        }
      }).catch(err => console.warn('[VideoCall WebPush error]:', err.message));
    } catch (e) {}
  });

  // Helper to cleanly remove active call pairings between two users
  const clearActiveCall = (userId1, userId2) => {
    for (const [sid, peerId] of activeCallPairs.entries()) {
      if (String(peerId) === String(userId1) || String(peerId) === String(userId2)) {
        activeCallPairs.delete(sid);
      }
    }
  };

  socket.on('call:accept', ({ callerId }) => {
    activeCallPairs.set(socket.id, callerId);

    io.to(`user_${callerId}`).emit('call:accepted', {
      receiverId: socket.user.id,
      receiverName: socket.user.name
    });
  });

  socket.on('call:reject', ({ callerId, reason }) => {
    activeCallPairs.delete(socket.id);
    clearActiveCall(socket.user.id, callerId);

    io.to(`user_${callerId}`).emit('call:rejected', {
      receiverId: socket.user.id,
      receiverName: socket.user.name,
      reason: reason || 'declined'
    });
  });

  socket.on('call:end', ({ targetUserId }) => {
    activeCallPairs.delete(socket.id);
    clearActiveCall(socket.user.id, targetUserId);

    if (targetUserId) {
      io.to(`user_${targetUserId}`).emit('call:ended', {
        fromUserId: socket.user.id
      });
    }
  });

  socket.on('call:signal', ({ targetUserId, signal }) => {
    if (targetUserId) {
      io.to(`user_${targetUserId}`).emit('call:signal', {
        fromUserId: socket.user.id,
        signal
      });
    }
  });

  socket.on('disconnect', () => {
    // If user disconnects during an ongoing call, inform the other party immediately
    if (activeCallPairs.has(socket.id)) {
      const peerId = activeCallPairs.get(socket.id);
      activeCallPairs.delete(socket.id);
      if (peerId) {
        io.to(`user_${peerId}`).emit('call:ended', { fromUserId: userId });
      }
    }

    const userSockets = activeUsers.get(userId);
    if (userSockets) {
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        activeUsers.delete(userId);
        // Broadcast user offline status change
        io.emit('status_change', { userId, isOnline: false });
      }
    }
  });
});

// Attach socket objects to express app
app.set('io', io);
app.set('activeUsers', activeUsers);

// ⏰ Start automated 30-minute check-in reminder service (IST Shift Hours)
const { startAttendanceReminderService } = require('./utils/attendanceReminder');
startAttendanceReminderService(io, activeUsers);

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: true, limit: '200mb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/uam', require('./routes/uam'));
app.use('/api/roles', require('./routes/roles'));
app.use('/api/permissions', require('./routes/permissions'));
app.use('/api/organizations', require('./routes/organizations'));
app.use('/api/companies', require('./routes/companies'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/org-overview', require('./routes/orgOverview'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/lead-statuses', require('./routes/leadStatuses'));
app.use('/api/job-requests', require('./routes/jobRequests'));
app.use('/api/job-request-statuses', require('./routes/jobRequestStatuses'));
app.use('/api/expos', require('./routes/expos'));
app.use('/api/performance', require('./routes/performance'));
app.use('/api/closed-sales', require('./routes/closedSales'));
app.use('/api/designs', require('./routes/designs'));
app.use('/api/audit-logs', require('./routes/auditLogs'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/staff-summary', require('./routes/staffSummary'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/autos', require('./routes/autos'));
app.use('/api/drivers', require('./routes/drivers'));
app.use('/api/loan-applications', require('./routes/loanApplications'));
app.use('/api/partners', require('./routes/partners'));
app.use('/api/campaign-links', require('./routes/campaignLinks'));
app.use('/uploads', require('express').static(require('path').join(__dirname, 'uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'CRM API is running', timestamp: new Date() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'File is too large. Maximum allowed size is 2GB.' });
  }
  res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;

// Start server only after DB is fully connected + synced
const startServer = async () => {
  // Wait for DB connection + ALTER TYPE + sync to complete
  await connectDB();

  server.listen(PORT, async () => {
    console.log(`\n🚀 CRM Server running on http://localhost:${PORT}`);
    console.log(`📋 API Docs: http://localhost:${PORT}/api/health\n`);

    // Auto-seed/ensure permissions for admin-level roles on startup
    try {
      const { Role, Permission } = require('./models');
      const { Op } = require('sequelize');

      // Automatically correct custom roles that need correct level mapping
      await Role.update({ level: 'org_admin' }, { where: { name: 'ORG ADMIN' } });
      await Role.update({ level: 'dept_manager' }, { where: { name: 'Tele Team head' } });

      // Seed for ALL elevated roles: system admins + org admins + department managers + directors
      const adminRoles = await Role.findAll({
        where: {
          [Op.or]: [
            { code: ['SUPER_ADMIN', 'ADMIN', 'DIRECTOR'] },
            { level: ['super_admin', 'org_admin', 'dept_manager', 'company_admin'] },
            { name: { [Op.iLike]: '%director%' } },
            { name: { [Op.iLike]: '%admin%' } }
          ]
        }
      });

      const permissionsRouter = require('./routes/permissions');
      const MODULE_SCREENS = permissionsRouter.MODULE_SCREENS;

      for (const role of adminRoles) {
        if (MODULE_SCREENS) {
          for (const [mod, scrList] of Object.entries(MODULE_SCREENS)) {
            for (const scr of scrList) {
              const [perm, created] = await Permission.findOrCreate({
                where: { roleId: role.id, module: mod, screen: scr },
                defaults: { roleId: role.id, module: mod, screen: scr, canView: true, canCreate: true, canEdit: true, canDelete: true }
              });
              const isExec = role.code === 'SUPER_ADMIN' || role.code === 'DIRECTOR' || role.level === 'super_admin' || role.name?.toLowerCase().includes('director');
              if (!created && isExec) {
                perm.canView = true;
                perm.canCreate = true;
                perm.canEdit = true;
                perm.canDelete = true;
                await perm.save();
              }
            }
          }
        }
      }
      console.log(`✅ Permissions auto-synced for ${adminRoles.length} admin-level role(s)`);
    } catch (err) {
      console.log('⚠️ Could not auto-sync permissions:', err.message);
    }
  });
};

startServer();
