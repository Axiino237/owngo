import React, { useState, useEffect, useCallback } from 'react';
import { Application, ApplicationStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { applicationsApi } from '../../services/api';
import { getSocket } from '../../services/socket';
import { ApplicationReviewDrawer } from './ApplicationReviewDrawer';
import {
  FileText,
  Clock,
  CheckCircle2,
  Lock,
  Search,
  RefreshCw,
  LogOut,
  Users,
  Eye,
  ArrowRight,
  ShieldAlert,
  ExternalLink,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { admin, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<ApplicationStatus>('NEW');
  const [applications, setApplications] = useState<Application[]>([]);
  const [counts, setCounts] = useState({ new: 0, workInProgress: 0, completed: 0, total: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [eligibilityFilter, setEligibilityFilter] = useState<'ALL' | 'YES' | 'NO'>('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);

  const fetchApplications = useCallback(async () => {
    setIsLoading(true);
    try {
      const [list, countsData] = await Promise.all([
        applicationsApi.getAll(activeTab),
        applicationsApi.getCounts(),
      ]);
      setApplications(list);
      setCounts(countsData);
    } catch (err) {
      console.error('Failed to load applications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Real-time WebSocket Listeners
  useEffect(() => {
    const socket = getSocket();

    const handleLocked = (data: any) => {
      // Update local state if the locked application is in the list
      setApplications((prev) =>
        prev.map((app) => {
          if (app.id === data.applicationId) {
            return {
              ...app,
              lockedByAdminId: data.lockedByAdminId,
              lockedByAdminName: data.lockedByAdminName,
              lockedAt: data.lockedAt,
              status: data.status || app.status,
            };
          }
          return app;
        }),
      );
      // Also update drawer if viewing it
      setSelectedApplication((current) => {
        if (current && current.id === data.applicationId) {
          return {
            ...current,
            lockedByAdminId: data.lockedByAdminId,
            lockedByAdminName: data.lockedByAdminName,
            lockedAt: data.lockedAt,
          };
        }
        return current;
      });
      // Refresh counts
      applicationsApi.getCounts().then(setCounts).catch(() => {});
    };

    const handleUnlocked = (data: any) => {
      setApplications((prev) =>
        prev.map((app) => {
          if (app.id === data.applicationId) {
            return {
              ...app,
              lockedByAdminId: null,
              lockedByAdminName: null,
              lockedAt: null,
            };
          }
          return app;
        }),
      );
      setSelectedApplication((current) => {
        if (current && current.id === data.applicationId) {
          return {
            ...current,
            lockedByAdminId: null,
            lockedByAdminName: null,
            lockedAt: null,
          };
        }
        return current;
      });
    };

    const handleStatusChanged = () => {
      fetchApplications();
    };

    socket.on('application_locked', handleLocked);
    socket.on('application_unlocked', handleUnlocked);
    socket.on('application_status_changed', handleStatusChanged);

    return () => {
      socket.off('application_locked', handleLocked);
      socket.off('application_unlocked', handleUnlocked);
      socket.off('application_status_changed', handleStatusChanged);
    };
  }, [fetchApplications]);

  // Click on an application to view/review
  const handleItemClick = async (app: Application) => {
    if (!admin) return;

    if (activeTab === 'NEW') {
      // As agreed: When clicked on 'New', automatically transitions to 'Work in Progress' and acquires lock
      try {
        const res = await applicationsApi.startReview(app.id, admin.id, admin.name);
        setSelectedApplication(res.application);
        // Switch tab to WORK_IN_PROGRESS to reflect current mode
        setActiveTab('WORK_IN_PROGRESS');
      } catch (err) {
        console.error('Error starting review:', err);
        setSelectedApplication(app);
      }
    } else if (activeTab === 'WORK_IN_PROGRESS') {
      // In WIP: try to acquire lock if not locked by someone else
      try {
        const res = await applicationsApi.startReview(app.id, admin.id, admin.name);
        setSelectedApplication(res.application);
      } catch (err) {
        setSelectedApplication(app);
      }
    } else {
      // Completed: just open in read-only
      setSelectedApplication(app);
    }
  };

  const filteredApps = applications.filter((app) => {
    if (activeTab === 'COMPLETED' && eligibilityFilter !== 'ALL' && app.eligibility !== eligibilityFilter) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      app.applicantFullName.toLowerCase().includes(q) ||
      app.applicationId.toLowerCase().includes(q) ||
      app.mobileNumber.includes(q) ||
      (app.panNumber && app.panNumber.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 animate-fadeIn">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-bajaj-blue text-white flex items-center justify-center font-bold text-lg">
              B
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                Bajaj Auto Finance
              </h1>
              <span className="text-[11px] text-slate-400 font-medium">Underwriting & Decision Desk</span>
            </div>
          </div>

          {/* Active Admin Info & Sign Out */}
          <div className="flex items-center gap-3 sm:gap-4">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              title="Open Customer Form in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              <span>Customer Form</span>
            </a>

            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <span className="text-xs font-semibold text-slate-900 block">{admin?.name}</span>
                <span className="text-[10px] text-slate-400 block">{admin?.role}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-100 text-bajaj-blue flex items-center justify-center font-bold text-xs border border-blue-200">
                {admin?.name?.charAt(0) || 'A'}
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Title & Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">Loan Applications Queue</h2>
            <p className="text-xs text-slate-500 mt-1">
              Real-time synchronization across all 4 admin terminals with live concurrency locking
            </p>
          </div>

          <button
            type="button"
            onClick={fetchApplications}
            disabled={isLoading}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Queue
          </button>
        </div>

        {/* 3 Tabs: New, Work in Progress, Completed */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="border-b border-slate-200 bg-slate-50/70 p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Tab Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('NEW')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                  activeTab === 'NEW'
                    ? 'bg-bajaj-blue text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>New</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    activeTab === 'NEW' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {counts.new}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('WORK_IN_PROGRESS')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                  activeTab === 'WORK_IN_PROGRESS'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Work in Progress</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    activeTab === 'WORK_IN_PROGRESS'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {counts.workInProgress}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('COMPLETED')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                  activeTab === 'COMPLETED'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Completed</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    activeTab === 'COMPLETED'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {counts.completed}
                </span>
              </button>
            </div>

            {/* Filter & Quick Search Controls */}
            <div className="flex flex-wrap items-center gap-2 max-w-md w-full sm:w-auto">
              {/* Eligibility Filter: Yes / No (Shown ONLY on Completed tab) */}
              {activeTab === 'COMPLETED' && (
                <select
                  value={eligibilityFilter}
                  onChange={(e) => setEligibilityFilter(e.target.value as 'ALL' | 'YES' | 'NO')}
                  className="text-xs py-2 px-3 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-bajaj-blue shadow-sm animate-fadeIn"
                  title="Filter by Eligibility Decision"
                >
                  <option value="ALL">All Decisions</option>
                  <option value="YES">Eligibility: Yes</option>
                  <option value="NO">Eligibility: No</option>
                </select>
              )}

              {/* Quick Search Input */}
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search name, phone, PAN, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 bg-white rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-bajaj-blue"
                />
              </div>
            </div>
          </div>

          {/* Table of Applications */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Application ID</th>
                  <th className="py-3.5 px-4">Applicant Name</th>
                  <th className="py-3.5 px-4">Mobile & PAN</th>
                  <th className="py-3.5 px-4">Current Mode / Lock Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <div className="w-6 h-6 border-2 border-bajaj-blue border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Loading applications...
                    </td>
                  </tr>
                ) : filteredApps.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      No applications found in {activeTab.replace(/_/g, ' ').toLowerCase()}.
                    </td>
                  </tr>
                ) : (
                  filteredApps.map((app) => {
                    const isLockedByOther =
                      app.status === 'WORK_IN_PROGRESS' &&
                      app.lockedByAdminId &&
                      app.lockedByAdminId !== admin?.id;
                    const isLockedByMe =
                      app.status === 'WORK_IN_PROGRESS' &&
                      app.lockedByAdminId &&
                      app.lockedByAdminId === admin?.id;

                    return (
                      <tr
                        key={app.id}
                        className={`hover:bg-slate-50/80 transition cursor-pointer ${
                          isLockedByOther ? 'bg-amber-50/30' : ''
                        }`}
                        onClick={() => handleItemClick(app)}
                      >
                        {/* ID */}
                        <td className="py-3.5 px-4 font-mono font-bold text-bajaj-blue">
                          {app.applicationId}
                        </td>

                        {/* Name */}
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {app.applicantFullName}
                        </td>

                        {/* Mobile & PAN */}
                        <td className="py-3.5 px-4">
                          <div>+91 {app.mobileNumber}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {app.panNumber || 'N/A'}
                          </div>
                        </td>

                        {/* Lock / Mode Status */}
                        <td className="py-3.5 px-4">
                          {app.status === 'NEW' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-bajaj-blue border border-blue-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-bajaj-blue animate-pulse" />
                              New (Click to Review)
                            </span>
                          )}

                          {app.status === 'WORK_IN_PROGRESS' && (
                            <>
                              {isLockedByOther ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                                  <Lock className="w-3.5 h-3.5 text-amber-700" />
                                  another admin is using ({app.lockedByAdminName})
                                </span>
                              ) : isLockedByMe ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                  Locked by You (Reviewing)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                                  In Progress (Unlocked)
                                </span>
                              )}
                            </>
                          )}

                          {app.status === 'COMPLETED' && (
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                app.eligibility === 'YES'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-red-50 text-red-800 border border-red-200'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Eligibility: {app.eligibility}
                            </span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleItemClick(app);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition ${
                              isLockedByOther
                                ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                : activeTab === 'NEW'
                                ? 'bg-bajaj-blue hover:bg-bajaj-dark text-white shadow-sm'
                                : 'bg-slate-800 hover:bg-black text-white'
                            }`}
                          >
                            {isLockedByOther ? (
                              <>
                                <Eye className="w-3.5 h-3.5" /> View Only
                              </>
                            ) : activeTab === 'NEW' ? (
                              <>
                                Review <ArrowRight className="w-3.5 h-3.5" />
                              </>
                            ) : (
                              <>
                                Review / Edit
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Review Drawer / Modal */}
      <ApplicationReviewDrawer
        application={selectedApplication}
        onClose={() => {
          setSelectedApplication(null);
          fetchApplications();
        }}
        onUpdated={(updated) => {
          setSelectedApplication(null);
          fetchApplications();
        }}
      />
    </div>
  );
};
