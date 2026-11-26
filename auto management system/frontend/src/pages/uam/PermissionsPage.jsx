import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  RiSaveLine, RiCheckboxLine, RiCheckboxBlankLine,
  RiShieldUserLine, RiKey2Line, RiSearchLine, RiFilterLine
} from 'react-icons/ri';
import AppLayout from '../../components/AppLayout';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const MODULE_ICONS = {
  dashboard: '🏠',
  autos: '🛺',
  drivers: '👤',
  tracking: '🧭',
  jobs: '📋',
  leads: '🎯',
  tools: '🔗',
  quotations: '📄',
  closed_sales: '✅',
  performance: '📊',
  design: '🎨',
  attendance: '📅',
  uam: '👥',
  roles: '🛡️',
  permissions: '🔑',
  organizations: '🏢',
  companies: '🏭',
  departments: '🗂️',
  chat: '💬',
  partners: '🤝',
  finance: '🏦'
};

const MODULE_NAMES = {
  dashboard: 'Dashboard',
  autos: 'EV Autos & Fleet',
  drivers: 'Driver Management',
  tracking: 'Live Fleet Tracking',
  leads: 'Leads (Fleet Partners)',
  jobs: 'Job Requests (EV Pilots)',
  tools: 'Link Generator & Campaign Tools',
  quotations: 'Quotations',
  closed_sales: 'Closed Sales',
  performance: 'Performance & Leaderboard',
  design: 'Design Orders',
  attendance: 'Attendance & Leaves',
  uam: 'User Access Management (UAM)',
  roles: 'Roles Management',
  permissions: 'Permissions Management',
  organizations: 'Organizations',
  companies: 'Companies',
  departments: 'Departments & Hierarchy',
  chat: 'Internal Chat & Team Workspaces',
  partners: 'Fleet Partners (Invested)',
  finance: 'Bajaj Loan & Finance Applications'
};

const ACTIONS = [
  { key: 'canView', label: 'View', color: 'var(--info)' },
  { key: 'canCreate', label: 'Create', color: 'var(--success)' },
  { key: 'canEdit', label: 'Edit', color: 'var(--warning)' },
  { key: 'canDelete', label: 'Delete', color: 'var(--danger)' },
];

const SCREEN_LABELS = {
  // EV Auto Fleet
  'autos-list': 'EV Autos & Fleet (List / View)',
  'auto-create': 'Add New EV Auto',
  'auto-edit': 'Edit EV Auto Details',
  'auto-delete': 'Delete EV Auto',

  // Driver Management
  'drivers-list': 'Drivers Directory (List / View)',
  'driver-create': 'Add New Driver',
  'driver-edit': 'Edit Driver Details',
  'driver-delete': 'Delete Driver',

  // Live Fleet Tracking
  'tracking-view': 'Live Fleet GPS Map & Tracking',

  // Job Requests (EV Pilots)
  'job-requests-list': 'Job Requests (EV Pilot Applications List)',
  'job-request-create': 'Create Job Request',
  'job-request-edit': 'Edit Job Request & Status',
  'job-request-delete': 'Delete Job Request',

  // Tools & Campaign Links
  'link-generator': 'UTM Campaign Link Generator',
  'saved-links': 'Official Standard & Saved Links Table',

  // Fleet Partners
  'partners-list': 'Fleet Partners Directory (List / View)',
  'partner-create': 'Add New Fleet Partner',
  'partner-edit': 'Edit Fleet Partner Details',
  'partner-delete': 'Delete Fleet Partner',

  // Bajaj Finance & Loan Applications
  'loan-applications-list': 'Loan Applications Queue (List / View)',
  'loan-application-view': 'View Full Loan Application & KYC Details',
  'loan-application-edit': 'Update Eligibility & Decision Status',
  'loan-application-delete': 'Delete Loan Application Record',

  // UAM & Status Master
  'status-master': 'Status Master (Lead/Job Pipeline Stages)',
  'users-list': 'Users List & Directory',
  'user-create': 'Create New User',
  'user-edit': 'Edit User Profile & Role',
  'user-delete': 'Delete User',
  'audit-logs-list': 'Security Audit Logs',
  'staff-summary': 'Staff Overview — Own Profile Only (Personal Access)',
  'staff-summary-dept': 'Staff Overview — Own Department (Team Staff)',
  'staff-summary-all': 'Staff Overview — Overall Org (All Departments & Dropdown)',

  // Roles & Permissions
  'roles-list': 'Roles List',
  'role-create': 'Create New Role',
  'role-edit': 'Edit Role Configuration',
  'role-delete': 'Delete Role',
  'permissions-list': 'Role Permissions Matrix View',
  'permission-edit': 'Edit Role Permissions & Access Rights',

  // Organizations, Companies, Departments
  'organizations-list': 'Organizations Directory (Super Admin Only)',
  'organization-create': 'Create Organization',
  'organization-edit': 'Edit Organization',
  'organization-delete': 'Delete Organization',
  'companies-list': 'Companies Directory',
  'company-create': 'Create Company',
  'company-edit': 'Edit Company',
  'company-delete': 'Delete Company',
  'departments-list': 'Departments Directory',
  'department-create': 'Create Department',
  'department-edit': 'Edit Department',
  'department-delete': 'Delete Department',
  'hierarchy-studio': 'Org Hierarchy Studio',
  'team-monitor': 'Team Monitor & Structure',

  // Leads (Fleet Partners)
  'leads-list': 'Leads Access (Own Assigned Only)',
  'leads-all': 'Leads Access (All Staff / Org Wide)',
  'lead-create': 'Create Lead',
  'lead-edit': 'Edit Lead',
  'lead-delete': 'Delete Lead',
  'lead-edit-upload-date': 'Edit Lead Uploaded Date',

  // Quotations
  'quotations-list': 'Quotations List',
  'quotation-create': 'Create Quotation',
  'quotation-export': 'Export Quotation (PDF)',

  // Performance & Leaderboard
  'performance-view': 'My Performance Metrics',
  'performance-team': 'Team Performance View (Show Department Team)',
  'performance-all-departments': 'Switch All Departments (Department Dropdown)',
  'leaderboard': 'Sales Leaderboard Podium',

  // Attendance & Leaves
  'attendance-list': 'My Attendance Calendar',
  'attendance-my-corrections': 'My Correction Requests',
  'attendance-correction-approvals': 'Correction Approvals (Team Requests)',
  'attendance-payroll': 'Monthly Payroll & Deductions',
  'attendance-team': 'Team Daily Logs',
  'attendance-all-departments': 'Attendance — Overall Org (All Departments Dropdown)',
  'attendance-holidays': 'Holidays Configuration',
  'leaves-portal': 'Leave Management & Applications',

  // Design
  'design-list': 'Design Orders List',
  'my-projects-list': 'My Design Projects',
  'completed-models-list': 'Completed 3D Models',

  // Collaboration
  'chat-room': 'Chat Room & Channels',
  'chat-workspaces': 'Chat Workspaces & Settings',

  // Closed Sales - Overview Cards
  'closed-sales-card-base-value': 'Card: Base Deal Value (Overview Card)',
  'closed-sales-card-gst': 'Card: Total GST 18% (Overview Card)',
  'closed-sales-card-tds': 'Card: Total TDS 2% (Overview Card)',
  'closed-sales-card-total-value': 'Card: Total Deal Value (Overview Card)',
  'closed-sales-card-paid': 'Card: Amount Paid (Overview Card)',
  'closed-sales-card-balance': 'Card: Pending Balance (Overview Card)',
  'closed-sales-card-vendor': 'Card: Paid to Vendor (Overview Card)',

  // Closed Sales - Table Columns
  'closed-sales-value': 'Column: Base Deal Value (Table Column & Input)',
  'closed-sales-gst-view': 'Column: GST 18% (Table Column)',
  'closed-sales-tds-view': 'Column: TDS 2% (Table Column)',
  'closed-sales-total-value': 'Column: Total Deal Value (Table Column)',
  'closed-sales-paid': 'Column: Paid Amount (Table Column & Input)',
  'closed-sales-balance': 'Column: Pending Balance (Table Column & View)',
  'closed-sales-vendor-payout': 'Column: Vendor Payout (Table Column & Input)',

  // Closed Sales - Actions & Scope
  'closed-sales-tax-calc': 'Action: GST & TDS Tax Calculator (Edit Modal)',
  'closed-sales-list': 'Closed Sales Access (Own Only)',
  'closed-sales-all': 'Closed Sales Access (All / Team)',
  'closed-sales-filters': 'Advanced Filters (Financial Year, Company)',
  'closed-sales-name-filter': 'Filter: Name Filter (Contact Person / Client Name)',
  'closed-sales-sort': 'Sorting Controls (Ascending / Descending Value & Column Sorting)',

  // Dashboard Cards & Widgets
  'total-profit-card': 'Total Sales Card (Without Tax / Base)',
  'total-value-card': 'Total Sales Card (With GST & TDS)',
  'overall-balance-card': 'Overall Balance Card (Pending Collection)',
  'monthly-profit-card': 'Average Monthly Sales Card',
  'deductions-card': 'Team Deductions Card',
  'net-profit-card': 'Net Profit Card',
  'quote-sent-count-card': 'Total Quote Sent Card (Own Scope)',
  'quote-sent-count-card-team': 'Total Quote Sent Card (Team / Org Scope)',
  'quote-sent-value-card': 'Total Quote Value Card (Own Scope)',
  'quote-sent-value-card-team': 'Total Quote Value Card (Team / Org Scope)',
  'profit-trend-chart': 'Monthly Sales Trend Chart',
  'dashboard-home': 'Dashboard Access (Own Only — Personal Metrics)',
  'dashboard-all': 'Dashboard Access (Team / All Scope — Org Metrics)',
  'dashboard-date-filter': 'Filter: Date Range Filter (Dashboard Analytics)',
  'dashboard-user-filter': 'Filter: User / Staff Filter (Dashboard Analytics)',
  'top-performers-widget': 'Top 3 Sales Performers Card (Leaderboard)',
  'upcoming-expos-widget': 'Upcoming Closed Projects & Expos Card',
  'leads-widget': 'Dashboard: Leads Quick Overview Widget',
  'calls-widget': 'Dashboard: Daily Calls Metric Widget',
  'interested-leads-widget': 'Dashboard: Interested Leads Counter',
  'projects-widget': 'Dashboard: Active Projects Widget',
  'pending-projects-widget': 'Dashboard: Pending Projects Widget',
  'completed-projects-widget': 'Dashboard: Completed Projects Widget',
  'recent-leads-list': 'Dashboard: Recent Leads Activity List',
  'recent-projects-list': 'Dashboard: Recent Projects Activity List',
  'org-overview': 'Dashboard: Enterprise Org Overview',
  'system-overview': 'Dashboard: System Infrastructure Overview',
  'pending-designs-widget': 'Dashboard: Pending Designs Widget',
  'completed-designs-widget': 'Dashboard: Completed Designs Widget',
  'change-designs-widget': 'Dashboard: Change Designs Widget',
  'total-designs-widget': 'Dashboard: Total Designs Widget'
};

const SCREEN_DESCRIPTIONS = {
  // EV Auto Fleet
  'autos-list': 'Allow user to view and search the EV autos inventory and fleet status',
  'auto-create': 'Allow user to register new EV autos into the system',
  'auto-edit': 'Allow user to update vehicle details, registration, driver assignment, and status',
  'auto-delete': 'Allow user to permanently remove an auto from the fleet database',

  // Drivers
  'drivers-list': 'Allow user to view the active drivers directory and driver profiles',
  'driver-create': 'Allow user to onboard new drivers into the company',
  'driver-edit': 'Allow user to modify driver license, contact, documents, and auto assignments',
  'driver-delete': 'Allow user to remove or offboard drivers',

  // Live Tracking
  'tracking-view': 'Allow user to access the real-time live GPS map tracking all active EV autos across Chennai',

  // Job Requests (EV Pilots)
  'job-requests-list': 'Allow user to view EV Pilot driver applications and job enquiries submitted via website/forms',
  'job-request-create': 'Allow user to manually log a new EV Pilot driver application',
  'job-request-edit': 'Allow user to edit driver applicant details, experience, license, and update recruitment status',
  'job-request-delete': 'Allow user to delete driver job requests',

  // Tools & Campaign Links
  'link-generator': 'Allow user to configure UTM parameters (source, medium, campaign), generate tracked marketing links and download QR codes',
  'saved-links': 'Allow user to manage saved marketing links: 1-click copy, save new presets, edit URLs (Option A modal), and delete/restore',

  // Status Master
  'status-master': 'Allow user to customize lead stages, job application pipeline statuses, colors, and sort orders',

  // UAM
  'users-list': 'User can view all staff and administrative users in the system',
  'user-create': 'User can invite and create new user accounts',
  'user-edit': 'User can update user details, department assignments, and roles',
  'user-delete': 'User can deactivate or delete user accounts',
  'audit-logs-list': 'User can inspect system security audit logs and action trails',

  // Roles & Permissions
  'roles-list': 'User can view role definitions and permission levels',
  'role-create': 'User can create new organizational roles',
  'role-edit': 'User can rename or configure roles',
  'role-delete': 'User can delete unused roles',
  'permissions-list': 'User can view role permission matrices',
  'permission-edit': 'User can modify screen permissions, view/create/edit/delete access rights',

  // Leads
  'leads-list': 'User can ONLY view leads directly assigned to their account (Own Scope)',
  'leads-all': 'User can view and filter ALL leads across all users and staff in the organization (All Staff / Org Scope)',
  'lead-create': 'Allow role to add and register new Fleet Partner leads',
  'lead-edit': 'Allow role to modify lead information, contact numbers, and pipeline stage',
  'lead-delete': 'Allow role to permanently delete leads from the CRM',
  'lead-edit-upload-date': 'Allow role to edit the uploaded/created date of leads in Lead management',

  // Performance
  'performance-view': 'User can view personal sales and KPI performance metrics',
  'performance-team': 'User can view entire department team metrics instead of only personal performance',
  'performance-all-departments': 'User can access and switch between all departments in the Performance dropdown',
  'leaderboard': 'User can view the gamified top sales performers leaderboard and podium',

  // Closed sales
  'closed-sales-list': 'User can ONLY see and manage their own closed sales',
  'closed-sales-all': 'User can see and manage ALL closed sales across the team / organization',
  'closed-sales-filters': 'Allow role to access advanced filters (Financial Year and Company dropdowns)',
  'closed-sales-name-filter': 'Show or hide the Name filter dropdown in Closed Sales (Allow role to filter closed sales by Name / Contact Person)',
  'closed-sales-sort': 'Allow role to sort closed sales by Ascending/Descending deal value, total value, balance, and names',

  // Cards descriptions
  'closed-sales-card-base-value': 'Show or hide the Base Deal Value overview card at the top',
  'closed-sales-card-gst': 'Show or hide the Total GST (18%) overview card at the top',
  'closed-sales-card-tds': 'Show or hide the Total TDS (2%) overview card at the top',
  'closed-sales-card-total-value': 'Show or hide the Total Deal Value overview card at the top',
  'closed-sales-card-paid': 'Show or hide the Amount Paid overview card at the top',
  'closed-sales-card-balance': 'Show or hide the Pending Balance overview card at the top',
  'closed-sales-card-vendor': 'Show or hide the Paid to Vendor overview card at the top',

  // Columns descriptions
  'closed-sales-value': 'Show or hide the Base Deal Value column in table and allow editing base value',
  'closed-sales-gst-view': 'Show or hide the GST (18%) column in closed sales table',
  'closed-sales-tds-view': 'Show or hide the TDS (2%) column in closed sales table',
  'closed-sales-total-value': 'Show or hide the final Total Value column in closed sales table',
  'closed-sales-paid': 'Show or hide the Paid Amount column in table and allow editing paid amount',
  'closed-sales-balance': 'Show or hide the Pending Balance column in closed sales table',
  'closed-sales-vendor-payout': 'Show or hide the Vendor Payout column in table and allow editing vendor payout',
  'closed-sales-tax-calc': 'Allow role to use the GST (18%) and TDS (2%) tax calculator and see breakdown cards in Edit Deal Financials',

  // Dashboard
  'dashboard-home': 'Allow user to view personal dashboard metrics specifically for their own assigned data (Own Scope)',
  'dashboard-all': 'Allow user to view team metrics across ALL staff in the organization on dashboard (Team / Org Scope)',
  'dashboard-date-filter': 'Show or hide the Date Range filter (Today, This Week, This Month, Custom Range) on the Dashboard',
  'dashboard-user-filter': 'Show or hide the User / Staff filter dropdown to view individual employee performance on the Dashboard',
  'top-performers-widget': 'Show the Top 3 sales staff ranking podium on the Dashboard, reacting dynamically to filters',
  'upcoming-expos-widget': 'Display upcoming closed sales and exhibitions with countdown badges, auto-removing expired ones',
  'total-profit-card': 'Show or hide the Total Sales card (base value without GST and TDS) on dashboard',
  'total-value-card': 'Show or hide the Total Sales card with GST (18%) and TDS (2%) calculated on dashboard',
  'overall-balance-card': 'Show or hide the Overall Pending Balance receivable card on dashboard',
  'net-profit-card': 'Display Team / Personal Net Profit card on the dashboard',
  'quote-sent-count-card': 'Show or hide the Total Quote Sent count card on personal dashboard (Own Scope)',
  'quote-sent-count-card-team': 'Show or hide the Total Quote Sent count card across the team / organization on dashboard (Team Scope)',
  'quote-sent-value-card': 'Show or hide the Total Quote Value (₹) card on personal dashboard (Own Scope)',
  'quote-sent-value-card-team': 'Show or hide the Total Quote Value (₹) card across the team / organization on dashboard (Team Scope)',

  // Staff summary
  'staff-summary': 'User can view their own personal staff summary, leave quota, and compensation',
  'staff-summary-dept': 'User can view staff summary for members in their assigned department',
  'staff-summary-all': 'User can view all staff across the organization and switch departments in dropdown',

  // Attendance
  'attendance-list': 'User can view their personal attendance calendar, punch in/out, and logs',
  'attendance-my-corrections': 'User can view and submit attendance regularization / correction requests',
  'attendance-correction-approvals': 'User can view and approve/reject team attendance correction requests',
  'attendance-payroll': 'User can view monthly salary calculation, absent deductions, and payroll summary',
  'attendance-team': 'User can view team daily attendance presence logs',
  'attendance-all-departments': 'User can view attendance records across all departments in the organization and switch departments in dropdown',
  'attendance-holidays': 'User can configure and manage public and company holidays',
  'leaves-portal': 'User can submit leave requests, view leave quotas, and track approvals',

  // Chat
  'chat-room': 'User can participate in real-time internal team messaging and department channels',
  'chat-workspaces': 'User can create and manage team chat channels, direct messages, and workspace settings'
};

const PermissionsPage = () => {
  const { roleId } = useParams();
  const navigate = useNavigate();
  const { refreshAuth, hasPermission } = useAuth();

  const [roles, setRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(roleId || '');
  const [role, setRole] = useState(null);
  const [moduleScreens, setModuleScreens] = useState({});
  const [permsMatrix, setPermsMatrix] = useState({});
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchModule, setSearchModule] = useState('');

  const canEditPerms = hasPermission('permissions', 'permission-edit', 'canEdit');

  // 1. Fetch all roles for the selector bar
  useEffect(() => {
    let isMounted = true;
    const fetchRoles = async () => {
      setLoadingRoles(true);
      try {
        const res = await api.get('/roles');
        const rolesList = res.data.roles || [];
        if (isMounted) {
          setRoles(rolesList);
          if (roleId) {
            setSelectedRoleId(roleId);
          } else if (rolesList.length > 0) {
            setSelectedRoleId(rolesList[0].id);
          }
        }
      } catch (err) {
        toast.error('Failed to load roles');
      } finally {
        if (isMounted) setLoadingRoles(false);
      }
    };
    fetchRoles();
    return () => { isMounted = false; };
  }, [roleId]);

  // 2. Fetch permissions matrix when selectedRoleId changes
  useEffect(() => {
    if (!selectedRoleId) return;
    let isMounted = true;
    const loadMatrix = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/permissions/role/${selectedRoleId}`);
        if (isMounted) {
          setRole(res.data.role);
          setModuleScreens(res.data.moduleScreens || {});
          setPermsMatrix(res.data.matrix || {});
        }
      } catch (err) {
        toast.error('Failed to load role permissions');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadMatrix();
    return () => { isMounted = false; };
  }, [selectedRoleId]);

  const handleRoleSelect = (id) => {
    setSelectedRoleId(id);
    navigate(`/uam/permissions/${id}`, { replace: true });
  };

  const toggle = (module, screen, action) => {
    if (!canEditPerms) return;
    setPermsMatrix(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [screen]: {
          ...prev[module][screen],
          [action]: !prev[module][screen][action]
        }
      }
    }));
  };

  const toggleAllModule = (module, action, value) => {
    if (!canEditPerms) return;
    setPermsMatrix(prev => {
      const updated = { ...prev, [module]: { ...prev[module] } };
      Object.keys(updated[module] || {}).forEach(screen => {
        updated[module][screen] = { ...updated[module][screen], [action]: value };
      });
      return updated;
    });
  };

  // Master toggle: enable/disable ALL screens & actions in a module
  const toggleWholeModule = (module, turnOn) => {
    if (!canEditPerms) return;
    setPermsMatrix(prev => {
      const updated = { ...prev, [module]: { ...prev[module] } };
      Object.keys(updated[module] || {}).forEach(screen => {
        updated[module][screen] = Object.fromEntries(ACTIONS.map(a => [a.key, turnOn]));
      });
      return updated;
    });
  };

  const toggleAllScreen = (module, screen) => {
    if (!canEditPerms) return;
    const currentPerm = permsMatrix[module]?.[screen] || {};
    const allOn = ACTIONS.every(a => currentPerm[a.key]);
    setPermsMatrix(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [screen]: Object.fromEntries(ACTIONS.map(a => [a.key, !allOn]))
      }
    }));
  };

  const handleSave = async () => {
    if (!selectedRoleId || !canEditPerms) return;
    setSaving(true);
    const permissions = [];
    for (const [module, screens] of Object.entries(permsMatrix)) {
      for (const [screen, perms] of Object.entries(screens)) {
        permissions.push({ module, screen, ...perms });
      }
    }
    try {
      await api.put(`/permissions/role/${selectedRoleId}`, { permissions });
      toast.success(`Permissions updated successfully for "${role?.name}"!`);
      refreshAuth();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // Filter modules by search term
  const filteredModules = Object.entries(moduleScreens).filter(([module]) => {
    if (!searchModule) return true;
    return module.toLowerCase().includes(searchModule.toLowerCase());
  });

  return (
    <AppLayout title="Permissions Management">
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <RiKey2Line style={{ color: 'var(--accent)' }} /> Role Permissions
          </h1>
          <p className="page-subtitle">
            Configure screen access rights and CRUD permissions across all system modules
          </p>
        </div>

        {canEditPerms && (
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || loading}
            id="save-perms-btn"
          >
            {saving ? <div className="spinner spinner-sm" /> : <RiSaveLine />}
            {saving ? 'Saving...' : 'Save Permissions'}
          </button>
        )}
      </div>

      {/* Role Selection Tabs */}
      <div style={{
        marginBottom: 20,
        padding: '12px 16px',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--accent-glow)',
        borderRadius: 12
      }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
          Select Role to Edit Permissions:
        </div>

        {loadingRoles ? (
          <div style={{ padding: '8px 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading roles...</div>
        ) : (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {roles.map(r => {
              const isActive = r.id === selectedRoleId;
              return (
                <button
                  key={r.id}
                  onClick={() => handleRoleSelect(r.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: isActive ? '1px solid var(--accent)' : '1px solid rgba(255, 255, 255, 0.08)',
                    background: isActive ? 'var(--accent-glow)' : 'rgba(255, 255, 255, 0.03)',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: isActive ? 600 : 400,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                  id={`role-tab-${r.id}`}
                >
                  <RiShieldUserLine style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }} />
                  <span>{r.name}</span>
                  <span style={{
                    fontSize: '0.6875rem',
                    padding: '1px 6px',
                    borderRadius: 4,
                    background: r.isSystem ? 'rgba(245, 158, 11, 0.15)' : 'var(--accent-glow)',
                    color: r.isSystem ? '#f59e0b' : 'var(--accent)'
                  }}>
                    {r.isSystem ? 'System' : 'Custom'}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Permissions Editor Card */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading permissions matrix...</div>
        </div>
      ) : (
        <>
          {/* Active Role Meta & Filter Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            marginBottom: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                fontWeight: 700,
                fontSize: '1rem',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <span>Configuring:</span>
                <span style={{ color: 'var(--accent)' }}>{role?.name}</span>
                {role?.code && <code style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>({role?.code})</code>}
              </div>
              <span className={`badge ${role?.isActive ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.75rem' }}>
                {role?.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>

            {/* Module search */}
            <div className="input-wrapper" style={{ minWidth: 220 }}>
              <RiSearchLine className="input-icon" />
              <input
                className="form-control"
                placeholder="Filter modules..."
                value={searchModule}
                onChange={e => setSearchModule(e.target.value)}
                style={{ fontSize: '0.8125rem', padding: '6px 12px 6px 36px' }}
              />
            </div>
          </div>

          {/* Actions Legend */}
          <div className="flex gap-4 mb-4" style={{ marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>Action Keys:</span>
            {ACTIONS.map(a => (
              <div key={a.key} className="flex items-center gap-2" style={{ fontSize: '0.8125rem' }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: a.color }} />
                <span style={{ color: 'var(--text-secondary)' }}>{a.label}</span>
              </div>
            ))}
          </div>

          {/* Matrix by Module */}
          {filteredModules.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: 'var(--text-muted)' }}>No modules found matching "{searchModule}"</p>
            </div>
          ) : (
            filteredModules.map(([module, screens]) => {
              const modulePerm = permsMatrix[module] || {};
              const allScreensAllActions = screens.every(s => ACTIONS.every(a => modulePerm[s]?.[a.key]));
              const anyOn = screens.some(s => ACTIONS.some(a => modulePerm[s]?.[a.key]));

              return (
                <div className="card" key={module} style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
                  {/* Module Header */}
                  <div style={{
                    padding: '12px 20px',
                    background: 'rgba(129, 140, 248, 0.06)',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap'
                  }}>
                    <span style={{ fontSize: '1.25rem' }}>{MODULE_ICONS[module] || '📋'}</span>
                    <span style={{
                      fontWeight: 700,
                      fontSize: '0.9375rem',
                      color: 'var(--text-primary)'
                    }}>
                      {MODULE_NAMES[module] || module.replace(/_/g, ' ')}
                    </span>

                    {/* Master Switch for Whole Module */}
                    <label
                      className="toggle"
                      title={allScreensAllActions ? 'Disable all permissions for this module' : 'Enable all permissions for this module'}
                      style={{ marginLeft: 8, cursor: canEditPerms ? 'pointer' : 'default' }}
                      id={`master-toggle-${module}`}
                    >
                      <input
                        type="checkbox"
                        checked={allScreensAllActions}
                        disabled={!canEditPerms}
                        onChange={() => toggleWholeModule(module, !allScreensAllActions)}
                      />
                      <span className="toggle-slider" style={{
                        '--toggle-on-color': allScreensAllActions ? 'var(--success)' : anyOn ? 'var(--warning)' : undefined
                      }} />
                    </label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: -4 }}>Toggle Module</span>

                    {/* Bulk Actions per column */}
                    {canEditPerms && (
                      <div className="flex gap-2" style={{ marginLeft: 'auto' }}>
                        {ACTIONS.map(a => (
                          <button
                            key={a.key}
                            className="btn btn-sm"
                            style={{
                              fontSize: '0.6875rem',
                              padding: '4px 8px',
                              background: 'transparent',
                              border: `1px solid ${a.color}40`,
                              color: a.color
                            }}
                            onClick={() => {
                              const allOn = screens.every(s => modulePerm[s]?.[a.key]);
                              toggleAllModule(module, a.key, !allOn);
                            }}
                            id={`module-${module}-${a.key}`}
                          >
                            All {a.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Screen Rows Table with Horizontal Scroll Support */}
                  <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <div style={{ minWidth: 620 }}>
                      {/* Sub-header with Column Action Labels */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr repeat(4, 110px)',
                        padding: '8px 20px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderBottom: '1px solid var(--border)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        <div>Screen / Resource</div>
                        {ACTIONS.map(a => (
                          <div key={a.key} style={{ textAlign: 'center', color: a.color }}>
                            {a.label}
                          </div>
                        ))}
                      </div>

                      {screens.map((screen, idx) => {
                        const screenPerm = modulePerm[screen] || {};
                        const isAllRowOn = ACTIONS.every(a => screenPerm[a.key]);

                        return (
                          <div
                            key={screen}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr repeat(4, 110px)',
                              padding: '12px 20px',
                              borderBottom: idx < screens.length - 1 ? '1px solid rgba(129, 140, 248, 0.05)' : 'none',
                              alignItems: 'center',
                              transition: 'background 0.15s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(129, 140, 248, 0.03)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            {/* Screen Name + Toggle All Row */}
                            <div className="flex items-center gap-2">
                              {canEditPerms && (
                                <button
                                  onClick={() => toggleAllScreen(module, screen)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: isAllRowOn ? 'var(--accent)' : 'var(--text-muted)',
                                    fontSize: '1.1rem',
                                    display: 'flex',
                                    padding: 0
                                  }}
                                  title="Toggle all actions for this screen"
                                  id={`all-${module}-${screen}`}
                                >
                                  {isAllRowOn ? <RiCheckboxLine /> : <RiCheckboxBlankLine />}
                                </button>
                              )}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                  {SCREEN_LABELS[screen] || screen.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                </span>
                                {SCREEN_DESCRIPTIONS[screen] && (
                                  <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                                    {SCREEN_DESCRIPTIONS[screen]}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Action Toggles */}
                            {ACTIONS.map(a => (
                              <div key={a.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <label className="toggle" id={`toggle-${module}-${screen}-${a.key}`}>
                                  <input
                                    type="checkbox"
                                    checked={!!screenPerm[a.key]}
                                    disabled={!canEditPerms}
                                    onChange={() => toggle(module, screen, a.key)}
                                  />
                                  <span
                                    className="toggle-slider"
                                    style={{ '--toggle-on-color': a.color }}
                                  />
                                </label>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Bottom Save Action */}
          {canEditPerms && (
            <div style={{ textAlign: 'right', marginTop: 20, marginBottom: 40 }}>
              <button
                className="btn btn-primary btn-lg"
                onClick={handleSave}
                disabled={saving}
                id="save-perms-btn-bottom"
              >
                {saving ? <div className="spinner spinner-sm" /> : <RiSaveLine />}
                {saving ? 'Saving Changes...' : `Save Permissions for ${role?.name || 'Role'}`}
              </button>
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
};

export default PermissionsPage;
