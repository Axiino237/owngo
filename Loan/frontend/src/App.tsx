import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ApplicationWizard } from './components/wizard/ApplicationWizard';
import { ApplicationSuccess } from './components/wizard/ApplicationSuccess';
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminDashboard } from './components/admin/AdminDashboard';

type ScreenMode = 'form' | 'admin';

const getInitialScreen = (): ScreenMode => {
  if (typeof window === 'undefined') return 'form';
  const path = window.location.pathname.toLowerCase();
  const params = new URLSearchParams(window.location.search);
  const screenParam = params.get('screen');

  if (path.startsWith('/admin') || screenParam === 'admin') {
    return 'admin';
  }
  return 'form';
};

const MainApp: React.FC = () => {
  const { admin } = useAuth();
  const [screen, setScreen] = useState<ScreenMode>(getInitialScreen);
  const [submittedAppId, setSubmittedAppId] = useState<string | null>(null);

  useEffect(() => {
    const handleLocationChange = () => {
      setScreen(getInitialScreen());
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Screen Render */}
      <div className="flex-1">
        {screen === 'form' && (
          <>
            {submittedAppId ? (
              <ApplicationSuccess
                applicationId={submittedAppId}
                onReset={() => setSubmittedAppId(null)}
              />
            ) : (
              <ApplicationWizard onSuccess={(appId) => setSubmittedAppId(appId)} />
            )}
          </>
        )}

        {screen === 'admin' && (
          <>
            {admin ? <AdminDashboard /> : <AdminLogin />}
          </>
        )}
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};

export default App;
