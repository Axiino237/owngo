import { useState, useEffect, useCallback } from 'react';
import {
  RiSettings4Line, RiAddLine, RiEditLine, RiDeleteBinLine,
  RiRefreshLine, RiCloseLine, RiCheckLine, RiBuilding2Line,
  RiSteering2Line, RiPaletteLine, RiShieldStarLine
} from 'react-icons/ri';
import AppLayout from '../../components/AppLayout';
import ConfirmModal from '../../components/ConfirmModal';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const COLOR_PRESETS = [
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Purple', hex: '#8b5cf6' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Red', hex: '#ef4444' },
  { name: 'Slate', hex: '#64748b' }
];

const StatusModal = ({ isOpen, onClose, onSaved, statusItem, endpoint, title }) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#10b981');
  const [order, setOrder] = useState(0);
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (statusItem) {
      setName(statusItem.name || '');
      setColor(statusItem.color || '#10b981');
      setOrder(statusItem.order || 0);
      setIsDefault(Boolean(statusItem.isDefault));
      setIsActive(statusItem.isActive !== undefined ? Boolean(statusItem.isActive) : true);
    } else {
      setName('');
      setColor('#10b981');
      setOrder(0);
      setIsDefault(false);
      setIsActive(true);
    }
  }, [statusItem, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Status name is required');
      return;
    }

    setSaving(true);
    try {
      if (statusItem) {
        await api.put(`${endpoint}/${statusItem.id}`, {
          name: name.trim(),
          color,
          order: parseInt(order, 10) || 0,
          isDefault,
          isActive
        });
        toast.success('Status updated successfully');
      } else {
        await api.post(endpoint, {
          name: name.trim(),
          color,
          order: parseInt(order, 10) || 0,
          isDefault
        });
        toast.success('Status created successfully');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save status');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal modal-md">
        <div className="modal-header">
          <h2 className="modal-title">
            {statusItem ? `Edit ${title} Status` : `Add New ${title} Status`}
          </h2>
          <button className="modal-close" onClick={onClose}><RiCloseLine /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 24px' }}>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Status Name *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Requirement Received, Interview Scheduled"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          {/* Color Picker & Presets */}
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Badge Theme Color</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                style={{ width: 44, height: 40, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 6 }}
              />
              <input
                type="text"
                className="form-control"
                value={color}
                onChange={e => setColor(e.target.value)}
                style={{ width: 120, fontFamily: 'monospace' }}
              />
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 12px',
                  borderRadius: 20,
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  backgroundColor: `${color}1a`,
                  color: color,
                  border: `1px solid ${color}40`
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: color }} />
                {name || 'Preview Badge'}
              </span>
            </div>

            {/* Color Presets */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {COLOR_PRESETS.map(p => (
                <button
                  type="button"
                  key={p.hex}
                  onClick={() => setColor(p.hex)}
                  title={p.name}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    backgroundColor: p.hex,
                    border: color === p.hex ? '2px solid #fff' : '2px solid transparent',
                    boxShadow: color === p.hex ? `0 0 0 2px ${p.hex}` : 'none',
                    cursor: 'pointer'
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Display Order Priority</label>
              <input
                type="number"
                className="form-control"
                value={order}
                onChange={e => setOrder(e.target.value)}
                min="0"
              />
            </div>

            {statusItem && (
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Active Status</label>
                <select
                  className="form-control"
                  value={isActive ? 'active' : 'inactive'}
                  onChange={e => setIsActive(e.target.value === 'active')}
                >
                  <option value="active">Active (Visible in Dropdowns)</option>
                  <option value="inactive">Inactive (Archived)</option>
                </select>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 20, background: 'var(--bg-secondary)', padding: 12, borderRadius: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={isDefault}
                onChange={e => setIsDefault(e.target.checked)}
              />
              <span>Set as Default Status for new incoming applications</span>
            </label>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 24, marginTop: 4 }}>
              When website forms or bulk uploads create new leads without a status, this status will be automatically assigned.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : (statusItem ? 'Update Status' : 'Create Status')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const StatusMasterPage = () => {
  const [activeTab, setActiveTab] = useState('partners'); // 'partners' | 'pilots'

  const [partnerStatuses, setPartnerStatuses] = useState([]);
  const [pilotStatuses, setPilotStatuses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalItem, setModalItem] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, item: null });

  // Fetch Partner Statuses
  const fetchPartnerStatuses = useCallback(async () => {
    try {
      const res = await api.get('/lead-statuses?activeOnly=false');
      if (res.data?.statuses && Array.isArray(res.data.statuses)) {
        setPartnerStatuses(res.data.statuses);
      }
    } catch (e) {
      toast.error('Failed to load Fleet Partner statuses');
    }
  }, []);

  // Fetch Pilot Statuses
  const fetchPilotStatuses = useCallback(async () => {
    try {
      const res = await api.get('/job-request-statuses?activeOnly=false');
      if (res.data?.statuses && Array.isArray(res.data.statuses)) {
        setPilotStatuses(res.data.statuses);
      }
    } catch (e) {
      toast.error('Failed to load EV Pilot statuses');
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchPartnerStatuses(), fetchPilotStatuses()]);
    setLoading(false);
  }, [fetchPartnerStatuses, fetchPilotStatuses]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Delete
  const handleDeleteStatus = async (item) => {
    const endpoint = activeTab === 'partners' ? '/lead-statuses' : '/job-request-statuses';
    try {
      const res = await api.delete(`${endpoint}/${item.id}`);
      toast.success(res.data?.message || 'Status removed successfully');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete status');
    } finally {
      setDeleteConfirm({ open: false, item: null });
    }
  };

  const currentList = activeTab === 'partners' ? partnerStatuses : pilotStatuses;
  const currentTitle = activeTab === 'partners' ? 'Lead' : 'EV Pilot Job Request';
  const currentEndpoint = activeTab === 'partners' ? '/lead-statuses' : '/job-request-statuses';

  return (
    <AppLayout>
      <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 50 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', fontSize: '1.4rem' }}>
              <RiSettings4Line />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Status Master Management (UAM)
              </h1>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Customize and reorder workflow pipelines for Leads & EV Pilot Driver applications
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline" onClick={loadData}>
              <RiRefreshLine /> Refresh
            </button>
            <button className="btn btn-primary" onClick={() => { setModalItem(null); setShowModal(true); }}>
              <RiAddLine /> Add {currentTitle} Status
            </button>
          </div>
        </div>

        {/* Master Table Tabs */}
        <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
          <button
            type="button"
            onClick={() => setActiveTab('partners')}
            style={{
              padding: '12px 20px',
              borderBottom: activeTab === 'partners' ? '3px solid #10b981' : '3px solid transparent',
              color: activeTab === 'partners' ? '#10b981' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.95rem',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s'
            }}
          >
            <RiBuilding2Line /> Lead Statuses ({partnerStatuses.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pilots')}
            style={{
              padding: '12px 20px',
              borderBottom: activeTab === 'pilots' ? '3px solid #06b6d4' : '3px solid transparent',
              color: activeTab === 'pilots' ? '#06b6d4' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.95rem',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s'
            }}
          >
            <RiSteering2Line /> EV Pilot Driver Statuses ({pilotStatuses.length})
          </button>
        </div>

        {/* Table Card */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div className="table-responsive">
            <table className="table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: 80, paddingLeft: 20 }}>ORDER</th>
                  <th>STATUS NAME & BADGE</th>
                  <th>KEY (SLUG)</th>
                  <th>LINKED RECORDS</th>
                  <th>DEFAULT STATUS</th>
                  <th>STATE</th>
                  <th style={{ textAlign: 'right', paddingRight: 20 }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                      <div className="spinner spinner-md" style={{ margin: '0 auto 10px' }} />
                      Loading status master data...
                    </td>
                  </tr>
                ) : currentList.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                      No statuses found. Click "Add Status" to create one.
                    </td>
                  </tr>
                ) : (
                  currentList.map(item => {
                    const count = activeTab === 'partners' ? (item.leadCount || 0) : (item.jobRequestCount || 0);
                    return (
                      <tr key={item.id}>
                        <td style={{ paddingLeft: 20, fontWeight: 700, color: 'var(--text-muted)' }}>
                          #{item.order}
                        </td>

                        {/* Status Name & Badge */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '4px 12px',
                                borderRadius: 20,
                                fontSize: '0.8125rem',
                                fontWeight: 700,
                                backgroundColor: `${item.color}1a`,
                                color: item.color,
                                border: `1px solid ${item.color}40`
                              }}
                            >
                              <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: item.color }} />
                              {item.name}
                            </span>
                          </div>
                        </td>

                        {/* Key */}
                        <td>
                          <code style={{ fontSize: '0.8rem', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: 4 }}>
                            {item.key}
                          </code>
                        </td>

                        {/* Linked Records Count */}
                        <td>
                          <span style={{ fontWeight: 700, color: count > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                            {count} {activeTab === 'partners' ? 'Leads' : 'Candidates'}
                          </span>
                        </td>

                        {/* Default Indicator */}
                        <td>
                          {item.isDefault ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#10b981', fontSize: '0.8rem', fontWeight: 700 }}>
                              <RiShieldStarLine /> Default Intake
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                          )}
                        </td>

                        {/* Active / Inactive */}
                        <td>
                          {item.isActive ? (
                            <span className="badge badge-success" style={{ fontSize: '0.725rem' }}>Active</span>
                          ) : (
                            <span className="badge badge-secondary" style={{ fontSize: '0.725rem' }}>Inactive</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: 'right', paddingRight: 20 }}>
                          <div style={{ display: 'inline-flex', gap: 8 }}>
                            <button
                              className="btn btn-icon btn-sm"
                              title="Edit Status"
                              onClick={() => { setModalItem(item); setShowModal(true); }}
                            >
                              <RiEditLine />
                            </button>
                            <button
                              className="btn btn-icon btn-sm btn-danger-icon"
                              title="Delete / Deactivate Status"
                              onClick={() => setDeleteConfirm({ open: true, item })}
                            >
                              <RiDeleteBinLine />
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
        </div>

        {/* Status Add/Edit Modal */}
        <StatusModal
          isOpen={showModal}
          onClose={() => { setShowModal(false); setModalItem(null); }}
          onSaved={loadData}
          statusItem={modalItem}
          endpoint={currentEndpoint}
          title={currentTitle}
        />

        {/* Delete Confirmation */}
        <ConfirmModal
          isOpen={deleteConfirm.open}
          title={`Delete ${deleteConfirm.item?.name}?`}
          message={
            (activeTab === 'partners' ? deleteConfirm.item?.leadCount : deleteConfirm.item?.jobRequestCount) > 0
              ? `There are active records using "${deleteConfirm.item?.name}". Deleting will safely mark this status as inactive without breaking existing records.`
              : `Are you sure you want to permanently delete "${deleteConfirm.item?.name}"?`
          }
          confirmLabel="Delete Status"
          confirmVariant="danger"
          onConfirm={() => handleDeleteStatus(deleteConfirm.item)}
          onCancel={() => setDeleteConfirm({ open: false, item: null })}
        />
      </div>
    </AppLayout>
  );
};

export default StatusMasterPage;
