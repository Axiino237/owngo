import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  RiUserFollowLine, RiUserAddLine, RiSearchLine, RiAlertLine,
  RiTimeLine, RiCarLine, RiRefreshLine, RiEditLine, RiDeleteBinLine,
  RiCloseLine, RiSaveLine, RiPhoneLine, RiShieldCheckLine, RiErrorWarningLine,
  RiExchangeLine, RiIdCardLine, RiCheckboxCircleLine, RiCloseCircleLine
} from 'react-icons/ri';
import AppLayout from '../../components/AppLayout';
import ConfirmModal from '../../components/ConfirmModal';
import PaginationBar from '../../components/PaginationBar';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const EMPTY_DRIVER_FORM = {
  name: '',
  phone: '',
  alternatePhone: '',
  email: '',
  licenseNumber: '',
  licenseType: 'Transport (LMV-TR)',
  licenseExpiryDate: '',
  badgeNumber: '',
  badgeExpiryDate: '',
  dateOfBirth: '',
  experienceYears: 3,
  address: '',
  city: 'Chennai',
  state: 'Tamil Nadu',
  pincode: '',
  isPoliceVerificationDone: true,
  policeVerificationExpiryDate: '',
  isMedicalFitnessCertified: true,
  medicalFitnessExpiryDate: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  status: 'active',
  remarks: ''
};

export default function DriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [stats, setStats] = useState(null);
  const [autos, setAutos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Common Search & Filters
  const [search, setSearch] = useState('');
  const [licenseFilter, setLicenseFilter] = useState('all'); // all | expired | expiring_soon | valid
  const [assignmentFilter, setAssignmentFilter] = useState('all'); // all | assigned | unassigned
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  // Modals
  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit' | 'assign' | null
  const [formData, setFormData] = useState(EMPTY_DRIVER_FORM);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [selectedAutoId, setSelectedAutoId] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState(null);

  // Fetch Drivers, Stats, and Autos
  const fetchDriverData = useCallback(async () => {
    try {
      setLoading(true);
      const [driversRes, statsRes, autosRes] = await Promise.all([
        api.get('/drivers', {
          params: {
            search,
            status: statusFilter,
            assignment: assignmentFilter,
            licenseStatus: licenseFilter,
            page,
            limit
          }
        }),
        api.get('/drivers/stats'),
        api.get('/autos', { params: { limit: 100 } })
      ]);

      if (driversRes.data.success) {
        setDrivers(driversRes.data.drivers || []);
        setTotal(driversRes.data.total || 0);
      }
      if (statsRes.data.success) {
        setStats(statsRes.data.stats || null);
      }
      if (autosRes.data.success) {
        setAutos(autosRes.data.autos || []);
      }
    } catch (err) {
      console.error('Failed to load driver data:', err);
      toast.error('Failed to load driver management data');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, assignmentFilter, licenseFilter, page, limit]);

  useEffect(() => {
    fetchDriverData();
  }, [fetchDriverData]);

  // Handle Input Change
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Open Add Modal
  const openAddModal = () => {
    setFormData(EMPTY_DRIVER_FORM);
    setModalMode('add');
    setSelectedDriver(null);
  };

  // Open Edit Modal
  const openEditModal = (driver) => {
    setSelectedDriver(driver);
    setFormData({
      name: driver.name || '',
      phone: driver.phone || '',
      alternatePhone: driver.alternatePhone || '',
      email: driver.email || '',
      licenseNumber: driver.licenseNumber || '',
      licenseType: driver.licenseType || 'Transport (LMV-TR)',
      licenseExpiryDate: driver.licenseExpiryDate || '',
      badgeNumber: driver.badgeNumber || '',
      badgeExpiryDate: driver.badgeExpiryDate || '',
      dateOfBirth: driver.dateOfBirth || '',
      experienceYears: driver.experienceYears || 3,
      address: driver.address || '',
      city: driver.city || 'Chennai',
      state: driver.state || 'Tamil Nadu',
      pincode: driver.pincode || '',
      isPoliceVerificationDone: !!driver.isPoliceVerificationDone,
      policeVerificationExpiryDate: driver.policeVerificationExpiryDate || '',
      isMedicalFitnessCertified: !!driver.isMedicalFitnessCertified,
      medicalFitnessExpiryDate: driver.medicalFitnessExpiryDate || '',
      emergencyContactName: driver.emergencyContactName || '',
      emergencyContactPhone: driver.emergencyContactPhone || '',
      status: driver.status || 'active',
      remarks: driver.remarks || ''
    });
    setModalMode('edit');
  };

  // Open Assign Modal
  const openAssignModal = (driver) => {
    setSelectedDriver(driver);
    setSelectedAutoId(driver.assignedAutoId || '');
    setModalMode('assign');
  };

  // Close Modal
  const closeModal = () => {
    setModalMode(null);
    setSelectedDriver(null);
    setSelectedAutoId('');
  };

  // Submit Driver (Create or Edit)
  const handleSubmitDriver = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim() || !formData.licenseNumber.trim()) {
      toast.error('Driver Name, Phone, and Driving License Number are required');
      return;
    }

    try {
      setSaving(true);
      if (modalMode === 'add') {
        const res = await api.post('/drivers', formData);
        if (res.data.success) {
          toast.success(`Driver ${formData.name} added successfully!`);
          closeModal();
          fetchDriverData();
        }
      } else if (modalMode === 'edit') {
        const res = await api.put(`/drivers/${selectedDriver.id}`, formData);
        if (res.data.success) {
          toast.success(`Driver ${formData.name} updated!`);
          closeModal();
          fetchDriverData();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save driver');
    } finally {
      setSaving(false);
    }
  };

  // Submit Auto Assignment
  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDriver) return;

    try {
      setSaving(true);
      const res = await api.post(`/drivers/${selectedDriver.id}/assign`, {
        autoId: selectedAutoId || null
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
          toast.success(res.data.message || 'Auto assignment updated!');
        }
        closeModal();
        fetchDriverData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign auto');
    } finally {
      setSaving(false);
    }
  };

  // Delete Driver
  const handleDeleteConfirm = async () => {
    if (!driverToDelete) return;
    try {
      const res = await api.delete(`/drivers/${driverToDelete.id}`);
      if (res.data.success) {
        toast.success(`Driver ${driverToDelete.name} deleted`);
        setDeleteModalOpen(false);
        setDriverToDelete(null);
        fetchDriverData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete driver');
    }
  };

  // License Expiry Badge Helper
  const renderLicenseBadge = (driver) => {
    const alerts = driver.alerts;
    if (!driver.licenseExpiryDate) {
      return <span className="badge" style={{ opacity: 0.6 }}>No Expiry</span>;
    }

    if (alerts?.isLicenseExpired) {
      return (
        <span className="badge badge-danger" title={`Expired on ${driver.licenseExpiryDate}`}>
          🚨 Expired ({Math.abs(alerts.licenseDaysRemaining)}d ago)
        </span>
      );
    }

    if (alerts?.isLicenseExpiringSoon) {
      return (
        <span className="badge badge-warning" title={`Expires on ${driver.licenseExpiryDate}`}>
          ⚠️ Expiring in {alerts.licenseDaysRemaining}d
        </span>
      );
    }

    return (
      <span className="badge badge-success" title={`Valid until ${driver.licenseExpiryDate}`}>
        ✓ Valid ({alerts?.licenseDaysRemaining}d)
      </span>
    );
  };

  const urgentExpiredDrivers = useMemo(() => {
    return drivers.filter(d => d.alerts?.isLicenseExpired);
  }, [drivers]);

  return (
    <AppLayout title="Driver Management">
      <div className="page-wrapper">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">
              <RiUserFollowLine style={{ color: 'var(--accent)' }} />
              Driver Fleet
            </h1>
            <p className="page-subtitle">Manage EV Auto drivers, statutory commercial driving licenses, badges, and auto assignments</p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-outline" onClick={fetchDriverData} disabled={loading} title="Refresh">
              <RiRefreshLine style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
            </button>
            <button className="btn btn-primary" onClick={openAddModal}>
              <RiUserAddLine /> Add Driver
            </button>
          </div>
        </div>

        {/* Classic Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
          <div className="card" onClick={() => { setLicenseFilter('all'); setAssignmentFilter('all'); }} style={{ cursor: 'pointer', padding: '16px 20px' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>Total Drivers</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>{stats?.total || 0}</div>
          </div>
          <div className="card" onClick={() => { setAssignmentFilter('assigned'); }} style={{ cursor: 'pointer', padding: '16px 20px' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>Assigned to Auto</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--success)' }}>{stats?.assigned || 0}</div>
          </div>
          <div className="card" onClick={() => { setAssignmentFilter('unassigned'); }} style={{ cursor: 'pointer', padding: '16px 20px' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>Available Standby</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--info)' }}>{stats?.unassigned || 0}</div>
          </div>
          <div className="card" onClick={() => { setLicenseFilter('expired'); }} style={{ cursor: 'pointer', padding: '16px 20px' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, color: '#ef4444', marginBottom: 6 }}>🚨 License Expired</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ef4444' }}>{stats?.licenseExpiredCount || 0}</div>
          </div>
          <div className="card" onClick={() => { setLicenseFilter('expiring_soon'); }} style={{ cursor: 'pointer', padding: '16px 20px' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, color: '#f59e0b', marginBottom: 6 }}>⚠️ Expiring Soon (&le;30d)</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b' }}>{stats?.licenseExpiringSoonCount || 0}</div>
          </div>
        </div>

        {/* Urgent License Expiry Banner */}
        {urgentExpiredDrivers.length > 0 && (
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
                  Driving License Expired Alert: {urgentExpiredDrivers.length} Driver{urgentExpiredDrivers.length > 1 ? 's' : ''} Require License Renewal
                </strong>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginTop: 2 }}>
                  {urgentExpiredDrivers.map(d => `${d.name} (${d.licenseNumber})`).join(' • ')}
                </div>
              </div>
            </div>
            <button className="btn btn-sm btn-danger" onClick={() => setLicenseFilter('expired')}>
              Filter Expired ({urgentExpiredDrivers.length})
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
                placeholder="Search by Driver Name, Phone, License No, Badge..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
            </div>

            {/* Common Filter Dropdowns */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <select
                className="form-control"
                style={{ width: 'auto', minWidth: 160 }}
                value={licenseFilter}
                onChange={e => { setLicenseFilter(e.target.value); setPage(1); }}
              >
                <option value="all">All License Status</option>
                <option value="expired">🚨 Expired Only</option>
                <option value="expiring_soon">⚠️ Expiring Soon (&le;30d)</option>
                <option value="valid">✓ Valid Only</option>
              </select>

              <select
                className="form-control"
                style={{ width: 'auto', minWidth: 150 }}
                value={assignmentFilter}
                onChange={e => { setAssignmentFilter(e.target.value); setPage(1); }}
              >
                <option value="all">All Assignments</option>
                <option value="assigned">Assigned to Auto</option>
                <option value="unassigned">Unassigned Standby</option>
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
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading drivers...</div>
              </div>
            ) : drivers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🧑‍✈️</div>
                <h3 style={{ color: 'var(--text-primary)', marginBottom: 6 }}>No Drivers Found</h3>
                <p style={{ fontSize: '0.875rem' }}>No drivers match your current search and filter criteria.</p>
                <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={openAddModal}>
                  <RiUserAddLine /> Add Driver
                </button>
              </div>
            ) : (
              <table className="table table-sticky-actions">
                <thead>
                  <tr>
                    <th>Driver Profile</th>
                    <th>Contact Info</th>
                    <th>Driving License Status</th>
                    <th>Badge & Clearances</th>
                    <th>Assigned EV Auto</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.map(driver => {
                    const isExpired = driver.alerts?.isLicenseExpired;
                    const isSoon = driver.alerts?.isLicenseExpiringSoon;
                    const rowBg = isExpired ? 'rgba(239, 68, 68, 0.05)' : isSoon ? 'rgba(245, 158, 11, 0.04)' : undefined;

                    return (
                      <tr key={driver.id} style={{ background: rowBg }}>
                        <td>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                              {driver.name}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              {driver.city || 'Chennai'} • Exp: {driver.experienceYears || 0} yrs
                            </div>
                          </div>
                        </td>

                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                              <RiPhoneLine style={{ color: 'var(--accent)' }} />
                              {driver.phone}
                            </div>
                            {driver.email && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {driver.email}
                              </div>
                            )}
                          </div>
                        </td>

                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <code>{driver.licenseNumber}</code>
                            {renderLicenseBadge(driver)}
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              Expires: {driver.licenseExpiryDate || 'Not specified'}
                            </span>
                          </div>
                        </td>

                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: '0.75rem' }}>
                            <div>
                              Badge: <strong>{driver.badgeNumber || 'N/A'}</strong>
                            </div>
                            <div>
                              {driver.isPoliceVerificationDone ? (
                                <span style={{ color: 'var(--success)', fontWeight: 600 }}>✓ Police Verified</span>
                              ) : (
                                <span style={{ color: 'var(--danger)', fontWeight: 600 }}>✗ Police Pending</span>
                              )}
                            </div>
                            <div>
                              {driver.isMedicalFitnessCertified ? (
                                <span style={{ color: 'var(--success)', fontWeight: 600 }}>✓ Medical Fit</span>
                              ) : (
                                <span style={{ color: 'var(--danger)', fontWeight: 600 }}>✗ Medical Expired</span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td>
                          {driver.assignedAutoNumber ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <code>🛺 {driver.assignedAutoNumber}</code>
                              <button
                                className="btn btn-icon btn-sm"
                                title="Reassign Auto"
                                onClick={() => openAssignModal(driver)}
                              >
                                <RiExchangeLine />
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>Unassigned</span>
                              <button
                                className="btn btn-sm btn-outline"
                                style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                                onClick={() => openAssignModal(driver)}
                              >
                                Assign
                              </button>
                            </div>
                          )}
                        </td>

                        <td>
                          <span className={`badge ${driver.status === 'on_duty' ? 'badge-success' : driver.status === 'active' ? 'badge-info' : 'badge-danger'}`}>
                            {driver.status === 'on_duty' ? 'On Duty' : driver.status === 'active' ? 'Standby' : driver.status}
                          </span>
                        </td>

                        <td>
                          <div className="flex gap-2">
                            <button
                              className="btn btn-icon btn-sm"
                              title="Edit Driver Details"
                              onClick={() => openEditModal(driver)}
                            >
                              <RiEditLine />
                            </button>
                            <button
                              className="btn btn-icon btn-sm"
                              title="Assign to Auto"
                              onClick={() => openAssignModal(driver)}
                            >
                              <RiExchangeLine />
                            </button>
                            <button
                              className="btn btn-icon btn-sm"
                              title="Delete Driver"
                              onClick={() => { setDriverToDelete(driver); setDeleteModalOpen(true); }}
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
            label="drivers"
          />
        </div>

        {/* ── Classic Modal: Add / Edit Driver ── */}
        {modalMode && modalMode !== 'assign' && (
          <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 740 }}>
              <div className="modal-header">
                <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <RiUserFollowLine style={{ color: 'var(--accent)' }} />
                  {modalMode === 'add' ? 'Add New Driver' : `Edit Driver: ${selectedDriver?.name}`}
                </h3>
                <button className="btn btn-icon" onClick={closeModal}><RiCloseLine /></button>
              </div>

              <form onSubmit={handleSubmitDriver}>
                <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
                  {/* Personal Info */}
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                    1. Driver Personal & Contact
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 16 }}>
                    <div className="form-group">
                      <label className="form-label">Full Name *</label>
                      <input
                        className="form-control"
                        placeholder="e.g. Murugan K"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Mobile Phone *</label>
                      <input
                        type="tel"
                        className="form-control"
                        placeholder="e.g. 9840123456"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Alternate Phone</label>
                      <input
                        type="tel"
                        className="form-control"
                        placeholder="e.g. 9840998877"
                        name="alternatePhone"
                        value={formData.alternatePhone}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email Address</label>
                      <input
                        type="email"
                        className="form-control"
                        placeholder="driver@owngo.in"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">City Base</label>
                      <input
                        className="form-control"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Experience (Years)</label>
                      <input
                        type="number"
                        className="form-control"
                        name="experienceYears"
                        value={formData.experienceYears}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  {/* Commercial License & Badge */}
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, marginTop: 8 }}>
                    2. Commercial Driving License & Badge
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 16 }}>
                    <div className="form-group">
                      <label className="form-label">Driving License Number *</label>
                      <input
                        className="form-control"
                        placeholder="e.g. TN0920180004561"
                        name="licenseNumber"
                        value={formData.licenseNumber}
                        onChange={handleInputChange}
                        required
                        style={{ textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700 }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">License Expiry Date *</label>
                      <input
                        type="date"
                        className="form-control"
                        name="licenseExpiryDate"
                        value={formData.licenseExpiryDate}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Commercial Badge Number</label>
                      <input
                        className="form-control"
                        placeholder="e.g. BDG-CHN-8821"
                        name="badgeNumber"
                        value={formData.badgeNumber}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Badge Expiry Date</label>
                      <input
                        type="date"
                        className="form-control"
                        name="badgeExpiryDate"
                        value={formData.badgeExpiryDate}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  {/* Clearances */}
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, marginTop: 8 }}>
                    3. Safety Clearances & Emergency Contact
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                    <div style={{ background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: 8 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 600 }}>
                        <input
                          type="checkbox"
                          name="isPoliceVerificationDone"
                          checked={formData.isPoliceVerificationDone}
                          onChange={handleInputChange}
                          style={{ accentColor: 'var(--accent)', transform: 'scale(1.2)' }}
                        />
                        Police Background Check Completed
                      </label>
                    </div>

                    <div style={{ background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: 8 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 600 }}>
                        <input
                          type="checkbox"
                          name="isMedicalFitnessCertified"
                          checked={formData.isMedicalFitnessCertified}
                          onChange={handleInputChange}
                          style={{ accentColor: 'var(--accent)', transform: 'scale(1.2)' }}
                        />
                        Medical Fitness Certified
                      </label>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                    <div className="form-group">
                      <label className="form-label">Emergency Contact Name</label>
                      <input
                        className="form-control"
                        placeholder="Spouse / Parent / Next of Kin"
                        name="emergencyContactName"
                        value={formData.emergencyContactName}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Emergency Contact Phone</label>
                      <input
                        type="tel"
                        className="form-control"
                        placeholder="Emergency Phone Number"
                        name="emergencyContactPhone"
                        value={formData.emergencyContactPhone}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Address</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder="Full residential street address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    <RiSaveLine /> {saving ? 'Saving...' : modalMode === 'add' ? 'Add Driver' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Classic Modal: Assign to Auto ── */}
        {modalMode === 'assign' && selectedDriver && (
          <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 520 }}>
              <div className="modal-header">
                <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <RiCarLine style={{ color: 'var(--accent)' }} />
                  Assign Auto to {selectedDriver.name}
                </h3>
                <button className="btn btn-icon" onClick={closeModal}><RiCloseLine /></button>
              </div>

              <form onSubmit={handleAssignSubmit}>
                <div className="modal-body">
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                    Select an EV Auto to assign to driver <strong style={{ color: 'var(--text-primary)' }}>{selectedDriver.name}</strong> ({selectedDriver.phone}).
                  </p>

                  <div className="form-group">
                    <label className="form-label">Select EV Auto from Fleet</label>
                    <select
                      className="form-control"
                      value={selectedAutoId}
                      onChange={e => setSelectedAutoId(e.target.value)}
                    >
                      <option value="">-- No Auto (Unassign Standby) --</option>
                      {autos.map(a => {
                        const isAssigned = a.id === selectedDriver.assignedAutoId;
                        const otherDriver = a.assignedDriverName && !isAssigned ? ` (with ${a.assignedDriverName})` : '';
                        const tag = isAssigned ? ' (Currently Assigned)' : otherDriver;

                        return (
                          <option key={a.id} value={a.id}>
                            🛺 {a.autoNumber} — {a.make} {a.model}{tag}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {selectedDriver.alerts?.isLicenseExpired && (
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
                        <RiAlertLine /> Compliance Violation Notice
                      </div>
                      <div>
                        This driver's commercial license ({selectedDriver.licenseNumber}) expired on <strong>{selectedDriver.licenseExpiryDate}</strong>. Assigning this driver to an active vehicle will flag the auto for regulatory non-compliance.
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
          title={`Delete Driver ${driverToDelete?.name}?`}
          message={`Are you sure you want to delete ${driverToDelete?.name} (${driverToDelete?.licenseNumber})? Any assigned auto will be unassigned automatically.`}
          confirmText="Delete Driver"
          danger={true}
        />
      </div>
    </AppLayout>
  );
}
