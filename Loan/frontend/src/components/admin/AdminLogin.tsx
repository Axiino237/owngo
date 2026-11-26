import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, AlertCircle } from 'lucide-react';

export const AdminLogin: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid credentials. Please verify your email and password.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-50 text-bajaj-blue rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
            <ShieldCheck className="w-8 h-8 text-bajaj-blue" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Portal Sign In</h1>
          <p className="text-xs text-slate-500 mt-1">
            Bajaj Auto Finance Underwriting & Credit Risk Desk
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Standard Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Admin Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. admin1@bajaj.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-bajaj-blue focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-bajaj-blue focus:outline-none"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-bajaj-blue hover:bg-bajaj-dark text-white font-semibold text-sm transition shadow-md shadow-blue-900/10 active:scale-98 disabled:opacity-50 mt-2"
          >
            {isLoading ? 'Authenticating...' : 'Sign In as Admin'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <a
            href="/"
            className="text-xs text-slate-500 hover:text-bajaj-blue font-medium transition inline-flex items-center gap-1"
          >
            &larr; Go to Customer Loan Form
          </a>
        </div>
      </div>
    </div>
  );
};
