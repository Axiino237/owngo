import { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  RiTeamLine, 
  RiShieldUserLine, 
  RiBuildingLine, 
  RiBuilding2Line, 
  RiGroupLine, 
  RiUserAddLine,
  RiBriefcaseLine,
  RiMoneyDollarBoxLine,
  RiPercentLine,
  RiCoinsLine,
  RiTimeLine,
  RiCheckDoubleLine,
  RiLineChartLine,
  RiPaletteLine,
  RiPhoneLine,
  RiUserHeartLine,
  RiWallet3Line,
  RiFundsLine,
  RiCalendarLine,
  RiFilterLine,
  RiRefreshLine,
  RiTrophyLine,
  RiCalendarEventLine,
  RiMoreFill,
  RiArrowRightSLine,
  RiSendPlaneLine,
  RiPriceTag3Line
} from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

// ── Modern KPI Stat Card (Matching Reference UI) ──────────────────────────
const kpiColorMap = {
  accent: { icon: '#84d802', bg: 'rgba(132, 216, 2, 0.14)', border: 'rgba(132, 216, 2, 0.35)' },
  primary: { icon: '#a2f218', bg: 'rgba(162, 242, 24, 0.14)', border: 'rgba(162, 242, 24, 0.35)' },
  info: { icon: '#22d3ee', bg: 'rgba(6, 182, 212, 0.14)', border: 'rgba(6, 182, 212, 0.3)' },
  warning: { icon: '#fb923c', bg: 'rgba(249, 115, 22, 0.14)', border: 'rgba(249, 115, 22, 0.3)' },
  success: { icon: '#34d399', bg: 'rgba(16, 185, 129, 0.14)', border: 'rgba(16, 185, 129, 0.3)' },
  danger: { icon: '#fb7185', bg: 'rgba(244, 63, 94, 0.14)', border: 'rgba(244, 63, 94, 0.3)' },
};

const StatCard = ({ icon, label, value, color = 'accent', onClick, subtext }) => {
  const c = kpiColorMap[color] || kpiColorMap.accent;
  const isCurrency = typeof value === 'string' && value.includes('₹');

  return (
    <div 
      onClick={onClick}
      style={{ 
        background: 'var(--bg-secondary, #0e1326)',
        border: '1px solid var(--border, rgba(255, 255, 255, 0.08))',
        borderRadius: 16,
        padding: '16px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
        position: 'relative',
        minHeight: 88
      }}
      onMouseEnter={e => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.borderColor = c.border;
          e.currentTarget.style.boxShadow = `0 8px 24px -4px ${c.bg}`;
        }
      }}
      onMouseLeave={e => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.borderColor = 'var(--border, rgba(255, 255, 255, 0.08))';
          e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.12)';
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: c.bg,
          color: c.icon,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.45rem',
          flexShrink: 0
        }}>
          {icon}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: isCurrency ? '1.3rem' : '1.55rem',
            fontWeight: 800,
            color: 'var(--text-primary, #ffffff)',
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            marginBottom: 4,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }} title={typeof value === 'string' ? value : ''}>
            {value ?? <div className="spinner spinner-sm" />}
          </div>
          <div style={{
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--text-secondary, #94a3b8)',
            lineHeight: 1.3,
            whiteSpace: 'normal',
            wordBreak: 'normal'
          }} title={label}>
            {label}
          </div>
          {subtext && (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748b)', marginTop: 2 }}>
              {subtext}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const FinancialKpiCard = ({ icon, label, value, subLabel, subValue, subColor, color = 'success', onClick }) => {
  const c = kpiColorMap[color] || kpiColorMap.success;

  return (
    <div 
      className="card"
      onClick={onClick}
      style={{
        background: 'var(--bg-secondary, #0e1326)',
        border: '1px solid var(--border, rgba(255, 255, 255, 0.08))',
        borderRadius: 16,
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
        position: 'relative'
      }}
      onMouseEnter={e => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.borderColor = c.border;
          e.currentTarget.style.boxShadow = `0 8px 24px -4px ${c.bg}`;
        }
      }}
      onMouseLeave={e => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.borderColor = 'var(--border, rgba(255, 255, 255, 0.08))';
          e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.12)';
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0, flex: 1 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: c.bg,
            color: c.icon,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.45rem',
            flexShrink: 0
          }}>
            {icon}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              color: 'var(--text-primary, #ffffff)',
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              marginBottom: 3
            }}>
              {value ?? <div className="spinner spinner-sm" />}
            </div>
            <div style={{
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: 'var(--text-secondary, #94a3b8)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {label}
            </div>
          </div>
        </div>
        <div style={{ color: 'var(--text-muted, #64748b)', fontSize: '1.15rem', alignSelf: 'flex-start', marginTop: -2, padding: '2px 4px' }}>
          <RiMoreFill />
        </div>
      </div>

      {(subLabel || subValue) && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem',
          borderTop: '1px solid var(--border, rgba(255, 255, 255, 0.06))',
          paddingTop: 10,
          marginTop: 2
        }}>
          <span style={{ color: 'var(--text-secondary)' }}>{subLabel}</span>
          <span style={{ fontWeight: 600, color: subColor || 'var(--text-primary)' }}>{subValue}</span>
        </div>
      )}
    </div>
  );
};

// ── Attendance Donut Chart Card (Overall Team & In-Time / Out-Time Individual) ───────────
const AttendanceDonutCard = ({ 
  attendanceData, 
  isFilteredByUser, 
  onNavigateAttendance,
  selectedUserId,
  onSelectUser
}) => {
  const [viewType, setViewType] = useState(isFilteredByUser ? 'individual' : 'overall'); // 'overall' | 'individual'
  const [selectedStaffId, setSelectedStaffId] = useState(null);

  // Sync with dashboard user filter
  useEffect(() => {
    if (isFilteredByUser && selectedUserId && selectedUserId !== 'all') {
      setViewType('individual');
      setSelectedStaffId(selectedUserId);
    }
  }, [isFilteredByUser, selectedUserId]);

  const overall = attendanceData?.overall || {
    totalStaff: 11,
    presentCount: 7,
    absentCount: 4,
    presentPercentage: 64,
    absentPercentage: 36
  };

  const staffList = attendanceData?.staffList || [];
  
  // Find currently active individual record
  const individual = useMemo(() => {
    if (selectedStaffId && staffList.length > 0) {
      const found = staffList.find(s => s.userId === selectedStaffId);
      if (found) return found;
    }
    return attendanceData?.individual || {
      userName: 'Individual Staff',
      roleName: 'Staff',
      windowDays: 30,
      workingDays: 26,
      presentDays: 13,
      absentDays: 13,
      presentPercentage: 50,
      absentPercentage: 50,
      todayInTime: '-',
      todayOutTime: '-',
      isTodayActive: false,
      isTodayLate: false,
      totalHoursWorked: 0,
      expectedHours: 234
    };
  }, [selectedStaffId, staffList, attendanceData?.individual]);

  const isIndividual = viewType === 'individual';
  const current = isIndividual ? individual : overall;

  const presentPct = current.presentPercentage ?? 0;
  const absentPct = current.absentPercentage ?? 0;

  // SVG Donut geometry: r = 68, circumference = 2 * PI * 68 ≈ 427.26
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const strokeWidth = 18;

  const presentDash = (presentPct / 100) * circumference;
  const absentDash = (absentPct / 100) * circumference;
  const absentOffset = -presentDash;

  return (
    <div 
      className="card"
      style={{
        background: 'var(--bg-secondary, #0a0f1e)',
        border: '1px solid var(--border, rgba(129, 140, 248, 0.16))',
        borderRadius: 16,
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: 'var(--shadow, 0 4px 20px -2px rgba(0,0,0,0.5))',
        position: 'relative'
      }}
    >
      {/* Top Header: Title, Toggle Pills & Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ flex: '1 1 auto', minWidth: 160 }}>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Attendance Rate</span>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: 10,
              background: (isIndividual && individual?.isAttendanceExempt) ? 'rgba(148, 163, 184, 0.14)' : 'rgba(16, 185, 129, 0.14)',
              color: (isIndividual && individual?.isAttendanceExempt) ? '#94a3b8' : '#34d399',
              border: `1px solid ${(isIndividual && individual?.isAttendanceExempt) ? 'rgba(148, 163, 184, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
            }}>
              {(isIndividual && individual?.isAttendanceExempt) ? 'Exempt' : `${presentPct}%`}
            </span>
          </div>

          {/* Subtitle / Staff Dropdown in Individual View */}
          {isIndividual ? (
            <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {staffList.length > 0 ? (
                <select
                  value={individual.userId || ''}
                  onChange={(e) => {
                    setSelectedStaffId(e.target.value);
                    if (onSelectUser) onSelectUser(e.target.value);
                  }}
                  style={{
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: '2px 8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    outline: 'none',
                    maxWidth: 160
                  }}
                  title="Select staff member"
                >
                  {staffList.map(s => (
                    <option key={s.userId} value={s.userId} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                      {s.userName} ({s.presentPercentage}%)
                    </option>
                  ))}
                </select>
              ) : (
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {individual.userName}
                </span>
              )}
              <span style={{
                fontSize: '0.68rem',
                color: 'var(--accent-light, #a5b4fc)',
                background: 'rgba(99, 102, 241, 0.14)',
                padding: '1px 6px',
                borderRadius: 4,
                fontWeight: 600
              }}>
                {individual.roleName || 'Staff'}
              </span>
              <span style={{
                fontSize: '0.68rem',
                color: '#38bdf8',
                background: 'rgba(6, 182, 212, 0.12)',
                padding: '1px 6px',
                borderRadius: 4,
                fontWeight: 600
              }}>
                Last 30 Days
              </span>
            </div>
          ) : (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 3 }}>
              Overall Team ({overall.totalStaff} Staff) • Today
            </div>
          )}
        </div>

        {/* View Switcher: Overall vs Individual */}
        <div style={{
          display: 'flex',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--border, rgba(129, 140, 248, 0.16))',
          borderRadius: 10,
          padding: 2,
          gap: 2
        }}>
          <button
            type="button"
            onClick={() => setViewType('overall')}
            style={{
              padding: '4px 9px',
              fontSize: '0.72rem',
              fontWeight: viewType === 'overall' ? 700 : 500,
              borderRadius: 7,
              background: viewType === 'overall' ? 'var(--accent-gradient, var(--accent-gradient))' : 'transparent',
              color: viewType === 'overall' ? '#ffffff' : 'var(--text-secondary)',
              border: viewType === 'overall' ? '1px solid rgba(129, 140, 248, 0.5)' : '1px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            👥 Overall
          </button>
          <button
            type="button"
            onClick={() => setViewType('individual')}
            style={{
              padding: '4px 9px',
              fontSize: '0.72rem',
              fontWeight: viewType === 'individual' ? 700 : 500,
              borderRadius: 7,
              background: viewType === 'individual' ? 'var(--accent-gradient, var(--accent-gradient))' : 'transparent',
              color: viewType === 'individual' ? '#ffffff' : 'var(--text-secondary)',
              border: viewType === 'individual' ? '1px solid rgba(129, 140, 248, 0.5)' : '1px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            👤 Individual
          </button>
        </div>

        <div 
          onClick={onNavigateAttendance}
          title="Open Full Attendance Page"
          style={{ color: 'var(--text-muted, #64748b)', fontSize: '1.2rem', cursor: 'pointer', padding: '2px 4px', lineHeight: 1 }}
        >
          <RiMoreFill />
        </div>
      </div>

      {/* Donut Chart Center */}
      <div style={{ position: 'relative', width: 175, height: 175, margin: '10px auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg 
          viewBox="0 0 190 190" 
          style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}
        >
          {/* Base circular track */}
          <circle
            cx="95"
            cy="95"
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth={strokeWidth}
          />

          {/* Present Segment: Site Emerald Green (#10b981) */}
          {presentPct > 0 && (
            <circle
              cx="95"
              cy="95"
              r={radius}
              fill="transparent"
              stroke="#10b981"
              strokeWidth={strokeWidth}
              strokeDasharray={`${presentDash} ${circumference}`}
              strokeDashoffset={0}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.5s ease' }}
            />
          )}

          {/* Absent Segment: Site Danger/Rose (#ef4444) */}
          {absentPct > 0 && (
            <circle
              cx="95"
              cy="95"
              r={radius}
              fill="transparent"
              stroke="#ef4444"
              strokeWidth={strokeWidth}
              strokeDasharray={`${absentDash} ${circumference}`}
              strokeDashoffset={absentOffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.5s ease' }}
            />
          )}
        </svg>

        {/* Center Content: Shield / User Icon + Percentage */}
        <div style={{
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          pointerEvents: 'none'
        }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#34d399',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            marginBottom: 2
          }}>
            <RiShieldUserLine />
          </div>
          <div style={{
            fontSize: (isIndividual && individual?.isAttendanceExempt) ? '1.1rem' : '1.45rem',
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.1,
            letterSpacing: '-0.02em'
          }}>
            {(isIndividual && individual?.isAttendanceExempt) ? 'Exempt' : `${presentPct}%`}
          </div>
          <div style={{
            fontSize: '0.62rem',
            fontWeight: 700,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            {(isIndividual && individual?.isAttendanceExempt) ? 'Not Required' : (isIndividual ? 'Present Rate' : 'Team Present')}
          </div>
        </div>
      </div>

      {/* Bottom Section: Dedicated In-Time & Out-Time details for Individual, or clean pill row for Overall */}
      {isIndividual ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
          {individual?.isAttendanceExempt ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px 12px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              gap: 8,
              width: '100%'
            }}>
              <span>⚪</span>
              <span><strong>Attendance Not Required:</strong> Exempt from check-in & tracking</span>
            </div>
          ) : (
            /* In-Time & Out-Time Timing Box */
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 12px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.85rem' }}>
                  {individual.isTodayLate ? '⚠️' : (individual.todayInTime && individual.todayInTime !== '-' ? '🟢' : '⚪')}
                </span>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.62rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>IN-TIME</span>
                  <strong style={{ color: individual.isTodayLate ? '#f59e0b' : (individual.todayInTime && individual.todayInTime !== '-' ? '#10b981' : 'var(--text-muted)') }}>
                    {individual.todayInTime || '-'} {individual.isTodayLate ? '(Late)' : ''}
                  </strong>
                </div>
              </div>

              <div style={{ width: 1, height: 22, background: 'rgba(255, 255, 255, 0.08)' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, textAlign: 'right' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.62rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>OUT-TIME</span>
                  <strong style={{ color: individual.isTodayActive ? '#38bdf8' : (individual.todayOutTime && individual.todayOutTime !== '-' ? '#f8fafc' : 'var(--text-muted)') }}>
                    {individual.todayOutTime || '-'}
                  </strong>
                </div>
                <span style={{ fontSize: '0.85rem' }}>
                  {individual.isTodayActive ? '⏱️' : (individual.todayOutTime && individual.todayOutTime !== '-' ? '🏁' : '⚪')}
                </span>
              </div>
            </div>
          )}

          {/* Present vs Absent days & Logged hours */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 4px',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--text-secondary)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              <span>
                Present: <strong style={{ color: '#10b981' }}>{individual.presentDays} d</strong> ({presentPct}%)
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
              <span>
                Absent: <strong style={{ color: '#ef4444' }}>{individual.absentDays} d</strong> ({absentPct}%)
              </span>
            </div>
            {individual.totalHoursWorked > 0 && (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                {individual.totalHoursWorked}h logged
              </span>
            )}
          </div>
        </div>
      ) : (
        /* Overall Team Legend Row (Theme aligned: Emerald for Present, Rose for Absent) */
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          marginTop: 6,
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: 'var(--text-secondary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            <span>
              Present: <strong style={{ color: '#10b981' }}>{overall.presentCount}</strong> ({overall.presentPercentage}%)
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
            <span>
              Absent: <strong style={{ color: '#ef4444' }}>{overall.absentCount}</strong> ({overall.absentPercentage}%)
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Smooth Spline Curve Helpers (Catmull-Rom Bezier) ─────────────────
function createSplinePath(points) {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`;
  }

  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  const tension = 0.22; // Smooth Catmull-Rom tension

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return path;
}

function createSplineArea(points, baselineY) {
  if (!points || points.length === 0) return '';
  const line = createSplinePath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${line} L ${last.x.toFixed(1)} ${baselineY} L ${first.x.toFixed(1)} ${baselineY} Z`;
}

// ── Monthly Sales Trend (Smooth Spline Graph + Bar Chart - Site Theme) ───────────────
const MonthlySalesTrendChart = ({ monthlyData = [], formatCurrency, loading }) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [viewMode, setViewMode] = useState('line'); // 'line' (spline wave graph) or 'bar'

  // Rolling 7 months ending at current month
  const monthKeys = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.toLocaleString('en-US', { month: 'short', year: 'numeric' }));
    }
    return months;
  }, []);

  const chartData = useMemo(() => {
    return monthKeys.map((m) => {
      const short = m.slice(0, 3).toLowerCase();
      const match = (monthlyData || []).find(d => d.month && d.month.toLowerCase().includes(short));
      
      const sales = match ? Math.max(0, parseFloat(match.revenue) || 0) : 0;
      const profit = match ? Math.max(0, parseFloat(match.profit) || (sales * 0.75)) : 0;
      const deals = match ? (parseInt(match.dealsCount, 10) || 0) : 0;
      
      return {
        month: m,
        label: m.split(' ')[0], // 'May', 'Jun', ...
        sales,
        profit,
        deals,
        hasData: !!match
      };
    });
  }, [monthlyData, monthKeys]);

  // Max value across both sales & profit
  const maxVal = useMemo(() => {
    const highest = Math.max(...chartData.map(d => Math.max(d.sales, d.profit)), 50000);
    return Math.ceil(highest * 1.15); // +15% headroom for curve peak & tooltips
  }, [chartData]);

  // Default active month: either highest sales month or index 4
  const peakIndex = useMemo(() => {
    const maxSales = Math.max(...chartData.map(x => x.sales), 0);
    const found = chartData.findIndex(d => d.sales === maxSales && d.sales > 0);
    return found !== -1 ? found : Math.min(5, chartData.length - 1);
  }, [chartData]);

  const activeIndex = hoveredIdx !== null ? hoveredIdx : peakIndex;

  // SVG Geometry
  const width = 740;
  const height = 230;
  const paddingLeft = 55;
  const paddingRight = 35;
  const topY = 48;
  const baselineY = 190;
  const usableHeight = baselineY - topY;
  const usableWidth = width - paddingLeft - paddingRight;

  const colWidth = usableWidth / chartData.length;
  const barWidth = 12;
  const barGap = 4;

  // Grid lines (4 horizontal dashed levels)
  const gridLevels = [
    { y: topY, val: maxVal },
    { y: topY + usableHeight * 0.33, val: maxVal * 0.66 },
    { y: topY + usableHeight * 0.66, val: maxVal * 0.33 },
    { y: baselineY, val: 0 }
  ];

  const peakSales = Math.max(...chartData.map(d => d.sales), 0);

  // Compute (x, y) coordinates for smooth curves
  const salesPoints = useMemo(() => {
    return chartData.map((d, idx) => {
      const cx = paddingLeft + (idx + 0.5) * colWidth;
      const cy = baselineY - (d.sales > 0 ? (d.sales / maxVal) * usableHeight : 0);
      return { x: cx, y: cy, ...d, idx };
    });
  }, [chartData, maxVal, colWidth, baselineY, usableHeight, paddingLeft]);

  const profitPoints = useMemo(() => {
    return chartData.map((d, idx) => {
      const cx = paddingLeft + (idx + 0.5) * colWidth;
      const cy = baselineY - (d.profit > 0 ? (d.profit / maxVal) * usableHeight : 0);
      return { x: cx, y: cy, ...d, idx };
    });
  }, [chartData, maxVal, colWidth, baselineY, usableHeight, paddingLeft]);

  const salesSplinePath = useMemo(() => createSplinePath(salesPoints), [salesPoints]);
  const salesSplineArea = useMemo(() => createSplineArea(salesPoints, baselineY), [salesPoints, baselineY]);
  const profitSplinePath = useMemo(() => createSplinePath(profitPoints), [profitPoints]);
  const profitSplineArea = useMemo(() => createSplineArea(profitPoints, baselineY), [profitPoints, baselineY]);

  const activeSalesPoint = salesPoints[activeIndex] || salesPoints[0];
  const activeProfitPoint = profitPoints[activeIndex] || profitPoints[0];

  return (
    <div className="card" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      {/* Card Header with View Mode Switcher */}
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="card-title" style={{ fontSize: '1.05rem', fontWeight: 800 }}>Monthly Sales Trend</span>
          <span style={{
            fontSize: '0.72rem',
            background: 'rgba(129, 140, 248, 0.14)',
            color: 'var(--accent-light)',
            border: '1px solid var(--border)',
            padding: '2px 8px',
            borderRadius: '10px',
            fontWeight: 700
          }}>
            {viewMode === 'line' ? '📈 Sales vs Profit Spline' : '📊 Double Bar View'}
          </span>
        </div>

        {/* Legend, Peak Stat & Toggle Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontSize: '0.8125rem' }}>
          {/* Legend Items: Total Sales (Site Indigo #818cf8), Net Profit (Site Emerald #10b981) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-secondary)' }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#818cf8', display: 'inline-block' }} />
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Total Sales</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-secondary)' }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              <span style={{ fontWeight: 600, color: '#34d399' }}>Net Profit</span>
            </div>
          </div>

          <div style={{ color: 'var(--text-secondary)' }}>
            Peak: <strong style={{ color: 'var(--accent)' }}>{formatCurrency(peakSales)}</strong>
          </div>

          {/* View Mode Toggle Pill (Graph vs Bars - Site Indigo Theme) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.04)',
            borderRadius: '8px',
            padding: '2px',
            border: '1px solid var(--border, rgba(129, 140, 248, 0.16))'
          }}>
            <button
              type="button"
              onClick={() => setViewMode('line')}
              style={{
                background: viewMode === 'line' ? 'var(--accent-gradient, var(--accent-gradient))' : 'transparent',
                color: viewMode === 'line' ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: viewMode === 'line' ? '0 2px 8px var(--border-hover)' : 'none',
                transition: 'all 0.2s ease'
              }}
              title="Smooth curved line & area graph"
            >
              📈 Graph
            </button>
            <button
              type="button"
              onClick={() => setViewMode('bar')}
              style={{
                background: viewMode === 'bar' ? 'var(--accent-gradient, var(--accent-gradient))' : 'transparent',
                color: viewMode === 'bar' ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: viewMode === 'bar' ? '0 2px 8px var(--border-hover)' : 'none',
                transition: 'all 0.2s ease'
              }}
              title="Side-by-side comparison bars"
            >
              📊 Bars
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : (
        <div style={{ marginTop: 14, position: 'relative' }}>
          <svg 
            viewBox={`0 0 ${width} ${height}`} 
            style={{ width: '100%', height: 'auto', maxHeight: '270px', overflow: 'visible', display: 'block' }}
          >
            <defs>
              {/* Tooltip drop shadow */}
              <filter id="graphBubbleShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000000" floodOpacity="0.45" />
              </filter>

              {/* Total Sales Area Gradient (Site Indigo #818cf8) */}
              <linearGradient id="salesSplineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#84d802" stopOpacity="0.32" />
                <stop offset="65%" stopColor="#84d802" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#84d802" stopOpacity="0.0" />
              </linearGradient>

              {/* Net Profit Area Gradient (Site Emerald #10b981) */}
              <linearGradient id="profitSplineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                <stop offset="70%" stopColor="#10b981" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid Lines */}
            {gridLevels.map((grid, idx) => (
              <g key={idx}>
                <line 
                  x1={paddingLeft} 
                  y1={grid.y} 
                  x2={width - paddingRight} 
                  y2={grid.y} 
                  stroke="rgba(255, 255, 255, 0.06)" 
                  strokeDasharray={idx === 3 ? "none" : "4,4"} 
                  strokeWidth={idx === 3 ? "1.5" : "1"}
                />
                <text 
                  x={paddingLeft - 8} 
                  y={grid.y + 4} 
                  textAnchor="end" 
                  fill="var(--text-muted, #64748b)" 
                  fontSize="10" 
                  fontWeight="600"
                >
                  {grid.val >= 100000 ? `₹${(grid.val / 100000).toFixed(1)}L` : grid.val >= 1000 ? `₹${(grid.val / 1000).toFixed(0)}k` : `₹${grid.val.toFixed(0)}`}
                </text>
              </g>
            ))}

            {/* ══════════════════════════════════════════════════════════
                VIEW 1: SMOOTH CURVED WAVE SPLINE GRAPH (SITE THEME)
            ══════════════════════════════════════════════════════════ */}
            {viewMode === 'line' && (
              <g>
                {/* 1. Area Gradient Fills */}
                <path d={salesSplineArea} fill="url(#salesSplineGrad)" />
                <path d={profitSplineArea} fill="url(#profitSplineGrad)" />

                {/* 2. Soft Ambient Glow Strokes behind the lines */}
                <path 
                  d={salesSplinePath} 
                  fill="none" 
                  stroke="var(--border)" 
                  strokeWidth="6" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />
                <path 
                  d={profitSplinePath} 
                  fill="none" 
                  stroke="rgba(16, 185, 129, 0.25)" 
                  strokeWidth="5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />

                {/* 3. Primary Crisp Wave Curves */}
                <path 
                  d={salesSplinePath} 
                  fill="none" 
                  stroke="#84d802" 
                  strokeWidth="3" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />
                <path 
                  d={profitSplinePath} 
                  fill="none" 
                  stroke="#10b981" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeDasharray="5,4" 
                />

                {/* 4. Active Data Guide Line (Vertical dashed guide to X-axis) */}
                {activeSalesPoint && (
                  <line 
                    x1={activeSalesPoint.x} 
                    y1={activeSalesPoint.y} 
                    x2={activeSalesPoint.x} 
                    y2={baselineY} 
                    stroke="rgba(129, 140, 248, 0.45)" 
                    strokeDasharray="3,3" 
                    strokeWidth="1.5" 
                  />
                )}

                {/* 5. Passive Month Dots along the curve */}
                {salesPoints.map((pt, idx) => {
                  const isHovered = activeIndex === idx;
                  return (
                    <g key={idx}>
                      {/* Secondary Profit Dot (Emerald) */}
                      <circle 
                        cx={profitPoints[idx].x} 
                        cy={profitPoints[idx].y} 
                        r={isHovered ? "5" : "3.5"} 
                        fill="#10b981" 
                        stroke="#0a0f1e" 
                        strokeWidth="1.5" 
                      />
                      {/* Main Sales Dot (Indigo) */}
                      <circle 
                        cx={pt.x} 
                        cy={pt.y} 
                        r={isHovered ? "6" : "4"} 
                        fill="#84d802" 
                        stroke="#0a0f1e" 
                        strokeWidth="1.5" 
                      />
                    </g>
                  );
                })}

                {/* 6. Active Highlight Halo & Pulsing Dot (Site Indigo) */}
                {activeSalesPoint && (
                  <g style={{ pointerEvents: 'none' }}>
                    <circle 
                      cx={activeSalesPoint.x} 
                      cy={activeSalesPoint.y} 
                      r="12" 
                      fill="rgba(129, 140, 248, 0.25)" 
                    />
                    <circle 
                      cx={activeSalesPoint.x} 
                      cy={activeSalesPoint.y} 
                      r="6.5" 
                      fill="#84d802" 
                      stroke="#ffffff" 
                      strokeWidth="2.5" 
                    />
                    <circle 
                      cx={activeSalesPoint.x} 
                      cy={activeSalesPoint.y} 
                      r="2.5" 
                      fill="#ffffff" 
                    />
                  </g>
                )}

                {/* 7. Column Hover Sensor Zones */}
                {chartData.map((d, idx) => {
                  const cx = paddingLeft + (idx + 0.5) * colWidth;
                  const isHovered = activeIndex === idx;
                  return (
                    <g 
                      key={idx}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    >
                      {/* Full column hit area */}
                      <rect 
                        x={cx - colWidth / 2} 
                        y={topY - 10} 
                        width={colWidth} 
                        height={usableHeight + 40} 
                        fill="transparent" 
                      />

                      {/* Subtle hover column beam */}
                      {isHovered && (
                        <rect 
                          x={cx - colWidth / 2 + 4} 
                          y={topY} 
                          width={colWidth - 8} 
                          height={usableHeight} 
                          fill="rgba(255, 255, 255, 0.025)" 
                          rx="6" 
                        />
                      )}

                      {/* X-Axis Month Label */}
                      <text
                        x={cx}
                        y={baselineY + 22}
                        textAnchor="middle"
                        fill={isHovered ? "#ffffff" : "var(--text-secondary, #94a3b8)"}
                        fontSize="11.5"
                        fontWeight={isHovered ? "800" : "500"}
                        style={{ transition: 'fill 0.2s ease' }}
                      >
                        {d.label}
                      </text>

                      {/* Active indicator dot under month */}
                      {isHovered && (
                        <circle cx={cx} cy={baselineY + 30} r="2" fill="#84d802" />
                      )}
                    </g>
                  );
                })}

                {/* 8. Speech-Bubble Floating Tooltip */}
                {activeSalesPoint && (() => {
                  const bubbleW = 108;
                  const bubbleH = 46;
                  const bubbleX = Math.min(Math.max(paddingLeft, activeSalesPoint.x - bubbleW / 2), width - paddingRight - bubbleW);
                  const bubbleY = Math.max(6, activeSalesPoint.y - bubbleH - 12);
                  const tipX = activeSalesPoint.x;

                  return (
                    <g style={{ transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)', pointerEvents: 'none' }} filter="url(#graphBubbleShadow)">
                      <rect
                        x={bubbleX}
                        y={bubbleY}
                        width={bubbleW}
                        height={bubbleH}
                        rx="8"
                        fill="#ffffff"
                      />

                      <polygon
                        points={`${tipX - 5},${bubbleY + bubbleH} ${tipX + 5},${bubbleY + bubbleH} ${tipX},${bubbleY + bubbleH + 6}`}
                        fill="#ffffff"
                      />

                      <text
                        x={bubbleX + bubbleW / 2}
                        y={bubbleY + 13}
                        textAnchor="middle"
                        fill="#64748b"
                        fontSize="8.5"
                        fontWeight="700"
                        letterSpacing="0.05em"
                        fontFamily="system-ui, -apple-system, sans-serif"
                      >
                        {activeSalesPoint.month.toUpperCase()}
                      </text>

                      <text
                        x={bubbleX + bubbleW / 2}
                        y={bubbleY + 28}
                        textAnchor="middle"
                        fill="#1e1b4b"
                        fontSize="13"
                        fontWeight="800"
                        fontFamily="system-ui, -apple-system, sans-serif"
                      >
                        {activeSalesPoint.sales > 0 ? formatCurrency(activeSalesPoint.sales) : '₹0'}
                      </text>

                      <text
                        x={bubbleX + bubbleW / 2}
                        y={bubbleY + 40}
                        textAnchor="middle"
                        fill="#059669"
                        fontSize="8.5"
                        fontWeight="700"
                        fontFamily="system-ui, -apple-system, sans-serif"
                      >
                        Profit: {activeSalesPoint.profit > 0 ? formatCurrency(activeSalesPoint.profit) : '₹0'}
                      </text>
                    </g>
                  );
                })()}
              </g>
            )}

            {/* ══════════════════════════════════════════════════════════
                VIEW 2: DOUBLE BAR VIEW (SITE THEME)
            ══════════════════════════════════════════════════════════ */}
            {viewMode === 'bar' && (
              <g>
                {chartData.map((d, idx) => {
                  const cx = paddingLeft + (idx + 0.5) * colWidth;
                  
                  const salesHeight = Math.max(d.sales > 0 ? (d.sales / maxVal) * usableHeight : 6, 6);
                  const profitHeight = Math.max(d.profit > 0 ? (d.profit / maxVal) * usableHeight : 5, 5);

                  const salesY = baselineY - salesHeight;
                  const profitY = baselineY - profitHeight;

                  const isHovered = activeIndex === idx;

                  const bar1X = cx - barWidth - barGap / 2;
                  const bar2X = cx + barGap / 2;

                  return (
                    <g 
                      key={idx}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    >
                      <rect
                        x={cx - colWidth / 2}
                        y={topY - 10}
                        width={colWidth}
                        height={usableHeight + 40}
                        fill="transparent"
                      />

                      {isHovered && (
                        <rect
                          x={cx - colWidth / 2 + 6}
                          y={topY}
                          width={colWidth - 12}
                          height={usableHeight}
                          fill="rgba(255, 255, 255, 0.03)"
                          rx="6"
                        />
                      )}

                      {/* Left Bar: Site Indigo (#818cf8) - Total Sales */}
                      <rect
                        x={bar1X}
                        y={salesY}
                        width={barWidth}
                        height={salesHeight}
                        rx="4"
                        fill={isHovered ? "#a2f218" : "#84d802"}
                        style={{ transition: 'all 0.25s ease' }}
                      />

                      {/* Right Bar: Site Emerald (#10b981) - Net Profit */}
                      <rect
                        x={bar2X}
                        y={profitY}
                        width={barWidth}
                        height={profitHeight}
                        rx="4"
                        fill={isHovered ? "#34d399" : "#10b981"}
                        style={{ transition: 'all 0.25s ease' }}
                      />

                      {/* X-Axis Month Label */}
                      <text
                        x={cx}
                        y={baselineY + 22}
                        textAnchor="middle"
                        fill={isHovered ? "#ffffff" : "var(--text-secondary, #94a3b8)"}
                        fontSize="11.5"
                        fontWeight={isHovered ? "700" : "500"}
                        style={{ transition: 'fill 0.2s ease' }}
                      >
                        {d.label}
                      </text>
                    </g>
                  );
                })}

                {/* Active Bubble Tooltip for Bar View */}
                {activeIndex !== null && chartData[activeIndex] && (() => {
                  const d = chartData[activeIndex];
                  const cx = paddingLeft + (activeIndex + 0.5) * colWidth;
                  const salesH = d.sales > 0 ? (d.sales / maxVal) * usableHeight : 6;
                  const profitH = d.profit > 0 ? (d.profit / maxVal) * usableHeight : 5;
                  const topBarY = Math.min(baselineY - salesH, baselineY - profitH);

                  const bubbleW = 100;
                  const bubbleH = 38;
                  const bubbleY = Math.max(6, topBarY - bubbleH - 10);
                  const bubbleX = cx - bubbleW / 2;

                  return (
                    <g style={{ transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', pointerEvents: 'none' }} filter="url(#graphBubbleShadow)">
                      <rect
                        x={bubbleX}
                        y={bubbleY}
                        width={bubbleW}
                        height={bubbleH}
                        rx="8"
                        fill="#ffffff"
                      />
                      <polygon
                        points={`${cx - 5},${bubbleY + bubbleH} ${cx + 5},${bubbleY + bubbleH} ${cx},${bubbleY + bubbleH + 6}`}
                        fill="#ffffff"
                      />
                      <text
                        x={cx}
                        y={bubbleY + 16}
                        textAnchor="middle"
                        fill="#1e1b4b"
                        fontSize="12"
                        fontWeight="800"
                        fontFamily="system-ui, -apple-system, sans-serif"
                      >
                        {d.sales > 0 ? formatCurrency(d.sales) : '₹0'}
                      </text>
                      <text
                        x={cx}
                        y={bubbleY + 30}
                        textAnchor="middle"
                        fill="#64748b"
                        fontSize="9"
                        fontWeight="700"
                        letterSpacing="0.04em"
                        fontFamily="system-ui, -apple-system, sans-serif"
                      >
                        TOTAL SALES
                      </text>
                    </g>
                  );
                })()}
              </g>
            )}
          </svg>
        </div>
      )}
    </div>
  );
};

const DoubleBarSalesChart = MonthlySalesTrendChart;


const Dashboard = () => {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();

  // Business stats visibility check (only checks actual business widgets, not general page access)
  const canSeeBusinessTab =
    hasPermission('dashboard', 'leads-widget', 'canView') ||
    hasPermission('dashboard', 'calls-widget', 'canView') ||
    hasPermission('dashboard', 'interested-leads-widget', 'canView') ||
    hasPermission('dashboard', 'projects-widget', 'canView') ||
    hasPermission('dashboard', 'pending-projects-widget', 'canView') ||
    hasPermission('dashboard', 'completed-projects-widget', 'canView') ||
    hasPermission('dashboard', 'quote-sent-count-card', 'canView') ||
    hasPermission('dashboard', 'quote-sent-count-card-team', 'canView') ||
    hasPermission('dashboard', 'quote-sent-value-card', 'canView') ||
    hasPermission('dashboard', 'quote-sent-value-card-team', 'canView') ||
    hasPermission('dashboard', 'total-profit-card', 'canView') ||
    hasPermission('dashboard', 'monthly-profit-card', 'canView') ||
    hasPermission('dashboard', 'deductions-card', 'canView') ||
    hasPermission('dashboard', 'net-profit-card', 'canView') ||
    hasPermission('dashboard', 'profit-trend-chart', 'canView') ||
    hasPermission('dashboard', 'recent-leads-list', 'canView') ||
    hasPermission('dashboard', 'recent-projects-list', 'canView') ||
    hasPermission('dashboard', 'pending-designs-widget', 'canView') ||
    hasPermission('dashboard', 'completed-designs-widget', 'canView') ||
    hasPermission('dashboard', 'change-designs-widget', 'canView') ||
    hasPermission('dashboard', 'total-designs-widget', 'canView');

  // System Overviews tab visibility check
  const canSeeSystemTab =
    hasPermission('dashboard', 'system-overview', 'canView');

  // Initialize active tab based on permissions
  const [activeTab, setActiveTab] = useState(() => {
    if (canSeeSystemTab && !canSeeBusinessTab) return 'system';
    if (canSeeBusinessTab) return 'business';
    if (canSeeSystemTab) return 'system';
    return 'none';
  });
  const [systemStats, setSystemStats] = useState({});
  const [businessStats, setBusinessStats] = useState(null);
  const [loadingSystem, setLoadingSystem] = useState(true);
  const [loadingBusiness, setLoadingBusiness] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [dashboardScope, setDashboardScope] = useState('all');
  const [datePreset, setDatePreset] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomInputs, setShowCustomInputs] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('all');
  const [performersFilter, setPerformersFilter] = useState('this_month');
  const [loadingPerformers, setLoadingPerformers] = useState(false);

  // UAM Date Range Filter permission check
  const canUseDateFilter =
    user?.isSuperAdmin ||
    hasPermission('dashboard', 'dashboard-date-filter', 'canView') ||
    businessStats?.canUseDateFilter;

  // UAM User / Staff Filter permission check
  const canUseUserFilter =
    user?.isSuperAdmin ||
    hasPermission('dashboard', 'dashboard-user-filter', 'canView') ||
    businessStats?.canUseUserFilter;

  // UAM Top Performers Widget permission check — visible to everyone as requested
  const canSeeTopPerformers = true;

  // UAM Upcoming Closed Expos Widget permission check
  const canSeeUpcomingExpos =
    hasPermission('dashboard', 'upcoming-expos-widget', 'canView');

  // UAM Quote Sent KPI Cards (Personal / Own Scope vs Team / Org Scope)
  const isOwnDashboardScope = dashboardScope === 'own';
  const canSeeQuoteSentCount = isOwnDashboardScope
    ? hasPermission('dashboard', 'quote-sent-count-card', 'canView')
    : hasPermission('dashboard', 'quote-sent-count-card-team', 'canView');
  const canSeeQuoteSentValue = isOwnDashboardScope
    ? hasPermission('dashboard', 'quote-sent-value-card', 'canView')
    : hasPermission('dashboard', 'quote-sent-value-card-team', 'canView');

  // Prepare smooth line chart points and curves
  const lineChartData = useMemo(() => {
    const rawData = businessStats?.stats?.monthlyData || [];
    
    // Rolling monthly timeline for 2026
    const monthKeys = ['May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026', 'Nov 2026'];
    
    const pointsData = monthKeys.map(m => {
      const short = m.slice(0, 3).toLowerCase();
      const match = rawData.find(d => d.month && d.month.toLowerCase().includes(short));
      return {
        month: m,
        label: m.split(' ')[0],
        sales: match ? Math.max(0, parseFloat(match.revenue) || 0) : 0,
        hasData: !!match
      };
    });

    const maxVal = Math.max(...pointsData.map(p => p.sales), 10000);
    const paddingLeft = 70;
    const paddingRight = 45;
    const chartWidth = 800 - paddingLeft - paddingRight;
    const baselineY = 175;
    const topY = 40;
    const chartHeight = baselineY - topY;

    const coords = pointsData.map((p, idx) => {
      const x = paddingLeft + (idx / Math.max(1, pointsData.length - 1)) * chartWidth;
      const y = baselineY - (p.sales > 0 ? (p.sales / maxVal) * chartHeight : 0);
      return { ...p, x, y };
    });

    // Build smooth cubic bezier line path
    let linePath = '';
    if (coords.length > 0) {
      linePath = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
      for (let i = 0; i < coords.length - 1; i++) {
        const p0 = coords[i];
        const p1 = coords[i + 1];
        const cp1x = p0.x + (p1.x - p0.x) / 2;
        const cp1y = p0.y;
        const cp2x = p0.x + (p1.x - p0.x) / 2;
        const cp2y = p1.y;
        linePath += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
      }
    }

    const last = coords[coords.length - 1] || { x: 755, y: baselineY };
    const first = coords[0] || { x: paddingLeft, y: baselineY };
    const areaPath = linePath ? `${linePath} L ${last.x.toFixed(1)} ${baselineY} L ${first.x.toFixed(1)} ${baselineY} Z` : '';

    return { coords, linePath, areaPath, maxVal, baselineY, topY, paddingLeft, chartWidth };
  }, [businessStats?.stats?.monthlyData]);

  // Dynamic activeTab sync if permissions load late
  useEffect(() => {
    if (canSeeBusinessTab && canSeeSystemTab) {
      setActiveTab(prev => (prev === 'system' || prev === 'business') ? prev : 'business');
    } else if (canSeeSystemTab) {
      setActiveTab('system');
    } else if (canSeeBusinessTab) {
      setActiveTab('business');
    } else {
      setActiveTab('none');
    }
  }, [canSeeBusinessTab, canSeeSystemTab]);

  const fetchSystemStats = useCallback(async () => {
    setLoadingSystem(true);
    try {
      const results = await Promise.allSettled([
        api.get('/uam/users?limit=1'),
        api.get('/roles/all'),
        api.get('/organizations/all'),
        api.get('/companies/all'),
        api.get('/departments/all'),
      ]);

      setSystemStats({
        users: results[0].status === 'fulfilled' ? results[0].value.data.total : '—',
        roles: results[1].status === 'fulfilled' ? results[1].value.data.roles?.length : '—',
        organizations: results[2].status === 'fulfilled' ? results[2].value.data.organizations?.length : '—',
        companies: results[3].status === 'fulfilled' ? results[3].value.data.companies?.length : '—',
        departments: results[4].status === 'fulfilled' ? results[4].value.data.departments?.length : '—',
      });
    } catch { /* ignore */ }
    setLoadingSystem(false);
  }, []);

  const fetchBusinessStats = useCallback(async (scopeOverride, presetOverride, startOverride, endOverride, userOverride, performersPresetOverride) => {
    setLoadingBusiness(true);
    try {
      const targetScope = scopeOverride !== undefined ? scopeOverride : dashboardScope;
      const targetPreset = presetOverride !== undefined ? presetOverride : datePreset;
      const targetStart = startOverride !== undefined ? startOverride : customStartDate;
      const targetEnd = endOverride !== undefined ? endOverride : customEndDate;
      const targetUser = userOverride !== undefined ? userOverride : selectedUserId;
      const targetPerformersFilter = performersPresetOverride !== undefined ? performersPresetOverride : performersFilter;

      const params = new URLSearchParams({
        scope: targetScope,
        datePreset: targetPreset,
        performersPreset: targetPerformersFilter
      });
      if (targetPreset === 'custom' || targetStart) params.append('startDate', targetStart);
      if (targetPreset === 'custom' || targetEnd) params.append('endDate', targetEnd);
      if (targetUser && targetUser !== 'all') params.append('userId', targetUser);

      const res = await api.get(`/dashboard/stats?${params.toString()}`);
      setBusinessStats(res.data);
      if (res.data?.scopeType && res.data.scopeType !== 'user') {
        setDashboardScope(res.data.scopeType);
      }
      if (res.data?.selectedUserId) {
        setSelectedUserId(res.data.selectedUserId);
      }
    } catch { /* ignore */ }
    finally {
      setLoadingBusiness(false);
    }
  }, [dashboardScope, datePreset, customStartDate, customEndDate, selectedUserId, performersFilter]);

  const handlePerformersFilterChange = async (newFilter) => {
    setPerformersFilter(newFilter);
    setLoadingPerformers(true);
    try {
      const params = new URLSearchParams({
        scope: dashboardScope,
        datePreset,
        performersPreset: newFilter
      });
      if (datePreset === 'custom' || customStartDate) params.append('startDate', customStartDate);
      if (datePreset === 'custom' || customEndDate) params.append('endDate', customEndDate);
      if (selectedUserId && selectedUserId !== 'all') params.append('userId', selectedUserId);

      const res = await api.get(`/dashboard/stats?${params.toString()}`);
      if (res.data?.topPerformers) {
        setBusinessStats(prev => ({
          ...prev,
          topPerformers: res.data.topPerformers
        }));
      }
    } catch (err) {
      console.error('Failed to update top performers:', err);
    } finally {
      setLoadingPerformers(false);
    }
  };

  const handleScopeChange = (newScope) => {
    setDashboardScope(newScope);
    setSelectedUserId('all');
    fetchBusinessStats(newScope, datePreset, customStartDate, customEndDate, 'all');
  };

  const handleUserFilterChange = (newUserId) => {
    setSelectedUserId(newUserId);
    fetchBusinessStats(dashboardScope, datePreset, customStartDate, customEndDate, newUserId);
  };

  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    if (preset === 'custom') {
      setShowCustomInputs(true);
    } else {
      setShowCustomInputs(false);
      setCustomStartDate('');
      setCustomEndDate('');
      fetchBusinessStats(dashboardScope, preset, '', '');
    }
  };

  const handleApplyCustomDates = (e) => {
    if (e) e.preventDefault();
    if (!customStartDate && !customEndDate) return;
    setDatePreset('custom');
    fetchBusinessStats(dashboardScope, 'custom', customStartDate, customEndDate);
  };

  const handleResetDateFilter = () => {
    setDatePreset('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setShowCustomInputs(false);
    fetchBusinessStats(dashboardScope, 'all', '', '');
  };

  useEffect(() => {
    fetchSystemStats();
    fetchBusinessStats();
  }, [fetchSystemStats, fetchBusinessStats]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Helper to format currency
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  // Helper for Expo deadline countdown (auto-removing when passed)
  const getExpoCountdown = (expoDateStr) => {
    if (!expoDateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(expoDateStr);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return { label: 'Today', cls: 'badge-danger', icon: '🔴' };
    if (diffDays === 1) return { label: 'Tomorrow', cls: 'badge-warning', icon: '⚡' };
    if (diffDays < 0) return { label: 'Completed', cls: 'badge-secondary', icon: '✓' };
    if (diffDays <= 7) return { label: `In ${diffDays} days`, cls: 'badge-warning', icon: '⏳' };
    return { label: `In ${diffDays} days`, cls: 'badge-accent', icon: '📅' };
  };

  const formatExpoDate = (expoDateStr) => {
    if (!expoDateStr) return '—';
    try {
      const d = new Date(expoDateStr);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return expoDateStr;
    }
  };

  return (
    <AppLayout title="Dashboard">
      {/* Welcome Banner */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-secondary) 100%)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: '24px'
      }}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="avatar avatar-lg" style={{ background: 'var(--accent-gradient)', fontSize: '1.25rem', overflow: 'hidden', flexShrink: 0 }}>
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
              )}
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                {greeting()},
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {user?.name} {user?.isSuperAdmin && '⭐'}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--accent-light)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span>{user?.isSuperAdmin ? 'Super Administrator — Full System Access' : `Role: ${user?.role?.name}`}</span>
                {businessStats?.isDeptHead && (
                  <span style={{
                    fontSize: '0.72rem',
                    background: 'rgba(99, 102, 241, 0.15)',
                    color: 'var(--accent)',
                    border: '1px solid rgba(99, 102, 241, 0.35)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontWeight: 600
                  }}>
                    👑 Department Head View (Team Leads & Projects)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tab Switcher */}
          {(canSeeBusinessTab && canSeeSystemTab) && (
            <div style={{
              display: 'flex',
              background: 'var(--bg-secondary)',
              padding: 4,
              borderRadius: 8,
              border: '1px solid var(--border)'
            }}>
              <button 
                onClick={() => setActiveTab('business')}
                style={{
                  background: activeTab === 'business' ? 'var(--accent)' : 'transparent',
                  color: activeTab === 'business' ? 'white' : 'var(--text-secondary)',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'var(--transition)'
                }}
              >
                💼 Business Stats
              </button>
              <button 
                onClick={() => setActiveTab('system')}
                style={{
                  background: activeTab === 'system' ? 'var(--accent)' : 'transparent',
                  color: activeTab === 'system' ? 'white' : 'var(--text-secondary)',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'var(--transition)'
                }}
              >
                🛡️ System Overviews
              </button>
            </div>
          )}
        </div>
      </div>

      {/* BUSINESS TAB */}
      {activeTab === 'business' && canSeeBusinessTab && (
        <div>
                    {/* Scope Header / Toggle Bar */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '16px 20px',
            marginBottom: 20,
            boxShadow: 'var(--shadow-sm)'
          }}>
            {/* Row 1: Scope indicator & mode switch */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Business Analytics Scope:
                  </span>
                  {dashboardScope === 'all' ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 12px',
                      borderRadius: 20,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: 'rgba(59, 130, 246, 0.12)',
                      color: 'var(--info)',
                      border: '1px solid rgba(59, 130, 246, 0.3)'
                    }}>
                      <span>👥</span> All Staff Counts (Team / Org Scope)
                    </span>
                  ) : (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 12px',
                      borderRadius: 20,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: 'var(--success-bg)',
                      color: 'var(--success)',
                      border: '1px solid var(--success-border)'
                    }}>
                      <span>👤</span> My Counts Only (Assigned to Me)
                    </span>
                  )}
                  {selectedUserId && selectedUserId !== 'all' && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 12px',
                      borderRadius: 20,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: 'rgba(168, 85, 247, 0.15)',
                      color: '#a855f7',
                      border: '1px solid rgba(168, 85, 247, 0.4)'
                    }}>
                      <RiShieldUserLine /> Filtered: {businessStats?.availableUsers?.find(u => String(u.id) === String(selectedUserId))?.name || `Staff #${selectedUserId}`}
                    </span>
                  )}
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: 4, marginBottom: 0 }}>
                  {selectedUserId && selectedUserId !== 'all'
                    ? `Viewing only metrics, leads and deals assigned to ${businessStats?.availableUsers?.find(u => String(u.id) === String(selectedUserId))?.name || 'selected staff member'}.`
                    : dashboardScope === 'all'
                    ? 'Monitoring leads, calls, deals and project metrics across all staff in your organization.'
                    : 'Viewing only metrics and leads specifically assigned to your account.'}
                </p>
              </div>

              {/* Scope Toggle Buttons if user has canViewAll permission */}
              {businessStats?.canViewAll && (
                <div style={{
                  display: 'inline-flex',
                  background: 'var(--bg-secondary)',
                  padding: 4,
                  borderRadius: 8,
                  border: '1px solid var(--border)'
                }}>
                  <button
                    type="button"
                    onClick={() => handleScopeChange('all')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: dashboardScope === 'all' ? 'var(--accent)' : 'transparent',
                      color: dashboardScope === 'all' ? '#ffffff' : 'var(--text-secondary)',
                      border: 'none',
                      padding: '6px 14px',
                      borderRadius: 6,
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      cursor: 'pointer',
                      transition: 'var(--transition)'
                    }}
                  >
                    <span>👥</span> All Staff Counts
                  </button>
                  <button
                    type="button"
                    onClick={() => handleScopeChange('own')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: dashboardScope === 'own' ? 'var(--accent)' : 'transparent',
                      color: dashboardScope === 'own' ? '#ffffff' : 'var(--text-secondary)',
                      border: 'none',
                      padding: '6px 14px',
                      borderRadius: 6,
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      cursor: 'pointer',
                      transition: 'var(--transition)'
                    }}
                  >
                    <span>👤</span> My Counts Only
                  </button>
                </div>
              )}
            </div>

            {/* Row 2: UAM Controlled Date Range Filter */}
            {canUseDateFilter && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
                paddingTop: 12,
                borderTop: '1px solid var(--border)'
              }}>
                {/* Presets Button Group */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    marginRight: 4
                  }}>
                    <RiCalendarLine style={{ color: 'var(--accent)', fontSize: '1rem' }} />
                    <span>Date Filter:</span>
                  </div>

                  {[
                    { key: 'all', label: 'All Time' },
                    { key: 'today', label: 'Today' },
                    { key: 'yesterday', label: 'Yesterday' },
                    { key: 'this_week', label: 'This Week' },
                    { key: 'this_month', label: 'This Month' },
                    { key: 'last_month', label: 'Last Month' },
                    { key: 'custom', label: 'Custom Range...' }
                  ].map(p => {
                    const isActive = datePreset === p.key;
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => handlePresetChange(p.key)}
                        style={{
                          background: isActive ? 'var(--accent)' : 'var(--bg-secondary)',
                          color: isActive ? '#ffffff' : 'var(--text-secondary)',
                          border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                          padding: '5px 11px',
                          borderRadius: 6,
                          fontSize: '0.775rem',
                          fontWeight: isActive ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Date Inputs & Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {(showCustomInputs || datePreset === 'custom') && (
                    <form onSubmit={handleApplyCustomDates} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={e => setCustomStartDate(e.target.value)}
                        style={{
                          padding: '5px 9px',
                          borderRadius: 6,
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-primary)',
                          fontSize: '0.775rem',
                          cursor: 'pointer'
                        }}
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>to</span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={e => setCustomEndDate(e.target.value)}
                        style={{
                          padding: '5px 9px',
                          borderRadius: 6,
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-primary)',
                          fontSize: '0.775rem',
                          cursor: 'pointer'
                        }}
                      />
                      <button
                        type="submit"
                        disabled={!customStartDate && !customEndDate}
                        style={{
                          background: 'var(--accent)',
                          color: '#ffffff',
                          border: 'none',
                          padding: '5px 12px',
                          borderRadius: 6,
                          fontSize: '0.775rem',
                          fontWeight: 600,
                          cursor: (!customStartDate && !customEndDate) ? 'not-allowed' : 'pointer',
                          opacity: (!customStartDate && !customEndDate) ? 0.6 : 1
                        }}
                      >
                        Apply
                      </button>
                    </form>
                  )}

                  {/* Active Filter Indicator & Reset Button */}
                  {datePreset !== 'all' && (
                    <button
                      type="button"
                      onClick={handleResetDateFilter}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 10px',
                        borderRadius: 6,
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#ef4444',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                      title="Clear date filter and view All Time metrics"
                    >
                      <RiRefreshLine /> Reset Date
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Row 3: UAM Controlled User / Staff Filter */}
            {canUseUserFilter && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
                paddingTop: 12,
                borderTop: '1px solid var(--border)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)'
                  }}>
                    <RiShieldUserLine style={{ color: '#a855f7', fontSize: '1.05rem' }} />
                    <span>Staff Member Filter:</span>
                  </div>

                  <select
                    value={selectedUserId}
                    onChange={(e) => handleUserFilterChange(e.target.value)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      minWidth: 230
                    }}
                  >
                    <option value="all">👥 All Staff Members</option>
                    {(businessStats?.availableUsers || []).map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} {(u.role?.name || u.Role?.name) ? `(${u.role?.name || u.Role?.name})` : ''}
                      </option>
                    ))}
                  </select>

                  {selectedUserId !== 'all' && (
                    <button
                      type="button"
                      onClick={() => handleUserFilterChange('all')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 10px',
                        borderRadius: 6,
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#ef4444',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                      title="Clear staff filter and show all staff"
                    >
                      <RiRefreshLine /> Clear Staff Filter
                    </button>
                  )}
                </div>

                {selectedUserId !== 'all' && (
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#c084fc',
                    background: 'rgba(168, 85, 247, 0.12)',
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: '1px solid rgba(168, 85, 247, 0.25)',
                    fontWeight: 600
                  }}>
                    Active Filter: {businessStats?.availableUsers?.find(u => String(u.id) === String(selectedUserId))?.name || `Staff #${selectedUserId}`}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Business Metrics Grid - Core Cards */}
          {(hasPermission('dashboard', 'leads-widget', 'canView') ||
            hasPermission('dashboard', 'calls-widget', 'canView') ||
            hasPermission('dashboard', 'interested-leads-widget', 'canView') ||
            canSeeQuoteSentCount ||
            canSeeQuoteSentValue ||
            hasPermission('dashboard', 'projects-widget', 'canView') ||
            hasPermission('dashboard', 'pending-projects-widget', 'canView') ||
            hasPermission('dashboard', 'completed-projects-widget', 'canView')) && (
            <div className="kpi-core-grid">
              {hasPermission('dashboard', 'leads-widget', 'canView') && (
                <StatCard 
                  icon={<RiTeamLine />} 
                  label="Total Leads" 
                  value={loadingBusiness ? null : businessStats?.stats?.totalLeads} 
                  color="accent" 
                  onClick={() => navigate('/leads')}
                />
              )}
              {hasPermission('dashboard', 'calls-widget', 'canView') && (
                <StatCard 
                  icon={<RiPhoneLine />} 
                  label="Total Calls" 
                  value={loadingBusiness ? null : businessStats?.stats?.totalCalls} 
                  color="info" 
                  onClick={() => navigate('/leads')}
                />
              )}
              {hasPermission('dashboard', 'interested-leads-widget', 'canView') && (
                <StatCard 
                  icon={<RiUserHeartLine />} 
                  label="Total Interested Leads" 
                  value={loadingBusiness ? null : businessStats?.stats?.totalInterestedLeads} 
                  color="info" 
                  onClick={() => navigate('/leads?status=qualified')}
                />
              )}
              {canSeeQuoteSentCount && (
                <StatCard 
                  icon={<RiSendPlaneLine />} 
                  label={dashboardScope === 'own' ? "My Quotes Sent" : "Total Quotes Sent"} 
                  value={loadingBusiness ? null : businessStats?.stats?.totalQuoteSent} 
                  color="warning" 
                  onClick={() => navigate('/leads?status=quote_sent')}
                />
              )}
              {canSeeQuoteSentValue && (
                <StatCard 
                  icon={<RiPriceTag3Line />} 
                  label={dashboardScope === 'own' ? "My Quote Value" : "Total Quote Value"} 
                  value={loadingBusiness ? null : formatCurrency(businessStats?.stats?.totalQuoteValue || 0)} 
                  color="success" 
                  onClick={() => navigate('/leads?status=quote_sent')}
                />
              )}
              {hasPermission('dashboard', 'projects-widget', 'canView') && (
                <StatCard 
                  icon={<RiBriefcaseLine />} 
                  label="Total Projects" 
                  value={loadingBusiness ? null : businessStats?.stats?.totalProjects} 
                  color="primary" 
                  onClick={() => navigate('/leads?status=converted')}
                />
              )}
              {hasPermission('dashboard', 'pending-projects-widget', 'canView') && (
                <StatCard 
                  icon={<RiTimeLine />} 
                  label="Pending Projects" 
                  value={loadingBusiness ? null : businessStats?.stats?.pendingProjects} 
                  color="warning" 
                  onClick={() => navigate('/leads?status=converted')}
                />
              )}
              {hasPermission('dashboard', 'completed-projects-widget', 'canView') && (
                <StatCard 
                  icon={<RiTrophyLine />} 
                  label="Completed Projects" 
                  value={loadingBusiness ? null : businessStats?.stats?.completedProjects} 
                  color="danger" 
                  onClick={() => navigate('/leads?status=converted')}
                />
              )}
            </div>
          )}

          {/* Design Operations Grid */}
          {(hasPermission('dashboard', 'total-designs-widget', 'canView') ||
            hasPermission('dashboard', 'pending-designs-widget', 'canView') ||
            hasPermission('dashboard', 'completed-designs-widget', 'canView') ||
            hasPermission('dashboard', 'change-designs-widget', 'canView')) && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                🎨 Design Operations
              </h3>
              <div className="kpi-quad-grid">
                {hasPermission('dashboard', 'total-designs-widget', 'canView') && (
                  <StatCard 
                    icon={<RiPaletteLine />} 
                    label="Total Design" 
                    value={loadingBusiness ? null : businessStats?.stats?.totalDesigns} 
                    color="primary" 
                    onClick={() => navigate('/my-projects')}
                  />
                )}
                {hasPermission('dashboard', 'pending-designs-widget', 'canView') && (
                  <StatCard 
                    icon={<RiTimeLine />} 
                    label="Pending Design" 
                    value={loadingBusiness ? null : businessStats?.stats?.pendingDesigns} 
                    color="warning" 
                    onClick={() => navigate('/my-projects')}
                  />
                )}
                {hasPermission('dashboard', 'completed-designs-widget', 'canView') && (
                  <StatCard 
                    icon={<RiCheckDoubleLine />} 
                    label="Total Completed Design" 
                    value={loadingBusiness ? null : businessStats?.stats?.completedDesigns} 
                    color="success" 
                    onClick={() => navigate('/completed-models')}
                  />
                )}
                {hasPermission('dashboard', 'change-designs-widget', 'canView') && (
                  <StatCard 
                    icon={<RiLineChartLine />} 
                    label="Total Changes" 
                    value={loadingBusiness ? null : businessStats?.stats?.changeDesigns} 
                    color="info" 
                  />
                )}
              </div>
            </div>
          )}

          {/* Financial Cards Grid */}
          {(hasPermission('dashboard', 'total-profit-card', 'canView') ||
            hasPermission('dashboard', 'monthly-profit-card', 'canView') ||
            hasPermission('dashboard', 'deductions-card', 'canView') ||
            hasPermission('dashboard', 'net-profit-card', 'canView')) && (
            <div className="kpi-quad-grid">
              {hasPermission('dashboard', 'total-profit-card', 'canView') && (
                <FinancialKpiCard
                  icon={<RiMoneyDollarBoxLine />}
                  label={dashboardScope === 'all' ? 'Team Total Sales' : 'My Total Sales'}
                  value={loadingBusiness ? null : formatCurrency(businessStats?.stats?.totalSales ?? businessStats?.stats?.totalRevenue)}
                  subLabel="Total Closed Deals:"
                  subValue={`${businessStats?.stats?.totalProjects ?? 0} Projects`}
                  color="warning"
                  onClick={() => navigate('/closed-sales')}
                />
              )}

              {hasPermission('dashboard', 'monthly-profit-card', 'canView') && (
                <FinancialKpiCard
                  icon={<RiLineChartLine />}
                  label="Average Monthly Sales"
                  value={loadingBusiness ? null : formatCurrency(businessStats?.stats?.perMonthSales ?? businessStats?.stats?.totalRevenue)}
                  subLabel="Monthly Growth Rate:"
                  subValue="+14.8%"
                  subColor="var(--success)"
                  color="accent"
                />
              )}

              {hasPermission('dashboard', 'deductions-card', 'canView') && (
                <FinancialKpiCard
                  icon={<RiCoinsLine />}
                  label={dashboardScope === 'all' ? 'Team Deductions' : 'My Deductions'}
                  value={loadingBusiness ? null : formatCurrency(businessStats?.stats?.totalDeductions)}
                  subLabel="Expense ratio:"
                  subValue={loadingBusiness ? '...' : `${Math.round(((businessStats?.stats?.totalDeductions || 0) / (businessStats?.stats?.totalRevenue || 1)) * 100)}%`}
                  subColor="var(--danger)"
                  color="danger"
                />
              )}

              {(hasPermission('dashboard', 'net-profit-card', 'canView') || hasPermission('dashboard', 'total-profit-card', 'canView')) && (
                <FinancialKpiCard
                  icon={<RiWallet3Line />}
                  label={dashboardScope === 'all' ? 'Team Net Profit' : 'My Net Profit'}
                  value={loadingBusiness ? null : formatCurrency(businessStats?.stats?.totalProfit)}
                  subLabel={dashboardScope === 'all' ? 'Team Profit Margin:' : 'My Profit Margin:'}
                  subValue={loadingBusiness ? '...' : `${Math.round(((businessStats?.stats?.totalProfit || 0) / (businessStats?.stats?.totalRevenue || 1)) * 100)}%`}
                  subColor={(businessStats?.stats?.totalProfit ?? 0) >= 0 ? 'var(--success)' : 'var(--danger)'}
                  color="success"
                />
              )}
            </div>
          )}

          {/* Main Visualizations Row: Sales Trend (Left) + Attendance Donut Card (Right) */}
          <div className="dashboard-viz-row">
            {/* Double Bar Monthly Sales Chart (Matching Reference UI) */}
            {hasPermission('dashboard', 'profit-trend-chart', 'canView') && (
              <DoubleBarSalesChart 
                monthlyData={businessStats?.stats?.monthlyData}
                formatCurrency={formatCurrency}
                loading={loadingBusiness}
              />
            )}

            {/* Attendance Donut Card (Overall Staff & Individual) — Controlled by Attendance Permissions */}
            {(hasPermission('attendance', 'attendance-team', 'canView') || hasPermission('attendance', 'attendance-list', 'canView')) && (
              <AttendanceDonutCard 
                attendanceData={businessStats?.attendance}
                isFilteredByUser={dashboardScope === 'my' || selectedUserId !== 'all'}
                selectedUserId={selectedUserId}
                onNavigateAttendance={() => navigate('/attendance')}
                onSelectUser={(uid) => {
                  if (uid && uid !== selectedUserId) {
                    setSelectedUserId(uid);
                    fetchBusinessStats(dashboardScope, datePreset, customStartDate, customEndDate, uid);
                  }
                }}
              />
            )}
          </div>

          {/* Top 3 Sales Performers Leaderboard — UAM Controlled */}
          {canSeeTopPerformers && (
            <div className="card" style={{ marginBottom: '24px', overflow: 'hidden' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(202, 138, 4, 0.1))',
                    border: '1px solid rgba(234, 179, 8, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#eab308',
                    fontSize: '1.2rem'
                  }}>
                    <RiTrophyLine />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      Top 3 Sales Sources
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Ranked by highest closed deal revenue & average deal value
                    </span>
                  </div>
                </div>

                {/* Monthly & Yearly Filter Controls for Top 3 Performers */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => handlePerformersFilterChange('this_month')}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 20,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: performersFilter === 'this_month' ? '1px solid #6366f1' : '1px solid var(--border)',
                      background: performersFilter === 'this_month' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                      color: performersFilter === 'this_month' ? '#a5b4fc' : 'var(--text-secondary)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    📅 This Month
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePerformersFilterChange('all')}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 20,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: performersFilter === 'all' ? '1px solid #6366f1' : '1px solid var(--border)',
                      background: performersFilter === 'all' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                      color: performersFilter === 'all' ? '#a5b4fc' : 'var(--text-secondary)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    🗓️ All Time
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePerformersFilterChange('last_month')}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 20,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: performersFilter === 'last_month' ? '1px solid #6366f1' : '1px solid var(--border)',
                      background: performersFilter === 'last_month' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                      color: performersFilter === 'last_month' ? '#a5b4fc' : 'var(--text-secondary)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    📅 Last Month
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePerformersFilterChange('this_year')}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 20,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: performersFilter === 'this_year' ? '1px solid #6366f1' : '1px solid var(--border)',
                      background: performersFilter === 'this_year' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                      color: performersFilter === 'this_year' ? '#a5b4fc' : 'var(--text-secondary)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    📆 This Year
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePerformersFilterChange('last_year')}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 20,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: performersFilter === 'last_year' ? '1px solid #6366f1' : '1px solid var(--border)',
                      background: performersFilter === 'last_year' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                      color: performersFilter === 'last_year' ? '#a5b4fc' : 'var(--text-secondary)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    📆 Last Year
                  </button>
                  <select
                    value={['all', 'this_month', 'last_month', 'this_year', 'last_year'].includes(performersFilter) ? '' : performersFilter}
                    onChange={(e) => { if (e.target.value) handlePerformersFilterChange(e.target.value); }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 20,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: !['all', 'this_month', 'last_month', 'this_year', 'last_year'].includes(performersFilter) ? '1px solid #6366f1' : '1px solid var(--border)',
                      background: !['all', 'this_month', 'last_month', 'this_year', 'last_year'].includes(performersFilter) ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-secondary)',
                      color: !['all', 'this_month', 'last_month', 'this_year', 'last_year'].includes(performersFilter) ? 'var(--accent)' : 'var(--text-secondary)',
                      outline: 'none'
                    }}
                  >
                    <option value="" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}>More...</option>
                    <option value="2026-09" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Sep 2026</option>
                    <option value="2026-08" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Aug 2026</option>
                    <option value="2026-07" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Jul 2026</option>
                    <option value="2026-06" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Jun 2026</option>
                    <option value="2026-05" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>May 2026</option>
                    <option value="2024" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>Year 2024</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => navigate('/leaderboard')}
                    style={{
                      padding: '4px 14px',
                      borderRadius: 20,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: '1px solid rgba(234, 179, 8, 0.45)',
                      background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(202, 138, 4, 0.1))',
                      color: '#fbbf24',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      marginLeft: 4,
                      transition: 'all 0.15s ease'
                    }}
                    title="View all sales members ranked top to bottom"
                  >
                    <RiTrophyLine /> Full Leaderboard &rarr;
                  </button>
                </div>
              </div>

              {loadingBusiness || loadingPerformers ? (
                <div style={{ textAlign: 'center', padding: '36px' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
              ) : (!businessStats?.topPerformers || businessStats.topPerformers.length === 0) ? (
                <div style={{
                  padding: '32px 20px',
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.01)',
                  borderRadius: 10,
                  border: '1px dashed var(--border)'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: 6 }}>🎯</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                    No Completed Sales in this Period
                  </div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                    As soon as leads are marked as converted or sales closed, top performing channels will rank here automatically.
                  </div>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: 16,
                  marginTop: 14
                }}>
                  {businessStats.topPerformers.map((emp) => {
                    const isGold = emp.rank === 1;
                    const isSilver = emp.rank === 2;

                    const borderCol = isGold ? 'rgba(234, 179, 8, 0.45)' : isSilver ? 'rgba(148, 163, 184, 0.45)' : 'rgba(217, 119, 6, 0.45)';
                    const bgGrad = isGold
                      ? 'linear-gradient(145deg, rgba(234, 179, 8, 0.12) 0%, rgba(202, 138, 4, 0.03) 100%)'
                      : isSilver
                      ? 'linear-gradient(145deg, rgba(148, 163, 184, 0.12) 0%, rgba(100, 116, 139, 0.03) 100%)'
                      : 'linear-gradient(145deg, rgba(217, 119, 6, 0.12) 0%, rgba(180, 83, 9, 0.03) 100%)';
                    const badgeText = isGold ? '🥇 #1 Champion' : isSilver ? '🥈 #2 Runner-Up' : '🥉 #3 Performer';
                    const badgeColor = isGold ? '#eab308' : isSilver ? '#cbd5e1' : '#f59e0b';

                    const sCount = emp.salesCount || 0;
                    const totalVal = emp.totalRevenue || emp.baseRevenue || 0;
                    const avgVal = emp.avgDealValue || (sCount > 0 ? Math.round(totalVal / sCount) : 0);

                    return (
                      <div
                        key={emp.source || emp.userId || emp.rank}
                        style={{
                          background: bgGrad,
                          border: `1px solid ${borderCol}`,
                          borderRadius: 14,
                          padding: '18px 20px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          position: 'relative',
                          transition: 'all 0.2s ease',
                          boxShadow: isGold ? '0 8px 24px rgba(234, 179, 8, 0.08)' : 'none',
                          cursor: 'pointer'
                        }}
                        onClick={() => navigate('/leads')}
                      >
                        {/* Top Rank Badge */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            color: badgeColor,
                            background: 'rgba(0, 0, 0, 0.35)',
                            padding: '3px 10px',
                            borderRadius: 12,
                            border: `1px solid ${borderCol}`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}>
                            {badgeText}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Rank {emp.rank} of {businessStats.topPerformers.length}
                          </span>
                        </div>

                        {/* Channel Icon & Name */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                          <div style={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            background: isGold ? 'rgba(234, 179, 8, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                            color: isGold ? '#eab308' : (emp.color || 'var(--accent)'),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '1.25rem',
                            border: `2px solid ${badgeColor}`,
                            flexShrink: 0
                          }}>
                            {emp.icon ? emp.icon : (emp.avatar ? (
                              <img src={emp.avatar} alt={emp.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              emp.name ? emp.name.charAt(0).toUpperCase() : '🔗'
                            ))}
                          </div>
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {emp.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {emp.role || 'Acquisition Channel'}
                            </div>
                          </div>
                        </div>

                        {/* Performance Metric Counters (Closed Deals, Avg Deal Value, Total Value) */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: 8,
                          padding: '10px 12px',
                          background: 'var(--bg-secondary)',
                          borderRadius: 10,
                          border: '1px solid var(--border)'
                        }}>
                          <div>
                            <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
                              Closed Deals
                            </span>
                            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--success)' }}>
                              {sCount} <span style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>deals</span>
                            </span>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
                              Avg Deal Value
                            </span>
                            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#a855f7', whiteSpace: 'nowrap' }}>
                              {formatCurrency(avgVal)}
                            </span>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
                              Total Value
                            </span>
                            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#38bdf8', whiteSpace: 'nowrap' }}>
                              {formatCurrency(totalVal)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Upcoming Closed Projects / Expos — UAM Controlled & Auto-Expiring */}
          {canSeeUpcomingExpos && (
            <div className="card" style={{ marginBottom: '24px' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(14, 165, 233, 0.1))',
                    border: '1px solid rgba(56, 189, 248, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#38bdf8',
                    fontSize: '1.2rem'
                  }}>
                    <RiCalendarEventLine />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      Upcoming Closed Projects & Expos
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Chronological exhibition schedule • Auto-removes once Expo Date finishes
                    </span>
                  </div>
                </div>

                <span style={{
                  fontSize: '0.72rem',
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '3px 10px',
                  borderRadius: 20,
                  fontWeight: 600
                }}>
                  ✨ Active Schedule ({businessStats?.upcomingClosedSales?.length || 0})
                </span>
              </div>

              {loadingBusiness ? (
                <div style={{ textAlign: 'center', padding: '36px' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
              ) : (!businessStats?.upcomingClosedSales || businessStats.upcomingClosedSales.length === 0) ? (
                <div style={{
                  padding: '32px 20px',
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.01)',
                  borderRadius: 10,
                  border: '1px dashed var(--border)'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: 6 }}>📅</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                    No Upcoming Closed Expos Scheduled
                  </div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                    Add an Expo Date when editing leads or closed sales to automatically track upcoming exhibition deadlines here.
                  </div>
                </div>
              ) : (
                <div className="table-wrapper" style={{ marginTop: 12 }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Expo Date & Urgency</th>
                        <th>Exhibition / Expo</th>
                        <th>Client / Company</th>
                        <th>Assigned Staff</th>
                        <th>Deal Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {businessStats.upcomingClosedSales.map(deal => {
                        const countdown = getExpoCountdown(deal.expoDate);
                        return (
                          <tr key={deal.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{
                                  padding: '5px 8px',
                                  borderRadius: 8,
                                  background: 'rgba(99, 102, 241, 0.12)',
                                  border: '1px solid var(--border)',
                                  textAlign: 'center',
                                  minWidth: 70
                                }}>
                                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent)' }}>
                                    {formatExpoDate(deal.expoDate)}
                                  </div>
                                </div>
                                {countdown && (
                                  <span className={`badge ${countdown.cls}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <span>{countdown.icon}</span> {countdown.label}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                {deal.expoName}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{deal.companyName}</div>
                              {deal.contactPerson && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{deal.contactPerson}</div>
                              )}
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: 24,
                                  height: 24,
                                  borderRadius: '50%',
                                  background: 'rgba(99, 102, 241, 0.2)',
                                  color: 'var(--accent)',
                                  fontSize: '0.72rem',
                                  fontWeight: 700
                                }}>
                                  {deal.assignee?.name ? deal.assignee.name.charAt(0).toUpperCase() : '?'}
                                </span>
                                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {deal.assignee?.name || 'Unassigned'}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span style={{ fontWeight: 700, color: 'var(--success)' }}>
                                {formatCurrency(deal.totalValue || deal.value)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Recent Leads & Projects Modern Activity Cards */}
          {(hasPermission('dashboard', 'recent-leads-list', 'canView') ||
            hasPermission('dashboard', 'recent-projects-list', 'canView')) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: '20px', marginBottom: '24px' }}>
              {/* Recent Leads Activity Card */}
              {hasPermission('dashboard', 'recent-leads-list', 'canView') && (
                <div className="card" style={{ padding: '20px 22px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: 'rgba(139, 92, 246, 0.15)',
                        color: '#a78bfa',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.15rem'
                      }}>
                        <RiTeamLine />
                      </div>
                      <div>
                        <span className="card-title" style={{ fontSize: '1rem', fontWeight: 800 }}>Recent Leads</span>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Latest business inquiries & opportunities</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => navigate('/leads')}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        borderRadius: 8,
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
                    >
                      View All <RiArrowRightSLine />
                    </button>
                  </div>

                  {loadingBusiness ? (
                    <div style={{ textAlign: 'center', padding: '30px' }}><div className="spinner spinner-sm" style={{ margin: '0 auto' }} /></div>
                  ) : (!businessStats?.recentLeads || businessStats.recentLeads.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                      No recent leads found
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {businessStats.recentLeads.map((lead) => {
                        const initial = (lead.companyName || lead.name || '?').charAt(0).toUpperCase();
                        const STATUS_FORMAT = {
                          new:                  { label: 'New',                  cls: 'badge-info' },
                          not_answering:        { label: 'Not Answering',        cls: 'badge-warning' },
                          number_busy:          { label: 'Number Busy',          cls: 'badge-warning' },
                          not_interested:       { label: 'Not Interested',       cls: 'badge-secondary' },
                          not_participating:    { label: 'Not Participating',    cls: 'badge-danger' },
                          requirement_received: { label: 'Requirement Received', cls: 'badge-info' },
                          call_back:            { label: 'Call Back',            cls: 'badge-warning' },
                          follow_ups:           { label: 'Follow Ups',           cls: 'badge-accent' },
                          design_sent:          { label: 'Design Sent',          cls: 'badge-accent' },
                          quote_sent:           { label: 'Quote Sent',           cls: 'badge-info' },
                          converted:            { label: 'Sales Closed',         cls: 'badge-success' },
                          contacted:            { label: 'Not Answering',        cls: 'badge-warning' },
                          qualified:            { label: 'Requirement Received', cls: 'badge-info' },
                          lost:                 { label: 'Not Participating',    cls: 'badge-danger' },
                          sales_closed:         { label: 'Sales Closed',         cls: 'badge-success' },
                          shell_scheme:         { label: 'Shell Scheme',         cls: 'badge-accent' },
                          'shell scheme':       { label: 'Shell Scheme',         cls: 'badge-accent' }
                        };
                        const fmt = STATUS_FORMAT[lead.status] || { label: lead.status || 'New', cls: 'badge-info' };
                        return (
                          <div
                            key={lead.id}
                            onClick={() => navigate('/leads')}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '11px 14px',
                              borderRadius: 12,
                              background: 'rgba(255, 255, 255, 0.02)',
                              border: '1px solid rgba(255, 255, 255, 0.05)',
                              cursor: 'pointer',
                              transition: 'all 0.18s ease'
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                              e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                              e.currentTarget.style.transform = 'translateX(2px)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                              e.currentTarget.style.transform = 'translateX(0)';
                            }}
                          >
                            {/* Left: Avatar + Title & Meta */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1, marginRight: 12 }}>
                              <div style={{
                                width: 38,
                                height: 38,
                                borderRadius: 10,
                                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(99, 102, 241, 0.15))',
                                color: '#c4b5fd',
                                fontWeight: 800,
                                fontSize: '0.95rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                {initial}
                              </div>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{
                                  fontSize: '0.875rem',
                                  fontWeight: 700,
                                  color: 'var(--text-primary)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {lead.companyName || lead.name}
                                </div>
                                <div style={{
                                  fontSize: '0.72rem',
                                  color: 'var(--text-secondary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  marginTop: 2,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {lead.contactPerson && <span>{lead.contactPerson}</span>}
                                  {lead.contactPerson && lead.expo && <span>•</span>}
                                  {lead.expo && (
                                    <span style={{
                                      background: 'rgba(255, 255, 255, 0.06)',
                                      padding: '1px 6px',
                                      borderRadius: 4,
                                      fontSize: '0.68rem',
                                      fontWeight: 600,
                                      color: 'var(--text-secondary)'
                                    }}>
                                      {lead.expo}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right: Est Value + Status Badge */}
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{
                                fontSize: '0.875rem',
                                fontWeight: 800,
                                color: (parseFloat(lead.value) || 0) > 0 ? '#10b981' : 'var(--text-secondary)'
                              }}>
                                {formatCurrency(lead.value)}
                              </div>
                              <span className={`badge ${fmt.cls}`} style={{ marginTop: 3, display: 'inline-block', fontSize: '0.68rem', padding: '2px 8px' }}>
                                {fmt.label}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Recent Projects Activity Card */}
              {hasPermission('dashboard', 'recent-projects-list', 'canView') && (
                <div className="card" style={{ padding: '20px 22px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: 'rgba(6, 182, 212, 0.15)',
                        color: '#22d3ee',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.15rem'
                      }}>
                        <RiBriefcaseLine />
                      </div>
                      <div>
                        <span className="card-title" style={{ fontSize: '1rem', fontWeight: 800 }}>Recent Projects</span>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Converted & active project engagements</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => navigate('/closed-sales')}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        borderRadius: 8,
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
                    >
                      View All <RiArrowRightSLine />
                    </button>
                  </div>

                  {loadingBusiness ? (
                    <div style={{ textAlign: 'center', padding: '30px' }}><div className="spinner spinner-sm" style={{ margin: '0 auto' }} /></div>
                  ) : (!businessStats?.recentProjects || businessStats.recentProjects.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                      No recent projects found
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {businessStats.recentProjects.map((project) => {
                        const initial = (project.name || project.companyName || '?').charAt(0).toUpperCase();
                        return (
                          <div
                            key={project.id}
                            onClick={() => navigate('/closed-sales')}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '11px 14px',
                              borderRadius: 12,
                              background: 'rgba(255, 255, 255, 0.02)',
                              border: '1px solid rgba(255, 255, 255, 0.05)',
                              cursor: 'pointer',
                              transition: 'all 0.18s ease'
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                              e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.3)';
                              e.currentTarget.style.transform = 'translateX(2px)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                              e.currentTarget.style.transform = 'translateX(0)';
                            }}
                          >
                            {/* Left: Avatar + Title & Meta */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1, marginRight: 12 }}>
                              <div style={{
                                width: 38,
                                height: 38,
                                borderRadius: 10,
                                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(14, 165, 233, 0.15))',
                                color: '#67e8f9',
                                fontWeight: 800,
                                fontSize: '0.95rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                {initial}
                              </div>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{
                                  fontSize: '0.875rem',
                                  fontWeight: 700,
                                  color: 'var(--text-primary)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {project.name || project.companyName}
                                </div>
                                <div style={{
                                  fontSize: '0.72rem',
                                  color: 'var(--text-secondary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  marginTop: 2,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  <span>{project.assignee?.name || 'Unassigned'}</span>
                                  {project.startDate && <span>•</span>}
                                  {project.startDate && <span>Start: {project.startDate}</span>}
                                </div>
                              </div>
                            </div>

                            {/* Right: Revenue & Status Badge */}
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{
                                fontSize: '0.875rem',
                                fontWeight: 800,
                                color: (parseFloat(project.revenue || project.value) || 0) > 0 ? '#10b981' : 'var(--text-secondary)'
                              }}>
                                {formatCurrency(project.revenue || project.value)}
                              </div>
                              <span className={`badge ${
                                project.status === 'completed' ? 'badge-success' :
                                project.status === 'cancelled' ? 'badge-danger' :
                                project.status === 'in_progress' ? 'badge-info' : 'badge-warning'
                              }`} style={{ marginTop: 3, display: 'inline-block', fontSize: '0.68rem', padding: '2px 8px', textTransform: 'uppercase' }}>
                                {project.status || 'Active'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SYSTEM OVERVIEW TAB */}
      {activeTab === 'system' && canSeeSystemTab && (
        <div>
          {/* Stats Grid */}
          <div className="grid-4" style={{ marginBottom: '24px' }}>
            {hasPermission('uam', 'users-list', 'canView') && (
              <StatCard icon={<RiTeamLine />} label="Total Users" value={loadingSystem ? null : systemStats.users} color="accent" />
            )}
            {hasPermission('roles', 'roles-list', 'canView') && (
              <StatCard icon={<RiShieldUserLine />} label="Roles" value={loadingSystem ? null : systemStats.roles} color="info" />
            )}
            {user?.isSuperAdmin && hasPermission('organizations', 'organizations-list', 'canView') && (
              <StatCard icon={<RiBuildingLine />} label="Organizations" value={loadingSystem ? null : systemStats.organizations} color="warning" />
            )}
            {hasPermission('companies', 'companies-list', 'canView') && (
              <StatCard icon={<RiBuilding2Line />} label="Companies" value={loadingSystem ? null : systemStats.companies} color="success" />
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 24 }}>
            {/* Quick Access Card */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Quick Actions</span>
              </div>
              <div className="grid-2" style={{ gap: 16 }}>
                {hasPermission('uam', 'users-list', 'canCreate') && (
                  <a href="/uam/users" className="btn btn-outline" style={{ justifyContent: 'center' }}>
                    <RiUserAddLine /> Add User
                  </a>
                )}
                {hasPermission('roles', 'roles-list', 'canCreate') && (
                  <a href="/uam/roles" className="btn btn-outline" style={{ justifyContent: 'center' }}>
                    <RiShieldUserLine /> Create Role
                  </a>
                )}
                {user?.isSuperAdmin && hasPermission('organizations', 'organization-create', 'canCreate') && (
                  <a href="/organizations" className="btn btn-outline" style={{ justifyContent: 'center' }}>
                    <RiBuildingLine /> Add Organization
                  </a>
                )}
                {hasPermission('companies', 'companies-list', 'canCreate') && (
                  <a href="/companies" className="btn btn-outline" style={{ justifyContent: 'center' }}>
                    <RiBuilding2Line /> Add Company
                  </a>
                )}
                {hasPermission('departments', 'departments-list', 'canCreate') && (
                  <a href="/departments" className="btn btn-outline" style={{ justifyContent: 'center' }}>
                    <RiGroupLine /> Add Department
                  </a>
                )}
              </div>
            </div>

            {/* Department Summary */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <span className="card-title" style={{ display: 'block', marginBottom: 12 }}>Department Breakdown</span>
                <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--info)' }}>
                  {loadingSystem ? <div className="spinner spinner-sm" /> : systemStats.departments}
                </span>
                <span style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: 8 }}>
                  Active functional departments configured in database.
                </span>
              </div>
              <a href="/departments" className="btn btn-primary" style={{ marginTop: 24, justifyContent: 'center' }}>
                View Departments
              </a>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'none' && (
        <div className="empty-state">
          <RiShieldUserLine size={48} />
          <h3>No Access</h3>
          <p>You don't have permission to view any dashboard statistics.</p>
        </div>
      )}
    </AppLayout>
  );
};

export default Dashboard;
