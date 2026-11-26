const { User, Attendance, LeaveRequest, Holiday } = require('../models');
const { Op } = require('sequelize');

const TIMEZONE = process.env.TIMEZONE || 'Asia/Kolkata';

// Helper to get today's local date string in IST (YYYY-MM-DD)
function getTodayIST() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date());
}

// Helper to get current hour, minute and day of week in IST
function getISTTimeInfo() {
  const now = new Date();
  const istDateStr = now.toLocaleString('en-US', { timeZone: TIMEZONE });
  const istDate = new Date(istDateStr);
  const hour = istDate.getHours();
  const minute = istDate.getMinutes();
  const dayOfWeek = istDate.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  return { hour, minute, dayOfWeek };
}

/**
 * Checks all active users. If a user has not checked in today, has no approved full-day leave,
 * and today is not an official holiday, sends an attendance reminder notification every 30 minutes.
 * @param {object} io - Socket.io instance
 * @param {Map} activeUsers - Map of userId -> Set of socket IDs
 * @param {boolean} force - If true, bypasses shift hours & Sunday check (for manual testing)
 */
async function sendAttendanceReminders(io, activeUsers, force = false) {
  if (!io) return { sentCount: 0, message: 'Socket.io instance not ready' };

  const { hour, minute, dayOfWeek } = getISTTimeInfo();

  if (!force) {
    // Skip Sundays
    if (dayOfWeek === 0) {
      return { sentCount: 0, message: 'Sunday: Shift reminders skipped' };
    }

    // Shift window: 09:30 AM to 06:30 PM IST (570 mins to 1110 mins)
    const totalMinutes = hour * 60 + minute;
    if (totalMinutes < 9 * 60 + 30 || totalMinutes > 18 * 60 + 30) {
      return { sentCount: 0, message: 'Outside shift window (09:30 AM - 06:30 PM IST)' };
    }
  }

  const todayStr = getTodayIST();

  try {
    // 1. Fetch all active users who require attendance tracking
    const users = await User.findAll({
      where: { 
        isActive: true,
        attendanceRequired: { [Op.ne]: false }
      },
      attributes: ['id', 'name', 'email', 'organizationId', 'attendanceRequired']
    });

    if (!users || users.length === 0) {
      return { sentCount: 0, message: 'No active users found' };
    }

    // 2. Fetch all users who have already checked in today
    const todayAttendances = await Attendance.findAll({
      where: {
        date: todayStr,
        checkIn: { [Op.ne]: null }
      },
      attributes: ['userId']
    });
    const checkedInUserIds = new Set(todayAttendances.map(a => String(a.userId)));

    // 3. Fetch all users who have an approved full-day leave covering today
    const leavesToday = await LeaveRequest.findAll({
      where: {
        status: 'approved',
        leaveDuration: 'full_day',
        startDate: { [Op.lte]: todayStr },
        endDate: { [Op.gte]: todayStr }
      },
      attributes: ['userId']
    });
    const onLeaveUserIds = new Set(leavesToday.map(l => String(l.userId)));

    // 4. Fetch official holidays for today
    const holidaysToday = await Holiday.findAll({
      where: { date: todayStr },
      attributes: ['organizationId']
    });
    const holidayOrgIds = new Set(holidaysToday.map(h => String(h.organizationId)));

    // 5. Filter users needing check-in reminder
    const usersToRemind = users.filter(u => {
      const uid = String(u.id);
      if (checkedInUserIds.has(uid)) return false;
      if (onLeaveUserIds.has(uid)) return false;
      if (u.organizationId && holidayOrgIds.has(String(u.organizationId))) return false;
      return true;
    });

    if (usersToRemind.length === 0) {
      return { sentCount: 0, message: 'All active users have already checked in or are on approved leave' };
    }

    console.log(`⏰ [Attendance Reminder] Sending 30m check-in alert to ${usersToRemind.length} user(s) for ${todayStr}`);

    usersToRemind.forEach(u => {
      const uid = String(u.id);
      const reminder = {
        type: 'attendance_reminder',
        userId: u.id,
        userName: u.name,
        date: todayStr,
        title: 'Check-in Reminder ⏰',
        message: `Hello ${u.name || 'there'}! You haven't checked in yet today (${todayStr}). Please mark your attendance now.`,
        link: '/attendance',
        timestamp: new Date().toISOString()
      };

      // Emit to user room (reaches active open tabs / mobile browsers for this user)
      io.to(`user_${uid}`).emit('attendance_reminder', reminder);

      const socketIds = activeUsers?.get(u.id) || activeUsers?.get(uid) || activeUsers?.get(Number(u.id));
      if (socketIds) {
        socketIds.forEach(sid => io.to(sid).emit('attendance_reminder', reminder));
      }

      // Deliver via Web Push (wakes up device even when browser is completely closed)
      const { sendPushToUser } = require('./webPush');
      sendPushToUser(u.id, {
        title: 'Check-in Reminder ⏰',
        body: `Hello ${u.name || 'there'}! You haven't checked in yet today (${todayStr}). Please mark your attendance now.`,
        url: '/attendance',
        tag: `attendance-${todayStr}`
      }).catch(err => console.warn(`[Attendance WebPush error for ${u.name}]:`, err.message));
    });

    return {
      sentCount: usersToRemind.length,
      users: usersToRemind.map(u => ({ id: u.id, name: u.name })),
      date: todayStr
    };
  } catch (err) {
    console.error('❌ [Attendance Reminder Error]:', err);
    return { sentCount: 0, error: err.message };
  }
}

/**
 * Initializes the recurring 30-minute attendance reminder service
 */
function startAttendanceReminderService(io, activeUsers) {
  console.log('⏰ Attendance 30-minute reminder service started (IST Shift Window: 09:30 AM - 06:30 PM).');

  // Initial check 20 seconds after server startup
  setTimeout(() => {
    sendAttendanceReminders(io, activeUsers).catch(err => {
      console.error('Attendance initial reminder error:', err.message);
    });
  }, 20000);

  // Recurring check every 30 minutes (30 * 60 * 1000 ms)
  setInterval(() => {
    sendAttendanceReminders(io, activeUsers).catch(err => {
      console.error('Attendance 30m reminder error:', err.message);
    });
  }, 30 * 60 * 1000);
}

module.exports = {
  startAttendanceReminderService,
  sendAttendanceReminders,
  getTodayIST
};
