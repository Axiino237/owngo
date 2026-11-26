const express = require('express');
const router = express.Router();
const { Attendance, User, Department, Role, LeaveRequest, AttendanceRegularization, Holiday, Organization, Permission } = require('../models');
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');
const { Op } = require('sequelize');
const { getDeptHeadScope } = require('../utils/departmentScope');

router.use(protect);

// ── Timezone & IST Helpers ──
const TIMEZONE = process.env.TIMEZONE || 'Asia/Kolkata';

// ── Helper: Get today's local date string in IST (YYYY-MM-DD) ──
const getLocalDateString = (d = new Date()) => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
};

// ── Helper: Check if check-in is late (Shift start cutoff: 09:30 AM IST) ──
const isLateCheckIn = (d = new Date(), cutoffTime = '09:30:59') => {
  const timeStr = d.toLocaleTimeString('en-GB', {
    timeZone: TIMEZONE,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  return timeStr > cutoffTime;
};

// ── Helper: Check if check-in is strictly after critical 09:45 AM cutoff (triggers 5-day late penalty rule) ──
const isCriticalLateCheckIn = (d = new Date()) => {
  return isLateCheckIn(d, '09:45:59');
};

// ── Helper: Parse Date or Time accurately into Asia/Kolkata (+05:30) ──
const parseISTDateTime = (dateStr, timeInput) => {
  if (!timeInput) return null;
  const s = String(timeInput).trim();
  if (s.includes('+') || s.endsWith('Z')) {
    return new Date(s);
  }
  if (s.includes('T')) {
    const parts = s.split('T');
    const d = parts[0];
    const t = parts[1].length === 5 ? `${parts[1]}:00` : parts[1].slice(0, 8);
    return new Date(`${d}T${t}+05:30`);
  }
  const cleanTime = s.length === 5 ? `${s}:00` : s;
  return new Date(`${dateStr}T${cleanTime}+05:30`);
};

// @desc   Check-in for today
// @route  POST /api/attendance/check-in
router.post('/check-in', async (req, res) => {
  try {
    const todayStr = getLocalDateString();
    
    // Check if check-in already exists
    const existing = await Attendance.findOne({
      where: { userId: req.user.id, date: todayStr }
    });

    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already checked in for today',
        attendance: existing,
        todayLog: existing
      });
    }

    // Determine status (Shift cutoff: 09:30 AM IST) - On Sunday, check-in is recorded as present (Sunday Duty)
    const now = new Date();
    const dayOfWeek = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE })).getDay();
    const isSunday = dayOfWeek === 0;
    const isLate = isSunday ? false : isLateCheckIn(now, '09:30:59');
    const status = isLate ? 'late' : 'present';

    const attendance = await Attendance.create({
      userId: req.user.id,
      date: todayStr,
      checkIn: now,
      status,
      notes: isSunday ? 'Sunday Duty' : null,
      organizationId: req.user.organizationId
    });

    const statusMsg = isSunday
      ? 'Checked in successfully for Sunday Duty'
      : (isLate ? 'Checked in successfully (Marked as Late - after 09:30 AM)' : 'Checked in successfully as present');
    res.status(201).json({ success: true, message: statusMsg, attendance, todayLog: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error during check-in', error: error.message });
  }
});

// @desc   Check-out for today
// @route  POST /api/attendance/check-out
router.post('/check-out', async (req, res) => {
  try {
    const todayStr = getLocalDateString();

    const attendance = await Attendance.findOne({
      where: { userId: req.user.id, date: todayStr }
    });

    if (!attendance) {
      return res.status(400).json({ success: false, message: 'No check-in record found for today' });
    }

    if (attendance.checkOut) {
      // If checkOut is in the future due to an extended shift, allow checking out now
      const checkOutMs = new Date(attendance.checkOut).getTime();
      const nowMs = Date.now();
      if (checkOutMs > nowMs || req.body?.force) {
        await attendance.update({
          checkOut: new Date()
        });
        return res.json({ success: true, message: 'Shift ended at current time', attendance, todayLog: attendance });
      }

      return res.status(400).json({ 
        success: false, 
        message: 'You have already checked out for today',
        attendance,
        todayLog: attendance
      });
    }

    await attendance.update({
      checkOut: new Date()
    });

    res.json({ success: true, message: 'Checked out successfully', attendance, todayLog: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error during check-out', error: error.message });
  }
});

// @desc   Extend today's shift after check-out or add overtime hours
// @route  POST /api/attendance/extend-session
router.post('/extend-session', async (req, res) => {
  try {
    const { hours } = req.body;
    const addHours = parseFloat(hours);
    if (!addHours || addHours <= 0 || addHours > 12) {
      return res.status(400).json({ success: false, message: 'Extension hours must be between 0.5 and 12 hours' });
    }

    const todayStr = getLocalDateString();
    const attendance = await Attendance.findOne({
      where: { userId: req.user.id, date: todayStr }
    });

    if (!attendance) {
      return res.status(400).json({ success: false, message: 'No attendance record found for today' });
    }

    // Base time: If user is checked out, extend from checkOut or now (whichever is later)
    // If not checked out, extend from now
    const baseMs = attendance.checkOut ? Math.max(new Date(attendance.checkOut).getTime(), Date.now()) : Date.now();
    const newCheckOut = new Date(baseMs + addHours * 60 * 60 * 1000);

    const extraNote = `Shift extended by +${addHours} hr(s) on ${new Date().toLocaleTimeString('en-IN', { timeZone: TIMEZONE })}`;
    const updatedNotes = attendance.notes ? `${attendance.notes}; ${extraNote}` : extraNote;

    await attendance.update({
      checkOut: newCheckOut,
      notes: updatedNotes
    });

    res.json({
      success: true,
      message: `Shift extended by ${addHours} hr(s) successfully! Total work duration updated.`,
      attendance,
      todayLog: attendance
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error extending session', error: error.message });
  }
});

// @desc   Get authoritative server time & today's IST status
// @route  GET /api/attendance/server-time
router.get('/server-time', (req, res) => {
  const now = new Date();
  const todayStr = getLocalDateString(now);
  const isLate = isLateCheckIn(now, '09:30:59');
  const serverYear = parseInt(new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric' }).format(now), 10);
  const serverMonth = parseInt(new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, month: 'numeric' }).format(now), 10);
  res.json({
    success: true,
    serverTime: now.toISOString(),
    serverDate: todayStr,
    serverYear,
    serverMonth,
    timeZone: TIMEZONE,
    isPastShiftStart: isLate
  });
});

// @desc   Get current user's monthly attendance summary
// @route  GET /api/attendance/my-summary
router.get('/my-summary', async (req, res) => {
  try {
    const now = new Date();
    const serverYear = parseInt(new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric' }).format(now), 10);
    const serverMonth = parseInt(new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, month: 'numeric' }).format(now), 10);
    const todayStr = getLocalDateString(now);
    const isLate = isLateCheckIn(now, '09:30:59');

    const year = parseInt(req.query.year || serverYear, 10);
    const month = parseInt(req.query.month || serverMonth, 10);

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const logs = await Attendance.findAll({
      where: {
        userId: req.user.id,
        date: { [Op.between]: [startDate, endDate] }
      },
      order: [['date', 'ASC']]
    });

    const leaves = await LeaveRequest.findAll({
      where: {
        userId: req.user.id,
        status: 'approved',
        [Op.or]: [
          { startDate: { [Op.between]: [startDate, endDate] } },
          { endDate: { [Op.between]: [startDate, endDate] } }
        ]
      }
    });

    const holidays = await Holiday.findAll({
      where: {
        date: { [Op.between]: [startDate, endDate] }
      },
      order: [['date', 'ASC']]
    });

    const deptScope = await getDeptHeadScope(req.user);
    const managedUsersCount = await User.count({ where: { managerId: req.user.id } });
    const userRole = req.user.role?.level;
    const isAdmin = ['super_admin', 'org_admin', 'company_admin'].includes(userRole) || req.user.isSuperAdmin;

    // Check UAM permission for team attendance access
    const { Permission } = require('../models');
    let hasTeamPerm = false;
    if (req.user.roleId) {
      const perm = await Permission.findOne({
        where: {
          roleId: req.user.roleId,
          module: 'attendance',
          screen: { [Op.in]: ['attendance-team', 'attendance-all-departments'] },
          canView: true
        }
      });
      if (perm) hasTeamPerm = true;
    }

    const hasTeamAccess = (managedUsersCount > 0) || deptScope.isDeptHead || (userRole === 'dept_manager') || isAdmin || hasTeamPerm;

    // Query today's attendance record explicitly to avoid timezone mismatches
    const todayRecord = await Attendance.findOne({
      where: { userId: req.user.id, date: todayStr }
    });

    // ── Calculate Late Arrival Metrics (>09:30 AM is normal late, >09:45 AM triggers 5-day deduction rule) ──
    let criticalLateCount = 0;
    let normalLateCount = 0;
    logs.forEach(l => {
      if (!l.checkIn) return;
      const logDate = new Date(l.date || l.checkIn);
      if (logDate.getDay() === 0) return; // Skip Sundays (voluntary duty)
      const checkInIST = new Date(l.checkIn).toLocaleTimeString('en-GB', {
        timeZone: TIMEZONE,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      if (checkInIST > '09:45:59') {
        criticalLateCount++;
      } else if (checkInIST > '09:30:59') {
        normalLateCount++;
      }
    });
    const latePenaltyUnits = Math.floor(criticalLateCount / 5);

    res.json({ 
      success: true, 
      serverTime: now.toISOString(),
      serverDate: todayStr,
      serverYear,
      serverMonth,
      isPastShiftStart: isLate,
      timeZone: TIMEZONE,
      logs, 
      todayLog: todayRecord,
      leaves, 
      holidays, 
      hasTeamAccess, 
      managedUsersCount,
      managedDeptIds: deptScope.managedDeptIds,
      criticalLateCount,
      normalLateCount,
      latePenaltyUnits
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error retrieving summary', error: error.message });
  }
});

// @desc   Get team today's attendance (for managers/heads/admins/scoped roles)
// @route  GET /api/attendance/team-today
router.get('/team-today', async (req, res) => {
  try {
    const { Permission } = require('../models');
    const userRole = req.user.role?.level;
    const isSuper = req.user.isSuperAdmin || userRole === 'super_admin';
    const isOrgAdmin = userRole === 'org_admin';
    const isCompanyAdmin = userRole === 'company_admin';
    const isAdmin = isSuper || isOrgAdmin || isCompanyAdmin;

    const deptScope = await getDeptHeadScope(req.user);
    const managedUsersCount = await User.count({ where: { managerId: req.user.id } });
    const isMappedManager = managedUsersCount > 0;
    const isDeptHead = deptScope.isDeptHead;
    const isManager = userRole === 'dept_manager';

    // 1. Team access check: admins, managers, dept heads, or roles with 'attendance-team' or 'attendance-all-departments'
    let canViewTeam = isAdmin || isDeptHead || isManager || isMappedManager;
    if (!canViewTeam && req.user.roleId) {
      const permTeam = await Permission.findOne({
        where: {
          roleId: req.user.roleId,
          module: 'attendance',
          screen: { [Op.in]: ['attendance-team', 'attendance-all-departments'] },
          canView: true
        }
      });
      if (permTeam) canViewTeam = true;
    }

    // 2. All departments check: admins or roles with 'attendance-all-departments'
    let canSwitchAllDepts = isAdmin;
    if (!canSwitchAllDepts && req.user.roleId) {
      const permAll = await Permission.findOne({
        where: {
          roleId: req.user.roleId,
          module: 'attendance',
          screen: 'attendance-all-departments',
          canView: true
        }
      });
      if (permAll) canSwitchAllDepts = true;
    }

    if (!canViewTeam) {
      return res.status(403).json({ success: false, message: 'Access denied: Team attendance permission required' });
    }

    let targetDeptId = req.query.departmentId || null;

    // Build user query scope - exclude staff exempt from attendance tracking
    const userWhere = { 
      isActive: true,
      attendanceRequired: { [Op.ne]: false }
    };
    if (!req.user.isSuperAdmin && req.user.organizationId) {
      userWhere.organizationId = req.user.organizationId;
    }

    if (!canSwitchAllDepts) {
      // User is locked to own department or managed departments!
      if (targetDeptId && targetDeptId !== 'All') {
        if (!deptScope.managedDeptIds.includes(targetDeptId) && targetDeptId !== req.user.departmentId) {
          return res.status(403).json({ success: false, message: 'Access denied: Department not within your managed scope' });
        }
        userWhere.departmentId = targetDeptId;
      } else {
        if (deptScope.managedDeptIds.length > 0) {
          userWhere.departmentId = { [Op.in]: deptScope.managedDeptIds };
        } else if (req.user.departmentId) {
          userWhere.departmentId = req.user.departmentId;
        } else if (isMappedManager) {
          userWhere.managerId = req.user.id;
        } else {
          userWhere.id = req.user.id;
        }
      }
    } else {
      // User can switch all departments
      if (targetDeptId && targetDeptId !== 'All') {
        userWhere.departmentId = targetDeptId;
      }
    }

    const deptUsers = await User.findAll({
      where: userWhere,
      attributes: ['id', 'name', 'email'],
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: Role, as: 'role', attributes: ['id', 'name'] }
      ]
    });

    const todayStr = getLocalDateString();
    const { startDate, endDate, date, month, year } = req.query;

    let effectiveStartDate = todayStr;
    let effectiveEndDate = todayStr;

    if (startDate && endDate) {
      effectiveStartDate = startDate;
      effectiveEndDate = endDate;
    } else if (date) {
      effectiveStartDate = date;
      effectiveEndDate = date;
    } else if (month) {
      const parsedYear = parseInt(year, 10) || new Date().getFullYear();
      const m = String(month).padStart(2, '0');
      const lastDay = new Date(parsedYear, parseInt(month, 10), 0).getDate();
      effectiveStartDate = `${parsedYear}-${m}-01`;
      effectiveEndDate = `${parsedYear}-${m}-${String(lastDay).padStart(2, '0')}`;
    }

    const isRange = effectiveStartDate !== effectiveEndDate;


    const userIds = deptUsers.map(u => u.id);

    const attendanceLogs = userIds.length > 0 ? await Attendance.findAll({
      where: {
        userId: { [Op.in]: userIds },
        date: { [Op.between]: [effectiveStartDate, effectiveEndDate] }
      },
      order: [['date', 'DESC'], ['checkIn', 'ASC']],
      raw: true
    }) : [];

    const approvedLeaves = userIds.length > 0 ? await LeaveRequest.findAll({
      where: {
        userId: { [Op.in]: userIds },
        status: 'approved',
        [Op.or]: [
          { startDate: { [Op.between]: [effectiveStartDate, effectiveEndDate] } },
          { endDate: { [Op.between]: [effectiveStartDate, effectiveEndDate] } }
        ]
      },
      raw: true
    }) : [];

    let teamAttendance = [];

    if (!isRange) {
      // Check if effectiveStartDate is Sunday (all Sundays are leave/off unless checked in)
      const [sYear, sMonth, sDay] = effectiveStartDate.split('-').map(Number);
      const dayOfWeek = new Date(sYear, sMonth - 1, sDay).getDay();
      const isSunday = dayOfWeek === 0;

      // Single Day mapping: show all scoped users
      teamAttendance = deptUsers.map(user => {
        const log = attendanceLogs.find(l => l.userId === user.id);
        const leave = approvedLeaves.find(l => l.userId === user.id && effectiveStartDate >= l.startDate && effectiveStartDate <= l.endDate);
        return {
          id: user.id,
          date: effectiveStartDate,
          name: user.name,
          email: user.email,
          department: user.department?.name || 'Unassigned',
          role: user.role?.name || 'User',
          isSunday,
          log: log ? {
            id: log.id,
            date: log.date,
            status: log.status,
            checkIn: log.checkIn,
            checkOut: log.checkOut,
            notes: isSunday ? (log.notes || 'Sunday Duty') : log.notes
          } : (isSunday ? {
            id: `sunday_${user.id}_${effectiveStartDate}`,
            date: effectiveStartDate,
            status: 'weekly_off',
            checkIn: null,
            checkOut: null,
            notes: 'Sunday Weekly Off'
          } : (leave ? {
            id: `leave_${leave.id}`,
            date: effectiveStartDate,
            status: 'on_leave',
            checkIn: null,
            checkOut: null,
            notes: leave.leaveType ? `Approved ${leave.leaveType} leave` : 'On Leave'
          } : null))
        };
      });
    } else {
      // Date Range / Month: show all attendance logs in the range
      const deptUserMap = new Map();
      deptUsers.forEach(u => deptUserMap.set(u.id, u));

      attendanceLogs.forEach(log => {
        const user = deptUserMap.get(log.userId);
        if (user) {
          teamAttendance.push({
            id: `${user.id}_${log.date}_${log.id}`,
            userId: user.id,
            date: log.date,
            name: user.name,
            email: user.email,
            department: user.department?.name || 'Unassigned',
            role: user.role?.name || 'User',
            log: {
              id: log.id,
              date: log.date,
              status: log.status,
              checkIn: log.checkIn,
              checkOut: log.checkOut,
              notes: log.notes
            }
          });
        }
      });

      // Add approved leaves
      approvedLeaves.forEach(leave => {
        const user = deptUserMap.get(leave.userId);
        if (user) {
          const s = new Date(leave.startDate) < new Date(effectiveStartDate) ? new Date(effectiveStartDate) : new Date(leave.startDate);
          const e = new Date(leave.endDate) > new Date(effectiveEndDate) ? new Date(effectiveEndDate) : new Date(leave.endDate);
          for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const alreadyHasLog = teamAttendance.some(t => t.userId === user.id && t.date === dateStr);
            if (!alreadyHasLog) {
              teamAttendance.push({
                id: `leave_${leave.id}_${dateStr}`,
                userId: user.id,
                date: dateStr,
                name: user.name,
                email: user.email,
                department: user.department?.name || 'Unassigned',
                role: user.role?.name || 'User',
                log: {
                  id: `leave_${leave.id}_${dateStr}`,
                  date: dateStr,
                  status: 'on_leave',
                  checkIn: null,
                  checkOut: null,
                  notes: leave.leaveType ? `Approved ${leave.leaveType} leave` : 'On Leave'
                }
              });
            }
          }
        }
      });

      // Sort by date DESC, then name ASC
      teamAttendance.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return a.name.localeCompare(b.name);
      });
    }

    const userDept = req.user.departmentId ? await Department.findByPk(req.user.departmentId) : null;

    res.json({
      success: true,
      date: effectiveStartDate,
      startDate: effectiveStartDate,
      endDate: effectiveEndDate,
      isRange,
      canSwitchAllDepts: Boolean(canSwitchAllDepts),
      canViewTeam: Boolean(canViewTeam),
      userDeptName: userDept?.name || '',
      isDesignDept: targetDeptId && targetDeptId !== 'All' ? await Department.findByPk(targetDeptId).then(d => d && (d.name.toLowerCase().includes('design') || (d.code && d.code.toLowerCase().includes('design')))) : false,
      teamAttendance
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error retrieving team attendance', error: error.message });
  }
});

// @desc   Apply for leave
// @route  POST /api/attendance/leave-request
router.post('/leave-request', async (req, res) => {
  try {
    const { startDate, endDate, leaveType, leaveDuration, halfDaySession, reason } = req.body;
    if (!startDate || !endDate || !reason) {
      return res.status(400).json({ success: false, message: 'Start date, end date, and reason are required' });
    }

    const user = await User.findByPk(req.user.id);
    const monthlyQuota = Number(user?.monthlyLeaveQuota ?? 1);

    // Calculate month of leave startDate
    const sDate = new Date(startDate);
    const y = sDate.getFullYear();
    const m = String(sDate.getMonth() + 1).padStart(2, '0');
    const monthStart = `${y}-${m}-01`;
    const lastDay = new Date(y, sDate.getMonth() + 1, 0).getDate();
    const monthEnd = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;

    // Count already approved leaves in this month
    const existingApproved = await LeaveRequest.findAll({
      where: {
        userId: req.user.id,
        status: 'approved',
        [Op.or]: [
          { startDate: { [Op.between]: [monthStart, monthEnd] } },
          { endDate: { [Op.between]: [monthStart, monthEnd] } }
        ]
      }
    });

    let alreadyUsedDays = 0;
    existingApproved.forEach(l => {
      let days = 1;
      if (l.leaveDuration === 'half_day') {
        days = 0.5;
      } else if (l.startDate && l.endDate) {
        const s = new Date(l.startDate);
        const e = new Date(l.endDate);
        days = Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1);
      }
      alreadyUsedDays += days;
    });

    const normType = (leaveType || 'casual').toLowerCase();
    let allocatedForType = 0;
    if (normType === 'casual') allocatedForType = Number(user?.casualLeaves ?? 10);
    else if (normType === 'sick') allocatedForType = Number(user?.sickLeaves ?? 8);
    else if (normType === 'paid' || normType === 'earned') allocatedForType = Number(user?.paidLeaves ?? 12);
    else allocatedForType = 10;

    const requestedDays = leaveDuration === 'half_day' ? 0.5 : (Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1));

    // Calculate all approved and pending leaves of this type in the current year
    const currYear = new Date().getFullYear();
    const yearStart = `${currYear}-01-01`;
    const yearEnd = `${currYear}-12-31`;

    const allApprovedOfThisType = await LeaveRequest.findAll({
      where: {
        userId: req.user.id,
        status: { [Op.in]: ['approved', 'pending'] },
        startDate: { [Op.gte]: yearStart },
        endDate: { [Op.lte]: yearEnd }
      }
    });

    let usedForType = 0;
    allApprovedOfThisType.forEach(l => {
      const t = (l.leaveType || '').toLowerCase();
      if ((normType === 'casual' && t === 'casual') ||
          (normType === 'sick' && t === 'sick') ||
          ((normType === 'paid' || normType === 'earned') && (t === 'paid' || t === 'earned'))) {
        let d = 1;
        if (l.leaveDuration === 'half_day') d = 0.5;
        else if (l.startDate && l.endDate) {
          const s = new Date(l.startDate);
          const e = new Date(l.endDate);
          d = Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1);
        }
        usedForType += d;
      }
    });

    const remainingForType = Math.max(0, allocatedForType - usedForType);
    if (['paid', 'casual', 'sick'].includes(normType) && remainingForType <= 0) {
      return res.status(400).json({
        success: false,
        message: `Insufficient leave balance! Your ${normType.toUpperCase()} Leave balance is 0. You cannot apply for this leave type.`
      });
    }

    if (['paid', 'casual', 'sick'].includes(normType) && requestedDays > remainingForType) {
      return res.status(400).json({
        success: false,
        message: `Requested ${requestedDays} day(s) exceeds your remaining ${normType.toUpperCase()} Leave balance of ${remainingForType} day(s).`
      });
    }

    // Count critical late check-ins (>09:45 AM, excluding Sundays) for the target month
    const monthLogs = await Attendance.findAll({
      where: {
        userId: req.user.id,
        date: { [Op.between]: [monthStart, monthEnd] },
        checkIn: { [Op.ne]: null }
      }
    });

    let criticalLateDays = 0;
    monthLogs.forEach(l => {
      const logDate = new Date(l.date || l.checkIn);
      if (logDate.getDay() === 0) return; // Skip Sundays
      const checkInIST = new Date(l.checkIn).toLocaleTimeString('en-GB', {
        timeZone: TIMEZONE,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      if (checkInIST > '09:45:59') criticalLateDays++;
    });

    const latePenaltyUnits = Math.floor(criticalLateDays / 5);
    const isLossOfPay = (alreadyUsedDays + requestedDays + latePenaltyUnits) > monthlyQuota;

    const leave = await LeaveRequest.create({
      userId: req.user.id,
      startDate,
      endDate,
      leaveType: leaveType || 'casual',
      leaveDuration: leaveDuration || 'full_day',
      halfDaySession: leaveDuration === 'half_day' ? halfDaySession : null,
      reason,
      status: 'pending',
      isLossOfPay,
      organizationId: req.user.organizationId
    });

    const msg = isLossOfPay 
      ? `Leave request submitted. (Note: Exceeds monthly quota of ${monthlyQuota} day(s); excess days will be treated as Loss of Pay)`
      : 'Leave request submitted successfully';

    res.status(201).json({ success: true, message: msg, leave, isLossOfPay });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error submitting leave request', error: error.message });
  }
});

// @desc   Get my leave requests and balances
// @route  GET /api/attendance/leave-requests/my
router.get('/leave-requests/my', async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'paidLeaves', 'casualLeaves', 'sickLeaves', 'monthlyLeaveQuota', 'baseSalary']
    });

    const leaves = await LeaveRequest.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });

    const paidQuota = Number(user?.paidLeaves ?? 12);
    const casualQuota = Number(user?.casualLeaves ?? 10);
    const sickQuota = Number(user?.sickLeaves ?? 8);
    const monthlyQuota = Number(user?.monthlyLeaveQuota ?? 1);

    const now = new Date();
    const currYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currMonthStart = `${currYearMonth}-01`;
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currMonthEnd = `${currYearMonth}-${String(lastDayOfMonth).padStart(2, '0')}`;

    let usedPaid = 0;
    let usedCasual = 0;
    let usedSick = 0;
    let thisMonthUsed = 0;

    leaves.filter(l => l.status === 'approved').forEach(l => {
      let days = 1;
      if (l.leaveDuration === 'half_day') {
        days = 0.5;
      } else if (l.startDate && l.endDate) {
        const s = new Date(l.startDate);
        const e = new Date(l.endDate);
        const diff = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
        days = diff > 0 ? diff : 1;
      }

      const type = (l.leaveType || '').toLowerCase();
      if (type === 'paid' || type === 'earned') {
        usedPaid += days;
      } else if (type === 'casual') {
        usedCasual += days;
      } else if (type === 'sick') {
        usedSick += days;
      }

      // Check if within current calendar month
      if ((l.startDate >= currMonthStart && l.startDate <= currMonthEnd) ||
          (l.endDate >= currMonthStart && l.endDate <= currMonthEnd)) {
        thisMonthUsed += days;
      }
    });

    // Also fetch this month's check-ins to factor in late penalties (>09:45 AM)
    const monthLogs = await Attendance.findAll({
      where: {
        userId: req.user.id,
        date: { [Op.between]: [currMonthStart, currMonthEnd] },
        checkIn: { [Op.ne]: null }
      }
    });
    let criticalLateDays = 0;
    monthLogs.forEach(l => {
      const logDate = new Date(l.date || l.checkIn);
      if (logDate.getDay() === 0) return; // Skip Sundays
      const checkInIST = new Date(l.checkIn).toLocaleTimeString('en-GB', {
        timeZone: TIMEZONE,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      if (checkInIST > '09:45:59') criticalLateDays++;
    });
    const latePenaltyUnits = Math.floor(criticalLateDays / 5);

    const balances = {
      paid: {
        allocated: paidQuota,
        used: usedPaid,
        remaining: Math.max(0, paidQuota - usedPaid)
      },
      casual: {
        allocated: casualQuota,
        used: usedCasual,
        remaining: Math.max(0, casualQuota - usedCasual)
      },
      sick: {
        allocated: sickQuota,
        used: usedSick,
        remaining: Math.max(0, sickQuota - usedSick)
      },
      monthly: {
        quota: monthlyQuota,
        used: thisMonthUsed,
        criticalLateDays,
        latePenaltyUnits,
        remaining: Math.max(0, monthlyQuota - (thisMonthUsed + latePenaltyUnits))
      }
    };

    const deptScope = await getDeptHeadScope(req.user);
    const managedUsersCount = await User.count({ where: { managerId: req.user.id } });
    const userRole = req.user.role?.level;
    const isAdmin = ['super_admin', 'org_admin', 'company_admin'].includes(userRole) || req.user.isSuperAdmin;
    const canApproveLeaves = isAdmin || (managedUsersCount > 0) || deptScope.isDeptHead || (userRole === 'dept_manager');

    res.json({ 
      success: true, 
      leaves, 
      balances, 
      monthlyQuota, 
      canApproveLeaves, 
      managedUsersCount,
      managedDeptIds: deptScope.managedDeptIds
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching leave requests', error: error.message });
  }
});

// @desc   Get team leave requests (for managers/heads/admins)
// @route  GET /api/attendance/leave-requests/team
router.get('/leave-requests/team', async (req, res) => {
  try {
    const userRole = req.user.role?.level;
    const isAdmin = ['super_admin', 'org_admin', 'company_admin'].includes(userRole) || req.user.isSuperAdmin;

    const deptScope = await getDeptHeadScope(req.user);
    const managedUsersCount = await User.count({ where: { managerId: req.user.id } });
    const hasTeamAccess = (managedUsersCount > 0) || (userRole === 'dept_manager') || deptScope.isDeptHead || isAdmin;

    if (!isAdmin && !hasTeamAccess) {
      return res.json({ success: true, leaves: [], canApproveLeaves: false, managedUsersCount: 0 });
    }

    const userWhere = {};
    if (!req.user.isSuperAdmin && req.user.organizationId) {
      userWhere.organizationId = req.user.organizationId;
    }

    if (!isAdmin) {
      // Must be mapped manager (managerId === req.user.id) OR department head across ANY managed department
      const orConditions = [{ managerId: req.user.id }];
      if (deptScope.managedDeptIds.length > 0) {
        orConditions.push({ departmentId: { [Op.in]: deptScope.managedDeptIds } });
      } else if (req.user.departmentId && userRole === 'dept_manager') {
        orConditions.push({ departmentId: req.user.departmentId });
      }
      userWhere[Op.or] = orConditions;
    }

    const deptUsers = await User.findAll({
      where: userWhere,
      attributes: ['id']
    });

    const leaves = await LeaveRequest.findAll({
      where: {
        userId: { [Op.in]: deptUsers.map(u => u.id) }
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'avatar', 'managerId', 'departmentId', 'monthlyLeaveQuota'],
          include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, leaves, canApproveLeaves: true, managedUsersCount, managedDeptIds: deptScope.managedDeptIds });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching team leave requests', error: error.message });
  }
});

// @desc   Update leave request status (Approve/Reject)
// @route  PUT /api/attendance/leave-request/:id/status
router.put('/leave-request/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const leave = await LeaveRequest.findByPk(req.params.id);
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    if (leave.userId === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot approve or reject your own leave request' });
    }

    // Verify organization boundary
    if (!req.user.isSuperAdmin && leave.organizationId && req.user.organizationId && leave.organizationId !== req.user.organizationId) {
      return res.status(403).json({ success: false, message: 'Access denied: User belongs to another organization' });
    }

    // Verify approver permission (mapped manager, dept head across ANY managed department, or admin)
    const userRole = req.user.role?.level;
    const isAdmin = ['super_admin', 'org_admin', 'company_admin'].includes(userRole) || req.user.isSuperAdmin;

    const targetUser = await User.findByPk(leave.userId);
    const isMappedManager = targetUser?.managerId === req.user.id;

    const deptScope = await getDeptHeadScope(req.user);
    const isDeptHead = targetUser?.departmentId && deptScope.managedDeptIds.includes(targetUser.departmentId);

    if (!isAdmin && !isMappedManager && !isDeptHead) {
      return res.status(403).json({ success: false, message: 'Access denied: You are not the assigned manager, department head, or admin for this user' });
    }

    await leave.update({
      status,
      approvedBy: req.user.id
    });

    // If approved, dynamically create attendance logs as 'on_leave' or 'half_day' for those dates!
    if (status === 'approved') {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const datesToSeed = [];

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        datesToSeed.push(d.toISOString().split('T')[0]);
      }

      const seedStatus = leave.leaveDuration === 'half_day' ? 'half_day' : 'on_leave';

      for (const dStr of datesToSeed) {
        await Attendance.upsert({
          userId: leave.userId,
          date: dStr,
          status: seedStatus,
          notes: leave.leaveDuration === 'half_day' ? `Half day leave: ${leave.halfDaySession === 'first_half' ? 'First Half' : 'Second Half'}` : null,
          organizationId: leave.organizationId
        });
      }
    }

    res.json({ success: true, message: `Leave request has been ${status}`, leave });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error updating leave request status', error: error.message });
  }
});

// @desc   Get all holidays
// @route  GET /api/attendance/holidays
router.get('/holidays', async (req, res) => {
  try {
    const holidays = await Holiday.findAll({
      where: req.user.isSuperAdmin ? {} : {
        [Op.or]: [
          { organizationId: req.user.organizationId },
          { organizationId: null }
        ]
      },
      order: [['date', 'ASC']]
    });
    res.json({ success: true, holidays });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error retrieving holidays', error: error.message });
  }
});

// @desc   Create a new holiday (Admin or attendance-holidays permission)
// @route  POST /api/attendance/holiday
router.post('/holiday', async (req, res) => {
  try {
    const userRole = req.user.role?.level;
    const isSuper = ['super_admin', 'org_admin', 'company_admin'].includes(userRole) || req.user.isSuperAdmin;
    let hasHolidayPerm = isSuper;
    if (!hasHolidayPerm && req.user.roleId) {
      const perm = await Permission.findOne({
        where: { roleId: req.user.roleId, module: 'attendance', screen: 'attendance-holidays' }
      });
      if (perm && (perm.canCreate || perm.canEdit || perm.canView)) hasHolidayPerm = true;
    }

    if (!hasHolidayPerm) {
      return res.status(403).json({ success: false, message: 'Access denied: Permission to create holidays required' });
    }

    const { name, date, type, description } = req.body;
    if (!name || !date) {
      return res.status(400).json({ success: false, message: 'Name and date are required' });
    }

    // Clean and validate date string
    const cleanDate = String(date).split('T')[0].trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
      return res.status(400).json({ success: false, message: 'Invalid date format. Expected YYYY-MM-DD' });
    }

    const allowedTypes = ['public', 'restricted', 'company'];
    const holidayType = allowedTypes.includes(type) ? type : 'public';

    const holiday = await Holiday.create({
      name: String(name).trim(),
      date: cleanDate,
      type: holidayType,
      description: description ? String(description).trim() : null,
      organizationId: req.user.organizationId || null
    });

    res.status(201).json({ success: true, message: 'Holiday created successfully', holiday });
  } catch (error) {
    console.error('Error creating holiday:', error);
    res.status(500).json({ success: false, message: 'Server error creating holiday', error: error.message });
  }
});

// @desc   Update a holiday (Admin or attendance-holidays permission)
// @route  PUT /api/attendance/holiday/:id
router.put('/holiday/:id', async (req, res) => {
  try {
    const userRole = req.user.role?.level;
    const isSuper = ['super_admin', 'org_admin', 'company_admin'].includes(userRole) || req.user.isSuperAdmin;
    let hasHolidayPerm = isSuper;
    if (!hasHolidayPerm && req.user.roleId) {
      const perm = await Permission.findOne({
        where: { roleId: req.user.roleId, module: 'attendance', screen: 'attendance-holidays' }
      });
      if (perm && (perm.canEdit || perm.canCreate || perm.canView)) hasHolidayPerm = true;
    }

    if (!hasHolidayPerm) {
      return res.status(403).json({ success: false, message: 'Access denied: Permission to edit holidays required' });
    }

    const holiday = await Holiday.findByPk(req.params.id);
    if (!holiday) {
      return res.status(404).json({ success: false, message: 'Holiday not found' });
    }

    if (!req.user.isSuperAdmin && holiday.organizationId && holiday.organizationId !== req.user.organizationId) {
      return res.status(403).json({ success: false, message: 'Access denied: Outside your organization' });
    }

    const { name, date, type, description } = req.body;
    let cleanDate = holiday.date;
    if (date) {
      cleanDate = String(date).split('T')[0].trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
        return res.status(400).json({ success: false, message: 'Invalid date format. Expected YYYY-MM-DD' });
      }
    }

    const allowedTypes = ['public', 'restricted', 'company'];
    const holidayType = type && allowedTypes.includes(type) ? type : holiday.type;

    await holiday.update({
      name: name ? String(name).trim() : holiday.name,
      date: cleanDate,
      type: holidayType,
      description: description !== undefined ? (description ? String(description).trim() : null) : holiday.description
    });

    res.json({ success: true, message: 'Holiday updated successfully', holiday });
  } catch (error) {
    console.error('Error updating holiday:', error);
    res.status(500).json({ success: false, message: 'Server error updating holiday', error: error.message });
  }
});

// @desc   Delete a holiday (Admin or attendance-holidays permission)
// @route  DELETE /api/attendance/holiday/:id
router.delete('/holiday/:id', async (req, res) => {
  try {
    const userRole = req.user.role?.level;
    const isSuper = ['super_admin', 'org_admin', 'company_admin'].includes(userRole) || req.user.isSuperAdmin;
    let hasHolidayPerm = isSuper;
    if (!hasHolidayPerm && req.user.roleId) {
      const perm = await Permission.findOne({
        where: { roleId: req.user.roleId, module: 'attendance', screen: 'attendance-holidays' }
      });
      if (perm && (perm.canDelete || perm.canEdit || perm.canView)) hasHolidayPerm = true;
    }

    if (!hasHolidayPerm) {
      return res.status(403).json({ success: false, message: 'Access denied: Permission to delete holidays required' });
    }

    const holiday = await Holiday.findByPk(req.params.id);
    if (!holiday) {
      return res.status(404).json({ success: false, message: 'Holiday not found' });
    }

    if (!req.user.isSuperAdmin && holiday.organizationId && holiday.organizationId !== req.user.organizationId) {
      return res.status(403).json({ success: false, message: 'Access denied: Outside your organization' });
    }

    await holiday.destroy();
    res.json({ success: true, message: 'Holiday deleted successfully' });
  } catch (error) {
    console.error('Error deleting holiday:', error);
    res.status(500).json({ success: false, message: 'Server error deleting holiday', error: error.message });
  }
});

// ─── ATTENDANCE REGULARIZATION (CORRECTION) ROUTES ────────────────────────

// @desc   Apply for attendance regularization (correction for absent / missed check-in)
// @route  POST /api/attendance/regularize
router.post('/regularize', async (req, res) => {
  try {
    const { date, checkIn, checkOut, reason } = req.body;
    if (!date || !reason) {
      return res.status(400).json({ success: false, message: 'Date and reason are required' });
    }

    const todayStr = getLocalDateString();
    if (date > todayStr) {
      return res.status(400).json({ success: false, message: 'Cannot apply attendance regularization for future dates' });
    }

    // Check if an existing pending regularization request exists for this date
    const existingReq = await AttendanceRegularization.findOne({
      where: {
        userId: req.user.id,
        date,
        status: 'pending'
      }
    });

    if (existingReq) {
      return res.status(400).json({ success: false, message: 'A pending correction request already exists for this date' });
    }

    const regularization = await AttendanceRegularization.create({
      userId: req.user.id,
      organizationId: req.user.organizationId,
      date,
      checkIn: parseISTDateTime(date, checkIn),
      checkOut: parseISTDateTime(date, checkOut),
      reason,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Attendance correction request submitted to your mapped manager',
      regularization
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error submitting regularization request', error: error.message });
  }
});

// @desc   Get logged-in user's regularization requests
// @route  GET /api/attendance/regularize/my-requests
router.get('/regularize/my-requests', async (req, res) => {
  try {
    const requests = await AttendanceRegularization.findAll({
      where: { userId: req.user.id },
      include: [
        { model: User, as: 'approver', attributes: ['id', 'name', 'email'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching regularization requests', error: error.message });
  }
});

// @desc   Get team regularization requests (for mapped manager / admins / attendance-correction-approvals permission)
// @route  GET /api/attendance/regularize/team-requests
router.get('/regularize/team-requests', async (req, res) => {
  try {
    const userRole = req.user.role?.level;
    const isSuper = ['super_admin', 'org_admin'].includes(userRole) || req.user.isSuperAdmin;
    let hasApprovalPerm = isSuper;
    if (!hasApprovalPerm && req.user.roleId) {
      const perm = await Permission.findOne({
        where: { roleId: req.user.roleId, module: 'attendance', screen: 'attendance-correction-approvals', canView: true }
      });
      if (perm) hasApprovalPerm = true;
    }

    const deptScope = await getDeptHeadScope(req.user);
    const isDeptHead = deptScope.isDeptHead;

    const userWhere = {};
    if (!req.user.isSuperAdmin && req.user.organizationId) {
      userWhere.organizationId = req.user.organizationId;
    }

    if (!isSuper && !hasApprovalPerm) {
      // Must be mapped manager (managerId === req.user.id) OR department head
      const orConditions = [{ managerId: req.user.id }];
      if (isDeptHead && deptScope.managedDeptIds.length > 0) {
        orConditions.push({ departmentId: { [Op.in]: deptScope.managedDeptIds } });
      }
      userWhere[Op.or] = orConditions;
    }

    const deptUsers = await User.findAll({
      where: userWhere,
      attributes: ['id']
    });

    const requests = await AttendanceRegularization.findAll({
      where: {
        userId: { [Op.in]: deptUsers.map(u => u.id) }
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'avatar', 'managerId', 'departmentId'],
          include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
        },
        { model: User, as: 'approver', attributes: ['id', 'name', 'email'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching team regularization requests', error: error.message });
  }
});

// @desc   Approve or Reject attendance regularization request
// @route  PUT /api/attendance/regularize/:id/status
router.put('/regularize/:id/status', async (req, res) => {
  try {
    const { status, managerNotes } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be approved or rejected' });
    }

    const regularization = await AttendanceRegularization.findByPk(req.params.id);
    if (!regularization) {
      return res.status(404).json({ success: false, message: 'Regularization request not found' });
    }

    if (regularization.userId === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot approve your own attendance regularization' });
    }

    // Verify organization boundary
    if (!req.user.isSuperAdmin && regularization.organizationId && req.user.organizationId && regularization.organizationId !== req.user.organizationId) {
      return res.status(403).json({ success: false, message: 'Access denied: Request is outside your organization' });
    }

    const targetUser = await User.findByPk(regularization.userId);
    const userRole = req.user.role?.level;
    const isAdmin = ['super_admin', 'org_admin'].includes(userRole) || req.user.isSuperAdmin;
    const isMappedManager = targetUser?.managerId === req.user.id;
    const deptScope = await getDeptHeadScope(req.user);
    const isDeptHead = targetUser?.departmentId && deptScope.managedDeptIds.includes(targetUser.departmentId);

    let hasApprovalPerm = isAdmin;
    if (!hasApprovalPerm && req.user.roleId) {
      const perm = await Permission.findOne({
        where: { roleId: req.user.roleId, module: 'attendance', screen: 'attendance-correction-approvals', canEdit: true }
      });
      if (perm) hasApprovalPerm = true;
    }

    if (!isAdmin && !isMappedManager && !isDeptHead && !hasApprovalPerm) {
      return res.status(403).json({ success: false, message: 'Access denied: Only mapped manager, admin, or authorized role can approve this request' });
    }

    await regularization.update({
      status,
      approvedBy: req.user.id,
      managerNotes: managerNotes || null
    });

    // If approved, update or insert attendance record as 'present'
    if (status === 'approved') {
      const parsedCheckIn = regularization.checkIn || parseISTDateTime(regularization.date, '09:30:00');
      const parsedCheckOut = regularization.checkOut || parseISTDateTime(regularization.date, '18:30:00');

      const [record, created] = await Attendance.findOrCreate({
        where: {
          userId: regularization.userId,
          date: regularization.date
        },
        defaults: {
          userId: regularization.userId,
          date: regularization.date,
          status: 'present',
          checkIn: parsedCheckIn,
          checkOut: parsedCheckOut,
          notes: `Regularized by ${req.user.name}: ${regularization.reason}`,
          organizationId: regularization.organizationId
        }
      });

      if (!created) {
        await record.update({
          status: 'present',
          checkIn: parsedCheckIn,
          checkOut: parsedCheckOut,
          notes: `Regularized by ${req.user.name}: ${regularization.reason}`
        });
      }
    }

    res.json({
      success: true,
      message: `Correction request has been ${status}${status === 'approved' ? ' (Attendance marked as PRESENT)' : ''}`,
      regularization
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error updating regularization status', error: error.message });
  }
});

// ─── PAYROLL / SALARY DEDUCTION SUMMARY ROUTE ─────────────────────────────

// @desc   Get monthly payroll and salary calculation summary (Organization-scoped)
// @route  GET /api/attendance/payroll-summary
router.get('/payroll-summary', async (req, res) => {
  try {
    const userRole = req.user.role?.level;
    const isSuper = req.user.isSuperAdmin || ['super_admin', 'org_admin'].includes(userRole);
    let hasPayrollPerm = isSuper;
    if (!hasPayrollPerm && req.user.roleId) {
      const perm = await Permission.findOne({
        where: { roleId: req.user.roleId, module: 'attendance', screen: 'attendance-payroll', canView: true }
      });
      if (perm) hasPayrollPerm = true;
    }

    if (!hasPayrollPerm) {
      return res.status(403).json({ success: false, message: 'Access denied: You do not have permission to view payroll summary' });
    }

    const orgId = req.user.isSuperAdmin ? (req.query.organizationId || req.user.organizationId || null) : (req.user.organizationId || null);

    // Resolve month (format: YYYY-MM)
    const now = new Date();
    const targetMonth = req.query.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [yearStr, monthStr] = targetMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const daysInMonth = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    const userWhere = { isActive: true };
    if (orgId) userWhere.organizationId = orgId;

    const users = await User.findAll({
      where: userWhere,
      attributes: ['id', 'name', 'email', 'avatar', 'baseSalary', 'monthlyLeaveQuota', 'organizationId', 'attendanceRequired'],
      include: [
        { model: Role, as: 'role', attributes: ['id', 'name'] },
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: User, as: 'manager', attributes: ['id', 'name'] }
      ],
      order: [['name', 'ASC']]
    });

    const userIds = users.map(u => u.id);

    // Fetch attendance logs for all users in this month
    const attendanceLogs = await Attendance.findAll({
      where: {
        userId: { [Op.in]: userIds },
        date: { [Op.between]: [startDate, endDate] }
      }
    });

    // Fetch approved leaves for all users in this month
    const approvedLeaves = await LeaveRequest.findAll({
      where: {
        userId: { [Op.in]: userIds },
        status: 'approved',
        [Op.or]: [
          { startDate: { [Op.between]: [startDate, endDate] } },
          { endDate: { [Op.between]: [startDate, endDate] } }
        ]
      }
    });

    // Calculate per-employee breakdown
    const employees = users.map(emp => {
      const baseSalary = parseFloat(emp.baseSalary) || 0;
      const monthlyQuota = parseInt(emp.monthlyLeaveQuota, 10) || 1;
      const perDaySalary = baseSalary > 0 ? (baseSalary / daysInMonth) : 0;

      const empLogs = attendanceLogs.filter(l => l.userId === emp.id);
      const empLeaves = approvedLeaves.filter(l => l.userId === emp.id);

      const presentDays = empLogs.filter(l => l.status === 'present' || l.status === 'late').length;
      const absentDays = empLogs.filter(l => l.status === 'absent').length;

      // ── CRITICAL LATE CALCULATION (> 09:45 AM cutoff, excluding Sundays) ──
      // Rule: 09:30 - 09:45 is marked late but ZERO salary or leave penalty.
      // Strictly after 09:45 AM: Every 5 days in a month = 1 leave quota cut.
      // Since monthly quota is 1, 10 days late = 1 leave quota cut + 1 day salary cut directly.
      let criticalLateDays = 0;
      let normalLateDays = 0;
      empLogs.forEach(l => {
        if (!l.checkIn) return;
        const logDate = new Date(l.date || l.checkIn);
        if (logDate.getDay() === 0) return; // Skip Sundays (voluntary overtime / duty)
        const checkInIST = new Date(l.checkIn).toLocaleTimeString('en-GB', {
          timeZone: TIMEZONE,
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        if (checkInIST > '09:45:59') {
          criticalLateDays++;
        } else if (checkInIST > '09:30:59') {
          normalLateDays++;
        }
      });

      // 5 days critical late = 1 penalty unit
      const latePenaltyUnits = Math.floor(criticalLateDays / 5);

      // Count approved leave days
      let totalApprovedLeaveDays = 0;
      empLeaves.forEach(l => {
        let dCount = 1;
        if (l.leaveDuration === 'half_day') dCount = 0.5;
        else if (l.startDate && l.endDate) {
          const s = new Date(Math.max(new Date(l.startDate), new Date(startDate)));
          const e = new Date(Math.min(new Date(l.endDate), new Date(endDate)));
          dCount = Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1);
        }
        totalApprovedLeaveDays += dCount;
      });

      // Total effective leave claim (actual taken leaves + penalty units from late check-ins)
      const totalEffectiveLeaveClaim = totalApprovedLeaveDays + latePenaltyUnits;

      // Quota absorption logic:
      // First, taken leaves consume free quota. If no leaves taken, late penalty absorbs quota.
      const remainingQuotaBeforeLate = Math.max(0, monthlyQuota - totalApprovedLeaveDays);
      const lateQuotaDeductionDays = Math.min(latePenaltyUnits, remainingQuotaBeforeLate);
      const lateSalaryDeductionDays = latePenaltyUnits - lateQuotaDeductionDays;

      const paidLeaveDays = Math.min(totalApprovedLeaveDays, monthlyQuota);
      const remainingMonthlyQuota = Math.max(0, monthlyQuota - totalEffectiveLeaveClaim);
      const leaveLOPDays = Math.max(0, totalApprovedLeaveDays - monthlyQuota);
      const excessLeaveDays = leaveLOPDays + lateSalaryDeductionDays;

      // Attendance requirement check: exempt users have 0 attendance deductions
      const isAttReq = emp.attendanceRequired !== false;
      const totalDeductionDays = isAttReq ? (absentDays + excessLeaveDays) : 0;
      const totalDeductionAmount = isAttReq ? Math.round(totalDeductionDays * perDaySalary) : 0;
      const netPayableSalary = isAttReq ? Math.max(0, Math.round(baseSalary - totalDeductionAmount)) : Math.round(baseSalary);

      return {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        role: emp.role?.name || 'User',
        department: emp.department?.name || 'General',
        manager: emp.manager?.name || 'None',
        attendanceRequired: isAttReq,
        baseSalary,
        monthlyQuota,
        remainingMonthlyQuota,
        perDaySalary: Math.round(perDaySalary),
        daysInMonth,
        presentDays: isAttReq ? presentDays : daysInMonth,
        absentDays: isAttReq ? absentDays : 0,
        normalLateDays,
        criticalLateDays,
        latePenaltyUnits,
        lateQuotaDeductionDays,
        lateSalaryDeductionDays,
        approvedLeaveDays: totalApprovedLeaveDays,
        paidLeaveDays,
        excessLeaveDays: isAttReq ? excessLeaveDays : 0, // Total LOP (Leave LOP + Late Penalty LOP)
        leaveLOPDays: isAttReq ? leaveLOPDays : 0,
        totalDeductionDays,
        totalDeductionAmount,
        netPayableSalary
      };
    });

    const totalBasePayroll = employees.reduce((acc, e) => acc + e.baseSalary, 0);
    const totalDeductions = employees.reduce((acc, e) => acc + e.totalDeductionAmount, 0);
    const totalNetPayroll = employees.reduce((acc, e) => acc + e.netPayableSalary, 0);

    res.json({
      success: true,
      month: targetMonth,
      daysInMonth,
      totalEmployees: employees.length,
      totalBasePayroll,
      totalDeductions,
      totalNetPayroll,
      employees
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error calculating payroll summary', error: error.message });
  }
});

// @desc   Manually trigger attendance check-in reminders (Admin or automated testing)
// @route  POST /api/attendance/trigger-reminders
router.post('/trigger-reminders', async (req, res) => {
  try {
    const { sendAttendanceReminders } = require('../utils/attendanceReminder');
    const io = req.app.get('io');
    const activeUsers = req.app.get('activeUsers');
    const force = req.query.force === 'true' || req.body.force === true;
    const result = await sendAttendanceReminders(io, activeUsers, force);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

