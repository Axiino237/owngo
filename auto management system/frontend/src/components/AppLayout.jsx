import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  RiDashboardLine, RiTeamLine, RiShieldUserLine,
  RiKey2Line, RiBuildingLine, RiBuilding2Line,
  RiGroupLine, RiLogoutBoxLine, RiSettings4Line, RiStarLine,
  RiOrganizationChart, RiTargetLine, RiFilePaper2Line, RiBarChart2Line,
  RiCheckboxCircleLine, RiDraftLine, RiPaletteLine, RiFileList2Line,
  RiCheckDoubleLine, RiCalendarLine, RiChat3Line, RiBellLine,
  RiMenuLine, RiCloseLine, RiNodeTree, RiUserStarLine,
  RiNotification3Line, RiNotificationOffLine, RiTrophyLine,
  RiCarLine, RiUserFollowLine, RiCompass3Line,
  RiLinkM, RiSteering2Line, RiUserHeartLine, RiBankCardLine
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../context/ThemeContext';
import OwngoLogo from './OwngoLogo';
import { showSystemNotification, requestNotificationPermission, isUserNotificationEnabled, initFirebaseForegroundReceiver, isIos, isStandalonePwa, isMac, isSafari, playNotificationChime, triggerMobileVibration } from '../utils/systemNotification';
import IosNotifGuideModal from './IosNotifGuideModal';
import VideoCallModal from './chat/VideoCallModal';
import './Layout.css';

// Sidebar
const Sidebar = ({ mobileOpen, onClose }) => {
  const { user, logout, hasPermission } = useAuth();
  const isDirector = user?.role?.name === 'Director' || user?.role?.code === 'DIRECTOR' || user?.role?.level === 'company_admin' || user?.isSuperAdmin;
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'SA';
  const navItems = [
    { section: 'Main', items: [{ to: '/dashboard', icon: <RiDashboardLine />, label: 'Dashboard', show: hasPermission('dashboard', 'dashboard-home', 'canView') }] },
    {
      section: 'EV Auto Fleet', items: [
        { to: '/autos', icon: <RiCarLine />, label: 'EV Autos & Fleet', show: hasPermission('autos', 'autos-list', 'canView') },
        { to: '/drivers', icon: <RiUserFollowLine />, label: 'Driver Management', show: hasPermission('drivers', 'drivers-list', 'canView') },
        { to: '/tracking', icon: <RiCompass3Line />, label: 'Live Fleet Tracking', show: hasPermission('tracking', 'tracking-view', 'canView') || hasPermission('autos', 'autos-list', 'canView') }
      ]
    },
    {
      section: 'User Management', items: [
        { to: '/uam/users', icon: <RiTeamLine />, label: 'Users', show: hasPermission('uam', 'users-list', 'canView') },
        { to: '/uam/roles', icon: <RiShieldUserLine />, label: 'Roles', show: hasPermission('roles', 'roles-list', 'canView') },
        { to: '/uam/permissions', icon: <RiKey2Line />, label: 'Permissions', show: hasPermission('permissions', 'permissions-list', 'canView') },
        { to: '/uam/status-master', icon: <RiSettings4Line />, label: 'Status Master', show: hasPermission('uam', 'status-master', 'canView') },
        { to: '/audit-logs', icon: <RiFileList2Line />, label: 'Audit Logs', show: hasPermission('uam', 'audit-logs-list', 'canView') }
      ]
    },
    {
      section: 'Organization', items: [
        { to: '/organizations', icon: <RiBuildingLine />, label: 'Organizations', show: hasPermission('organizations', 'organizations-list', 'canView') },
        { to: '/companies', icon: <RiBuilding2Line />, label: 'Companies', show: hasPermission('companies', 'companies-list', 'canView') },
        { to: '/departments', icon: <RiGroupLine />, label: 'Departments', show: hasPermission('departments', 'departments-list', 'canView') },
        { to: '/hierarchy', icon: <RiNodeTree />, label: 'Hierarchy Studio', show: hasPermission('departments', ['hierarchy-studio', 'departments-list'], 'canView') },
        { to: '/team-monitor', icon: <RiTeamLine />, label: 'Team Monitor', show: hasPermission('departments', ['team-monitor', 'departments-list'], 'canView') },
        { to: '/org-overview', icon: <RiOrganizationChart />, label: 'Org Overview', show: hasPermission('dashboard', 'org-overview', 'canView') }
      ]
    },
    {
      section: 'CRM & Sales', items: [
        { to: '/leads', icon: <RiTargetLine />, label: 'Leads', show: hasPermission('leads', 'leads-list', 'canView') },
        { to: '/partners', icon: <RiUserHeartLine />, label: 'Fleet Partners', show: hasPermission('partners', 'partners-list', 'canView') },
        { to: '/loan-applications', icon: <RiBankCardLine />, label: 'Loan Applications', show: hasPermission('finance', 'loan-applications-list', 'canView') },
        { to: '/job-requests', icon: <RiSteering2Line />, label: 'Job Requests', show: hasPermission('jobs', 'job-requests-list', 'canView') || hasPermission('leads', 'leads-list', 'canView') },
        { to: '/link-generator', icon: <RiLinkM />, label: 'Link Generator', show: hasPermission('tools', 'link-generator', 'canView') },
        { to: '/quotation', icon: <RiFilePaper2Line />, label: 'Quotation', show: hasPermission('quotations', 'quotations-list', 'canView') },
        { to: '/performance', icon: <RiBarChart2Line />, label: 'Performance', show: hasPermission('performance', 'performance-view', 'canView') },
        { to: '/leaderboard', icon: <RiTrophyLine />, label: 'Leaderboard', show: hasPermission('performance', ['leaderboard', 'performance-view'], 'canView') },
        { to: '/closed-sales', icon: <RiCheckboxCircleLine />, label: 'Closed Sales', show: hasPermission('closed_sales', ['closed-sales-list', 'closed-sales-all'], 'canView') }
      ]
    },
    {
      section: 'Design', items: [
        { to: '/design', icon: <RiDraftLine />, label: 'Design Orders', show: hasPermission('design', 'design-list', 'canView') },
        { to: '/my-projects', icon: <RiPaletteLine />, label: 'My Projects', show: hasPermission('design', 'my-projects-list', 'canView') },
        { to: '/completed-models', icon: <RiCheckDoubleLine />, label: 'Completed Models', show: hasPermission('design', 'completed-models-list', 'canView') }
      ]
    },
    {
      section: 'HR Management', items: [
        { to: '/attendance', icon: <RiCalendarLine />, label: 'Attendance Portal', show: hasPermission('attendance', ['attendance-list', 'attendance-team', 'attendance-all-departments'], 'canView') },
        { to: '/leaves', icon: <RiFileList2Line />, label: 'Leave Portal', show: hasPermission('attendance', ['attendance-list', 'attendance-team', 'attendance-all-departments'], 'canView') },
        { to: '/staff-summary', icon: <RiUserStarLine />, label: 'Staff & Salary Summary', show: hasPermission('uam', ['staff-summary', 'staff-summary-dept', 'staff-summary-all', 'users-list'], 'canView') }
      ]
    },
    {
      section: 'Collaboration', items: [
        { to: '/chat', icon: <RiChat3Line />, label: 'Chat Room', show: hasPermission('chat', 'chat-room', 'canView') },
        { to: '/chat-settings', icon: <RiSettings4Line />, label: 'Chat Workspaces', show: hasPermission('chat', 'chat-workspaces', 'canView') }
      ]
    }
  ];
  return (
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px' }}>
        <Link to="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }} title="OWNGO">
          <OwngoLogo size="sidebar" />
        </Link>
        {mobileOpen && (
          <button className="mobile-close-btn" onClick={onClose} aria-label="Close menu">
            <RiCloseLine />
          </button>
        )}
      </div>
      <nav className="sidebar-nav">
        {navItems.map(section => {
          const visibleItems = section.items.filter(item => item.always || item.show !== false);
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.section}>
              <div className="nav-section-label">{section.section}</div>
              {visibleItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <div className="user-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <Link to="/profile" onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 10, flexGrow: 1, textDecoration: 'none', color: 'inherit', minWidth: 0 }}>
            <div className="avatar" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {user?.avatar ? <img src={user.avatar} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : initials}
            </div>
            <div className="user-info" style={{ minWidth: 0 }}>
              <div className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
              <div className="user-role" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.isSuperAdmin ? 'Super Admin' : user?.role?.name}</div>
            </div>
          </Link>
          <ThemeToggle size="small" />
          <button className="logout-btn" onClick={logout} title="Logout" style={{ flexShrink: 0 }}><RiLogoutBoxLine /></button>
        </div>
        <div style={{ textAlign: 'center', paddingTop: 8, fontSize: '0.68rem', color: 'var(--text-muted)' }}>
          Developed by <a href="https://axiino.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>axiino.com</a>
        </div>
      </div>
    </aside>
  );
};

// NotificationBell with Status Tagging (active, opened, cleared) and Direct Chat/Page Navigation
const NotificationBell = ({ user }) => {
  const STORAGE_KEY = user?.id ? `crm_notifications_v2_${user.id}` : 'crm_notifications_v2_guest';
  const CLEARED_KEY = user?.id ? `crm_notifs_cleared_${user.id}` : 'crm_notifs_cleared_guest';

  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      const ICON_MAP = { '&#x1F4AC;': '💬', '&#x1F3A8;': '🎨', '&#x1F515;': '🔕' };
      return parsed
        .filter(n => n.status !== 'cleared')
        .map(n => ({
          ...n,
          icon: ICON_MAP[n.icon] || n.icon,
          tag: n.tag || (n.read ? 'opened' : 'unread'),
          status: n.status || (n.read ? 'opened' : 'active')
        }));
    } catch { return []; }
  });

  const [open, setOpen] = useState(false);
  const [layoutSocket, setLayoutSocket] = useState(null);
  const panelRef = useRef(null);

  // Filter only visible active/opened notifications (cleared never show)
  const visibleNotifications = notifications.filter(n => n.status !== 'cleared');
  const unreadCount = visibleNotifications.filter(n => !n.read && n.tag !== 'opened').length;

  // Track user-level notification mute toggle
  const [browserPermission, setBrowserPermission] = useState(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported';
  });
  const [userPrefEnabled, setUserPrefEnabled] = useState(() => {
    try {
      const userJson = localStorage.getItem('crm_user');
      if (userJson) {
        const u = JSON.parse(userJson);
        const val = localStorage.getItem(`crm_notif_enabled_${u.id}`);
        if (val !== null) return val === 'true';
      }
    } catch {}
    return false;
  });

  const [showIosModal, setShowIosModal] = useState(false);

  // On iOS inside browser tabs, window.Notification is blocked by Apple,
  // so user preference activates high-visibility in-app audio chime & banner alerts!
  // On Desktop / Android / iOS Standalone PWA, browser permission MUST be 'granted'.
  const isAlertsOn = (isIos() && !('Notification' in window))
    ? userPrefEnabled
    : (userPrefEnabled && browserPermission === 'granted');

  const toggleUserNotif = async (e) => {
    if (e) e.stopPropagation();
    if (isAlertsOn) {
      setUserPrefEnabled(false);
      if (user?.id) {
        localStorage.setItem(`crm_notif_enabled_${user.id}`, 'false');
      }
      toast('🔕 Notifications muted for your account', { icon: '🔕' });
      return;
    }

    // Check if on iOS outside Standalone PWA
    if (isIos() && !isStandalonePwa() && !('Notification' in window)) {
      setShowIosModal(true);
      return;
    }

    // Must check platform support
    if (typeof window === 'undefined' || !('Notification' in window)) {
      if (isIos()) {
        setShowIosModal(true);
      } else {
        toast.error('This browser does not support web notifications');
      }
      return;
    }

    try {
      const res = await requestNotificationPermission();
      setBrowserPermission(res);

      if (res === 'ios_pwa_required') {
        setShowIosModal(true);
        return;
      }

      if (res !== 'granted') {
        setUserPrefEnabled(false);
        if (user?.id) localStorage.setItem(`crm_notif_enabled_${user.id}`, 'false');
        if (res === 'denied') {
          if (isMac()) {
            if (isSafari()) {
              toast.error('Safari-la notifications blocked! Go to Safari ➔ Settings ➔ Websites ➔ Notifications, and set crm.axiino.com to Allow. Also check Mac System Settings ➔ Notifications ➔ Safari.', { duration: 9000 });
            } else {
              toast.error('Chrome-la notifications blocked! Click 🎛️ Tune icon left of URL to Allow. Also check Mac System Settings ➔ Notifications ➔ Google Chrome.', { duration: 9000 });
            }
          } else {
            toast.error('Notifications blocked in browser! Click 🎛️ Tune / Lock icon left of URL to Allow.', { duration: 7000 });
          }
        } else {
          toast.error('Notification permission was not granted. Alerts remain OFF.');
        }
        return;
      }

      setBrowserPermission('granted');
      setUserPrefEnabled(true);
      if (user?.id) localStorage.setItem(`crm_notif_enabled_${user.id}`, 'true');
      toast.success('🔔 Notifications Allowed & Enabled!');
      showSystemNotification('OWNGO Notifications Enabled 🔔', {
        body: 'You will receive desktop and phone alerts for updates.',
        icon: '/icon-192.png'
      });
    } catch (err) {
      toast.error('Failed to request notification permission');
    }
  };

  const handleTestNotification = (e) => {
    if (e) e.stopPropagation();
    playNotificationChime();
    triggerMobileVibration();
    showSystemNotification('OWNGO Notification Test 🔔', {
      body: 'Audio ping and alert system is working properly on your device!',
      icon: '/icon-192.png',
      link: '/chat'
    });
    toast.success('🔔 Test alert triggered!');
  };

  // Check today's followups for the current user
  useEffect(() => {
    if (!user) return;
    const checkTodayFollowups = async () => {
      try {
        const { data } = await api.get('/leads/followups-today');
        if (data?.success && data.count > 0) {
          const leadNames = data.followups?.slice(0, 2).map(l => l.companyName || l.name).join(', ');
          const moreText = data.count > 2 ? ` and ${data.count - 2} more` : '';
          const notif = {
            id: `followup-today-${data.date}`,
            type: 'followup',
            icon: '📞',
            title: `Follow-up Reminder (${data.count} Due Today) 📞`,
            body: `${leadNames}${moreText} scheduled for follow-up today`,
            channel: 'Sales / Follow-ups',
            time: new Date(),
            read: false,
            status: 'active',
            tag: 'unread',
            link: '/leads'
          };
          setNotifications(prev => {
            if (prev.some(n => n.id === notif.id || (n.id.startsWith('followup-today') && n.status === 'cleared'))) {
              return prev;
            }
            return [notif, ...prev.filter(n => n.status !== 'cleared')].slice(0, 50);
          });
          showSystemNotification(notif.title, {
            body: notif.body,
            icon: '/icon-192.png',
            tag: notif.id,
            link: '/leads',
            type: 'followup_due'
          });
        }
      } catch (err) {}
    };
    checkTodayFollowups();
  }, [user]);

  // Socket and Firebase Foreground Push listeners
  useEffect(() => {
    const token = localStorage.getItem('crm_token');
    if (!token || !user) return;
    const socketUrl = import.meta.env.VITE_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    const socket = io(socketUrl, { auth: { token }, transports: ['websocket', 'polling'] });
    setLayoutSocket(socket);

    // 💬 Chat Message Notification with DIRECT navigation to sender's chat
    socket.on('new_message', (data) => {
      if (data.isSenderCopy) return;
      const senderId = data.senderId || data.message?.senderId;
      if (senderId && user?.id && String(senderId) === String(user.id)) return;
      if (data.receiverId && user?.id && String(data.receiverId) !== String(user.id)) return;

      const isChatPage = typeof window !== 'undefined' && window.location.pathname === '/chat';
      const activeChatChannel = typeof window !== 'undefined' ? sessionStorage.getItem('crm_active_chat_channel') : null;
      if (isChatPage && activeChatChannel && senderId && String(activeChatChannel) === String(senderId)) {
        return;
      }

      const senderName = data.senderName || data.message?.sender?.name || 'Team Member';
      const isEncrypted = data.isEncrypted || (typeof data.message?.message === 'string' && data.message.message.startsWith('{"encryptedPayload"'));
      const body = isEncrypted 
        ? '🔒 Encrypted message' 
        : (data.preview || (typeof data.message?.message === 'string' ? data.message.message.slice(0, 55) : 'Sent you a message'));
      const channel = data.channelName || (data.receiverId ? senderName : 'Chat');
      const targetChatLink = senderId ? `/chat?userId=${senderId}` : '/chat';

      const notif = { 
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, 
        type: 'message', 
        icon: '💬', 
        title: `New message from ${senderName}`, 
        body, 
        channel, 
        time: new Date(), 
        read: false, 
        status: 'active',
        tag: 'unread',
        link: targetChatLink 
      };

      setNotifications(prev => [notif, ...prev.filter(n => n.status !== 'cleared')].slice(0, 50));

      showSystemNotification(notif.title, {
        body: notif.body,
        icon: '/icon-192.png',
        tag: `chat-${senderId || Date.now()}`,
        link: targetChatLink,
        type: 'chat'
      });
    });

    // 🎨 Designer Project Assignment Notification
    socket.on('project_assigned', (data) => {
      const projectName = data.projectName || data.companyName || 'Design Project';
      const notif = { 
        id: `proj-${Date.now()}`, 
        type: 'project', 
        icon: '🎨', 
        title: 'New Project Assigned! 🎨', 
        body: data.message || `You have been assigned: "${projectName}"`, 
        channel: data.assignedBy ? `By ${data.assignedBy}` : 'Design Team', 
        deadline: data.deadline, 
        time: new Date(), 
        read: false, 
        status: 'active',
        tag: 'unread',
        link: '/my-projects' 
      };
      setNotifications(prev => [notif, ...prev.filter(n => n.status !== 'cleared')].slice(0, 50));

      showSystemNotification(notif.title, {
        body: notif.body,
        icon: '/icon-192.png',
        tag: `project-${data.orderId || Date.now()}`,
        link: '/my-projects',
        type: 'project_assigned'
      });
    });

    // 🚀 Designer Completed -> Sales Department Notification
    socket.on('design_completed', (data) => {
      const companyName = data.companyName || 'Design Order';
      const notif = {
        id: `design-done-${Date.now()}`,
        type: 'design_complete',
        icon: '🎉',
        title: 'Design Completed! 🎉',
        body: data.message || `Designer ${data.designerName || ''} completed the 3D model for "${companyName}"!`,
        channel: data.designerName ? `Designer: ${data.designerName}` : 'Design Team',
        time: new Date(),
        read: false,
        status: 'active',
        tag: 'unread',
        link: '/completed-models'
      };
      setNotifications(prev => [notif, ...prev.filter(n => n.status !== 'cleared')].slice(0, 50));

      showSystemNotification(notif.title, {
        body: notif.body,
        icon: '/icon-192.png',
        tag: `design-done-${data.orderId || Date.now()}`,
        link: '/completed-models',
        type: 'design_completed'
      });
    });

    // ⏰ 30-Minute Check-in Reminder Notification
    socket.on('attendance_reminder', (data) => {
      if (data.userId && user?.id && String(data.userId) !== String(user.id)) return;

      const notif = {
        id: `att-remind-${Date.now()}`,
        type: 'attendance',
        icon: '⏰',
        title: data.title || 'Check-in Reminder ⏰',
        body: data.message || `Hello ${user?.name || ''}, please check in to mark your attendance today!`,
        channel: 'HR / Attendance',
        time: new Date(),
        read: false,
        status: 'active',
        tag: 'unread',
        link: '/attendance'
      };

      setNotifications(prev => {
        const isDuplicate = prev.some(n => n.type === 'attendance' && n.status !== 'cleared' && !n.read && (Date.now() - new Date(n.time).getTime()) < 25 * 60 * 1000);
        if (isDuplicate) return prev;
        return [notif, ...prev.filter(n => n.status !== 'cleared')].slice(0, 50);
      });

      showSystemNotification(notif.title, {
        body: notif.body,
        icon: '/icon-192.png',
        tag: `attendance-reminder-${Date.now()}`,
        link: '/attendance',
        type: 'attendance_reminder'
      });
    });

    // 📋 Lead Assigned Notification
    socket.on('lead_assigned', (data) => {
      const notif = {
        id: `lead-assigned-${Date.now()}`,
        type: 'lead',
        icon: '📋',
        title: data.title || 'New Lead Assigned! 📋',
        body: data.body || 'A new lead has been assigned to you',
        channel: data.assignedBy ? `By ${data.assignedBy}` : 'Sales Team',
        time: new Date(),
        read: false,
        status: 'active',
        tag: 'unread',
        link: data.link || '/leads'
      };
      setNotifications(prev => [notif, ...prev.filter(n => n.status !== 'cleared')].slice(0, 50));

      showSystemNotification(notif.title, {
        body: notif.body,
        icon: '/icon-192.png',
        tag: `lead-assigned-${data.leadId || Date.now()}`,
        link: notif.link,
        type: 'lead_assigned'
      });
    });

    // 📞 Followup Reminder Notification
    socket.on('followup_reminder', (data) => {
      const notif = {
        id: `followup-${Date.now()}`,
        type: 'followup',
        icon: '📞',
        title: data.title || 'Follow-up Reminder 📞',
        body: data.message || data.body || 'You have leads scheduled for follow-up today',
        channel: 'Sales / Follow-ups',
        time: new Date(),
        read: false,
        status: 'active',
        tag: 'unread',
        link: data.link || '/leads'
      };
      setNotifications(prev => [notif, ...prev.filter(n => n.status !== 'cleared')].slice(0, 50));

      showSystemNotification(notif.title, {
        body: notif.body,
        icon: '/icon-192.png',
        tag: `followup-${Date.now()}`,
        link: notif.link,
        type: 'followup_reminder'
      });
    });

    // Setup Firebase Foreground Push listener
    const unsubscribeFirebase = initFirebaseForegroundReceiver((payload) => {
      const notif = {
        id: `fcm-${Date.now()}`,
        type: payload.type || 'push',
        icon: '🔔',
        title: payload.title,
        body: payload.body,
        channel: 'CRM Notification',
        time: new Date(),
        read: false,
        status: 'active',
        tag: 'unread',
        link: payload.link || '/'
      };
      setNotifications(prev => [notif, ...prev.filter(n => n.status !== 'cleared')].slice(0, 50));
    });

    return () => {
      setLayoutSocket(null);
      socket.disconnect();
      if (typeof unsubscribeFirebase === 'function') unsubscribeFirebase();
    };
  }, [user]);

  useEffect(() => {
    const onOut = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onOut);
    return () => document.removeEventListener('mousedown', onOut);
  }, []);

  // Mark all as opened/read
  const markAllRead = () => {
    setNotifications(p => p.map(n => ({ ...n, read: true, tag: 'opened', status: n.status === 'cleared' ? 'cleared' : 'opened' })));
  };

  // Clear all notifications permanently with 'cleared' tag
  const clearAll = () => {
    setNotifications(p => p.map(n => ({ ...n, status: 'cleared', tag: 'cleared', read: true })));
    try {
      localStorage.setItem(CLEARED_KEY, String(Date.now()));
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    } catch {}
    toast.success('All notifications cleared');
  };

  // Mark single notification as opened & read when clicked
  const markOpened = (id) => {
    setNotifications(p => p.map(n => n.id === id ? { ...n, read: true, tag: 'opened', status: 'opened' } : n));
  };

  // Clear single notification permanently
  const clearSingle = (id, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setNotifications(p => p.map(n => n.id === id ? { ...n, status: 'cleared', tag: 'cleared', read: true } : n));
  };

  const timeAgo = (d) => {
    const s = Math.floor((Date.now() - new Date(d)) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      <button 
        id="notification-bell-btn" 
        onClick={() => { setOpen(o => !o); if (!open) markAllRead(); }} 
        title="Notifications"
        style={{ 
          background: open ? 'var(--accent)' : 'var(--bg-secondary)', 
          border: '1px solid var(--border)', 
          borderRadius: 10, 
          width: 38, 
          height: 38, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          cursor: 'pointer', 
          color: open ? '#fff' : (unreadCount > 0 ? 'var(--accent)' : 'var(--text-secondary)'), 
          position: 'relative', 
          transition: 'all 0.2s', 
          fontSize: '1.15rem' 
        }}
      >
        <RiBellLine />
        {unreadCount > 0 && (
          <span style={{ 
            position: 'absolute', top: -5, right: -5, 
            background: '#ef4444', color: '#fff', 
            fontSize: '0.58rem', fontWeight: 800, 
            minWidth: 17, height: 17, borderRadius: '50%', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            border: '2px solid var(--bg-card)', padding: '0 3px' 
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div id="notification-panel" className="notification-panel-responsive">
          {/* Header Bar */}
          <div style={{ 
            padding: '12px 16px', 
            borderBottom: '1px solid var(--border)', 
            background: 'var(--bg-secondary)', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            gap: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                Notifications
              </span>
              {visibleNotifications.length > 0 && (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  ({visibleNotifications.length})
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Test Audio & Notification Button */}
              <button
                onClick={handleTestNotification}
                title="Test audio chime & notification on this device"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  padding: '3px 8px',
                  borderRadius: 14,
                  fontSize: '0.67rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Test 🔔
              </button>

              {/* User Notification Toggle Pill in Dropdown */}
              <button
                onClick={toggleUserNotif}
                title={isAlertsOn ? "Notifications are ON — Click to Mute" : "Notifications are OFF — Click to Allow & Turn ON"}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: isAlertsOn ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: `1px solid ${isAlertsOn ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                  color: isAlertsOn ? '#10b981' : '#ef4444',
                  padding: '3px 8px',
                  borderRadius: 20,
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                {isAlertsOn ? '🔔 ON' : '🔕 OFF'}
              </button>

              {visibleNotifications.length > 0 && (
                <>
                  <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}>
                    Mark read
                  </button>
                  <button onClick={clearAll} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}>
                    Clear
                  </button>
                </>
              )}
            </div>
          </div>

          {/* User Muted Info Banner */}
          {!isAlertsOn && (
            <div style={{
              padding: '8px 14px',
              background: 'rgba(239, 68, 68, 0.12)',
              borderBottom: '1px solid rgba(239, 68, 68, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.72rem',
              color: '#f87171'
            }}>
              <span>🔕 Alerts are currently OFF.</span>
              <button onClick={toggleUserNotif} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontWeight: 800 }}>
                Turn ON
              </button>
            </div>
          )}

          {/* iPhone Safari / Chrome Setup Banner (Apple requires Add to Home Screen) */}
          {isIos() && !isStandalonePwa() && (
            <div style={{
              padding: '10px 14px',
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15), rgba(79, 70, 229, 0.15))',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10
            }}>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-primary)', lineHeight: 1.3 }}>
                <strong style={{ display: 'block', color: '#60a5fa' }}>📱 iPhone Notification Setup</strong>
                Apple requires Home Screen install for lockscreen push
              </div>
              <button
                onClick={() => setShowIosModal(true)}
                style={{
                  padding: '5px 11px',
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: '0.71rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                Guide 📤
              </button>
            </div>
          )}

          {/* Mobile & System Notification Permission Activation Banner (Android / Desktop) */}
          {!isIos() && browserPermission !== 'granted' && browserPermission !== 'unsupported' && (
            <div style={{
              padding: '10px 14px',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15))',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10
            }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-primary)', lineHeight: 1.3 }}>
                <strong style={{ display: 'block', color: 'var(--accent)' }}>🔔 Enable System Alerts</strong>
                Receive desktop and mobile notifications for updates
              </div>
              <button
                onClick={toggleUserNotif}
                style={{
                  padding: '5px 12px',
                  background: 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                Enable
              </button>
            </div>
          )}

          {/* Notification List with Tag indicators and direct navigation */}
          <div style={{ overflowY: 'auto', flexGrow: 1 }}>
            {visibleNotifications.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🔕</div>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-secondary)' }}>No notifications yet</div>
                <div style={{ fontSize: '0.75rem', marginTop: 4 }}>Chat messages, follow-up alerts, and project updates will appear here</div>
              </div>
            ) : visibleNotifications.map(notif => (
              <div 
                key={notif.id}
                style={{
                  position: 'relative',
                  borderBottom: '1px solid var(--border)',
                  background: notif.read ? 'transparent' : 'rgba(99,102,241,0.06)',
                  transition: 'background 0.15s'
                }}
              >
                <Link 
                  to={notif.link} 
                  onClick={() => { markOpened(notif.id); setOpen(false); }}
                  style={{ 
                    display: 'flex', 
                    gap: 12, 
                    padding: '13px 40px 13px 16px', 
                    textDecoration: 'none', 
                    color: 'inherit', 
                    alignItems: 'flex-start' 
                  }}
                >
                  <div style={{ 
                    width: 38, 
                    height: 38, 
                    borderRadius: 10, 
                    flexShrink: 0, 
                    background: notif.type === 'message' ? 'rgba(99,102,241,0.15)' : (notif.type === 'followup' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(139,92,246,0.15)'), 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '1.2rem' 
                  }}>
                    {notif.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{notif.title}</span>
                      {/* Tag Badge */}
                      <span style={{
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        padding: '1px 6px',
                        borderRadius: 4,
                        background: notif.tag === 'opened' ? 'rgba(148, 163, 184, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                        color: notif.tag === 'opened' ? 'var(--text-muted)' : '#22c55e',
                        border: `1px solid ${notif.tag === 'opened' ? 'transparent' : 'rgba(34, 197, 94, 0.3)'}`
                      }}>
                        {notif.tag === 'opened' ? 'opened' : 'new'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {notif.body}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 5, alignItems: 'center' }}>
                      <span style={{ 
                        fontSize: '0.67rem', 
                        fontWeight: 700, 
                        padding: '1px 7px', 
                        borderRadius: 4, 
                        background: notif.type === 'message' ? 'rgba(99,102,241,0.12)' : (notif.type === 'followup' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(139,92,246,0.12)'), 
                        color: notif.type === 'message' ? 'var(--accent)' : (notif.type === 'followup' ? '#f59e0b' : '#a78bfa') 
                      }}>
                        {notif.type === 'message' ? 'Chat' : (notif.type === 'followup' ? 'Follow-up' : 'Project')}
                      </span>
                      <span style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>{notif.channel}</span>
                      <span style={{ fontSize: '0.67rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>{timeAgo(notif.time)}</span>
                    </div>
                  </div>
                </Link>

                {/* Individual Dismiss Button */}
                <button
                  onClick={(e) => clearSingle(notif.id, e)}
                  title="Dismiss notification"
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 12,
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    padding: '4px 6px',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  <RiCloseLine />
                </button>
              </div>
            ))}
          </div>

          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link to="/chat" onClick={() => setOpen(false)} style={{ fontSize: '0.76rem', color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>
              Open Chat Room
            </Link>
            <Link to="/my-projects" onClick={() => setOpen(false)} style={{ fontSize: '0.76rem', color: '#a78bfa', fontWeight: 700, textDecoration: 'none' }}>
              My Projects
            </Link>
          </div>
        </div>
      )}

      {/* iPhone Setup Guide Modal */}
      <IosNotifGuideModal 
        isOpen={showIosModal} 
        onClose={() => setShowIosModal(false)} 
        onEnableInApp={() => {
          setUserPrefEnabled(true);
          if (user?.id) localStorage.setItem(`crm_notif_enabled_${user.id}`, 'true');
          toast.success('🔔 In-App Sound Alerts Enabled for iPhone!');
          playNotificationChime();
        }} 
      />
    </div>
  );
};

// Header
const Header = ({ title, onMenuToggle }) => {
  const { user } = useAuth();
  const [browserPermission, setBrowserPermission] = useState(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported';
  });
  const [userPrefEnabled, setUserPrefEnabled] = useState(() => {
    try {
      const userJson = localStorage.getItem('crm_user');
      if (userJson) {
        const u = JSON.parse(userJson);
        const val = localStorage.getItem(`crm_notif_enabled_${u.id}`);
        if (val !== null) return val === 'true';
      }
    } catch {}
    return false;
  });
  const [showIosModal, setShowIosModal] = useState(false);

  // On iOS inside regular browser tabs, window.Notification is blocked by Apple,
  // so user preference activates high-visibility in-app audio chime & banner alerts!
  // On Desktop / Android / iOS Standalone PWA, browser permission MUST be 'granted'.
  const isAlertsOn = (isIos() && !('Notification' in window))
    ? userPrefEnabled
    : (userPrefEnabled && browserPermission === 'granted');

  const toggleUserNotif = async () => {
    // If currently ON, user clicks to turn it OFF (mute)
    if (isAlertsOn) {
      setUserPrefEnabled(false);
      if (user?.id) {
        localStorage.setItem(`crm_notif_enabled_${user.id}`, 'false');
      }
      toast('🔕 Notifications muted for your account', { icon: '🔕' });
      return;
    }

    // Check if on iOS outside Standalone PWA
    if (isIos() && !isStandalonePwa() && !('Notification' in window)) {
      setShowIosModal(true);
      return;
    }

    // Must check platform support
    if (typeof window === 'undefined' || !('Notification' in window)) {
      if (isIos()) {
        setShowIosModal(true);
      } else {
        toast.error('This browser does not support system notifications');
      }
      return;
    }

    try {
      const res = await requestNotificationPermission();
      setBrowserPermission(res);

      if (res === 'ios_pwa_required') {
        setShowIosModal(true);
        return;
      }

      if (res !== 'granted') {
        setUserPrefEnabled(false);
        if (user?.id) {
          localStorage.setItem(`crm_notif_enabled_${user.id}`, 'false');
        }
        if (res === 'denied') {
          if (isMac()) {
            if (isSafari()) {
              toast.error('Safari-la notifications blocked! Go to Safari ➔ Settings ➔ Websites ➔ Notifications, and set crm.axiino.com to Allow. Also check Mac System Settings ➔ Notifications ➔ Safari.', { duration: 9000 });
            } else {
              toast.error('Chrome-la notifications blocked! URL pakkathula irukkura 🎛️ Tune icon click panni Allow kudunga. Also check Mac System Settings ➔ Notifications ➔ Google Chrome.', { duration: 9000 });
            }
          } else {
            toast.error('Chrome has blocked notifications! Click the 🎛️ Tune / Lock icon left of URL to Allow.', { duration: 7000 });
          }
        } else {
          toast.error('Notification permission was not granted. Alerts remain OFF.');
        }
        return;
      }

      // Permission is granted! Turn ON:
      setBrowserPermission('granted');
      setUserPrefEnabled(true);
      if (user?.id) {
        localStorage.setItem(`crm_notif_enabled_${user.id}`, 'true');
      }
      toast.success('🔔 Notifications Allowed & Enabled!');
      showSystemNotification('OWNGO Notifications Enabled 🔔', {
        body: 'You will now receive system notifications for all updates on this device.',
        icon: '/icon-192.png'
      });
    } catch (e) {
      toast.error('Failed to request notification permission');
    }
  };

  const showBlockedHelp = () => {
    if (isMac()) {
      if (isSafari()) {
        toast.error('Safari-la notifications blocked! Go to Safari ➔ Settings ➔ Websites ➔ Notifications, and set crm.axiino.com to Allow. Also check Mac System Settings ➔ Notifications ➔ Safari.', { duration: 9000 });
      } else {
        toast.error('Chrome-la notifications blocked! URL pakkathula irukkura 🎛️ Tune icon click panni Allow kudunga. Also check Mac System Settings ➔ Notifications ➔ Google Chrome.', { duration: 9000 });
      }
    } else {
      toast.error('Notifications blocked. Click the 🎛️ Tune / Lock icon left of URL to set Notifications to "Allow", then reload!', { duration: 8000 });
    }
  };

  return (
    <>
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: '1 1 auto' }}>
          <button className="mobile-menu-btn" onClick={onMenuToggle} aria-label="Toggle navigation">
            <RiMenuLine />
          </button>
          <div className="header-title" title={title}>{title}</div>
        </div>
        <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {user?.isSuperAdmin && (<span className="super-admin-chip"><RiStarLine /> Super Admin</span>)}

          {browserPermission === 'denied' && (
            <button
              onClick={showBlockedHelp}
              title="Notifications are blocked in browser settings. Click for help."
              className="header-icon-btn btn-warning-alert"
              aria-label="Notifications blocked"
            >
              <span>⚠️</span>
            </button>
          )}

          {/* User Notification Toggle Button (Sleek Compact Icon) */}
          <button
            id="header-user-notification-btn"
            onClick={toggleUserNotif}
            title={isAlertsOn ? "Push Alerts: Active (Click to Mute)" : "Push Alerts: Muted (Click to Enable)"}
            className={`header-icon-btn ${isAlertsOn ? 'header-alert-on' : 'header-alert-off'}`}
            aria-label="Toggle notifications"
          >
            {isAlertsOn ? <RiNotification3Line /> : <RiNotificationOffLine />}
          </button>

          <NotificationBell user={user} />

          <ThemeToggle />

          <Link to="/profile" className="avatar avatar-sm" style={{ cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }} title="My Profile">
            {user?.avatar ? <img src={user.avatar} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </Link>
        </div>
      </header>

      {/* Top Banner when Browser Permission is still default (not yet enabled) */}
      {!isAlertsOn && browserPermission === 'default' && (
        <div style={{
          background: 'linear-gradient(90deg, var(--accent-glow) 0%, rgba(132, 216, 2, 0.08) 100%)',
          borderBottom: '1px solid var(--border)',
          padding: '8px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          fontSize: '0.78rem',
          color: 'var(--text-primary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.05rem' }}>🔔</span>
            <span>
              <strong>Enable System Notifications:</strong> Turn ON notifications to get Windows and Mobile lockscreen alerts for messages, leads, and follow-ups.
            </span>
          </div>
          <button
            onClick={toggleUserNotif}
            style={{
              padding: '6px 14px',
              background: 'var(--accent)',
              color: '#070908',
              border: 'none',
              borderRadius: 8,
              fontWeight: 800,
              fontSize: '0.75rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px var(--accent-glow)',
              flexShrink: 0
            }}
          >
            Allow Notifications
          </button>
        </div>
      )}

      {/* iPhone Setup Guide Modal for Header button */}
      <IosNotifGuideModal 
        isOpen={showIosModal} 
        onClose={() => setShowIosModal(false)} 
        onEnableInApp={() => {
          setUserPrefEnabled(true);
          if (user?.id) localStorage.setItem(`crm_notif_enabled_${user.id}`, 'true');
          toast.success('🔔 In-App Sound Alerts Enabled for iPhone!');
          playNotificationChime();
        }} 
      />
    </>
  );
};

// AppLayout
const AppLayout = ({ children, title = 'Dashboard' }) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  // Close mobile drawer automatically upon navigating to any page
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-layout">
      {mobileNavOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileNavOpen(false)} />
      )}
      <Sidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="main-content">
        <Header title={title} onMenuToggle={() => setMobileNavOpen(p => !p)} />
        <main className="page-wrapper">{children}</main>
        <footer style={{ padding: '16px 24px', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          Developed by <a href="https://axiino.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>axiino.com</a>
        </footer>
      </div>

      {/* Global Real-time Video & Audio Call Modal at Root */}
      <VideoCallModal currentUser={user} />
    </div>
  );
};

export { Sidebar, Header };
export default AppLayout;
