var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var AttendancePage_exports = {};
__export(AttendancePage_exports, {
  calculateDuration: () => calculateDuration,
  default: () => AttendancePage_default,
  formatTime: () => formatTime,
  getISTDateStr: () => getISTDateStr
});
module.exports = __toCommonJS(AttendancePage_exports);
var import_jsx_runtime = require("react/jsx-runtime");
var import_react = require("react");
var import_react_hot_toast = __toESM(require("react-hot-toast"), 1);
var import_ri = require("react-icons/ri");
var import_AppLayout = __toESM(require("../components/AppLayout"), 1);
var import_AuthContext = require("../context/AuthContext");
var import_apiSlice = require("../store/apiSlice");
const formatTime = (timeStr, includeSeconds = false) => {
  if (!timeStr) return "-";
  try {
    return new Date(timeStr).toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      ...includeSeconds ? { second: "2-digit" } : {},
      hour12: true
    });
  } catch {
    return new Date(timeStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
};
const getISTDateStr = (dateInput = /* @__PURE__ */ new Date()) => {
  try {
    const d = typeof dateInput === "string" || typeof dateInput === "number" ? new Date(dateInput) : dateInput;
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(d);
  } catch {
    return (/* @__PURE__ */ new Date()).toLocaleDateString("en-CA");
  }
};
const calculateDuration = (checkInTime, checkOutTime) => {
  if (!checkInTime || !checkOutTime) return "-";
  const diffMs = new Date(checkOutTime) - new Date(checkInTime);
  if (diffMs < 0) return "-";
  const totalMins = Math.floor(diffMs / (1e3 * 60));
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `${hrs} hrs ${mins} mins`;
};
const AttendancePage = () => {
  const { user, hasPermission } = (0, import_AuthContext.useAuth)();
  const isAdmin = ["super_admin", "org_admin", "company_admin"].includes(user?.role?.level) || user?.isSuperAdmin;
  const canSeeCalendar = user?.isSuperAdmin || hasPermission("attendance", "attendance-list", "canView");
  const canSeeMyCorrections = user?.isSuperAdmin || hasPermission("attendance", "attendance-my-corrections", "canView") || hasPermission("attendance", "attendance-list", "canView");
  const canSeeCorrectionApprovals = user?.isSuperAdmin || hasPermission("attendance", "attendance-correction-approvals", "canView") || isAdmin && hasPermission("attendance", "attendance-correction-approvals", "canView") !== false;
  const canSeePayroll = user?.isSuperAdmin || hasPermission("attendance", "attendance-payroll", "canView");
  const canSeeTeamLogs = user?.isSuperAdmin || hasPermission("attendance", "attendance-team", "canView") || hasPermission("attendance", "attendance-all-departments", "canView");
  const canSeeHolidays = user?.isSuperAdmin || hasPermission("attendance", "attendance-holidays", "canView") || isAdmin && hasPermission("attendance", "attendance-holidays", "canView") !== false;
  const hasAllDeptsPerm = hasPermission("attendance", "attendance-all-departments", "canView");
  const canAccessTeam = canSeeTeamLogs || canSeeCorrectionApprovals || canSeePayroll;
  const [activeTab, setActiveTab] = (0, import_react.useState)("my-attendance");
  const [holidayName, setHolidayName] = (0, import_react.useState)("");
  const [holidayDate, setHolidayDate] = (0, import_react.useState)("");
  const [holidayType, setHolidayType] = (0, import_react.useState)("public");
  const [holidayDesc, setHolidayDesc] = (0, import_react.useState)("");
  const [serverOffset, setServerOffset] = (0, import_react.useState)(0);
  const [currentServerTime, setCurrentServerTime] = (0, import_react.useState)(() => /* @__PURE__ */ new Date());
  const [currentYear, setCurrentYear] = (0, import_react.useState)(() => (/* @__PURE__ */ new Date()).getFullYear());
  const [currentMonth, setCurrentMonth] = (0, import_react.useState)(() => (/* @__PURE__ */ new Date()).getMonth() + 1);
  const [searchQuery, setSearchQuery] = (0, import_react.useState)("");
  const [selectedDept, setSelectedDept] = (0, import_react.useState)("All");
  const [selectedStatus, setSelectedStatus] = (0, import_react.useState)("All");
  const [periodPreset, setPeriodPreset] = (0, import_react.useState)("today");
  const [startDate, setStartDate] = (0, import_react.useState)(() => getISTDateStr());
  const [endDate, setEndDate] = (0, import_react.useState)(() => getISTDateStr());
  const [filterMonth, setFilterMonth] = (0, import_react.useState)(String((/* @__PURE__ */ new Date()).getMonth() + 1));
  const [filterYear, setFilterYear] = (0, import_react.useState)(String((/* @__PURE__ */ new Date()).getFullYear()));
  (0, import_react.useEffect)(() => {
    const visibleTabIds = [
      canSeeCalendar && "my-attendance",
      canSeeMyCorrections && "my-regularizations",
      canSeeCorrectionApprovals && "team-regularizations",
      canSeePayroll && "payroll-summary",
      canSeeTeamLogs && "team-attendance",
      canSeeHolidays && "admin-holidays"
    ].filter(Boolean);
    if (visibleTabIds.length > 0 && !visibleTabIds.includes(activeTab)) {
      setActiveTab(visibleTabIds[0]);
    }
  }, [canSeeCalendar, canSeeMyCorrections, canSeeCorrectionApprovals, canSeePayroll, canSeeTeamLogs, canSeeHolidays, activeTab]);
  const handlePeriodPresetChange = (preset) => {
    setPeriodPreset(preset);
    const now = new Date(Date.now() + serverOffset);
    const currYear = parseInt(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric" }).format(now), 10);
    const currMonth = parseInt(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", month: "numeric" }).format(now), 10);
    if (preset === "today") {
      const t = getISTDateStr(now);
      setStartDate(t);
      setEndDate(t);
    } else if (preset === "this_month") {
      const mStr = String(currMonth).padStart(2, "0");
      const lastDay = new Date(currYear, currMonth, 0).getDate();
      setStartDate(`${currYear}-${mStr}-01`);
      setEndDate(`${currYear}-${mStr}-${String(lastDay).padStart(2, "0")}`);
      setFilterMonth(String(currMonth));
      setFilterYear(String(currYear));
    } else if (preset === "last_month") {
      const lastMonthDate = new Date(currYear, currMonth - 2, 1);
      const lmYear = lastMonthDate.getFullYear();
      const lmMonth = lastMonthDate.getMonth() + 1;
      const mStr = String(lmMonth).padStart(2, "0");
      const lastDay = new Date(lmYear, lmMonth, 0).getDate();
      setStartDate(`${lmYear}-${mStr}-01`);
      setEndDate(`${lmYear}-${mStr}-${String(lastDay).padStart(2, "0")}`);
      setFilterMonth(String(lmMonth));
      setFilterYear(String(lmYear));
    }
  };
  const handleMonthYearChange = (m, y) => {
    const selM = parseInt(m, 10);
    const selY = parseInt(y, 10);
    const mStr = String(selM).padStart(2, "0");
    const lastDay = new Date(selY, selM, 0).getDate();
    setFilterMonth(String(selM));
    setFilterYear(String(selY));
    setStartDate(`${selY}-${mStr}-01`);
    setEndDate(`${selY}-${mStr}-${String(lastDay).padStart(2, "0")}`);
  };
  const { data: summaryData, isLoading: loadingSummary, refetch: refetchSummary } = (0, import_apiSlice.useGetMySummaryQuery)({ year: currentYear, month: currentMonth });
  const logs = summaryData?.logs || [];
  const leaves = summaryData?.leaves || [];
  const holidays = summaryData?.holidays || [];
  const hasTeamAccess = summaryData?.hasTeamAccess || false;
  const syncedServerRef = (0, import_react.useRef)(false);
  (0, import_react.useEffect)(() => {
    if (summaryData?.serverTime) {
      const serverMs = new Date(summaryData.serverTime).getTime();
      const clientMs = Date.now();
      const offset = serverMs - clientMs;
      setServerOffset(offset);
      setCurrentServerTime(new Date(Date.now() + offset));
    }
    if (summaryData?.serverYear && summaryData?.serverMonth && !syncedServerRef.current) {
      syncedServerRef.current = true;
      setCurrentYear(summaryData.serverYear);
      setCurrentMonth(summaryData.serverMonth);
      if (periodPreset === "today" && summaryData?.serverDate) {
        setStartDate(summaryData.serverDate);
        setEndDate(summaryData.serverDate);
      }
    }
  }, [summaryData?.serverTime, summaryData?.serverYear, summaryData?.serverMonth, summaryData?.serverDate, periodPreset]);
  (0, import_react.useEffect)(() => {
    const timer = setInterval(() => {
      setCurrentServerTime(new Date(Date.now() + serverOffset));
    }, 1e3);
    return () => clearInterval(timer);
  }, [serverOffset]);
  const liveTimeString = currentServerTime.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  const { data: teamData, isLoading: loadingTeam, refetch: refetchTeamData } = (0, import_apiSlice.useGetTeamTodayQuery)({
    startDate,
    endDate
  }, {
    skip: !canSeeTeamLogs
  });
  const teamAttendance = teamData?.teamAttendance || [];
  const canSwitchAllDepts = isAdmin || hasAllDeptsPerm || Boolean(teamData?.canSwitchAllDepts);
  const availableDepts = [...new Set(teamAttendance.map((m) => m.department).filter(Boolean))];
  const departmentsList = canSwitchAllDepts ? ["All", ...availableDepts] : availableDepts.length > 0 ? availableDepts : [user?.department?.name || teamData?.userDeptName || "Your Department"];
  (0, import_react.useEffect)(() => {
    if (!canSwitchAllDepts) {
      const userDept = user?.department?.name || teamData?.userDeptName || (availableDepts[0] || "");
      if (userDept && selectedDept !== userDept) {
        setSelectedDept(userDept);
      }
    }
  }, [canSwitchAllDepts, user?.department?.name, teamData?.userDeptName, availableDepts.length]);
  const filteredTeamAttendance = teamAttendance.filter((member) => {
    const memberName = (member?.name || "").toLowerCase();
    const memberRole = (member?.role || "").toLowerCase();
    const q = (searchQuery || "").toLowerCase();
    const matchesSearch = memberName.includes(q) || memberRole.includes(q);
    const matchesDept = selectedDept === "All" || member?.department === selectedDept;
    const statusStr = member?.log ? member.log.status : "absent";
    const matchesStatus = selectedStatus === "All" || statusStr === selectedStatus;
    return matchesSearch && matchesDept && matchesStatus;
  });
  const isMultiDay = startDate !== endDate;
  const handleExportCSV = () => {
    const headers = isMultiDay ? ["Date", "Member Name", "Department", "Role", "Check-in Time", "Check-out Time", "Work Duration", "Status", "Notes"] : ["Member Name", "Department", "Role", "Check-in Time", "Check-out Time", "Work Duration", "Status"];
    const rows = filteredTeamAttendance.map((member) => {
      const checkInStr = member.log?.checkIn ? formatTime(member.log.checkIn) : "-";
      const checkOutStr = member.log?.checkOut ? formatTime(member.log.checkOut) : "-";
      const durationStr = member.log?.checkIn ? calculateDuration(member.log.checkIn, member.log.checkOut) : "-";
      const statusStr = member.log ? member.log.status.toUpperCase() : "ABSENT";
      const notesStr = member.log?.notes || "-";
      if (isMultiDay) {
        return [
          member.date || startDate,
          member.name,
          member.department || "Unassigned",
          member.role || "User",
          checkInStr,
          checkOutStr,
          durationStr,
          statusStr,
          notesStr
        ];
      } else {
        return [
          member.name,
          member.department || "Unassigned",
          member.role || "User",
          checkInStr,
          checkOutStr,
          durationStr,
          statusStr
        ];
      }
    });
    const csvString = [headers.join(","), ...rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const filename = isMultiDay ? `team_attendance_${startDate}_to_${endDate}.csv` : `team_attendance_${startDate}.csv`;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    import_react_hot_toast.default.success(`Exported ${filteredTeamAttendance.length} records (${isMultiDay ? `${startDate} to ${endDate}` : startDate})`);
  };
  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedDept(canSwitchAllDepts ? "All" : user?.department?.name || "Your Department");
    setSelectedStatus("All");
    handlePeriodPresetChange("today");
  };
  const { data: holidaysData } = (0, import_apiSlice.useGetAllHolidaysQuery)(void 0, {
    skip: !canSeeHolidays
  });
  const allHolidays = holidaysData?.holidays || [];
  const [checkIn] = (0, import_apiSlice.useCheckInMutation)();
  const [checkOut] = (0, import_apiSlice.useCheckOutMutation)();
  const [addHoliday, { isLoading: addingHoliday }] = (0, import_apiSlice.useAddHolidayMutation)();
  const [deleteHoliday] = (0, import_apiSlice.useDeleteHolidayMutation)();
  const [showRegularizeModal, setShowRegularizeModal] = (0, import_react.useState)(false);
  const [regDate, setRegDate] = (0, import_react.useState)("");
  const [regInTime, setRegInTime] = (0, import_react.useState)("09:30");
  const [regOutTime, setRegOutTime] = (0, import_react.useState)("18:30");
  const [regReason, setRegReason] = (0, import_react.useState)("");
  const [submittingReg, setSubmittingReg] = (0, import_react.useState)(false);
  const { data: myRegsData, isLoading: loadingMyRegs, refetch: refetchMyRegs } = (0, import_apiSlice.useGetMyRegularizationsQuery)(void 0, {
    skip: !canSeeMyCorrections
  });
  const myRegs = myRegsData?.requests || [];
  const { data: teamRegsData, isLoading: loadingTeamRegs, refetch: refetchTeamRegs } = (0, import_apiSlice.useGetTeamRegularizationsQuery)(void 0, {
    skip: !canSeeCorrectionApprovals
  });
  const teamRegs = teamRegsData?.requests || [];
  const [applyRegularization] = (0, import_apiSlice.useApplyRegularizationMutation)();
  const [updateRegularizationStatus] = (0, import_apiSlice.useUpdateRegularizationStatusMutation)();
  const [showExtendModal, setShowExtendModal] = (0, import_react.useState)(false);
  const [extendHours, setExtendHours] = (0, import_react.useState)(1);
  const [extendSession, { isLoading: extendingSession }] = (0, import_apiSlice.useExtendSessionMutation)();
  const handleExtendSubmit = async () => {
    const numHours = parseFloat(extendHours);
    if (!numHours || numHours <= 0) {
      return import_react_hot_toast.default.error("Please select valid extension hours");
    }
    try {
      const res = await extendSession({ hours: numHours }).unwrap();
      import_react_hot_toast.default.success(res.message || `Shift extended by +${numHours} hr(s)!`);
      if (res.attendance || res.todayLog) {
        setCheckedInTodayRecord(res.attendance || res.todayLog);
      }
      setShowExtendModal(false);
      if (refetchSummary) refetchSummary();
      if (refetchTeamData) refetchTeamData();
    } catch (err) {
      import_react_hot_toast.default.error(err.data?.message || "Failed to extend shift");
    }
  };
  const [payrollMonth, setPayrollMonth] = (0, import_react.useState)(`${(/* @__PURE__ */ new Date()).getFullYear()}-${String((/* @__PURE__ */ new Date()).getMonth() + 1).padStart(2, "0")}`);
  const { data: payrollData, isLoading: loadingPayroll } = (0, import_apiSlice.useGetPayrollSummaryQuery)({ month: payrollMonth }, {
    skip: !canSeePayroll
  });
  const payrollEmployees = payrollData?.employees || [];
  const handleApplyRegularization = async (e) => {
    e.preventDefault();
    if (!regDate || !regReason) {
      return import_react_hot_toast.default.error("Date and reason are required");
    }
    setSubmittingReg(true);
    try {
      const inTimeClean = regInTime.length === 5 ? `${regInTime}:00` : regInTime;
      const outTimeClean = regOutTime.length === 5 ? `${regOutTime}:00` : regOutTime;
      const res = await applyRegularization({
        date: regDate,
        checkIn: `${regDate}T${inTimeClean}+05:30`,
        checkOut: `${regDate}T${outTimeClean}+05:30`,
        reason: regReason
      }).unwrap();
      import_react_hot_toast.default.success(res.message || "Correction request submitted!");
      setShowRegularizeModal(false);
      setRegDate("");
      setRegReason("");
      if (refetchMyRegs) refetchMyRegs();
    } catch (err) {
      import_react_hot_toast.default.error(err.data?.message || "Failed to submit correction request");
    } finally {
      setSubmittingReg(false);
    }
  };
  const handleRegularizationStatus = async (id, status) => {
    try {
      const res = await updateRegularizationStatus({ id, status }).unwrap();
      import_react_hot_toast.default.success(res.message || `Correction request ${status}`);
      if (refetchTeamRegs) refetchTeamRegs();
    } catch (err) {
      import_react_hot_toast.default.error(err.data?.message || "Failed to update request");
    }
  };
  const effectiveTodayStr = summaryData?.serverDate || getISTDateStr(currentServerTime);
  const todayDateStr = effectiveTodayStr;
  const [checkedInTodayRecord, setCheckedInTodayRecord] = (0, import_react.useState)(null);
  const todayLog = checkedInTodayRecord || summaryData?.todayLog || logs.find((l) => {
    if (!l) return false;
    const logDate = typeof l.date === "string" ? l.date.includes("T") ? l.date.split("T")[0] : l.date.slice(0, 10) : "";
    const inDate = l.checkIn ? getISTDateStr(l.checkIn) : "";
    const createdDate = l.createdAt ? getISTDateStr(l.createdAt) : "";
    return logDate === effectiveTodayStr || inDate === effectiveTodayStr || createdDate === effectiveTodayStr;
  }) || null;
  const isPastShiftStart = (() => {
    if (summaryData?.isPastShiftStart !== void 0 && !serverOffset) {
      return summaryData.isPastShiftStart;
    }
    const timeStr = currentServerTime.toLocaleTimeString("en-GB", {
      timeZone: "Asia/Kolkata",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    return timeStr > "09:30:59";
  })();
  const handleCheckIn = async () => {
    try {
      const res = await checkIn().unwrap();
      import_react_hot_toast.default.success(res.message || "Checked in successfully!");
      if (res.attendance || res.todayLog) {
        setCheckedInTodayRecord(res.attendance || res.todayLog);
      }
      if (refetchSummary) refetchSummary();
      if (refetchTeamData) refetchTeamData();
    } catch (err) {
      if (err.data?.attendance || err.data?.todayLog) {
        setCheckedInTodayRecord(err.data.attendance || err.data.todayLog);
        import_react_hot_toast.default.info(err.data?.message || "Attendance already marked for today");
      } else {
        import_react_hot_toast.default.error(err.data?.message || "Check-in failed");
      }
      if (refetchSummary) refetchSummary();
    }
  };
  const handleCheckOut = (0, import_react.useCallback)(async () => {
    try {
      const res = await checkOut().unwrap();
      import_react_hot_toast.default.success(res.message || "Checked out successfully!");
      if (res.attendance || res.todayLog) {
        setCheckedInTodayRecord(res.attendance || res.todayLog);
      }
      if (refetchSummary) refetchSummary();
      if (refetchTeamData) refetchTeamData();
    } catch (err) {
      if (err.data?.attendance || err.data?.todayLog) {
        setCheckedInTodayRecord(err.data.attendance || err.data.todayLog);
        import_react_hot_toast.default.info(err.data?.message || "Check-out already completed");
      } else {
        import_react_hot_toast.default.error(err.data?.message || "Check-out failed");
      }
      if (refetchSummary) refetchSummary();
    }
  }, [checkOut, refetchSummary, refetchTeamData]);
  const AUTO_CHECKOUT_MS = 9 * 60 * 60 * 1e3;
  const WARN_BEFORE_MS = 15 * 60 * 1e3;
  const [extensionMs, setExtensionMs] = (0, import_react.useState)(0);
  const [timeLeft, setTimeLeft] = (0, import_react.useState)(null);
  const [showExtendWarning, setShowExtendWarning] = (0, import_react.useState)(false);
  const intervalRef = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
    if (!todayLog?.checkIn || todayLog?.checkOut) {
      clearInterval(intervalRef.current);
      setTimeLeft(null);
      setShowExtendWarning(false);
      return;
    }
    const checkInTime = new Date(todayLog.checkIn).getTime();
    const tick = () => {
      const nowMs = Date.now() + serverOffset;
      const remaining = checkInTime + AUTO_CHECKOUT_MS + extensionMs - nowMs;
      setTimeLeft(remaining);
      if (remaining <= WARN_BEFORE_MS && remaining > 0) setShowExtendWarning(true);
      if (remaining <= 0) {
        clearInterval(intervalRef.current);
        setShowExtendWarning(false);
        handleCheckOut();
      }
    };
    tick();
    intervalRef.current = setInterval(tick, 1e3);
    return () => clearInterval(intervalRef.current);
  }, [todayLog?.checkIn, todayLog?.checkOut, extensionMs, serverOffset, handleCheckOut]);
  const handleExtend = (extraMinutes) => {
    setExtensionMs((prev) => prev + extraMinutes * 60 * 1e3);
    setShowExtendWarning(false);
    import_react_hot_toast.default.success(`\u23F0 Session extended by ${extraMinutes} minutes!`);
  };
  const formatTimeLeft = (ms) => {
    if (!ms || ms <= 0) return "00:00:00";
    const totalSecs = Math.floor(ms / 1e3);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor(totalSecs % 3600 / 60);
    const secs = totalSecs % 60;
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };
  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!holidayName || !holidayDate) {
      return import_react_hot_toast.default.error("Name and Date are required");
    }
    try {
      await addHoliday({
        name: holidayName,
        date: holidayDate,
        type: holidayType,
        description: holidayDesc
      }).unwrap();
      import_react_hot_toast.default.success("Holiday added successfully!");
      setHolidayName("");
      setHolidayDate("");
      setHolidayDesc("");
    } catch (err) {
      import_react_hot_toast.default.error(err.data?.message || "Failed to add holiday");
    }
  };
  const handleDeleteHoliday = async (id) => {
    if (!window.confirm("Are you sure you want to delete this holiday?")) return;
    try {
      await deleteHoliday(id).unwrap();
      import_react_hot_toast.default.success("Holiday deleted");
    } catch (err) {
      import_react_hot_toast.default.error("Failed to delete holiday");
    }
  };
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth - 1, 1).getDay();
  const calendarDays = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }
  const getDayStatus = (day) => {
    if (!day) return null;
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const holiday = holidays.find((h) => h.date === dateStr);
    if (holiday) {
      return { type: "holiday", label: `Holiday: ${holiday.name}`, color: "#c084fc", typeCode: holiday.type };
    }
    const log = logs.find((l) => l.date === dateStr);
    const checkDate = new Date(currentYear, currentMonth - 1, day);
    const isSunday = checkDate.getDay() === 0;
    if (log) {
      const duration = log.checkOut ? calculateDuration(log.checkIn, log.checkOut) : "Active";
      if (log.status === "present") return { type: "present", label: isSunday ? `Sunday Duty (${formatTime(log.checkIn)})` : `Present (${formatTime(log.checkIn)})`, color: "var(--success)", duration };
      if (log.status === "late") return { type: "late", label: `Late Arrival (${formatTime(log.checkIn)})`, color: "#f59e0b", duration };
      if (log.status === "on_leave") return { type: "leave", label: "On Leave", color: "#38bdf8" };
      if (log.status === "half_day") return { type: "half_day", label: "Half Day Leave", color: "#e0f2fe" };
      return { type: log.status, label: log.status, color: "var(--accent)", duration };
    }
    const leave = leaves.find((l) => {
      return dateStr >= l.startDate && dateStr <= l.endDate;
    });
    if (leave) {
      const statusLabel = leave.leaveDuration === "half_day" ? "Half Day Leave" : "On Leave";
      const statusColor = leave.leaveDuration === "half_day" ? "#e0f2fe" : "#38bdf8";
      const statusType = leave.leaveDuration === "half_day" ? "half_day" : "leave";
      return { type: statusType, label: statusLabel, color: statusColor };
    }
    if (isSunday) {
      return { type: "sunday", label: "Sunday (Off)", color: "#a5b4fc", bg: "rgba(99, 102, 241, 0.08)" };
    }
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    if (checkDate > today) {
      return { type: "future", label: "Future", color: "var(--text-muted)" };
    }
    const dayOfWeek = checkDate.getDay();
    if (dayOfWeek === 6) {
      return { type: "weekend", label: "Saturday", color: "var(--bg-secondary)" };
    }
    return { type: "absent", label: "Absent / No Record", color: "var(--danger)" };
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_AppLayout.default, { title: "Attendance Dashboard", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 24 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 20 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "card", style: { padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 200 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", { style: { fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_ri.RiTimeLine, { style: { color: "var(--accent)" } }),
            " Mark Attendance"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { background: "var(--bg-secondary)", padding: "6px 12px", borderRadius: 6, fontSize: "0.78rem", color: "var(--accent)", fontWeight: 700, border: "1px solid var(--border)" }, children: "\u23F0 Office Shift: 09:30 AM - 06:30 PM" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "var(--bg-secondary)", padding: "6px 12px", borderRadius: 6, fontSize: "0.78rem", color: "var(--text-primary)", fontWeight: 700, border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 6 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { width: 8, height: 8, borderRadius: "50%", background: "#10b981", display: "inline-block", boxShadow: "0 0 6px #10b981" } }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Live IST: " }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontFamily: "monospace", color: "var(--accent)", fontSize: "0.82rem" }, children: liveTimeString })
            ] }),
            !todayLog && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `badge ${isPastShiftStart ? "badge-warning" : "badge-success"}`, style: { fontSize: "0.7rem", padding: "4px 8px", textTransform: "uppercase", fontWeight: 700 }, children: isPastShiftStart ? "\u26A0\uFE0F Late Window (> 09:30 AM)" : "\u2705 On-Time Window" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 20 }, children: isPastShiftStart && !todayLog ? "Current time has exceeded 09:30 AM. Checking in now will be recorded as Late arrival." : "Check-in daily before 09:30 AM to avoid late check-in marking." })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          loadingSummary ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", justifyContent: "center", padding: "16px" }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "spinner" }) }) : todayLog ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 12 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: "var(--text-secondary)" }, children: "Check-in time:" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { style: { color: "var(--text-primary)" }, children: formatTime(todayLog.checkIn) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: "var(--text-secondary)" }, children: "Status:" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `badge ${todayLog.status === "present" ? "badge-success" : todayLog.status === "late" ? "badge-warning" : "badge-info"}`, style: { textTransform: "uppercase", fontWeight: 700 }, children: todayLog.status === "late" ? "\u26A0\uFE0F LATE" : todayLog.status })
            ] }),
            todayLog.checkOut ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: "var(--text-secondary)" }, children: "Check-out time:" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { style: { color: "var(--text-primary)" }, children: formatTime(todayLog.checkOut) })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", fontSize: "0.875rem", marginTop: 4, paddingTop: 8, borderTop: "1px dashed var(--border)" }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: "var(--text-secondary)" }, children: "Work Duration:" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { style: { color: "var(--accent)" }, children: calculateDuration(todayLog.checkIn, todayLog.checkOut) })
              ] }),
              new Date(todayLog.checkOut).getTime() > Date.now() + serverOffset && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: {
                marginTop: 8,
                padding: "10px 12px",
                borderRadius: 8,
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.25)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: "0.78rem", fontWeight: 700, color: "#10b981" }, children: "\u{1F680} Extended Shift Active" }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: "0.72rem", color: "var(--text-secondary)" }, children: [
                    "Ends at ",
                    formatTime(todayLog.checkOut)
                  ] })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "button",
                  {
                    className: "btn btn-xs btn-outline-danger",
                    onClick: handleCheckOut,
                    title: "End shift now at current time",
                    children: "End Shift Now"
                  }
                )
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                "button",
                {
                  className: "btn btn-outline",
                  onClick: () => setShowExtendModal(true),
                  style: {
                    width: "100%",
                    marginTop: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    borderColor: "rgba(99, 102, 241, 0.4)",
                    color: "#818cf8",
                    background: "rgba(99, 102, 241, 0.08)",
                    fontWeight: 700,
                    padding: "10px 14px",
                    borderRadius: 8
                  },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_ri.RiTimeLine, { style: { fontSize: "1.1rem" } }),
                    " Extend Shift / Add Hours"
                  ]
                }
              )
            ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
              timeLeft !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 12px",
                borderRadius: 8,
                background: timeLeft < WARN_BEFORE_MS ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.07)",
                border: `1px solid ${timeLeft < WARN_BEFORE_MS ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.2)"}`
              }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: "0.76rem", color: "var(--text-secondary)", fontWeight: 600 }, children: "\u23F1 Auto-checkout in" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontWeight: 800, fontSize: "1rem", fontFamily: "monospace", letterSpacing: "0.06em", color: timeLeft < WARN_BEFORE_MS ? "#ef4444" : "#10b981" }, children: formatTimeLeft(timeLeft) })
              ] }),
              showExtendWarning && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { padding: "12px 14px", borderRadius: 10, border: "1.5px solid rgba(245,158,11,0.4)", background: "rgba(245,158,11,0.07)" }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: "0.8rem", fontWeight: 700, color: "#f59e0b", marginBottom: 8 }, children: "\u26A0\uFE0F Auto-checkout soon! Extend session?" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 8 }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    "button",
                    {
                      onClick: () => handleExtend(30),
                      style: { flex: 1, padding: "7px 0", background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.4)", borderRadius: 8, color: "#f59e0b", fontWeight: 700, cursor: "pointer", fontSize: "0.78rem" },
                      children: "+30 min"
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    "button",
                    {
                      onClick: () => handleExtend(60),
                      style: { flex: 1, padding: "7px 0", background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.4)", borderRadius: 8, color: "#f59e0b", fontWeight: 700, cursor: "pointer", fontSize: "0.78rem" },
                      children: "+1 hour"
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    "button",
                    {
                      onClick: () => setShowExtendWarning(false),
                      style: { padding: "7px 10px", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-muted)", fontWeight: 600, cursor: "pointer", fontSize: "0.78rem" },
                      children: "\u2715"
                    }
                  )
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "btn btn-outline-danger", onClick: handleCheckOut, style: { width: "100%", marginTop: 4 }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_ri.RiLogoutBoxLine, {}),
                " Check Out Now"
              ] })
            ] })
          ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 10 }, children: [
            user?.attendanceRequired === false && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: {
              padding: "10px 14px",
              borderRadius: 8,
              background: "rgba(99, 102, 241, 0.1)",
              border: "1px solid rgba(99, 102, 241, 0.3)",
              fontSize: "0.8rem",
              color: "#a5b4fc",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontWeight: 600
            }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: "1.1rem" }, children: "\u26AA" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Attendance Not Required:" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: "0.74rem", opacity: 0.9, fontWeight: 400 }, children: "You are exempt from daily attendance check-ins, reminders, and metrics." })
              ] })
            ] }),
            isPastShiftStart && user?.attendanceRequired !== false && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: {
              padding: "10px 14px",
              borderRadius: 8,
              background: "rgba(245, 158, 11, 0.1)",
              border: "1.5px solid rgba(245, 158, 11, 0.35)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: "0.8rem",
              color: "#f59e0b",
              fontWeight: 600
            }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: "1.1rem" }, children: "\u23F0" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Shift started at 09:30 AM." }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: "0.74rem", opacity: 0.9 }, children: [
                  "Check-in will be marked as ",
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontWeight: 800, textDecoration: "underline" }, children: "LATE" }),
                  "."
                ] })
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "button",
              {
                className: "btn btn-primary",
                onClick: handleCheckIn,
                style: {
                  width: "100%",
                  padding: "14px",
                  background: isPastShiftStart ? "linear-gradient(135deg, #f59e0b, #d97706)" : void 0,
                  borderColor: isPastShiftStart ? "#f59e0b" : void 0,
                  boxShadow: isPastShiftStart ? "0 4px 14px rgba(245, 158, 11, 0.3)" : void 0
                },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_ri.RiLoginBoxLine, {}),
                  " ",
                  isPastShiftStart ? "Check In Now (Late Check-in)" : "Check In Now"
                ]
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "button",
            {
              className: "btn btn-outline",
              onClick: () => setShowRegularizeModal(true),
              style: { width: "100%", marginTop: 10, fontSize: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_ri.RiEditBoxLine, {}),
                " Missed Punch / Absent Correction"
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "card", style: { padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 200 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { style: { fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }, children: "\u{1F4CA} Monthly Stats Summary" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 20 }, children: "Overview of your checked logs for this month." })
        ] }),
        loadingSummary ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", justifyContent: "center", padding: "24px", flexGrow: 1 }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "spinner" }) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "var(--bg-secondary)", padding: "10px 6px", borderRadius: 8, textAlign: "center", border: "1px solid var(--border)" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: "1.4rem", fontWeight: 800, color: "var(--success)", display: "block" }, children: logs.filter((l) => l.status === "present").length }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: "0.68rem", color: "var(--text-secondary)", fontWeight: 600, display: "block" }, children: "Present" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "var(--bg-secondary)", padding: "10px 6px", borderRadius: 8, textAlign: "center", border: "1px solid var(--border)" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: "1.4rem", fontWeight: 800, color: "#f59e0b", display: "block" }, children: logs.filter((l) => l.status === "late").length }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: "0.68rem", color: "var(--text-secondary)", fontWeight: 600, display: "block" }, children: "Late" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "var(--bg-secondary)", padding: "10px 6px", borderRadius: 8, textAlign: "center", border: "1px solid var(--border)" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: "1.4rem", fontWeight: 800, color: "#38bdf8", display: "block" }, children: logs.filter((l) => l.status === "on_leave" || l.status === "half_day").length }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: "0.68rem", color: "var(--text-secondary)", fontWeight: 600, display: "block" }, children: "Leave" })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "tab-scroll-container", style: { borderBottom: "1px solid var(--border)", gap: 8, paddingBottom: 6 }, children: [
      { id: "my-attendance", label: "My Attendance Calendar", show: canSeeCalendar },
      { id: "my-regularizations", label: "My Correction Requests", show: canSeeMyCorrections },
      { id: "team-regularizations", label: `Correction Approvals ${teamRegs.filter((r) => r.status === "pending").length > 0 ? `(${teamRegs.filter((r) => r.status === "pending").length})` : ""}`, show: canSeeCorrectionApprovals },
      { id: "payroll-summary", label: "Monthly Payroll & Deductions", show: canSeePayroll },
      { id: "team-attendance", label: "Team Daily Logs", show: canSeeTeamLogs },
      { id: "admin-holidays", label: "Holidays Configuration", show: canSeeHolidays }
    ].filter((tab) => tab.show).map((tab) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "button",
      {
        onClick: () => setActiveTab(tab.id),
        style: {
          background: activeTab === tab.id ? "rgba(99, 102, 241, 0.12)" : "transparent",
          border: activeTab === tab.id ? "1px solid rgba(99, 102, 241, 0.3)" : "1px solid transparent",
          borderRadius: 8,
          padding: "8px 14px",
          fontSize: "0.82rem",
          fontWeight: activeTab === tab.id ? 800 : 600,
          color: activeTab === tab.id ? "var(--accent)" : "var(--text-muted)",
          cursor: "pointer",
          whiteSpace: "nowrap",
          flexShrink: 0
        },
        children: tab.label
      },
      tab.id
    )) }),
    activeTab === "my-attendance" && canSeeCalendar && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "card", style: { padding: 24 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { style: { fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)" }, children: new Date(currentYear, currentMonth - 1).toLocaleString("default", { month: "long", year: "numeric" }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 8 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn btn-outline btn-sm", onClick: () => {
            if (currentMonth === 1) {
              setCurrentMonth(12);
              setCurrentYear((y) => y - 1);
            } else {
              setCurrentMonth((m) => m - 1);
            }
          }, children: "< Previous" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn btn-outline btn-sm", onClick: () => {
            if (currentMonth === 12) {
              setCurrentMonth(1);
              setCurrentYear((y) => y + 1);
            } else {
              setCurrentMonth((m) => m + 1);
            }
          }, children: "Next >" })
        ] })
      ] }),
      loadingSummary ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { textAlign: "center", padding: "40px" }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "spinner" }) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { width: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 6 }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, textAlign: "center", minWidth: 460 }, children: [
        ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", paddingBottom: 8 }, children: d }, d)),
        calendarDays.map((day, idx) => {
          if (!day) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { background: "transparent" } }, `empty-${idx}`);
          const status = getDayStatus(day);
          const isHoliday = status?.type === "holiday";
          const isSunday = status?.type === "sunday";
          const isWeekend = status?.type === "weekend";
          const isPresent = status?.type === "present" || status?.type === "late";
          return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "div",
            {
              style: {
                minHeight: 80,
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: isHoliday ? "rgba(192, 132, 252, 0.08)" : isSunday ? "rgba(99, 102, 241, 0.08)" : isWeekend ? "var(--bg-secondary)" : "var(--bg-card)",
                padding: 8,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                alignItems: "flex-start",
                opacity: status?.type === "future" ? 0.4 : 1
              },
              title: status?.label,
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)" }, children: day }),
                status && status.type !== "future" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4, width: "100%" }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    "span",
                    {
                      style: {
                        fontSize: "0.62rem",
                        fontWeight: 700,
                        color: status.color,
                        background: isHoliday ? "rgba(192, 132, 252, 0.12)" : isSunday ? "rgba(99, 102, 241, 0.16)" : isPresent ? "rgba(16, 185, 129, 0.12)" : status.type === "half_day" ? "rgba(56, 189, 248, 0.12)" : "rgba(239, 68, 68, 0.12)",
                        padding: "2px 4px",
                        borderRadius: 4,
                        maxWidth: "100%",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      },
                      children: status.type === "holiday" ? status.label.replace("Holiday: ", "") : isSunday ? "Sunday (Off)" : status.type
                    }
                  ),
                  status.duration && status.duration !== "-" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 600 }, children: [
                    "\u23F1\uFE0F ",
                    status.duration.replace(" hrs", "h").replace(" mins", "m")
                  ] })
                ] })
              ]
            },
            day
          );
        })
      ] }) }) })
    ] }),
    activeTab === "team-attendance" && canSeeTeamLogs && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "card", style: { padding: 24 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", { style: { fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: 10 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: isMultiDay ? "\u{1F5D3}\uFE0F Team Presence Logs" : "\u{1F4C5} Today's Presence Dashboard" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "badge", style: { fontSize: "0.75rem", padding: "3px 10px", background: "rgba(99,102,241,0.12)", color: "var(--accent)", fontWeight: 700 }, children: isMultiDay ? `${startDate} to ${endDate}` : startDate })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { margin: "4px 0 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }, children: isMultiDay ? `Showing team check-ins, leaves, and attendance logs across ${startDate} to ${endDate}` : "Real-time check-in, check-out, and active duty status for today" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "button",
          {
            className: "btn btn-outline btn-sm",
            onClick: refetchTeamData,
            style: { display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", fontSize: "0.8rem" },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_ri.RiRefreshLine, { className: loadingTeam ? "spinner" : "" }),
              " Refresh Logs"
            ]
          }
        ) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: {
        display: "flex",
        flexDirection: "column",
        gap: 14,
        marginBottom: 20,
        padding: "16px 18px",
        background: "var(--bg-secondary)",
        borderRadius: 10,
        border: "1px solid var(--border)"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: {
          display: "flex",
          flexWrap: "wrap",
          gap: 14,
          alignItems: "center"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: "1 1 200px", minWidth: 170 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { style: { display: "block", fontSize: "0.72rem", fontWeight: 700, marginBottom: 6, color: "var(--text-secondary)" }, children: "Search Member / Role" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "input",
              {
                type: "text",
                className: "form-control",
                placeholder: "Search by name or role...",
                value: searchQuery,
                onChange: (e) => setSearchQuery(e.target.value),
                style: { fontSize: "0.8rem", padding: "7px 12px" }
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: "1 1 160px", minWidth: 150 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.72rem", fontWeight: 700, marginBottom: 6, color: "var(--text-secondary)" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Department" }),
              !canSwitchAllDepts && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: "0.7rem", color: "var(--text-muted)" }, children: "\u{1F512} (Your Dept)" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "select",
              {
                className: "form-control",
                value: selectedDept,
                onChange: (e) => setSelectedDept(e.target.value),
                disabled: !canSwitchAllDepts,
                title: !canSwitchAllDepts ? "Department locked to your assigned department" : "Switch department",
                style: {
                  fontSize: "0.8rem",
                  padding: "7px 12px",
                  cursor: canSwitchAllDepts ? "pointer" : "default",
                  opacity: canSwitchAllDepts ? 1 : 0.85
                },
                children: departmentsList.map((dept) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: dept, children: dept }, dept))
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: "1 1 130px", minWidth: 120 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { style: { display: "block", fontSize: "0.72rem", fontWeight: 700, marginBottom: 6, color: "var(--text-secondary)" }, children: "Presence Status" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "select",
              {
                className: "form-control",
                value: selectedStatus,
                onChange: (e) => setSelectedStatus(e.target.value),
                style: { fontSize: "0.8rem", padding: "7px 12px" },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "All", children: "All Statuses" }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "present", children: "Present" }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "late", children: "Late Arrival" }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "half_day", children: "Half Day" }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "on_leave", children: "On Leave" }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "absent", children: "Absent" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: "1 1 170px", minWidth: 160 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { style: { display: "block", fontSize: "0.72rem", fontWeight: 700, marginBottom: 6, color: "var(--text-secondary)" }, children: "Date / Range Filter" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "select",
              {
                className: "form-control",
                value: periodPreset,
                onChange: (e) => handlePeriodPresetChange(e.target.value),
                style: { fontSize: "0.8rem", padding: "7px 12px", fontWeight: 600 },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", { value: "today", children: [
                    "\u{1F4C5} Today (",
                    todayDateStr,
                    ")"
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", { value: "this_month", children: [
                    "\u{1F5D3}\uFE0F This Month (",
                    (/* @__PURE__ */ new Date()).toLocaleString("en-US", { month: "short", year: "numeric" }),
                    ")"
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "last_month", children: "\u{1F5D3}\uFE0F Last Month" }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "month_picker", children: "\u{1F4C6} Specific Month..." }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "custom", children: "\u{1F50D} Custom Date Range..." })
                ]
              }
            )
          ] }),
          periodPreset === "month_picker" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 8, alignItems: "flex-end", flex: "1 1 200px" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: 1 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { style: { display: "block", fontSize: "0.72rem", fontWeight: 700, marginBottom: 6, color: "var(--text-secondary)" }, children: "Month" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "select",
                {
                  className: "form-control",
                  value: filterMonth,
                  onChange: (e) => handleMonthYearChange(e.target.value, filterYear),
                  style: { fontSize: "0.8rem", padding: "7px 10px" },
                  children: [
                    { m: "1", l: "January" },
                    { m: "2", l: "February" },
                    { m: "3", l: "March" },
                    { m: "4", l: "April" },
                    { m: "5", l: "May" },
                    { m: "6", l: "June" },
                    { m: "7", l: "July" },
                    { m: "8", l: "August" },
                    { m: "9", l: "September" },
                    { m: "10", l: "October" },
                    { m: "11", l: "November" },
                    { m: "12", l: "December" }
                  ].map(({ m, l }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: m, children: l }, m))
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { width: 85 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { style: { display: "block", fontSize: "0.72rem", fontWeight: 700, marginBottom: 6, color: "var(--text-secondary)" }, children: "Year" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                "select",
                {
                  className: "form-control",
                  value: filterYear,
                  onChange: (e) => handleMonthYearChange(filterMonth, e.target.value),
                  style: { fontSize: "0.8rem", padding: "7px 10px" },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "2025", children: "2025" }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "2026", children: "2026" }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "2027", children: "2027" })
                  ]
                }
              )
            ] })
          ] }),
          periodPreset === "custom" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 8, alignItems: "flex-end", flex: "1 1 230px" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: 1 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { style: { display: "block", fontSize: "0.72rem", fontWeight: 700, marginBottom: 6, color: "var(--text-secondary)" }, children: "From Date" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "input",
                {
                  type: "date",
                  className: "form-control",
                  value: startDate,
                  onChange: (e) => setStartDate(e.target.value),
                  style: { fontSize: "0.8rem", padding: "6px 8px" }
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: 1 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { style: { display: "block", fontSize: "0.72rem", fontWeight: 700, marginBottom: 6, color: "var(--text-secondary)" }, children: "To Date" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "input",
                {
                  type: "date",
                  className: "form-control",
                  value: endDate,
                  onChange: (e) => setEndDate(e.target.value),
                  style: { fontSize: "0.8rem", padding: "6px 8px" }
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 10, alignSelf: "flex-end", marginLeft: "auto" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                type: "button",
                className: "btn btn-outline btn-sm",
                onClick: handleResetFilters,
                style: { padding: "8px 16px", fontSize: "0.8rem" },
                children: "Reset"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "button",
              {
                type: "button",
                className: "btn btn-primary btn-sm",
                onClick: handleExportCSV,
                disabled: filteredTeamAttendance.length === 0,
                style: {
                  padding: "8px 18px",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 4px 14px rgba(99,102,241,0.25)"
                },
                children: [
                  "\u{1F4E5} Export CSV (",
                  filteredTeamAttendance.length,
                  ")"
                ]
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontSize: "0.74rem", color: "var(--text-muted)", fontWeight: 600, marginRight: 4 }, children: [
            "Filtered Metrics (",
            isMultiDay ? `${startDate} to ${endDate}` : startDate,
            "):"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "badge", style: { background: "rgba(56, 189, 248, 0.12)", color: "var(--accent)", fontSize: "0.72rem", padding: "3px 8px" }, children: [
            "Total: ",
            filteredTeamAttendance.length
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "badge", style: { background: "rgba(34, 197, 94, 0.12)", color: "var(--success)", fontSize: "0.72rem", padding: "3px 8px" }, children: [
            "Present: ",
            filteredTeamAttendance.filter((m) => m.log?.status === "present").length
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "badge", style: { background: "rgba(245, 158, 11, 0.12)", color: "#f59e0b", fontSize: "0.72rem", padding: "3px 8px" }, children: [
            "Late: ",
            filteredTeamAttendance.filter((m) => m.log?.status === "late").length
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "badge", style: { background: "rgba(168, 85, 247, 0.12)", color: "#c084fc", fontSize: "0.72rem", padding: "3px 8px" }, children: [
            "Half Day: ",
            filteredTeamAttendance.filter((m) => m.log?.status === "half_day").length
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "badge", style: { background: "rgba(99, 102, 241, 0.12)", color: "#818cf8", fontSize: "0.72rem", padding: "3px 8px" }, children: [
            "Sunday (Off): ",
            filteredTeamAttendance.filter((m) => m.log?.status === "weekly_off" || m.isSunday && !m.log?.checkIn).length
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "badge", style: { background: "rgba(239, 68, 68, 0.12)", color: "var(--danger)", fontSize: "0.72rem", padding: "3px 8px" }, children: [
            "Absent: ",
            filteredTeamAttendance.filter((m) => (!m.log || m.log?.status === "absent") && m.log?.status !== "weekly_off" && !(m.isSunday && !m.log?.checkIn)).length
          ] })
        ] })
      ] }),
      loadingTeam ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { textAlign: "center", padding: "40px" }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "spinner" }) }) : filteredTeamAttendance.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { textAlign: "center", padding: "40px", color: "var(--text-secondary)" }, children: "No attendance logs found matching the selected filters." }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "table-wrapper", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "table", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
          isMultiDay && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { style: { minWidth: 105 }, children: "Date" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Member Name" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Department" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Role" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Check-in" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Check-out" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Duration" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Status" })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: filteredTeamAttendance.map((member, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
          isMultiDay && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { style: { fontWeight: 700, color: "var(--accent)", fontSize: "0.8rem", whiteSpace: "nowrap" }, children: [
            "\u{1F4C5} ",
            member.date || member.log?.date || startDate
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { style: { fontWeight: 700 }, children: member.name || "-" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: member.department || "Unassigned" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: member.role || "User" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: member.log?.checkIn ? formatTime(member.log.checkIn) : "-" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: member.log?.checkOut ? formatTime(member.log.checkOut) : "-" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { style: { fontWeight: 600, color: member.log?.checkOut ? "var(--accent)" : "var(--text-muted)" }, children: member.log?.checkIn && !member.log?.checkOut ? "\u{1F7E2} Active" : calculateDuration(member.log?.checkIn, member.log?.checkOut) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: member.log?.status === "weekly_off" || member.isSunday && !member.log?.checkIn ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "badge", style: { background: "rgba(99, 102, 241, 0.15)", color: "#a5b4fc", border: "1px solid rgba(99, 102, 241, 0.3)", textTransform: "uppercase" }, children: "SUNDAY (OFF)" }) : member.log ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `badge ${member.log.status === "present" ? "badge-success" : member.log.status === "late" ? "badge-warning" : member.log.status === "half_day" ? "badge-info" : member.log.status === "on_leave" ? "badge-primary" : "badge-danger"}`, style: { textTransform: "uppercase" }, children: member.log.status === "on_leave" ? "ON LEAVE" : member.isSunday && member.log.checkIn ? "SUNDAY DUTY" : member.log.status || "present" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "badge badge-danger", children: "ABSENT" }) })
        ] }, member.id || member._id || member.email || `team-member-${idx}`)) })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { textAlign: "center", marginTop: 18, fontSize: "0.72rem", color: "var(--text-muted)" }, children: [
        "Developed by ",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { href: "https://axiino.com", target: "_blank", rel: "noopener noreferrer", style: { color: "var(--accent)", textDecoration: "none", fontWeight: 600 }, children: "axiino.com" })
      ] })
    ] }),
    activeTab === "admin-holidays" && canSeeHolidays && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "card", style: { padding: 24, height: "fit-content" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { style: { fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: 16 }, children: "Add Office Holiday" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { onSubmit: handleAddHoliday, style: { display: "flex", flexDirection: "column", gap: 12 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "form-label", children: "Holiday Name" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "text", className: "form-control", placeholder: "e.g. Diwali, New Year", value: holidayName, onChange: (e) => setHolidayName(e.target.value), required: true })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "form-label", children: "Holiday Date" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "date", className: "form-control", value: holidayDate, onChange: (e) => setHolidayDate(e.target.value), required: true })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "form-label", children: "Type" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { className: "form-control", value: holidayType, onChange: (e) => setHolidayType(e.target.value), children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "public", children: "National/Public Holiday" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "restricted", children: "Restricted Holiday" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "company", children: "Company Holiday" })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "form-label", children: "Description (Optional)" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { className: "form-control", rows: "2", placeholder: "Brief description", value: holidayDesc, onChange: (e) => setHolidayDesc(e.target.value) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "submit", className: "btn btn-primary", disabled: addingHoliday, children: addingHoliday ? "Adding..." : "Save Holiday" })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "card", style: { padding: 24 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { style: { fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: 16 }, children: "Office Holiday Calendar List" }),
        allHolidays.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { textAlign: "center", padding: "20px", color: "var(--text-secondary)" }, children: "No office holidays created yet." }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "table-wrapper", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "table table-sticky-actions", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Date" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Holiday Name" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Type" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Action" })
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: allHolidays.map((hol) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { style: { fontWeight: 700 }, children: hol.date }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: hol.name }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `badge ${hol.type === "restricted" ? "badge-warning" : "badge-accent"}`, children: hol.type }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn btn-icon btn-sm", onClick: () => handleDeleteHoliday(hol.id), style: { color: "var(--danger)" }, title: "Delete Holiday", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_ri.RiDeleteBin7Line, {}) }) })
          ] }, hol.id)) })
        ] }) })
      ] })
    ] }),
    activeTab === "my-regularizations" && canSeeMyCorrections && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "card", style: { padding: "20px 18px" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 12 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { flex: "1 1 200px", minWidth: 0 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { style: { fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)" }, children: "My Attendance Correction Requests" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 2 }, children: "Requests submitted to convert absent days to present with approval from your manager." })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "btn btn-primary btn-sm", onClick: () => setShowRegularizeModal(true), style: { flexShrink: 0, whiteSpace: "nowrap" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_ri.RiEditBoxLine, {}),
          " Apply New Correction"
        ] })
      ] }),
      loadingMyRegs ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { textAlign: "center", padding: "40px" }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "spinner" }) }) : myRegs.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { textAlign: "center", padding: "30px", color: "var(--text-secondary)" }, children: "No attendance correction requests submitted." }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "table-wrapper", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "table", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Correction Date" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Expected In / Out" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Reason" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Status" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Approved By" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Applied On" })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: myRegs.map((reg) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { style: { fontWeight: 700 }, children: reg.date }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { style: { fontSize: "0.8rem" }, children: [
            reg.checkIn ? formatTime(reg.checkIn) : "09:30 AM",
            " \u2014 ",
            reg.checkOut ? formatTime(reg.checkOut) : "06:30 PM"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { style: { fontSize: "0.85rem" }, children: reg.reason }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [
            reg.status === "approved" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "badge badge-success", children: "\u2705 Approved (Present)" }),
            reg.status === "pending" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "badge badge-warning", children: "\u23F3 Pending Approval" }),
            reg.status === "rejected" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "badge badge-danger", children: "\u274C Rejected (Absent)" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { style: { fontSize: "0.8rem", color: "var(--text-secondary)" }, children: reg.approver?.name || "\u2014" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { style: { fontSize: "0.75rem", color: "var(--text-muted)" }, children: new Date(reg.createdAt).toLocaleDateString() })
        ] }, reg.id)) })
      ] }) })
    ] }),
    activeTab === "team-regularizations" && canSeeCorrectionApprovals && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "card", style: { padding: 24 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { marginBottom: 16 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { style: { fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)" }, children: "Team Attendance Correction Approvals" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { style: { fontSize: "0.78rem", color: "var(--text-muted)" }, children: [
          "Review and approve correction requests for employees mapped to you. Approving a request marks the day as ",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "PRESENT" }),
          " and removes salary deduction."
        ] })
      ] }),
      loadingTeamRegs ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { textAlign: "center", padding: "40px" }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "spinner" }) }) : teamRegs.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { textAlign: "center", padding: "30px", color: "var(--text-secondary)" }, children: "No attendance correction requests from your team members." }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "table-wrapper", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "table table-sticky-actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Employee" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Date" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Timing" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Reason" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Status" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Actions" })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: teamRegs.map((reg) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontWeight: 700 }, children: reg.user?.name }),
              reg.user?.department?.name && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: "0.68rem", fontWeight: 600, background: "rgba(99, 102, 241, 0.1)", color: "var(--accent)", padding: "1px 6px", borderRadius: 4, border: "1px solid rgba(99, 102, 241, 0.2)" }, children: reg.user.department.name })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: "0.72rem", color: "var(--text-muted)" }, children: reg.user?.email })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { style: { fontWeight: 700 }, children: reg.date }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { style: { fontSize: "0.8rem" }, children: [
            reg.checkIn ? formatTime(reg.checkIn) : "09:30 AM",
            " \u2014 ",
            reg.checkOut ? formatTime(reg.checkOut) : "06:30 PM"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { style: { fontSize: "0.85rem" }, children: reg.reason }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [
            reg.status === "approved" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "badge badge-success", children: "Approved (Present)" }),
            reg.status === "pending" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "badge badge-warning", children: "Pending Review" }),
            reg.status === "rejected" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "badge badge-danger", children: "Rejected" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: reg.status === "pending" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 6 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "button",
              {
                className: "btn btn-success btn-xs",
                onClick: () => handleRegularizationStatus(reg.id, "approved"),
                title: "Approve and mark Present",
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_ri.RiCheckDoubleLine, {}),
                  " Approve (Mark Present)"
                ]
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "button",
              {
                className: "btn btn-danger btn-xs",
                onClick: () => handleRegularizationStatus(reg.id, "rejected"),
                title: "Reject request",
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_ri.RiCloseCircleLine, {}),
                  " Reject"
                ]
              }
            )
          ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: "0.75rem", color: "var(--text-muted)" }, children: "Reviewed" }) })
        ] }, reg.id)) })
      ] }) })
    ] }),
    activeTab === "payroll-summary" && canSeePayroll && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "card", style: { padding: 24 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", { style: { fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_ri.RiMoneyDollarCircleLine, { style: { color: "#10b981", fontSize: "1.2rem" } }),
            " Monthly Payroll & Absent Deductions"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { fontSize: "0.78rem", color: "var(--text-muted)" }, children: "Salary calculation based on base salary, monthly free leave quota, unregularized absences, and excess leaves (LOP)." })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { style: { fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)" }, children: "Month:" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "input",
            {
              type: "month",
              className: "form-control",
              style: { width: "auto", padding: "6px 12px" },
              value: payrollMonth,
              onChange: (e) => setPayrollMonth(e.target.value)
            }
          )
        ] })
      ] }),
      payrollData && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "var(--bg-secondary)", padding: "14px 16px", borderRadius: 10, border: "1px solid var(--border)" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }, children: "Total Employees" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)", marginTop: 4 }, children: payrollData.totalEmployees || 0 })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "rgba(59, 130, 246, 0.08)", padding: "14px 16px", borderRadius: 10, border: "1px solid rgba(59, 130, 246, 0.25)" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: "0.72rem", color: "#60a5fa", fontWeight: 700, textTransform: "uppercase" }, children: "Gross Base Payroll" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: "1.6rem", fontWeight: 800, color: "#93c5fd", marginTop: 4 }, children: [
            "\u20B9",
            (payrollData.totalBasePayroll || 0).toLocaleString()
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "rgba(239, 68, 68, 0.08)", padding: "14px 16px", borderRadius: 10, border: "1px solid rgba(239, 68, 68, 0.25)" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: "0.72rem", color: "#f87171", fontWeight: 700, textTransform: "uppercase" }, children: "Total Deductions (Absent/LOP)" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: "1.6rem", fontWeight: 800, color: "#fca5a5", marginTop: 4 }, children: [
            "-\u20B9",
            (payrollData.totalDeductions || 0).toLocaleString()
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { background: "rgba(16, 185, 129, 0.08)", padding: "14px 16px", borderRadius: 10, border: "1px solid rgba(16, 185, 129, 0.25)" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: "0.72rem", color: "#34d399", fontWeight: 700, textTransform: "uppercase" }, children: "Net Payable Payroll" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: "1.6rem", fontWeight: 800, color: "#6ee7b7", marginTop: 4 }, children: [
            "\u20B9",
            (payrollData.totalNetPayroll || 0).toLocaleString()
          ] })
        ] })
      ] }),
      loadingPayroll ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { textAlign: "center", padding: "40px" }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "spinner" }) }) : payrollEmployees.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { textAlign: "center", padding: "30px", color: "var(--text-secondary)" }, children: "No active employees found for this month." }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "table-wrapper", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { className: "table", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Employee" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Manager" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Base Salary" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Present" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Free Leave (Paid)" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Absent Days" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Excess Leave (LOP)" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Total Deduction" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: "Net Payable Salary" })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: payrollEmployees.map((emp) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontWeight: 700 }, children: emp.name }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: "0.72rem", color: "var(--text-muted)" }, children: [
              emp.department,
              " \u2022 ",
              emp.role
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { style: { fontSize: "0.8rem" }, children: emp.manager !== "None" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { color: "var(--accent)", fontWeight: 600 }, children: [
            "\u{1F464} ",
            emp.manager
          ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: "var(--text-muted)" }, children: "Direct" }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { style: { color: "var(--text-primary)" }, children: [
              "\u20B9",
              (emp.baseSalary || 0).toLocaleString()
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: "0.68rem", color: "var(--text-muted)" }, children: [
              "\u20B9",
              emp.perDaySalary || 0,
              "/day"
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontWeight: 700, color: "var(--success)" }, children: [
            emp.presentDays || 0,
            " d"
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontWeight: 700, color: "#38bdf8" }, children: [
            emp.paidLeaveDays || 0,
            " / ",
            emp.monthlyQuota || 0,
            " d"
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: emp.absentDays > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontWeight: 800, color: "var(--danger)" }, children: [
            emp.absentDays,
            " d"
          ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: "var(--text-muted)" }, children: "0" }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: emp.excessLeaveDays > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontWeight: 800, color: "#f59e0b" }, children: [
            emp.excessLeaveDays,
            " d (LOP)"
          ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: "var(--text-muted)" }, children: "0" }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: emp.totalDeductionAmount > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { style: { color: "var(--danger)" }, children: [
              "-\u20B9",
              (emp.totalDeductionAmount || 0).toLocaleString()
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: "0.68rem", color: "var(--text-muted)" }, children: [
              emp.totalDeductionDays || 0,
              " day(s) cut"
            ] })
          ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: "var(--success)", fontWeight: 700 }, children: "\u20B90" }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { style: { fontSize: "1rem", color: "#10b981" }, children: [
            "\u20B9",
            (emp.netPayableSalary || 0).toLocaleString()
          ] }) })
        ] }, emp.id)) })
      ] }) })
    ] }),
    showRegularizeModal && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "modal-overlay", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "modal", style: { maxWidth: 480 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "modal-header", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", { className: "modal-title", style: { display: "flex", alignItems: "center", gap: 8 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_ri.RiEditBoxLine, { style: { color: "var(--accent)" } }),
          " Apply Attendance Correction"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn btn-icon", onClick: () => setShowRegularizeModal(false), children: "\u2715" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { onSubmit: handleApplyRegularization, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "modal-body", style: { display: "flex", flexDirection: "column", gap: 14 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { padding: "10px 14px", borderRadius: 8, background: "rgba(56, 189, 248, 0.08)", border: "1px solid rgba(56, 189, 248, 0.25)", fontSize: "0.78rem", color: "var(--text-secondary)" }, children: [
            "\u{1F4A1} If you missed check-in or had punch errors, request a correction here. Once your mapped manager approves, your attendance will be updated to ",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "PRESENT" }),
            ", saving salary deductions."
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "form-label", style: { fontWeight: 700, fontSize: "0.8rem" }, children: "Date of Correction *" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "input",
              {
                type: "date",
                className: "form-control",
                max: (/* @__PURE__ */ new Date()).toLocaleDateString("en-CA"),
                value: regDate,
                onChange: (e) => setRegDate(e.target.value),
                required: true,
                id: "reg-date"
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "grid-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "form-label", style: { fontWeight: 700, fontSize: "0.8rem" }, children: "Check-In Time" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "input",
                {
                  type: "time",
                  className: "form-control",
                  value: regInTime,
                  onChange: (e) => setRegInTime(e.target.value),
                  required: true,
                  id: "reg-in-time"
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "form-label", style: { fontWeight: 700, fontSize: "0.8rem" }, children: "Check-Out Time" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "input",
                {
                  type: "time",
                  className: "form-control",
                  value: regOutTime,
                  onChange: (e) => setRegOutTime(e.target.value),
                  required: true,
                  id: "reg-out-time"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "form-label", style: { fontWeight: 700, fontSize: "0.8rem" }, children: "Reason for Correction *" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "textarea",
              {
                className: "form-control",
                rows: "3",
                placeholder: "e.g. Forgot to punch in / Client on-duty visit / Network device glitch",
                value: regReason,
                onChange: (e) => setRegReason(e.target.value),
                required: true,
                id: "reg-reason"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "modal-footer", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "btn btn-outline", onClick: () => setShowRegularizeModal(false), children: "Cancel" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "submit", className: "btn btn-primary", disabled: submittingReg, id: "reg-submit-btn", children: submittingReg ? "Submitting..." : "Submit Request" })
        ] })
      ] })
    ] }) }),
    showExtendModal && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "modal-overlay", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "modal", style: { maxWidth: 450 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "modal-header", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", { className: "modal-title", style: { display: "flex", alignItems: "center", gap: 8 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_ri.RiTimeLine, { style: { color: "var(--accent)" } }),
          " Extend Shift / Add Hours"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "btn btn-icon", onClick: () => setShowExtendModal(false), children: "\u2715" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "modal-body", style: { display: "flex", flexDirection: "column", gap: 16 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: {
          padding: "10px 14px",
          borderRadius: 8,
          background: "rgba(99, 102, 241, 0.08)",
          border: "1px solid rgba(99, 102, 241, 0.25)",
          fontSize: "0.8rem",
          color: "var(--text-secondary)"
        }, children: "\u{1F4A1} Select how many additional / overtime hours to add to today's shift. The extended hours will automatically be credited to today's total work duration." }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "form-label", style: { fontWeight: 700, fontSize: "0.82rem", marginBottom: 8, display: "block" }, children: "Quick Select Extension Hours" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }, children: [1, 1.5, 2, 3].map((h) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "button",
            {
              type: "button",
              className: `btn ${extendHours === h ? "btn-primary" : "btn-outline"}`,
              onClick: () => setExtendHours(h),
              style: { padding: "8px 0", fontSize: "0.82rem", fontWeight: 700 },
              children: [
                "+",
                h,
                " ",
                h === 1 ? "Hr" : "Hrs"
              ]
            },
            h
          )) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "form-label", style: { fontWeight: 700, fontSize: "0.82rem" }, children: "Or Custom Hours" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "input",
              {
                type: "number",
                step: "0.5",
                min: "0.5",
                max: "12",
                className: "form-control",
                value: extendHours,
                onChange: (e) => setExtendHours(parseFloat(e.target.value) || ""),
                placeholder: "e.g. 2",
                required: true
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }, children: "Hour(s)" })
          ] })
        ] }),
        todayLog && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: {
          fontSize: "0.78rem",
          padding: "10px 12px",
          borderRadius: 6,
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: 6
        }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", justifyContent: "space-between" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: "var(--text-secondary)" }, children: "Current Check-out:" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: todayLog.checkOut ? formatTime(todayLog.checkOut) : "Active" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", justifyContent: "space-between" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: "var(--text-secondary)" }, children: "New Extended Check-out:" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { style: { color: "var(--accent)" }, children: todayLog.checkOut ? formatTime(new Date(new Date(todayLog.checkOut).getTime() + Number(extendHours || 0) * 36e5)) : formatTime(new Date(Date.now() + Number(extendHours || 0) * 36e5)) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "modal-footer", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "btn btn-outline", onClick: () => setShowExtendModal(false), children: "Cancel" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: "btn btn-primary",
            disabled: extendingSession || !extendHours || extendHours <= 0,
            onClick: handleExtendSubmit,
            children: extendingSession ? "Extending..." : `Confirm +${extendHours || 0} Hr Extension`
          }
        )
      ] })
    ] }) })
  ] }) });
};
var AttendancePage_default = AttendancePage;
