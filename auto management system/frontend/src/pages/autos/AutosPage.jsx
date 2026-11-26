import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  RiCarLine, RiAddLine, RiSearchLine, RiAlertLine, RiCheckboxCircleLine,
  RiTimeLine, RiBatteryChargeLine, RiChargingPile2Line, RiRefreshLine,
  RiEditLine, RiDeleteBinLine, RiUserSharedLine, RiCloseLine, RiSaveLine,
  RiSpeedUpLine, RiUser3Line, RiErrorWarningLine, RiFilterLine
} from 'react-icons/ri';
import AppLayout from '../../components/AppLayout';
import ConfirmModal from '../../components/ConfirmModal';
import PaginationBar from '../../components/PaginationBar';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const EMPTY_AUTO_FORM = {
  autoNumber: '',
  vehicleType: 'EV Auto',
  make: '',
  model: '',
  manufacturingYear: new Date().getFullYear(),
  chassisNumber: '',
  motorNumber: '',
  batteryCapacityKwh: '',
  batteryType: 'Lithium-ion',
  batterySerialNumber: '',
  rangePerChargeKm: '',
  status: 'active',
  fitnessExpiryDate: '',
  insuranceExpiryDate: '',
  insurancePolicyNumber: '',
  insuranceProvider: '',
  permitExpiryDate: '',
  permitNumber: '',
  rcExpiryDate: '',
  pucExpiryDate: '',
  batteryWarrantyExpiryDate: '',
  roadTaxExpiryDate: '',
  remarks: ''
};

export default function AutosPage() {
  const [autos, setAutos] = useState([]);
  const [stats, setStats] = useState(null);
  const [urgentAlerts, setUrgentAlerts] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Common Search & Filters
  const [search, setSearch] = useState('');
  const [complianceFilter, setComplianceFilter] = useState('all'); // all | expired | expiring_soon | valid
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  // Modals
  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit' | 'assign' | null
  const [formData, setFormData] = useState(EMPTY_AUTO_FORM);
  const [selectedAuto, setSelectedAuto] = useState(null);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [autoToDelete, setAutoToDelete] = useState(null);

  // Fetch Autos, Stats, and Drivers
  const fetchFleetData = useCallback(async () => {
    try {
      setLoading(true);
      const [autosRes, statsRes, alertsRes, driversRes] = await Promise.all([
        api.get('/autos', {
          params: {
            search,
            status: statusFilter,
            compliance: complianceFilter,
            page,
            limit
          }
        }),
        api.get('/autos/stats'),
        api.get('/autos/alerts/urgent'),
        api.get('/drivers', { params: { limit: 100 } })
      ]);

      if (autosRes.data.success) {
        setAutos(autosRes.data.autos || []);
        setTotal(autosRes.data.total || 0);
      }
      if (statsRes.data.success) {
        setStats(statsRes.data.stats || null);
      }
      if (alertsRes.data.success) {
        setUrgentAlerts(alertsRes.data.alerts || []);
      }
      if (driversRes.data.success) {
        setDrivers(driversRes.data.drivers || []);
      }
    } catch (err) {
      console.error('Failed to load fleet data:', err);
      toast.error('Failed to load EV Auto fleet data');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, complianceFilter, page, limit]);

  useEffect(() => {
    fetchFleetData();
  }, [fetchFleetData]);

  // Form input handler
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Open Add Modal
  const openAddModal = () => {
    setFormData(EMPTY_AUTO_FORM);
    setModalMode('add');
    setSelectedAuto(null);
  };

  // Open Edit Modal
  const openEditModal = (auto) => {
    setSelectedAuto(auto);
    setFormData({
      autoNumber: auto.autoNumber || '',
      vehicleType: auto.vehicleType || 'EV Auto',
      make: auto.make || '',
      model: auto.model || '',
      manufacturingYear: auto.manufacturingYear || new Date().getFullYear(),
      chassisNumber: auto.chassisNumber || '',
      motorNumber: auto.motorNumber || '',
      batteryCapacityKwh: auto.batteryCapacityKwh || '',
      batteryType: auto.batteryType || 'Lithium-ion',
      batterySerialNumber: auto.batterySerialNumber || '',
      rangePerChargeKm: auto.rangePerChargeKm || '',
      status: auto.status || 'active',
      fitnessExpiryDate: auto.fitnessExpiryDate || '',
      insuranceExpiryDate: auto.insuranceExpiryDate || '',
      insurancePolicyNumber: auto.insurancePolicyNumber || '',
      insuranceProvider: auto.insuranceProvider || '',
      permitExpiryDate: auto.permitExpiryDate || '',
      permitNumber: auto.permitNumber || '',
      rcExpiryDate: auto.rcExpiryDate || '',
      pucExpiryDate: auto.pucExpiryDate || '',
      batteryWarrantyExpiryDate: auto.batteryWarrantyExpiryDate || '',
      roadTaxExpiryDate: auto.roadTaxExpiryDate || '',
      remarks: auto.remarks || ''
    });
    setModalMode('edit');
  };

  // Open Quick Assign Driver Modal
  const openAssignModal = (auto) => {
    setSelectedAuto(auto);
    setSelectedDriverId(auto.assignedDriverId || '');
    setModalMode('assign');
  };

  // Close Any Modal
  const closeModal = () => {
    setModalMode(null);
    setSelectedAuto(null);
    setSelectedDriverId('');
  };

  // Save Auto (Create or Edit)
  const handleSubmitAuto = async (e) => {
    e.preventDefault();
    if (!formData.autoNumber.trim()) {
      toast.error('Registration / Auto Number is required');
      return;
    }

    try {
      setSaving(true);
      if (modalMode === 'add') {
        const res = await api.post('/autos', formData);
        if (res.data.success) {
          toast.success(`EV Auto ${formData.autoNumber} added successfully!`);
          closeModal();
          fetchFleetData();
        }
      } else if (modalMode === 'edit') {
        const res = await api.put(`/autos/${selectedAuto.id}`, formData);
        if (res.data.success) {
          toast.success(`EV Auto ${formData.autoNumber} updated!`);
          closeModal();
          fetchFleetData();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save EV Auto');
    } finally {
      setSaving(false);
    }
  };

  // Assign Driver Submit
  const handleAssignDriver = async (e) => {
    e.preventDefault();
    if (!selectedAuto) return;

    try {
      setSaving(true);
      const res = await api.post(`/autos/${selectedAuto.id}/assign-driver`, {
        driverId: selectedDriverId || null
      });

      if (res.data.success) {
        if (res.data.warning) {
          toast((t) => (
            <div>
              <div style={{ fontWeight: 700, color: '#f59e0b', marginBottom: 4 }}>Compliance Notice</div>
              <div style={{ fontSize: '0.85rem' }}>{res.data.warning}</div>
            </div>
          ), { icon: '⚠️', duration: 6000 });
        } else {
          toast.success(res.data.message || 'Driver assignment updated!');
        }
        closeModal();
        fetchFleetData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign driver');
    } finally {
      setSaving(false);
    }
  };

  // Delete Auto
  const handleDeleteConfirm = async () => {
    if (!autoToDelete) return;
    try {
      const res = await api.delete(`/autos/${autoToDelete.id}`);
      if (res.data.success) {
        toast.success(`Auto ${autoToDelete.autoNumber} deleted`);
        setDeleteModalOpen(false);
        setAutoToDelete(null);
        fetchFleetData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete auto');
    }
  };

  // Helper: Render Expiry Chip
  const renderExpiryChip = (docName, docAlert) => {
    if (!docAlert || !docAlert.date) {
      return (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {docName}: <span style={{ opacity: 0.6 }}>Not Set</span>
        </div>
      );
    }

    if (docAlert.status === 'expired') {
      return (
        <div>
          <span className="badge badge-danger" title={`Expired on ${docAlert.date}`}>
            🚨 {docName} ({Math.abs(docAlert.days)}d ago)
          </span>
        </div>
      );
    }

    if (docAlert.status === 'expiring_soon') {
      return (
        <div>
          <span className="badge badge-warning" title={`Expires on ${docAlert.date}`}>
            ⚠️ {docName} ({docAlert.days}d left)
          </span>
        </div>
      );
    }

    return (
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <span style={{ color: 'var(--success)', fontWeight: 600 }}>✓ {docName}:</span> {docAlert.days}d
      </div>
    );
  };

  const selectedDriverObj = useMemo(() => {
    if (!selectedDriverId) return null;
    return drivers.find(d => d.id === selectedDriverId);
  }, [selectedDriverId, drivers]);

  return (
    <AppLayout title="EV Auto Fleet Management">
      <div className="page-wrapper">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">
              <RiCarLine style={{ color: 'var(--accent)' }} />
              EV Auto Fleet
            </h1>
            <p className="page-subtitle">Manage electric autos, battery specs, driver duty, and statutory compliance (FC, Insurance, Permit)</p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-outline" onClick={fetchFleetData} disabled={loading} title="Refresh">
              <RiRefreshLine style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
            </button>
            <button className="btn btn-primary" onClick={openAddModal}>
              <RiAddLine /> Add EV Auto
            </button>
          </div>
        </div>

        {/* Classic Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
          <div className="card" onClick={() => { setComplianceFilter('all'); setStatusFilter('all'); }} style={{ cursor: 'pointer', padding: '16px 20px' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>Total EV Fleet</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>{stats?.total || 0}</div>
          </div>
          <div className="card" onClick={() => { setStatusFilter('active'); }} style={{ cursor: 'pointer', padding: '16px 20px' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>Active On Road</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--success)' }}>{stats?.active || 0}</div>
          </div>
          <div className="card" onClick={() => { setStatusFilter('charging'); }} style={{ cursor: 'pointer', padding: '16px 20px' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>Charging Hub</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--info)' }}>{stats?.charging || 0}</div>
          </div>
          <div className="card" onClick={() => { setComplianceFilter('expired'); }} style={{ cursor: 'pointer', padding: '16px 20px' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, color: '#ef4444', marginBottom: 6 }}>🚨 Expired Documents</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ef4444' }}>{stats?.expiredCount || 0}</div>
          </div>
          <div className="card" onClick={() => { setComplianceFilter('expiring_soon'); }} style={{ cursor: 'pointer', padding: '16px 20px' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, color: '#f59e0b', marginBottom: 6 }}>⚠️ Expiring Soon (&le;30d)</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b' }}>{stats?.expiringSoonCount || 0}</div>
          </div>
        </div>

        {/* Urgent Alert Banner */}
        {urgentAlerts.length > 0 && (
          <div style={{
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            borderRadius: 12,
            padding: '12px 18px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <RiErrorWarningLine style={{ color: 'var(--danger)', fontSize: '1.4rem', flexShrink: 0 }} />
              <div>
                <strong style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>
                  Statutory Compliance Notice: {urgentAlerts.length} Vehicle{urgentAlerts.length > 1 ? 's' : ''} Require Immediate Attention
                </strong>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginTop: 2 }}>
                  {urgentAlerts.slice(0, 4).map(a => a.autoNumber).join(', ')} {urgentAlerts.length > 4 && `+${urgentAlerts.length - 4} more`}
                </div>
              </div>
            </div>
            <button className="btn btn-sm btn-danger" onClick={() => setComplianceFilter('expired')}>
              View Expired ({stats?.expiredCount || 0})
            </button>
          </div>
        )}

        {/* Main Classic Table Card with Common Search & Filters */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            {/* Common Search Bar */}
            <div className="search-bar" style={{ minWidth: 260, maxWidth: 380, flex: '1 1 auto' }}>
              <RiSearchLine className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search by Auto Number, Model, Driver, Chassis..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
            </div>

            {/* Common Filter Dropdowns */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <select
                className="form-control"
                style={{ width: 'auto', minWidth: 160 }}
                value={complianceFilter}
                onChange={e => { setComplianceFilter(e.target.value); setPage(1); }}
              >
                <option value="all">All Compliance</option>
                <option value="expired">🚨 Expired Only</option>
                <option value="expiring_soon">⚠️ Expiring Soon (&le;30d)</option>
                <option value="valid">✓ All Valid</option>
              </select>

              <select
                className="form-control"
                style={{ width: 'auto', minWidth: 150 }}
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              >
                <option value="all">All Status</option>
                <option value="active">Active On Road</option>
                <option value="charging">Charging</option>
                <option value="idle">Idle / Standby</option>
                <option value="maintenance">Maintenance</option>
              </select>

              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Total: {total}
              </span>
            </div>
          </div>

          {/* Classic Table */}
          <div className="table-wrapper">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div className="spinner" style={{ margin: '0 auto 10px auto' }} />
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading EV fleet data...</div>
              </div>
            ) : autos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🛺</div>
                <h3 style={{ color: 'var(--text-primary)', marginBottom: 6 }}>No EV Autos Found</h3>
                <p style={{ fontSize: '0.875rem' }}>No autos match your current search and filter criteria.</p>
                <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={openAddModal}>
                  <RiAddLine /> Add EV Auto
                </button>
              </div>
            ) : (
              <table className="table table-sticky-actions">
                <thead>
                  <tr>
                    <th>Auto Number</th>
                    <th>Make & Model</th>
                    <th>EV Specs</th>
                    <th>Assigned Driver</th>
                    <th>Document Compliance</th>
                    <th>Battery & Depot</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {autos.map(auto => {
                    const hasExpired = auto.alerts?.hasExpired;
                    const hasExpSoon = auto.alerts?.hasExpiringSoon;
                    const rowBg = hasExpired ? 'rgba(239, 68, 68, 0.05)' : hasExpSoon ? 'rgba(245, 158, 11, 0.04)' : undefined;

                    return (
                      <tr key={auto.id} style={{ background: rowBg }}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <code>{auto.autoNumber}</code>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {auto.vehicleType || 'EV Auto'} • {auto.manufacturingYear || '2024'}
                            </span>
                          </div>
                        </td>

                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {auto.make} {auto.model}
                          </div>
                          {auto.chassisNumber && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                              VIN: {auto.chassisNumber}
                            </div>
                          )}
                        </td>

                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '0.85rem' }}>
                              ⚡ {auto.batteryCapacityKwh ? `${auto.batteryCapacityKwh} kWh` : '7.5 kWh'}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Range: {auto.rangePerChargeKm ? `${auto.rangePerChargeKm} km` : '120 km'} • {auto.batteryType || 'Li-ion'}
                            </span>
                          </div>
                        </td>

                        <td>
                          {auto.assignedDriverName ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div>
                                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <RiUser3Line style={{ color: 'var(--accent)' }} />
                                  {auto.assignedDriverName}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  {auto.assignedDriverPhone || 'No phone'}
                                </div>
                              </div>
                              <button
                                className="btn btn-icon btn-sm"
                                title="Change Assigned Driver"
                                onClick={() => openAssignModal(auto)}
                              >
                                <RiUserSharedLine />
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>Unassigned</span>
                              <button
                                className="btn btn-sm btn-outline"
                                style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                                onClick={() => openAssignModal(auto)}
                              >
                                Assign
                              </button>
                            </div>
                          )}
                        </td>

                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {renderExpiryChip('FC / Fitness', auto.alerts?.fitness)}
                            {renderExpiryChip('Insurance', auto.alerts?.insurance)}
                            {renderExpiryChip('Permit', auto.alerts?.permit)}
                            {renderExpiryChip('PUC', auto.alerts?.puc)}
                          </div>
                        </td>

                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: (auto.batterySocPct || 80) <= 20 ? 'var(--danger)' : (auto.batterySocPct || 80) <= 45 ? 'var(--warning)' : 'var(--success)' }}>
                              🔋 {auto.batterySocPct != null ? `${auto.batterySocPct}%` : '80%'}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              📍 {auto.currentLocationName || 'Chennai Hub'}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span className={`badge ${auto.status === 'active' ? 'badge-success' : auto.status === 'charging' ? 'badge-info' : auto.status === 'maintenance' ? 'badge-danger' : 'badge-warning'}`}>
                            {auto.status === 'active' ? 'Active' : auto.status === 'charging' ? 'Charging' : auto.status === 'maintenance' ? 'Maintenance' : 'Idle'}
                          </span>
                        </td>

                        <td>
                          <div className="flex gap-2">
                            <button
                              className="btn btn-icon btn-sm"
                              title="Edit / Renew Documents"
                              onClick={() => openEditModal(auto)}
                            >
                              <RiEditLine />
                            </button>
                            <button
                              className="btn btn-icon btn-sm"
                              title="Assign Driver"
                              onClick={() => openAssignModal(auto)}
                            >
                              <RiUserSharedLine />
                            </button>
                            <button
                              className="btn btn-icon btn-sm"
                              title="Delete Auto"
                              onClick={() => { setAutoToDelete(auto); setDeleteModalOpen(true); }}
                              style={{ color: 'var(--danger)' }}
                            >
                              <RiDeleteBinLine />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Common Pagination Bar */}
          <PaginationBar
            page={page}
            setPage={setPage}
            total={total}
            limit={limit}
            setLimit={setLimit}
            label="autos"
          />
        </div>

        {/* ── Classic Modal: Add / Edit Auto ── */}
        {modalMode && modalMode !== 'assign' && (
          <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 780 }}>
              <div className="modal-header">
                <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <RiCarLine style={{ color: 'var(--accent)' }} />
                  {modalMode === 'add' ? 'Add New EV Auto' : `Edit Auto: ${selectedAuto?.autoNumber}`}
                </h3>
                <button className="btn btn-icon" onClick={closeModal}><RiCloseLine /></button>
              </div>

              <form onSubmit={handleSubmitAuto}>
                <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
                  {/* Basic Details */}
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                    1. Registration & Vehicle Details
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 16 }}>
                    <div className="form-group">
                      <label className="form-label">Auto / Registration Number *</label>
                      <input
                        className="form-control"
                        placeholder="e.g. TN-09-EV-1001"
                        name="autoNumber"
                        value={formData.autoNumber}
                        onChange={handleInputChange}
                        required
                        style={{ textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700 }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Make / Brand</label>
                      <input
                        className="form-control"
                        placeholder="e.g. Mahindra / Piaggio / Bajaj"
                        name="make"
                        value={formData.make}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Model Name</label>
                      <input
                        className="form-control"
                        placeholder="e.g. Treo Electric / Ape E-City"
                        name="model"
                        value={formData.model}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Manufacturing Year</label>
                      <input
                        type="number"
                        className="form-control"
                        name="manufacturingYear"
                        value={formData.manufacturingYear}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Chassis / VIN Number</label>
                      <input
                        className="form-control"
                        placeholder="e.g. MA1TREOEV2024001"
                        name="chassisNumber"
                        value={formData.chassisNumber}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Motor Serial Number</label>
                      <input
                        className="form-control"
                        placeholder="e.g. MHD-8KW-9021"
                        name="motorNumber"
                        value={formData.motorNumber}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  {/* EV Specs */}
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, marginTop: 8 }}>
                    2. EV Battery & Powertrain
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 16 }}>
                    <div className="form-group">
                      <label className="form-label">Battery Capacity (kWh)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="form-control"
                        placeholder="e.g. 7.5 or 10.2"
                        name="batteryCapacityKwh"
                        value={formData.batteryCapacityKwh}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Battery Chemistry</label>
                      <select
                        className="form-control"
                        name="batteryType"
                        value={formData.batteryType}
                        onChange={handleInputChange}
                      >
                        <option value="Lithium-ion">Lithium-ion (NMC)</option>
                        <option value="LFP">LFP (Lithium Iron Phosphate)</option>
                        <option value="Swappable Lithium">Swappable Battery Pack</option>
                        <option value="Solid State">Advanced Solid State</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Real Range (km / charge)</label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="e.g. 130"
                        name="rangePerChargeKm"
                        value={formData.rangePerChargeKm}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  {/* Statutory Expiry Dates */}
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, marginTop: 8 }}>
                    3. Statutory Compliance Dates (Alert Engine)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 16 }}>
                    <div className="form-group">
                      <label className="form-label">FC / Fitness Expiry Date</label>
                      <input
                        type="date"
                        className="form-control"
                        name="fitnessExpiryDate"
                        value={formData.fitnessExpiryDate}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Insurance Expiry Date</label>
                      <input
                        type="date"
                        className="form-control"
                        name="insuranceExpiryDate"
                        value={formData.insuranceExpiryDate}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Insurance Policy Number</label>
                      <input
                        className="form-control"
                        placeholder="e.g. HDFC-ERGO-EV-9021"
                        name="insurancePolicyNumber"
                        value={formData.insurancePolicyNumber}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Permit Expiry Date</label>
                      <input
                        type="date"
                        className="form-control"
                        name="permitExpiryDate"
                        value={formData.permitExpiryDate}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">RC Expiry Date</label>
                      <input
                        type="date"
                        className="form-control"
                        name="rcExpiryDate"
                        value={formData.rcExpiryDate}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">PUC Expiry Date</label>
                      <input
                        type="date"
                        className="form-control"
                        name="pucExpiryDate"
                        value={formData.pucExpiryDate}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Battery Warranty Expiry</label>
                      <input
                        type="date"
                        className="form-control"
                        name="batteryWarrantyExpiryDate"
                        value={formData.batteryWarrantyExpiryDate}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Operational Status</label>
                      <select
                        className="form-control"
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                      >
                        <option value="active">Active (On Road)</option>
                        <option value="charging">Charging</option>
                        <option value="idle">Idle / Standby</option>
                        <option value="maintenance">Maintenance</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Internal Operational Remarks</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      name="remarks"
                      placeholder="Notes regarding depot, route, charger, etc."
                      value={formData.remarks}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    <RiSaveLine /> {saving ? 'Saving...' : modalMode === 'add' ? 'Add EV Auto' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Classic Modal: Quick Assign Driver ── */}
        {modalMode === 'assign' && selectedAuto && (
          <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 520 }}>
              <div className="modal-header">
                <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <RiUserSharedLine style={{ color: 'var(--accent)' }} />
                  Assign Driver to {selectedAuto.autoNumber}
                </h3>
                <button className="btn btn-icon" onClick={closeModal}><RiCloseLine /></button>
              </div>

              <form onSubmit={handleAssignDriver}>
                <div className="modal-body">
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                    Select a driver for EV Auto <strong style={{ color: 'var(--text-primary)' }}>{selectedAuto.autoNumber}</strong> ({selectedAuto.make} {selectedAuto.model}).
                  </p>

                  <div className="form-group">
                    <label className="form-label">Select Driver</label>
                    <select
                      className="form-control"
                      value={selectedDriverId}
                      onChange={e => setSelectedDriverId(e.target.value)}
                    >
                      <option value="">-- No Driver (Unassign) --</option>
                      {drivers.map(d => {
                        const isExpired = d.alerts?.isLicenseExpired;
                        const isSoon = d.alerts?.isLicenseExpiringSoon;
                        const prefix = isExpired ? '🚨 [LICENSE EXPIRED] ' : isSoon ? '⚠️ [Expiring Soon] ' : '';
                        const tag = d.assignedAutoId === selectedAuto.id ? ' (Currently Assigned)' : d.assignedAutoNumber ? ` (In ${d.assignedAutoNumber})` : '';

                        return (
                          <option key={d.id} value={d.id}>
                            {prefix}{d.name} — {d.phone || 'No phone'} ({d.licenseNumber}){tag}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {selectedDriverObj?.alerts?.isLicenseExpired && (
                    <div style={{
                      marginTop: 14,
                      background: 'var(--danger-bg)',
                      border: '1px solid var(--danger-border)',
                      borderRadius: 8,
                      padding: '12px 14px',
                      color: 'var(--danger)',
                      fontSize: '0.85rem'
                    }}>
                      <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <RiAlertLine /> Compliance Warning: License Expired!
                      </div>
                      <div>
                        Driver <strong>{selectedDriverObj.name}</strong>'s driving license ({selectedDriverObj.licenseNumber}) expired on <strong>{selectedDriverObj.licenseExpiryDate}</strong>. Assigning this driver will flag the auto for regulatory non-compliance.
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    <RiSaveLine /> {saving ? 'Assigning...' : 'Confirm Assignment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        <ConfirmModal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={handleDeleteConfirm}
          title={`Delete Auto ${autoToDelete?.autoNumber}?`}
          message={`Are you sure you want to remove ${autoToDelete?.autoNumber} from the OWNGO fleet? All associated telemetry and historical records will be deleted.`}
          confirmText="Delete Auto"
          danger={true}
        />
      </div>
    </AppLayout>
  );
}
