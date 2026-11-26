import { useState, useEffect, useCallback } from 'react';
import {
  RiUserHeartLine, RiSearchLine, RiRefreshLine, RiDownloadLine,
  RiMoneyDollarCircleLine, RiCarLine, RiShieldCheckLine, RiEyeLine,
  RiAddLine, RiCloseLine, RiSaveLine, RiMapPinLine, RiPhoneLine, RiMailLine, RiWhatsappLine
} from 'react-icons/ri';
import AppLayout from '../../components/AppLayout';
import PaginationBar from '../../components/PaginationBar';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const PartnersPage = () => {
  const [partners, setPartners] = useState([]);
  const [stats, setStats] = useState({ totalPartners: 0, totalAutos: 0, totalCapital: 0, activePartners: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [total, setTotal] = useState(0);

  // Modals
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', phone: '', email: '', city: 'Chennai', autosCount: 1, notes: '' });
  const [saving, setSaving] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await api.get('/partners/stats');
      if (res.data?.success) {
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error('Error fetching partner stats:', err);
    }
  };

  const fetchPartners = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit, search: search.trim() };
      const res = await api.get('/partners', { params });
      if (res.data?.success) {
        setPartners(res.data.partners || []);
        setTotal(res.data.total || 0);
      }
    } catch (err) {
      console.error('Error fetching partners:', err);
      toast.error('Failed to load fleet partners');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => {
    fetchStats();
    fetchPartners();
  }, [fetchPartners]);

  const handleExport = async () => {
    try {
      toast.loading('Exporting Fleet Partners...', { id: 'partner-export' });
      const res = await api.get('/partners?export=true', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `fleet_partners_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Partners CSV downloaded successfully', { id: 'partner-export' });
    } catch (err) {
      toast.error('Failed to export partners CSV', { id: 'partner-export' });
    }
  };

  const handleCreatePartner = async (e) => {
    e.preventDefault();
    if (!newForm.name || !newForm.phone) {
      return toast.error('Partner Name and Phone are required');
    }
    try {
      setSaving(true);
      const res = await api.post('/partners', newForm);
      if (res.data?.success) {
        toast.success('Fleet Partner onboarded successfully!');
        setShowAddModal(false);
        setNewForm({ name: '', phone: '', email: '', city: 'Chennai', autosCount: 1, notes: '' });
        fetchStats();
        fetchPartners();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create partner');
    } finally {
      setSaving(false);
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
                🤝 Fleet Partners Directory
              </h1>
              <span className="badge badge-success" style={{ fontWeight: 700, fontSize: '0.8rem', padding: '4px 10px' }}>
                INVESTED PORTFOLIO
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Verified investor partners who have successfully funded commercial EV auto fleets
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
              onClick={() => setShowAddModal(true)}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
            >
              <RiAddLine /> Add Fleet Partner
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div className="card" style={{ padding: '18px 20px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Partners</span>
              <div style={{ background: 'rgba(0, 230, 153, 0.12)', color: 'var(--accent)', borderRadius: 8, padding: 6 }}><RiUserHeartLine size={20} /></div>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>{stats.totalPartners}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Active fleet investors</div>
          </div>

          <div className="card" style={{ padding: '18px 20px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fleet Auto Units</span>
              <div style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', borderRadius: 8, padding: 6 }}><RiCarLine size={20} /></div>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#38bdf8' }}>{stats.totalAutos} <span style={{ fontSize: '1rem', fontWeight: 600 }}>Autos</span></div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Funded EV 3-Wheelers</div>
          </div>

          <div className="card" style={{ padding: '18px 20px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Capital Committed</span>
              <div style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', borderRadius: 8, padding: 6 }}><RiMoneyDollarCircleLine size={20} /></div>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981' }}>₹ {(stats.totalCapital || 0).toLocaleString('en-IN')}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Total deployed partner capital</div>
          </div>

          <div className="card" style={{ padding: '18px 20px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Financing Verified</span>
              <div style={{ background: 'rgba(168, 85, 247, 0.12)', color: '#a855f7', borderRadius: 8, padding: 6 }}><RiShieldCheckLine size={20} /></div>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#a855f7' }}>100%</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Bajaj Auto Finance verified</div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="card" style={{ padding: '14px 18px', borderRadius: 12, marginBottom: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 300px' }}>
            <RiSearchLine style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search partner by name, phone, city..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="form-control"
              style={{ paddingLeft: 36, width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, height: 40 }}
            />
          </div>

          <button
            onClick={() => { fetchStats(); fetchPartners(); }}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <RiRefreshLine /> Refresh
          </button>
        </div>

        {/* Partners Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow-sm)' }}>
          <div className="table-responsive" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="table table-sticky-actions" style={{ margin: 0, minWidth: 1050 }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                  <th style={{ minWidth: 220, padding: '14px 16px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>PARTNER / INVESTOR</th>
                  <th style={{ minWidth: 180, padding: '14px 16px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>CONTACT INFO</th>
                  <th style={{ minWidth: 150, padding: '14px 16px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>INVESTED FLEET</th>
                  <th style={{ minWidth: 150, padding: '14px 16px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>TOTAL CAPITAL</th>
                  <th style={{ minWidth: 180, padding: '14px 16px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>FINANCE REF (BAJAJ)</th>
                  <th style={{ minWidth: 140, padding: '14px 16px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>STATUS</th>
                  <th style={{ textAlign: 'center', width: 110, padding: '14px 16px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                      <div className="spinner spinner-md" style={{ margin: '0 auto 12px' }} />
                      Loading fleet partners...
                    </td>
                  </tr>
                ) : partners.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
                      <RiUserHeartLine size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>No Invested Partners Found</div>
                      <p style={{ margin: '4px 0 16px', fontSize: '0.85rem' }}>
                        Leads whose loan applications are approved with "Eligibility: YES" will automatically appear here.
                      </p>
                      <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm">
                        + Add First Partner
                      </button>
                    </td>
                  </tr>
                ) : (
                  partners.map(p => {
                    const capital = (p.autosCount || 1) * 100000;
                    const cleanPhone = (p.phone || '').replace(/[^0-9]/g, '');

                    return (
                      <tr
                        key={p.id}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        {/* Partner / Investor with Gradient Avatar Chip */}
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
                              {(p.name || '?').charAt(0).toUpperCase()}
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
                                onClick={() => setSelectedPartner(p)}
                              >
                                {p.name}
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
                                <span>{p.city || 'Chennai'}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Contact Info with WhatsApp */}
                        <td style={{ padding: '12px 16px' }}>
                          {p.phone ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <a
                                href={`tel:${p.phone}`}
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
                                {p.phone}
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
                          {p.email && (
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                              <RiMailLine style={{ fontSize: '0.75rem' }} />
                              {p.email}
                            </div>
                          )}
                        </td>

                        {/* Invested Fleet */}
                        <td style={{ padding: '12px 16px' }}>
                          <span className="badge badge-info" style={{ fontWeight: 700, padding: '4px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 6 }}>
                            🛺 {p.autosCount || 1} {p.autosCount === 1 ? 'Auto' : 'Autos'}
                          </span>
                        </td>

                        {/* Total Capital */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 800, color: '#10b981', fontSize: '0.92rem' }}>
                            ₹ {capital.toLocaleString('en-IN')}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>₹1,00,000 / Auto</div>
                        </td>

                        {/* Finance Ref (Bajaj) */}
                        <td style={{ padding: '12px 16px' }}>
                          {p.loanApplication ? (
                            <div>
                              <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--accent)', fontSize: '0.82rem', letterSpacing: '0.03em' }}>
                                {p.loanApplication.applicationId}
                              </span>
                              <div style={{ marginTop: 3 }}>
                                <span className={`badge ${p.loanApplication.eligibility === 'YES' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: 4 }}>
                                  ✓ Eligibility: {p.loanApplication.eligibility}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Direct Investor</span>
                          )}
                        </td>

                        {/* Status */}
                        <td style={{ padding: '12px 16px' }}>
                          <span className="badge badge-success" style={{ fontWeight: 700, padding: '4px 10px', fontSize: '0.75rem', letterSpacing: '0.03em', display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 6 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                            INVESTED
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: 'center', padding: '10px 14px' }}>
                          <div style={{ display: 'inline-flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                            <button
                              type="button"
                              className="action-btn action-btn-view"
                              title="View Details"
                              onClick={() => setSelectedPartner(p)}
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
                label="Fleet Partners"
              />
            </div>
          )}
        </div>

        {/* Add Partner Modal */}
        {showAddModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div className="card" style={{ width: '100%', maxWidth: 500, borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', padding: 24, boxShadow: 'var(--shadow-xl)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>🤝 Onboard Fleet Partner</h3>
                <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <RiCloseLine size={24} />
                </button>
              </div>

              <form onSubmit={handleCreatePartner}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Partner Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newForm.name}
                    onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                    className="form-control"
                    placeholder="e.g. Ramesh Kumar"
                    style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}
                  />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={newForm.phone}
                    onChange={(e) => setNewForm({ ...newForm, phone: e.target.value })}
                    className="form-control"
                    placeholder="10-digit mobile number"
                    style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>City</label>
                    <input
                      type="text"
                      value={newForm.city}
                      onChange={(e) => setNewForm({ ...newForm, city: e.target.value })}
                      className="form-control"
                      placeholder="Chennai"
                      style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Invested Autos Count</label>
                    <input
                      type="number"
                      min="1"
                      value={newForm.autosCount}
                      onChange={(e) => setNewForm({ ...newForm, autosCount: e.target.value })}
                      className="form-control"
                      style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Notes & Agreement Remarks</label>
                  <textarea
                    rows={3}
                    value={newForm.notes}
                    onChange={(e) => setNewForm({ ...newForm, notes: e.target.value })}
                    className="form-control"
                    placeholder="Fleet investment agreement details..."
                    style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <RiSaveLine /> {saving ? 'Saving...' : 'Confirm Onboarding'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Partner Details Modal */}
        {selectedPartner && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div className="card" style={{ width: '100%', maxWidth: 560, borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', padding: 24, boxShadow: 'var(--shadow-xl)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>{selectedPartner.name}</h3>
                  <span className="badge badge-success">INVESTED PARTNER</span>
                </div>
                <button onClick={() => setSelectedPartner(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <RiCloseLine size={24} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
                <div style={{ background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: 10 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>PHONE NUMBER</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: 4 }}>{selectedPartner.phone}</div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: 10 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>CITY / LOCATION</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: 4 }}>{selectedPartner.city || 'Chennai'}</div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: 10 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>INVESTED FLEET</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8', marginTop: 4 }}>
                    🛺 {selectedPartner.autosCount || 1} Autos
                  </div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: 10 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>CAPITAL INVESTED</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981', marginTop: 4 }}>
                    ₹ {((selectedPartner.autosCount || 1) * 100000).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {selectedPartner.loanApplication && (
                <div style={{ background: 'rgba(0, 230, 153, 0.06)', border: '1px solid rgba(0, 230, 153, 0.2)', padding: 14, borderRadius: 10, marginBottom: 18 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 4 }}>
                    BAJAJ AUTO FINANCE VERIFICATION
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span>Loan App ID: <strong>{selectedPartner.loanApplication.applicationId}</strong></span>
                    <span className="badge badge-success">Eligibility: {selectedPartner.loanApplication.eligibility}</span>
                  </div>
                  {selectedPartner.loanApplication.vehicleModel && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      Vehicle Model: {selectedPartner.loanApplication.vehicleModel}
                    </div>
                  )}
                </div>
              )}

              {selectedPartner.notes && (
                <div style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 10, marginBottom: 18, fontSize: '0.85rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 4 }}>REMARKS / NOTES</div>
                  {selectedPartner.notes}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setSelectedPartner(null)} className="btn btn-secondary">
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

export default PartnersPage;
