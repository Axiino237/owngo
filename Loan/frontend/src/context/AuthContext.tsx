import React, { createContext, useContext, useState, useEffect } from 'react';
import { AdminUser } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  admin: AdminUser | null;
  token: string | null;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  availableAdmins: AdminUser[];
  quickLogin: (email: string) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(() => {
    const saved = localStorage.getItem('bajaj_active_admin');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('bajaj_admin_token') || null;
  });
  const [availableAdmins, setAvailableAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Fetch preset admins for easy testing/login
    authApi
      .getAdmins()
      .then((data) => setAvailableAdmins(data))
      .catch((err) => console.error('Failed to load admin list:', err));
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await authApi.login(email, pass);
      setAdmin(res.admin);
      setToken(res.accessToken);
      localStorage.setItem('bajaj_active_admin', JSON.stringify(res.admin));
      localStorage.setItem('bajaj_admin_token', res.accessToken);
    } finally {
      setIsLoading(false);
    }
  };

  const quickLogin = async (email: string) => {
    await login(email, 'admin123');
  };

  const logout = () => {
    setAdmin(null);
    setToken(null);
    localStorage.removeItem('bajaj_active_admin');
    localStorage.removeItem('bajaj_admin_token');
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        token,
        login,
        logout,
        availableAdmins,
        quickLogin,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
