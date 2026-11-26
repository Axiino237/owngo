import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute - wraps routes that require auth + optional permission check
 * @param {string} module - e.g. 'uam'
 * @param {string} screen - e.g. 'users-list'
 * @param {string} action - e.g. 'canView'
 */
const ProtectedRoute = ({
  children,
  module,
  screen,
  action = 'canView',
  superAdminOnly = false,
  fallbackModule,
  fallbackScreen
}) => {
  const { user, loading, hasPermission, getFirstAuthorizedPath } = useAuth();
  const location = useLocation();

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

  if (!user) {
    const currentPath = location.pathname + location.search;
    const redirectParam = currentPath && currentPath !== '/' && currentPath !== '/login'
      ? `?redirect=${encodeURIComponent(currentPath)}`
      : '';
    return <Navigate to={`/login${redirectParam}`} replace />;
  }

  // Super Admin has full unrestricted access across all screens
  if (user.isSuperAdmin || user.role?.level === 'super_admin') {
    return children;
  }

  if (superAdminOnly && !user.isSuperAdmin && user.role?.level !== 'super_admin') {
    const fallback = getFirstAuthorizedPath();
    return <Navigate to={fallback} replace />;
  }

  const primaryAllowed = module && screen ? hasPermission(module, screen, action) : false;
  const fallbackAllowed = fallbackModule && fallbackScreen ? hasPermission(fallbackModule, fallbackScreen, action) : false;

  if ((module || fallbackModule) && !primaryAllowed && !fallbackAllowed) {
    // Route to user's authorized screen instead of showing an unauthorized error
    const target = getFirstAuthorizedPath();
    if (target && target !== window.location.pathname) {
      return <Navigate to={target} replace />;
    }
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
