import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import {
  RiBankCardLine, RiSearchLine, RiRefreshLine, RiDownloadLine,
  RiCheckLine, RiCloseLine, RiEyeLine, RiTimeLine, RiAlertLine,
  RiPhoneLine, RiUserLine, RiBuildingLine, RiMoneyDollarCircleLine,
  RiShieldCheckLine, RiCarLine, RiWhatsappLine, RiMapPinLine, RiCalendarLine
} from 'react-icons/ri';
import AppLayout from '../../components/AppLayout';
import PaginationBar from '../../components/PaginationBar';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const LoanApplicationsPage = () => {
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({ total: 0, eligible: 0, ineligible: 0, pending: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [eligibilityFilter, setEligibilityFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [total, setTotal] = useState(0);

  // Detail Modal
  const [selectedApp, setSelectedApp] = useState(null);
  const [updating, setUpdating] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await api.get('/loan-applications/stats');
      if (res.data?.success) {
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error('Error fetching loan stats:', err);
    }
  };

  const fetchApplications = useCallback(async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true);
      const params = {
        page,
        limit,
        search: search.trim(),
        status: statusFilter,
        eligibility: eligibilityFilter
      };
      const res = await api.get('/loan-applications', { params });
      if (res.data?.success) {
        setApplications(res.data.applications || []);
        setTotal(res.data.total || 0);
      }
    } catch (err) {
      console.error('Error fetching loan applications:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to load loan applications');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, eligibilityFilter]);

  // Initial load and filter change
  useEffect(() => {
    fetchStats();
    fetchApplications(true);
  }, [fetchApplications]);

  // Real-time Event-Driven updates via WebSocket (Zero polling, Zero full reloads)
  useEffect(() => {
    const token = localStorage.getItem('crm_token');
    if (!token) return;

    const socketUrl = import.meta.env.VITE_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socket.on('loan_application:updated', (updatedApp) => {
      if (!updatedApp) return;

      // In-place patch of the specific application row
      setApplications(prev => prev.map(app => {
        if (app.applicationId === updatedApp.applicationId || app.id === updatedApp.id) {
          return { ...app, ...updatedApp };
        }
        return app;
      }));

      // Update detail modal if currently open for this app
      setSelectedApp(prev => {
        if (prev && (prev.applicationId === updatedApp.applicationId || prev.id === updatedApp.id)) {
          return { ...prev, ...updatedApp };
        }
        return prev;
      });

      // Silently refresh stats counters
      fetchStats();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleExport = async () => {
    try {
      toast.loading('Exporting filtered loan applications...', { id: 'loan-export' });
      const params = new URLSearchParams();
      params.set('export', 'true');
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (eligibilityFilter && eligibilityFilter !== 'all') params.set('eligibility', eligibilityFilter);
      if (search && search.trim()) params.set('search', search.trim());

      const res = await api.get(`/loan-applications?${params.toString()}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const filterSuffix = eligibilityFilter !== 'all' ? `_${eligibilityFilter.toLowerCase()}` : '';
      link.setAttribute('download', `bajaj_loan_applications${filterSuffix}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Filtered Loan Applications CSV exported successfully', { id: 'loan-export' });
    } catch (err) {
      toast.error('Failed to export loan applications', { id: 'loan-export' });
    }
  };

  const handleUpdateEligibility = async (appId, newEligibility) => {
    try {
      setUpdating(true);
      const res = await api.patch(`/loan-applications/${appId}/eligibility`, {
        eligibility: newEligibility
      });
      if (res.data?.success) {
        toast.success(`Eligibility updated to ${newEligibility}! Synced to Bajaj Desk.`);
        if (newEligibility === 'YES') {
          toast.success('Matched Lead updated to "Invested" & moved to Partners page! 🤝', { duration: 5000 });
        }
        setSelectedApp(res.data.application);
        fetchStats();
        fetchApplications();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update eligibility');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateStatus = async (appId, newStatus) => {
    try {
      setUpdating(true);
      const res = await api.patch(`/loan-applications/${appId}/status`, {
        status: newStatus
      });
      if (res.data?.success) {
        toast.success(`Workflow stage updated to ${newStatus}! Synced to Bajaj Desk.`);
        setSelectedApp(res.data.application);
        fetchStats();
        fetchApplications();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update workflow stage');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <AppLayout>
      <div style={{ padding: '24px 28px', maxWidth: 1400, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                🏦 Bajaj Auto Finance Applications
              </h1>
              <span className="badge badge-info" style={{ fontWeight: 700, fontSize: '0.8rem', padding: '4px 10px' }}>
                UNDERWRITING DESK
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Real-time synchronization with Bajaj Auto Loan Underwriting Queue & Automated Investor Onboarding
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleExport}
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
            >
              <RiDownloadLine /> Export CSV
            </button>
            <button
              onClick={() => { fetchStats(); fetchApplications(); }}
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <RiRefreshLine /> Refresh
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div className="card" style={{ padding: '18px 20px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Applications</span>
              <div style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', borderRadius: 8, padding: 6 }}><RiBankCardLine size={20} /></div>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>{stats.total}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Financing submissions</div>
          </div>

          <div className="card" style={{ padding: '18px 20px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Eligibility: YES</span>
              <div style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', borderRadius: 8, padding: 6 }}><RiShieldCheckLine size={20} /></div>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981' }}>{stats.eligible}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Approved / Invested</div>
          </div>

          <div className="card" style={{ padding: '18px 20px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Eligibility: NO</span>
              <div style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', borderRadius: 8, padding: 6 }}><RiAlertLine size={20} /></div>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ef4444' }}>{stats.ineligible}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Declined by credit risk</div>
          </div>

          <div className="card" style={{ padding: '18px 20px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pending Review</span>
              <div style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', borderRadius: 8, padding: 6 }}><RiTimeLine size={20} /></div>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b' }}>{stats.pending}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>In underwriter review</div>
          </div>
        </div>

        {/* 3 Workflow Stage Tabs (Synchronized with Bajaj Underwriting Desk) */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => { setStatusFilter('all'); setPage(1); }}
            className="btn"
            style={{
              padding: '8px 16px',
              borderRadius: 20,
              background: statusFilter === 'all' ? 'var(--accent)' : 'var(--bg-card)',
              color: statusFilter === 'all' ? '#000' : 'var(--text-muted)',
              fontWeight: 800,
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              border: statusFilter === 'all' ? 'none' : '1px solid var(--border)'
            }}
          >
            All Applications
            <span style={{ background: statusFilter === 'all' ? 'rgba(0,0,0,0.15)' : 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 800 }}>
              {stats.total || 0}
            </span>
          </button>

          <button
            onClick={() => { setStatusFilter('NEW'); setPage(1); }}
            className="btn"
            style={{
              padding: '8px 16px',
              borderRadius: 20,
              background: statusFilter === 'NEW' ? '#3b82f6' : 'var(--bg-card)',
              color: statusFilter === 'NEW' ? '#fff' : 'var(--text-muted)',
              fontWeight: 800,
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              border: statusFilter === 'NEW' ? 'none' : '1px solid var(--border)'
            }}
          >
            📝 New
            <span style={{ background: statusFilter === 'NEW' ? 'rgba(255,255,255,0.25)' : 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 800 }}>
              {stats.newCount || 0}
            </span>
          </button>

          <button
            onClick={() => { setStatusFilter('WORK_IN_PROGRESS'); setPage(1); }}
            className="btn"
            style={{
              padding: '8px 16px',
              borderRadius: 20,
              background: statusFilter === 'WORK_IN_PROGRESS' ? '#f59e0b' : 'var(--bg-card)',
              color: statusFilter === 'WORK_IN_PROGRESS' ? '#fff' : 'var(--text-muted)',
              fontWeight: 800,
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              border: statusFilter === 'WORK_IN_PROGRESS' ? 'none' : '1px solid var(--border)'
            }}
          >
            ⏱ Work in Progress
            <span style={{ background: statusFilter === 'WORK_IN_PROGRESS' ? 'rgba(255,255,255,0.25)' : 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 800 }}>
              {stats.workInProgress || 0}
            </span>
          </button>

          <button
            onClick={() => { setStatusFilter('COMPLETED'); setPage(1); }}
            className="btn"
            style={{
              padding: '8px 16px',
              borderRadius: 20,
              background: statusFilter === 'COMPLETED' ? '#10b981' : 'var(--bg-card)',
              color: statusFilter === 'COMPLETED' ? '#fff' : 'var(--text-muted)',
              fontWeight: 800,
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              border: statusFilter === 'COMPLETED' ? 'none' : '1px solid var(--border)'
            }}
          >
            ✅ Completed
            <span style={{ background: statusFilter === 'COMPLETED' ? 'rgba(255,255,255,0.25)' : 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 800 }}>
              {stats.completed || 0}
            </span>
          </button>

          <div style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
            ⚡ Live 2-Way Sync with Bajaj Desk
          </div>
        </div>

        {/* Filter Bar */}
        <div className="card" style={{ padding: '14px 18px', borderRadius: 12, marginBottom: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 280px' }}>
            <RiSearchLine style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by Application ID, Name, Mobile, PAN..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="form-control"
              style={{ paddingLeft: 36, width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, height: 40 }}
            />
          </div>

          {/* Eligibility Filter */}
          <select
            value={eligibilityFilter}
            onChange={(e) => { setEligibilityFilter(e.target.value); setPage(1); }}
            className="form-control"
            style={{ width: 170, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, height: 40 }}
          >
            <option value="all">All Eligibility</option>
            <option value="YES">Eligibility: YES (Approved)</option>
            <option value="NO">Eligibility: NO (Declined)</option>
            <option value="PENDING">Pending Decision</option>
          </select>
        </div>

        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow-sm)' }}>
          <div className="table-responsive" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="table table-sticky-actions" style={{ margin: 0, minWidth: 1200 }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                  <th style={{ minWidth: 180, padding: '14px 16px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>APPLICATION ID</th>
                  <th style={{ minWidth: 220, padding: '14px 16px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>APPLICANT NAME</th>
                  <th style={{ minWidth: 190, padding: '14px 16px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>MOBILE & PAN</th>
                  <th style={{ minWidth: 170, padding: '14px 16px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>MODEL & PRICE</th>
                  <th style={{ minWidth: 180, padding: '14px 16px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>ELIGIBILITY DECISION</th>
                  <th style={{ minWidth: 170, padding: '14px 16px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>WORKFLOW STATUS</th>
                  <th style={{ textAlign: 'center', width: 110, padding: '14px 16px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                      <div className="spinner spinner-md" style={{ margin: '0 auto 12px' }} />
                      Loading loan queue...
                    </td>
                  </tr>
                ) : applications.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
                      <RiBankCardLine size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>No Loan Applications Found</div>
                      <p style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
                        When applicants complete the customer wizard, submissions will sync here in real time.
                      </p>
                    </td>
                  </tr>
                ) : (
                  applications.map(app => {
                    const isYes = app.eligibility === 'YES';
                    const isNo = app.eligibility === 'NO';
                    const cleanPhone = (app.mobileNumber || '').replace(/[^0-9]/g, '');

                    return (
                      <tr
                        key={app.id}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        {/* Application ID */}
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--accent)', fontSize: '0.88rem', letterSpacing: '0.04em' }}>
                            {app.applicationId}
                          </span>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                            <RiCalendarLine style={{ fontSize: '0.75rem' }} />
                            <span>{app.createdAt ? new Date(app.createdAt).toISOString().split('T')[0] : '—'}</span>
                          </div>
                        </td>

                        {/* Applicant Name with Gradient Avatar Chip */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                              width: 38,
                              height: 38,
                              borderRadius: 10,
                              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.22), rgba(16, 185, 129, 0.06))',
                              border: '1.5px solid rgba(16, 185, 129, 0.35)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#10b981',
                              fontWeight: 800,
                              fontSize: '0.92rem',
                              flexShrink: 0
                            }}>
                              {(app.applicantFullName || '?').charAt(0).toUpperCase()}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontWeight: 700,
                                  color: 'var(--text-primary)',
                                  cursor: 'pointer',
                                  fontSize: '0.88rem',
                                  textTransform: 'capitalize',
                                  lineHeight: 1.3,
                                  marginBottom: 3
                                }}
                                onClick={() => setSelectedApp(app)}
                              >
                                {app.applicantFullName}
                              </div>
                              <div style={{
                                fontSize: '0.74rem',
                                color: 'var(--text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                <RiMapPinLine style={{ fontSize: '0.8rem', color: '#10b981', flexShrink: 0 }} />
                                <span>{app.city || 'Chennai'}{app.state ? ` • ${app.state}` : ''}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Mobile & PAN with WhatsApp */}
                        <td style={{ padding: '12px 16px' }}>
                          {app.mobileNumber ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <a
                                href={`tel:${app.mobileNumber}`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  fontSize: '0.85rem',
                                  fontWeight: 700,
                                  color: 'var(--text-primary)',
                                  textDecoration: 'none'
                                }}
                              >
                                <RiPhoneLine style={{ fontSize: '0.85rem', color: '#10b981' }} />
                                {app.mobileNumber}
                              </a>
                              {cleanPhone && (
                                <a
                                  href={`https://wa.me/91${cleanPhone.slice(-10)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Chat on WhatsApp"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 22,
                                    height: 22,
                                    borderRadius: '50%',
                                    background: 'rgba(37, 211, 102, 0.15)',
                                    color: '#25d366',
                                    fontSize: '0.82rem',
                                    textDecoration: 'none',
                                    transition: 'transform 0.15s ease'
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'}
                                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                  <RiWhatsappLine />
                                </a>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                          <div style={{ fontSize: '0.73rem', fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: 2 }}>
                            PAN: {app.panNumber || '—'}
                          </div>
                        </td>

                        {/* Model & Price */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                            {app.vehicleModel || 'Bajaj RE Compact EV'}
                          </div>
                          {app.onRoadPrice ? (
                            <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700, marginTop: 2 }}>
                              ₹ {parseFloat(app.onRoadPrice).toLocaleString('en-IN')}
                            </div>
                          ) : null}
                        </td>

                        {/* Eligibility Decision */}
                        <td style={{ padding: '12px 16px' }}>
                          {isYes ? (
                            <span className="badge badge-success" style={{ fontWeight: 800, padding: '4px 10px', fontSize: '0.78rem', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              ✓ Eligibility: YES
                            </span>
                          ) : isNo ? (
                            <span className="badge badge-danger" style={{ fontWeight: 800, padding: '4px 10px', fontSize: '0.78rem', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              ✕ Eligibility: NO
                            </span>
                          ) : (
                            <span className="badge badge-warning" style={{ fontWeight: 700, padding: '4px 10px', fontSize: '0.78rem', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              ⏳ Pending Decision
                            </span>
                          )}
                          {app.underwriterName && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                              By: {app.underwriterName}
                            </div>
                          )}
                        </td>

                        {/* Workflow Status */}
                        <td style={{ padding: '12px 16px' }}>
                          <span className={`badge ${app.status === 'COMPLETED' ? 'badge-info' : (app.status === 'WORK_IN_PROGRESS' ? 'badge-warning' : 'badge-secondary')}`} style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px', borderRadius: 6 }}>
                            {app.status === 'WORK_IN_PROGRESS' ? '⏳ In Review' : (app.status === 'COMPLETED' ? '✓ Decision Saved' : 'New Queue')}
                          </span>
                          {app.status === 'WORK_IN_PROGRESS' && app.underwriterName && (
                            <div style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span>🔒</span>
                              <span>Review by: <strong>{app.underwriterName}</strong></span>
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: 'center', padding: '10px 14px' }}>
                          <div style={{ display: 'inline-flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                            <button
                              type="button"
                              className="action-btn action-btn-view"
                              title="Review / View Application"
                              onClick={() => setSelectedApp(app)}
                            >
                              <RiEyeLine />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > limit && (
            <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)' }}>
              <PaginationBar
                page={page}
                setPage={setPage}
                total={total}
                limit={limit}
                setLimit={setLimit}
                label="Loan Applications"
              />
            </div>
          )}
        </div>

        {/* Detail & Decision Modal */}
        {selectedApp && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div className="card" style={{ width: '100%', maxWidth: 650, borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', padding: 24, maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-xl)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>{selectedApp.applicantFullName}</h3>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--accent)' }}>{selectedApp.applicationId}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Bajaj Auto Finance Underwriting Review
                  </div>
                  {selectedApp.status === 'WORK_IN_PROGRESS' && selectedApp.underwriterName && (
                    <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px', borderRadius: 6, background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontSize: '0.75rem', fontWeight: 700 }}>
                      🔒 Currently in review by: {selectedApp.underwriterName}
                    </div>
                  )}
                </div>
                <button onClick={() => setSelectedApp(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <RiCloseLine size={24} />
                </button>
              </div>

              {/* Quick Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 18 }}>
                <div style={{ background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: 10 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>MOBILE NUMBER</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: 4 }}>{selectedApp.mobileNumber}</div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: 10 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>PAN NUMBER</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: 4, fontFamily: 'monospace' }}>{selectedApp.panNumber || '—'}</div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: 10 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>VEHICLE MODEL</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: 4 }}>{selectedApp.vehicleModel || 'Bajaj RE Compact EV'}</div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: 10 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>ON-ROAD VALUATION</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#10b981', marginTop: 4 }}>
                    ₹ {selectedApp.onRoadPrice ? parseFloat(selectedApp.onRoadPrice).toLocaleString('en-IN') : '2,60,000'}
                  </div>
                </div>
              </div>

              {/* Workflow Stage Controls */}
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                    Workflow Stage Transition
                  </div>
                  <span className="badge badge-info" style={{ fontWeight: 800, fontSize: '0.75rem' }}>
                    CURRENT: {selectedApp.status || 'NEW'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    disabled={updating || selectedApp.status === 'NEW'}
                    onClick={() => handleUpdateStatus(selectedApp.id, 'NEW')}
                    className="btn"
                    style={{
                      flex: 1,
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      background: selectedApp.status === 'NEW' ? '#3b82f6' : 'var(--bg-card)',
                      color: selectedApp.status === 'NEW' ? '#fff' : 'var(--text-primary)',
                      border: '1px solid var(--border)'
                    }}
                  >
                    📝 Move to New
                  </button>

                  <button
                    disabled={updating || selectedApp.status === 'WORK_IN_PROGRESS'}
                    onClick={() => handleUpdateStatus(selectedApp.id, 'WORK_IN_PROGRESS')}
                    className="btn"
                    style={{
                      flex: 1,
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      background: selectedApp.status === 'WORK_IN_PROGRESS' ? '#f59e0b' : 'var(--bg-card)',
                      color: selectedApp.status === 'WORK_IN_PROGRESS' ? '#fff' : 'var(--text-primary)',
                      border: '1px solid var(--border)'
                    }}
                  >
                    ⏱ Move to WIP
                  </button>

                  <button
                    disabled={updating || selectedApp.status === 'COMPLETED'}
                    onClick={() => handleUpdateStatus(selectedApp.id, 'COMPLETED')}
                    className="btn"
                    style={{
                      flex: 1,
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      background: selectedApp.status === 'COMPLETED' ? '#10b981' : 'var(--bg-card)',
                      color: selectedApp.status === 'COMPLETED' ? '#fff' : 'var(--text-primary)',
                      border: '1px solid var(--border)'
                    }}
                  >
                    ✅ Mark Completed
                  </button>
                </div>
              </div>

              {/* Eligibility Decision Box */}
              <div style={{ background: 'rgba(0, 230, 153, 0.05)', border: '1px solid var(--border)', borderRadius: 12, padding: 18, marginBottom: 20 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', marginBottom: 10 }}>
                  Underwriter Eligibility Decision
                </div>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    disabled={updating}
                    onClick={() => handleUpdateEligibility(selectedApp.id, 'YES')}
                    className={`btn ${selectedApp.eligibility === 'YES' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 700 }}
                  >
                    <RiCheckLine size={18} /> Approve (Eligibility: YES)
                  </button>

                  <button
                    disabled={updating}
                    onClick={() => handleUpdateEligibility(selectedApp.id, 'NO')}
                    className="btn btn-secondary"
                    style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)', fontWeight: 700 }}
                  >
                    <RiCloseLine size={18} /> Decline (Eligibility: NO)
                  </button>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.5 }}>
                  💡 <strong>Rule:</strong> Setting Eligibility to <strong>YES</strong> automatically matches this applicant by phone in CRM Leads, upgrades status to <strong>"Invested"</strong>, and transfers them into the <strong>Fleet Partners Directory</strong>.
                </div>
              </div>

              {/* Form Data Snapshot */}
              {selectedApp.formData && Object.keys(selectedApp.formData).length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                    Full Customer Form Submission Snapshot
                  </div>
                  <pre style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, fontSize: '0.75rem', color: 'var(--text-primary)', overflowX: 'auto', maxHeight: 200 }}>
                    {JSON.stringify(selectedApp.formData, null, 2)}
                  </pre>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button onClick={() => setSelectedApp(null)} className="btn btn-secondary">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default LoanApplicationsPage;
