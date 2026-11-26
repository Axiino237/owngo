import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './routes/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Listens for push notification clicks from Service Worker and redirects inside React Router
const ServiceWorkerNavigationListener = () => {
  const navigate = useNavigate();
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const handleMessage = (event) => {
      if (event.data?.type === 'NAVIGATE_TO' && event.data?.url) {
        console.log('🔔 [SW Navigation]:', event.data.url);
        navigate(event.data.url);
      }
    };
    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, [navigate]);
  return null;
};

// Smart redirect to user's first authorized route
const HomeRedirect = () => {
  const { user, loading, getFirstAuthorizedPath } = useAuth();
  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--bg-primary)', color: 'var(--accent)'
      }}>
        <div className="spinner" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={getFirstAuthorizedPath()} replace />;
};

// Pages
import LoginPage from './pages/Login';
import Dashboard from './pages/Dashboard';
import UsersPage from './pages/uam/UsersPage';
import RolesPage from './pages/uam/RolesPage';
import PermissionsPage from './pages/uam/PermissionsPage';
import OrganizationsPage from './pages/orgs/OrganizationsPage';
import CompaniesPage from './pages/orgs/CompaniesPage';
import DepartmentsPage from './pages/orgs/DepartmentsPage';
import HierarchyPage from './pages/orgs/HierarchyPage';
import OrgOverviewPage from './pages/orgs/OrgOverviewPage';
import TeamMonitorPage from './pages/orgs/TeamMonitorPage';
import LeadsPage from './pages/leads/LeadsPage';
import PartnersPage from './pages/leads/PartnersPage';
import LoanApplicationsPage from './pages/finance/LoanApplicationsPage';
import QuotationPage from './pages/quotations/QuotationPage';
import Unauthorized from './pages/Unauthorized';
import ClosedSalesPage from './pages/leads/ClosedSalesPage';
import PerformancePage from './pages/PerformancePage';
import DesignPage from './pages/design/DesignPage';
import MyProjectsPage from './pages/design/MyProjectsPage';
import CompletedModelsPage from './pages/design/CompletedModelsPage';
import AuditLogsPage from './pages/uam/AuditLogsPage';
import AttendancePage from './pages/AttendancePage';
import LeavesPage from './pages/LeavesPage';
import ChatPage from './pages/chat/ChatPage';
import ChatSettingsPage from './pages/chat/ChatSettingsPage';
import ProfilePage from './pages/ProfilePage';
import StaffSummaryPage from './pages/hr/StaffSummaryPage';
import LeaderboardPage from './pages/LeaderboardPage';
import AutosPage from './pages/autos/AutosPage';
import DriversPage from './pages/drivers/DriversPage';
import TrackingPage from './pages/tracking/TrackingPage';
import JobRequestsPage from './pages/jobs/JobRequestsPage';
import LinkGeneratorPage from './pages/tools/LinkGeneratorPage';
import StatusMasterPage from './pages/uam/StatusMasterPage';

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <ServiceWorkerNavigationListener />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: {
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.875rem',
                boxShadow: 'var(--shadow-lg)'
              },
              success: { iconTheme: { primary: '#84d802', secondary: '#070908' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#070908' } }
            }}
          />

          <ErrorBoundary>
          <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Root redirect */}
          <Route path="/" element={<HomeRedirect />} />

          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute module="dashboard" screen="dashboard-home" action="canView">
              <Dashboard />
            </ProtectedRoute>
          } />

          {/* EV Auto Fleet Management */}
          <Route path="/autos" element={
            <ProtectedRoute module="autos" screen="autos-list" action="canView">
              <AutosPage />
            </ProtectedRoute>
          } />

          {/* Driver Management */}
          <Route path="/drivers" element={
            <ProtectedRoute module="drivers" screen="drivers-list" action="canView">
              <DriversPage />
            </ProtectedRoute>
          } />

          {/* Live Fleet Tracking */}
          <Route path="/tracking" element={
            <ProtectedRoute module="tracking" screen="tracking-view" fallbackModule="autos" fallbackScreen="autos-list" action="canView">
              <TrackingPage />
            </ProtectedRoute>
          } />

          {/* UAM - Users */}
          <Route path="/uam/users" element={
            <ProtectedRoute module="uam" screen="users-list" action="canView">
              <UsersPage />
            </ProtectedRoute>
          } />

          {/* UAM - Roles */}
          <Route path="/uam/roles" element={
            <ProtectedRoute module="roles" screen="roles-list" action="canView">
              <RolesPage />
            </ProtectedRoute>
          } />

          {/* UAM - Permissions */}
          <Route path="/uam/permissions" element={
            <ProtectedRoute module="permissions" screen="permissions-list" action="canView">
              <PermissionsPage />
            </ProtectedRoute>
          } />

          <Route path="/uam/permissions/:roleId" element={
            <ProtectedRoute module="permissions" screen="permissions-list" action="canView">
              <PermissionsPage />
            </ProtectedRoute>
          } />

          {/* Organizations - Super Admin Only */}
          <Route path="/organizations" element={
            <ProtectedRoute superAdminOnly={true} module="organizations" screen="organizations-list" action="canView">
              <OrganizationsPage />
            </ProtectedRoute>
          } />

          {/* Audit Logs */}
          <Route path="/audit-logs" element={
            <ProtectedRoute module="uam" screen="audit-logs-list" action="canView">
              <AuditLogsPage />
            </ProtectedRoute>
          } />

          {/* Companies */}
          <Route path="/companies" element={
            <ProtectedRoute module="companies" screen="companies-list" action="canView">
              <CompaniesPage />
            </ProtectedRoute>
          } />

          {/* Departments */}
          <Route path="/departments" element={
            <ProtectedRoute module="departments" screen="departments-list" action="canView">
              <DepartmentsPage />
            </ProtectedRoute>
          } />

          {/* Hierarchy Studio */}
          <Route path="/hierarchy" element={
            <ProtectedRoute module="departments" screen={['hierarchy-studio', 'departments-list']} action="canView">
              <HierarchyPage />
            </ProtectedRoute>
          } />

          {/* Team Monitor */}
          <Route path="/team-monitor" element={
            <ProtectedRoute module="departments" screen={['team-monitor', 'departments-list']} action="canView">
              <TeamMonitorPage />
            </ProtectedRoute>
          } />

          {/* Org Overview */}
          <Route path="/org-overview" element={
            <ProtectedRoute module="dashboard" screen="org-overview" action="canView">
              <OrgOverviewPage />
            </ProtectedRoute>
          } />

          {/* Leads (Fleet Partners) */}
          <Route path="/leads" element={
            <ProtectedRoute module="leads" screen="leads-list" action="canView">
              <LeadsPage />
            </ProtectedRoute>
          } />

          {/* Fleet Partners (Invested Leads) */}
          <Route path="/partners" element={
            <ProtectedRoute module="partners" screen="partners-list" fallbackModule="leads" fallbackScreen="leads-list" action="canView">
              <PartnersPage />
            </ProtectedRoute>
          } />

          {/* Loan Applications (Bajaj Auto Finance) */}
          <Route path="/loan-applications" element={
            <ProtectedRoute module="finance" screen="loan-applications-list" fallbackModule="leads" fallbackScreen="leads-list" action="canView">
              <LoanApplicationsPage />
            </ProtectedRoute>
          } />

          {/* Job Requests (EV Pilot Drivers) */}
          <Route path="/job-requests" element={
            <ProtectedRoute module="jobs" screen="job-requests-list" fallbackModule="leads" fallbackScreen="leads-list" action="canView">
              <JobRequestsPage />
            </ProtectedRoute>
          } />

          {/* Campaign Link Generator */}
          <Route path="/link-generator" element={
            <ProtectedRoute module="tools" screen="link-generator" action="canView">
              <LinkGeneratorPage />
            </ProtectedRoute>
          } />

          {/* Status Master Management (UAM) */}
          <Route path="/uam/status-master" element={
            <ProtectedRoute module="uam" screen="status-master" action="canView">
              <StatusMasterPage />
            </ProtectedRoute>
          } />

          {/* Quotation */}
          <Route path="/quotation" element={
            <ProtectedRoute module="quotations" screen="quotations-list" action="canView">
              <QuotationPage />
            </ProtectedRoute>
          } />

          {/* Performance */}
          <Route path="/performance" element={
            <ProtectedRoute module="performance" screen="performance-view" action="canView">
              <PerformancePage />
            </ProtectedRoute>
          } />

          {/* Sales Leaderboard */}
          <Route path="/leaderboard" element={
            <ProtectedRoute module="performance" screen={['leaderboard', 'performance-view']} action="canView">
              <LeaderboardPage />
            </ProtectedRoute>
          } />

          {/* Closed Sales */}
          <Route path="/closed-sales" element={
            <ProtectedRoute module="closed_sales" screen={['closed-sales-list', 'closed-sales-all']} action="canView">
              <ClosedSalesPage />
            </ProtectedRoute>
          } />

          {/* Design Orders */}
          <Route path="/design" element={
            <ProtectedRoute module="design" screen="design-list" action="canView">
              <DesignPage />
            </ProtectedRoute>
          } />

          {/* My Projects */}
          <Route path="/my-projects" element={
            <ProtectedRoute module="design" screen="my-projects-list" action="canView">
              <MyProjectsPage />
            </ProtectedRoute>
          } />

          {/* Completed Design Models */}
          <Route path="/completed-models" element={
            <ProtectedRoute module="design" screen="completed-models-list" action="canView">
              <CompletedModelsPage />
            </ProtectedRoute>
          } />

          {/* Attendance Portal */}
          <Route path="/attendance" element={
            <ProtectedRoute module="attendance" screen={['attendance-list', 'attendance-team', 'attendance-all-departments']} action="canView">
              <AttendancePage />
            </ProtectedRoute>
          } />

          {/* Leaves Portal */}
          <Route path="/leaves" element={
            <ProtectedRoute module="attendance" screen={['leaves-portal', 'attendance-list', 'attendance-team', 'attendance-all-departments']} action="canView">
              <LeavesPage />
            </ProtectedRoute>
          } />

          {/* Staff & Payroll Summary */}
          <Route path="/staff-summary" element={
            <ProtectedRoute module="uam" screen={['staff-summary', 'staff-summary-dept', 'staff-summary-all', 'users-list']} action="canView">
              <StaffSummaryPage />
            </ProtectedRoute>
          } />

          {/* Chat room */}
          <Route path="/chat" element={
            <ProtectedRoute module="chat" screen="chat-room" action="canView">
              <ChatPage />
            </ProtectedRoute>
          } />

          {/* Chat settings */}
          <Route path="/chat-settings" element={
            <ProtectedRoute module="chat" screen="chat-workspaces" action="canView">
              <ChatSettingsPage />
            </ProtectedRoute>
          } />

          {/* Profile settings */}
          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </ErrorBoundary>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
