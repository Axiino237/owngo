import { useState, useEffect, useCallback } from 'react';
import {
  RiUserAddLine, RiSearchLine, RiEditLine, RiDeleteBinLine,
  RiRefreshLine, RiCloseLine, RiPhoneLine, RiMailLine,
  RiFilterLine, RiUpload2Line, RiDownloadLine, RiCheckboxLine,
  RiCheckboxBlankLine, RiDeleteBin5Line, RiEyeLine, RiCalendarLine,
  RiMapPinLine, RiUserLine, RiExternalLinkLine, RiAwardLine,
  RiSteering2Line, RiTimeLine, RiShieldCheckLine, RiWhatsappLine, RiGlobalLine
} from 'react-icons/ri';
import AppLayout from '../../components/AppLayout';
import ConfirmModal from '../../components/ConfirmModal';
import PaginationBar from '../../components/PaginationBar';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';

// ── Helpers ───────────────────────────────────────────────────────────────
const formatLicenseBadge = (licenseType) => {
  if (!licenseType) return { label: 'Not Specified', color: '#64748b', bg: 'rgba(100, 116, 139, 0.08)' };
  const lower = licenseType.toLowerCase();
  if (lower.includes('commercial') || lower === 'commercial_badge' || lower.includes('badge')) {
    return { label: 'Commercial Auto Badge', color: '#0284c7', bg: 'rgba(2, 132, 199, 0.09)' };
  }
  if (lower.includes('lmv') || lower.includes('4-wheeler')) {
    return { label: 'LMV / 4-Wheeler', color: '#059669', bg: 'rgba(5, 150, 105, 0.09)' };
  }
  if (lower.includes('applied') || lower.includes('process')) {
    return { label: 'Badge in Process', color: '#d97706', bg: 'rgba(217, 119, 6, 0.09)' };
  }
  return { label: licenseType, color: '#0284c7', bg: 'rgba(2, 132, 199, 0.09)' };
};

const formatLocation = (city, area) => {
  if (!city && !area) return 'Chennai';
  if (!area) return city;
  if (!city) return area;
  const cleanArea = area.replace(new RegExp(`^${city}\\s*[•·\\-–,]\\s*`, 'i'), '').trim();
  if (!cleanArea || cleanArea.toLowerCase() === city.toLowerCase()) return city;
  return `${city} • ${cleanArea}`;
};

// ── Job Request Candidate Modal (Add / Edit) ───────────────────────────────
const CandidateModal = ({ candidate, users = [], masterStatuses = [], onClose, onSaved }) => {
  const [form, setForm] = useState(candidate ? {
    name: candidate.name || '',
    phone: candidate.phone || '',
    email: candidate.email || '',
    city: candidate.city || 'Chennai',
    preferredArea: candidate.preferredArea || 'Central Chennai',
    licenseType: candidate.licenseType || 'Commercial 3-Wheeler Auto Badge',
    experience: candidate.experience || '2 to 5 Years',
    source: candidate.source || 'Website Pilot Form',
    sourceLink: candidate.sourceLink || '',
    status: candidate.status || 'new',
    assignedTo: candidate.assignedTo || '',
    nextFollowUp: candidate.nextFollowUp || '',
    notes: candidate.notes || ''
  } : {
    name: '',
    phone: '',
    email: '',
    city: 'Chennai',
    preferredArea: 'Central Chennai',
    licenseType: 'Commercial 3-Wheeler Auto Badge',
    experience: '2 to 5 Years',
    source: 'Direct Entry',
    sourceLink: '',
    status: 'new',
    assignedTo: '',
    nextFollowUp: '',
    notes: ''
  });

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error('Driver name and phone number are required');
      return;
    }

    setSaving(true);
    try {
      if (candidate) {
        await api.put(`/job-requests/${candidate.id}`, form);
        toast.success('Pilot candidate updated successfully');
      } else {
        await api.post('/job-requests', form);
        toast.success('New pilot candidate created successfully');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save candidate');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal modal-lg" style={{ maxWidth: 740, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', fontSize: '1.25rem' }}>
              <RiSteering2Line />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: '1.2rem', margin: 0 }}>
                {candidate ? 'Edit EV Pilot Application' : 'New EV Pilot Driver Candidate'}
              </h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Commercial EV auto driver candidate tracking & verification
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><RiCloseLine /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '18px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Driver Full Name */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Driver Full Name *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Murugan K, Selvam R"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            {/* Phone Number */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Phone Number *</label>
              <input
                type="tel"
                className="form-control"
                placeholder="+91 XXXXX XXXXX"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                required
              />
            </div>

            {/* Email Address */}
            <div className="form-group">
              <label className="form-label">Email Address (Optional)</label>
              <input
                type="email"
                className="form-control"
                placeholder="driver@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </div>

            {/* Target City */}
            <div className="form-group">
              <label className="form-label">City</label>
              <select
                className="form-control"
                value={form.city}
                onChange={e => setForm({ ...form, city: e.target.value })}
              >
                <option value="Chennai">Chennai</option>
                <option value="Coimbatore">Coimbatore</option>
                <option value="Madurai">Madurai</option>
                <option value="Tiruchirappalli">Tiruchirappalli</option>
                <option value="Salem">Salem</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Preferred Driving Zone */}
            <div className="form-group">
              <label className="form-label">Preferred Operating Area / Zone</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. T. Nagar, Velachery, Guindy, Airport"
                value={form.preferredArea}
                onChange={e => setForm({ ...form, preferredArea: e.target.value })}
              />
            </div>

            {/* License & Badge Type */}
            <div className="form-group">
              <label className="form-label">Commercial License & Badge Type</label>
              <select
                className="form-control"
                value={form.licenseType}
                onChange={e => setForm({ ...form, licenseType: e.target.value })}
              >
                <option value="Commercial 3-Wheeler Auto Badge">Commercial 3-Wheeler Auto Badge</option>
                <option value="Commercial 4-Wheeler Transport Badge">Commercial 4-Wheeler Transport Badge</option>
                <option value="LMV Passenger Commercial">LMV Passenger Commercial</option>
                <option value="Standard LMV Non-Transport">Standard LMV Non-Transport</option>
                <option value="Badge Applied / In Process">Badge Applied / In Process</option>
              </select>
            </div>

            {/* Driving Experience */}
            <div className="form-group">
              <label className="form-label">Commercial Auto Experience</label>
              <select
                className="form-control"
                value={form.experience}
                onChange={e => setForm({ ...form, experience: e.target.value })}
              >
                <option value="Fresh Commercial Driver (<1 Year)">Fresh Commercial Driver (&lt;1 Year)</option>
                <option value="1 to 2 Years">1 to 2 Years</option>
                <option value="2 to 5 Years">2 to 5 Years</option>
                <option value="5+ Years Veteran">5+ Years Veteran</option>
                <option value="10+ Years Expert">10+ Years Expert</option>
              </select>
            </div>

            {/* Lead Source */}
            <div className="form-group">
              <label className="form-label">Application Source</label>
              <select
                className="form-control"
                value={form.source}
                onChange={e => setForm({ ...form, source: e.target.value })}
              >
                <option value="Website Pilot Form">Website Pilot Form</option>
                <option value="Auto Stand Campaign">Auto Stand Campaign</option>
                <option value="WhatsApp Referral">WhatsApp Referral</option>
                <option value="Instagram Ad">Instagram Ad</option>
                <option value="Driver Referral">Driver Referral</option>
                <option value="Walk-in">Walk-in</option>
                <option value="Direct Entry">Direct Entry</option>
              </select>
            </div>

            {/* Source URL / UTM Link */}
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Source Link (Tracking URL / UTM)</label>
              <input
                type="text"
                className="form-control"
                placeholder="https://owngo.in/?utm_source=instagram&ref=..."
                value={form.sourceLink}
                onChange={e => setForm({ ...form, sourceLink: e.target.value })}
              />
            </div>

            {/* Status Dropdown */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Candidate Status</label>
              <select
                className="form-control"
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
              >
                {masterStatuses.map(s => (
                  <option key={s.id || s.key} value={s.key}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Assigned Staff */}
            <div className="form-group">
              <label className="form-label">Assigned Verification Staff</label>
              <select
                className="form-control"
                value={form.assignedTo}
                onChange={e => setForm({ ...form, assignedTo: e.target.value })}
              >
                <option value="">Unassigned</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Next Follow-up Date */}
            <div className="form-group">
              <label className="form-label">Next Interview / Follow-up Date</label>
              <input
                type="date"
                className="form-control"
                value={form.nextFollowUp}
                onChange={e => setForm({ ...form, nextFollowUp: e.target.value })}
              />
            </div>

            {/* Remarks / Interview Notes */}
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Driver Interview & Screening Notes</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="License badge verification status, vehicle familiarity, shift availability..."
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ minWidth: 140 }}>
              {saving ? 'Saving...' : (candidate ? 'Update Candidate' : 'Create Candidate')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── View Candidate Details Modal ───────────────────────────────────────────
const ViewCandidateModal = ({ candidate, onClose, onEdit }) => {
  if (!candidate) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal modal-md" style={{ maxWidth: 640 }}>
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', fontSize: '1.3rem' }}>
              <RiSteering2Line />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: '1.25rem', margin: 0 }}>{candidate.name}</h2>
              <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                EV Pilot Driver Candidate Application
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><RiCloseLine /></button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, background: 'var(--bg-secondary)', padding: 16, borderRadius: 10 }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Mobile Phone</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: 4 }}>
                <a href={`tel:${candidate.phone}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                  {candidate.phone}
                </a>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Email Address</div>
              <div style={{ fontSize: '0.95rem', marginTop: 4 }}>
                {candidate.email ? <a href={`mailto:${candidate.email}`} style={{ color: 'var(--text-primary)' }}>{candidate.email}</a> : '—'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Target City / Preferred Area</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: 4 }}>
                {candidate.city} {candidate.preferredArea ? `• ${candidate.preferredArea}` : ''}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Commercial License & Badge</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#38bdf8', marginTop: 4 }}>
                {candidate.licenseType}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Driving Experience</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#a78bfa', marginTop: 4 }}>
                {candidate.experience}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Application Source</div>
              <div style={{ fontSize: '0.95rem', marginTop: 4 }}>
                {candidate.source}
              </div>
            </div>
          </div>

          {candidate.sourceLink && (
            <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700, marginBottom: 4 }}>TRACKING URL / UTM PARAMETERS</div>
              <div style={{ fontSize: '0.8rem', wordBreak: 'break-all', color: 'var(--text-secondary)' }}>
                {candidate.sourceLink}
              </div>
            </div>
          )}

          {candidate.notes && (
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>Screening & Interview Remarks</div>
              <div style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 8, fontSize: '0.875rem', whiteSpace: 'pre-line', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                {candidate.notes}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Applied on: {new Date(candidate.createdAt).toLocaleString('en-IN')}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline" onClick={onClose}>Close</button>
              <button className="btn btn-primary" onClick={() => { onClose(); onEdit(candidate); }}>Edit Details</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Bulk Upload Modal for EV Pilots ─────────────────────────────────────────
const BulkUploadModal = ({ onClose, onUploaded }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const downloadPilotTemplate = () => {
    const csvContent = "Name,Phone,Email,City,Preferred Area,License Type,Experience,Source,Notes\n" +
      "Murugan K,9876543210,murugan@example.com,Chennai,Central Chennai,Commercial 3-Wheeler Auto Badge,2 to 5 Years,Direct Walk-in,Valid badge verified\n" +
      "Selvam R,9123456789,,Chennai,Airport / Guindy,Commercial 3-Wheeler Auto Badge,5+ Years Veteran,Auto Stand Poster,E-Auto driving test completed\n";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "owngo_ev_pilots_upload_template.csv";
    a.click();
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select a CSV or Excel file');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await api.post('/job-requests/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(res.data?.message || 'Bulk upload completed successfully');
      onUploaded();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal modal-md">
        <div className="modal-header">
          <h2 className="modal-title">Bulk Import EV Pilot Candidates</h2>
          <button className="modal-close" onClick={onClose}><RiCloseLine /></button>
        </div>
        <form onSubmit={handleUpload} style={{ padding: '20px 24px' }}>
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
              Upload a CSV or Excel spreadsheet containing EV Pilot driver candidate applications.
            </p>
            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: '0.825rem' }}
              onClick={downloadPilotTemplate}
            >
              <RiDownloadLine /> Download EV Pilots Template (.csv)
            </button>
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Select File (.csv, .xlsx)</label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="form-control"
              onChange={e => setFile(e.target.files[0])}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={uploading}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={uploading}>
              {uploading ? 'Importing...' : 'Upload & Import'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main Job Requests Page ──────────────────────────────────────────────────
const JobRequestsPage = () => {
  const { user } = useAuth();

  const [candidates, setCandidates] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [masterStatuses, setMasterStatuses] = useState([]);

  // Filters matching columns
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [preferredAreaFilter, setPreferredAreaFilter] = useState('');
  const [licenseTypeFilter, setLicenseTypeFilter] = useState('');
  const [assignedToFilter, setAssignedToFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [statusCounts, setStatusCounts] = useState({});

  // Selection
  const [selected, setSelected] = useState(new Set());

  // Modals
  const [modalCandidate, setModalCandidate] = useState(null);
  const [viewCandidate, setViewCandidate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [confirm, setConfirm] = useState({ open: false, candidate: null, bulk: false });

  // Fetch Master Statuses
  const fetchStatuses = useCallback(async () => {
    try {
      const res = await api.get('/job-request-statuses?activeOnly=true');
      if (res.data?.statuses && Array.isArray(res.data.statuses)) {
        setMasterStatuses(res.data.statuses);
      }
    } catch (e) {
      console.warn('Could not load job request statuses:', e);
    }
  }, []);

  // Fetch Team Users for Assignment
  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/leads/assignees');
      if (res.data?.assignees && Array.isArray(res.data.assignees)) {
        setUsers(res.data.assignees);
      }
    } catch (e) {
      console.warn('Could not load assignees:', e);
    }
  }, []);

  // Fetch Candidates List
  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    try {
      const params = new URLSearchParams({ page, limit });
      if (search) params.set('search', search);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (preferredAreaFilter && preferredAreaFilter !== 'all') params.set('preferredArea', preferredAreaFilter);
      if (licenseTypeFilter && licenseTypeFilter !== 'all') params.set('licenseType', licenseTypeFilter);
      if (assignedToFilter) params.set('assignedTo', assignedToFilter);
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate) params.set('toDate', toDate);

      const res = await api.get(`/job-requests?${params}`);
      setCandidates(res.data?.data || []);
      setTotal(res.data?.total || 0);
      setStatusCounts(res.data?.statusCounts || {});
    } catch (err) {
      toast.error('Failed to load EV Pilot candidates');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, preferredAreaFilter, licenseTypeFilter, assignedToFilter, fromDate, toDate]);

  useEffect(() => {
    fetchStatuses();
    fetchUsers();
  }, [fetchStatuses, fetchUsers]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  // Quick Status Change
  const handleQuickStatusChange = async (candidateId, newStatus) => {
    try {
      await api.put(`/job-requests/${candidateId}`, { status: newStatus });
      toast.success('Status updated');
      setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, status: newStatus } : c));
      fetchStatuses();
    } catch (e) {
      toast.error('Failed to update status');
    }
  };

  // Quick Reassign
  const handleQuickReassign = async (candidateId, userId) => {
    try {
      const res = await api.put(`/job-requests/${candidateId}`, { assignedTo: userId || null });
      toast.success('Assignee updated');
      const updatedAssignee = res.data?.data?.assignee || null;
      setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, assignedTo: userId, assignee: updatedAssignee } : c));
    } catch (e) {
      toast.error('Failed to reassign candidate');
    }
  };

  // Single Delete
  const handleDelete = async (candidate) => {
    try {
      await api.delete(`/job-requests/${candidate.id}`);
      toast.success('Candidate deleted');
      fetchCandidates();
    } catch (e) {
      toast.error('Failed to delete candidate');
    } finally {
      setConfirm({ open: false, candidate: null, bulk: false });
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    try {
      await api.delete('/job-requests/bulk-delete', { data: { ids: Array.from(selected) } });
      toast.success(`${selected.size} candidates deleted`);
      setSelected(new Set());
      fetchCandidates();
    } catch (e) {
      toast.error('Failed to delete selected candidates');
    } finally {
      setConfirm({ open: false, candidate: null, bulk: false });
    }
  };

  const [exporting, setExporting] = useState(false);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      let exportList = [];
      if (selected.size > 0) {
        exportList = candidates.filter(c => selected.has(c.id));
      } else {
        const params = new URLSearchParams({ page: 1, limit: 10000 });
        if (search) params.set('search', search);
        if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
        if (preferredAreaFilter && preferredAreaFilter !== 'all') params.set('preferredArea', preferredAreaFilter);
        if (licenseTypeFilter && licenseTypeFilter !== 'all') params.set('licenseType', licenseTypeFilter);
        if (fromDate) params.set('fromDate', fromDate);
        if (toDate) params.set('toDate', toDate);

        const res = await api.get(`/job-requests?${params}`);
        exportList = res.data?.data || candidates;
      }

      if (!exportList || exportList.length === 0) {
        toast.error('No candidates available to export');
        setExporting(false);
        return;
      }

      const headers = [
        'ID',
        'Driver Name',
        'Phone Number',
        'Email',
        'City',
        'Preferred Area',
        'License & Badge',
        'Experience',
        'Source',
        'Source Link',
        'Status',
        'Follow Up Date',
        'Notes',
        'Applied Date'
      ];

      const escapeCSV = (val) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const rows = exportList.map(c => [
        escapeCSV(c.id),
        escapeCSV(c.name),
        escapeCSV(c.phone),
        escapeCSV(c.email || ''),
        escapeCSV(c.city || ''),
        escapeCSV(c.preferredArea || ''),
        escapeCSV(c.licenseType || ''),
        escapeCSV(c.experience || ''),
        escapeCSV(c.source || ''),
        escapeCSV(c.sourceLink || ''),
        escapeCSV(c.status || ''),
        escapeCSV(c.nextFollowUp || ''),
        escapeCSV(c.notes || ''),
        escapeCSV(c.createdAt ? new Date(c.createdAt).toISOString().split('T')[0] : '')
      ].join(','));

      const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `owngo_ev_pilots_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${exportList.length} candidates to CSV! 📄`);
    } catch (err) {
      toast.error('Failed to export candidates');
    } finally {
      setExporting(false);
    }
  };

  // Select All Toggle
  const toggleSelectAll = () => {
    if (selected.size === candidates.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(candidates.map(c => c.id)));
    }
  };

  // Individual Select Toggle
  const toggleSelectOne = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  // Get status color & badge
  const getStatusBadge = (statusKey) => {
    const found = masterStatuses.find(s => s.key === statusKey || s.name.toLowerCase() === statusKey?.toLowerCase());
    if (found) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 20,
            fontSize: '0.75rem',
            fontWeight: 700,
            backgroundColor: `${found.color}1a`,
            color: found.color,
            border: `1px solid ${found.color}40`
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: found.color }} />
          {found.name}
        </span>
      );
    }
    return (
      <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>
        {statusKey || 'New'}
      </span>
    );
  };

  return (
    <AppLayout>
      <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 40 }}>
        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', fontSize: '1.4rem' }}>
                <RiSteering2Line />
              </div>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Job Requests (EV Pilot Drivers)
                </h1>
                <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Commercial EV 3-Wheeler Auto driver applications, badge screening & recruitment
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              className="btn btn-outline"
              onClick={handleExportCSV}
              disabled={exporting}
              id="export-pilots-csv-btn"
              title="Export Candidates to CSV"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <RiDownloadLine style={{ color: '#10b981' }} /> {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
            <button className="btn btn-outline" onClick={() => setShowUpload(true)}>
              <RiUpload2Line /> Bulk Upload
            </button>
            <button className="btn btn-primary" onClick={() => { setModalCandidate(null); setShowModal(true); }}>
              <RiUserAddLine /> Add Pilot Candidate
            </button>
          </div>
        </div>

        {/* ── Filters Card Matching EV Pilot Columns ── */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px', marginBottom: 20, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, alignItems: 'center' }}>
            {/* 1. Search */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gridColumn: 'span 2' }}>
              <RiSearchLine style={{ position: 'absolute', left: 12, color: search ? 'var(--accent)' : 'var(--text-muted)', fontSize: '1.1rem' }} />
              <input
                type="text"
                placeholder="Search driver name, phone, area, notes..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={{
                  width: '100%',
                  background: 'var(--bg-secondary)',
                  border: search ? '1px solid var(--accent)' : '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '10px 36px 10px 38px',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => { setSearch(''); setPage(1); }}
                  style={{ position: 'absolute', right: 10, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <RiCloseLine />
                </button>
              )}
            </div>

            {/* 2. Status Filter */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <RiFilterLine style={{ position: 'absolute', left: 12, color: statusFilter ? 'var(--accent)' : 'var(--text-muted)', fontSize: '1.05rem', pointerEvents: 'none' }} />
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                style={{
                  width: '100%',
                  background: 'var(--bg-secondary)',
                  border: statusFilter ? '1px solid var(--accent)' : '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '10px 28px 10px 36px',
                  color: statusFilter ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontSize: '0.875rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="">All Statuses ({total})</option>
                {masterStatuses.map(s => (
                  <option key={s.id || s.key} value={s.key}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* 3. License Type Filter */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <RiShieldCheckLine style={{ position: 'absolute', left: 12, color: licenseTypeFilter ? 'var(--accent)' : 'var(--text-muted)', fontSize: '1.05rem', pointerEvents: 'none' }} />
              <select
                value={licenseTypeFilter}
                onChange={e => { setLicenseTypeFilter(e.target.value); setPage(1); }}
                style={{
                  width: '100%',
                  background: 'var(--bg-secondary)',
                  border: licenseTypeFilter ? '1px solid var(--accent)' : '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '10px 28px 10px 36px',
                  color: licenseTypeFilter ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontSize: '0.875rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="">All License Badges</option>
                <option value="Commercial 3-Wheeler Auto Badge">Commercial Auto Badge</option>
                <option value="Commercial 4-Wheeler Transport Badge">Commercial Transport</option>
                <option value="LMV Passenger Commercial">LMV Commercial</option>
                <option value="Badge Applied / In Process">Badge in Process</option>
              </select>
            </div>

            {/* 4. From Date */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <RiCalendarLine style={{ position: 'absolute', left: 12, color: fromDate ? 'var(--accent)' : 'var(--text-muted)', fontSize: '1.05rem', pointerEvents: 'none' }} />
              <input
                type="date"
                value={fromDate}
                onChange={e => { setFromDate(e.target.value); setPage(1); }}
                style={{
                  width: '100%',
                  background: 'var(--bg-secondary)',
                  border: fromDate ? '1px solid var(--accent)' : '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '10px 10px 10px 36px',
                  color: fromDate ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              />
            </div>

            {/* 5. To Date */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <RiCalendarLine style={{ position: 'absolute', left: 12, color: toDate ? 'var(--accent)' : 'var(--text-muted)', fontSize: '1.05rem', pointerEvents: 'none' }} />
              <input
                type="date"
                value={toDate}
                onChange={e => { setToDate(e.target.value); setPage(1); }}
                style={{
                  width: '100%',
                  background: 'var(--bg-secondary)',
                  border: toDate ? '1px solid var(--accent)' : '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '10px 10px 10px 36px',
                  color: toDate ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              />
            </div>

            {/* Reset Filters */}
            {(search || statusFilter || licenseTypeFilter || fromDate || toDate) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('');
                  setLicenseTypeFilter('');
                  setAssignedToFilter('');
                  setFromDate('');
                  setToDate('');
                  setPage(1);
                }}
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#ef4444',
                  borderRadius: 10,
                  padding: '0 16px',
                  minHeight: 42,
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                <RiRefreshLine /> Reset Filters
              </button>
            )}
          </div>

          {/* Bulk actions bar */}
          {selected.size > 0 && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent)' }}>
                {selected.size} candidate(s) selected
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={handleExportCSV}
                  disabled={exporting}
                  id="bulk-export-pilots-btn"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <RiDownloadLine style={{ color: '#10b981' }} /> Export Selected ({selected.size})
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => setConfirm({ open: true, candidate: null, bulk: true })}
                >
                  <RiDeleteBin5Line /> Delete Selected ({selected.size})
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Table Card ── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow-sm)' }}>
          <div className="table-responsive" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="table table-sticky-actions" style={{ margin: 0, minWidth: 1150 }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                  <th style={{ width: 44, paddingLeft: 18, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={candidates.length > 0 && selected.size === candidates.length}
                      onChange={toggleSelectAll}
                      style={{ cursor: 'pointer', width: 16, height: 16, accentColor: '#10b981' }}
                    />
                  </th>
                  <th style={{ minWidth: 230, whiteSpace: 'nowrap', padding: '14px 16px' }}>DRIVER / CANDIDATE</th>
                  <th style={{ minWidth: 180, whiteSpace: 'nowrap', padding: '14px 16px' }}>CONTACT INFO</th>
                  <th style={{ minWidth: 170, whiteSpace: 'nowrap', padding: '14px 16px' }}>LICENSE & BADGE</th>
                  <th style={{ minWidth: 130, whiteSpace: 'nowrap', padding: '14px 16px' }}>EXPERIENCE</th>
                  <th style={{ minWidth: 150, whiteSpace: 'nowrap', padding: '14px 16px' }}>SOURCE & LINK</th>
                  <th style={{ minWidth: 130, whiteSpace: 'nowrap', padding: '14px 16px' }}>FOLLOW UP</th>
                  <th style={{ minWidth: 150, whiteSpace: 'nowrap', padding: '14px 16px' }}>STATUS</th>
                  <th style={{ textAlign: 'center', width: 120, whiteSpace: 'nowrap', padding: '14px 16px' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                      <div className="spinner spinner-md" style={{ margin: '0 auto 12px' }} />
                      Loading EV Pilot driver candidates...
                    </td>
                  </tr>
                ) : candidates.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                      No EV pilot candidates found matching your filters.
                    </td>
                  </tr>
                ) : (
                  candidates.map(candidate => {
                    const isSelected = selected.has(candidate.id);
                    const badge = formatLicenseBadge(candidate.licenseType);
                    const loc = formatLocation(candidate.city, candidate.preferredArea);
                    const cleanPhone = (candidate.phone || '').replace(/[^0-9]/g, '');

                    return (
                      <tr
                        key={candidate.id}
                        className={isSelected ? 'row-selected' : ''}
                        style={{
                          background: isSelected ? 'rgba(16, 185, 129, 0.07)' : undefined,
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <td style={{ paddingLeft: 18, textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(candidate.id)}
                            style={{ cursor: 'pointer', width: 16, height: 16, accentColor: '#10b981' }}
                          />
                        </td>

                        {/* Driver / Candidate */}
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
                              {(candidate.name || '?').charAt(0).toUpperCase()}
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
                                onClick={() => setViewCandidate(candidate)}
                              >
                                {candidate.name}
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
                                <span>{loc}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Contact Info */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <a
                              href={`tel:${candidate.phone}`}
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
                              {candidate.phone}
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
                          {candidate.email && (
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                              <RiMailLine style={{ fontSize: '0.75rem' }} />
                              {candidate.email}
                            </div>
                          )}
                        </td>

                        {/* License & Badge */}
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '4px 10px',
                            borderRadius: 6,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: badge.color,
                            background: badge.bg,
                            border: `1px solid ${badge.color}35`,
                            whiteSpace: 'nowrap'
                          }}>
                            <RiSteering2Line style={{ fontSize: '0.8rem' }} />
                            {badge.label}
                          </span>
                        </td>

                        {/* Experience */}
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            color: 'var(--text-secondary)',
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid var(--border)'
                          }}>
                            <RiTimeLine style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }} />
                            {candidate.experience || '—'}
                          </span>
                        </td>

                        {/* Source & Link */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            <RiGlobalLine style={{ color: '#0ea5e9', fontSize: '0.85rem' }} />
                            <span>{candidate.source || 'Direct Entry'}</span>
                          </div>
                          {candidate.sourceLink && (
                            <div>
                              <a
                                href={candidate.sourceLink}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  fontSize: '0.72rem',
                                  color: 'var(--accent)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 3,
                                  marginTop: 2,
                                  textDecoration: 'none',
                                  fontWeight: 600
                                }}
                              >
                                View URL <RiExternalLinkLine style={{ fontSize: '0.75rem' }} />
                              </a>
                            </div>
                          )}
                        </td>

                        {/* Follow Up */}
                        <td style={{ padding: '12px 16px' }}>
                          {candidate.nextFollowUp ? (
                            <div style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <RiCalendarLine /> {candidate.nextFollowUp}
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>

                        {/* Status (Quick Dropdown) */}
                        <td style={{ padding: '12px 16px' }}>
                          <select
                            value={candidate.status}
                            onChange={e => handleQuickStatusChange(candidate.id, e.target.value)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: 8,
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              background: 'var(--bg-secondary)',
                              border: '1px solid var(--border)',
                              color: 'var(--text-primary)',
                              cursor: 'pointer',
                              outline: 'none',
                              width: '100%',
                              minWidth: 120
                            }}
                          >
                            {masterStatuses.map(s => (
                              <option key={s.id || s.key} value={s.key} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: 'center', padding: '10px 14px' }}>
                          <div style={{ display: 'inline-flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                            <button
                              type="button"
                              className="action-btn action-btn-view"
                              title="View Details"
                              onClick={() => setViewCandidate(candidate)}
                            >
                              <RiEyeLine />
                            </button>
                            <button
                              type="button"
                              className="action-btn action-btn-edit"
                              title="Edit Candidate"
                              onClick={() => { setModalCandidate(candidate); setShowModal(true); }}
                            >
                              <RiEditLine />
                            </button>
                            <button
                              type="button"
                              className="action-btn action-btn-delete"
                              title="Delete Candidate"
                              onClick={() => setConfirm({ open: true, candidate, bulk: false })}
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

          {/* Pagination */}
          <PaginationBar
            page={page}
            setPage={setPage}
            total={total}
            limit={limit}
            setLimit={setLimit}
            label="EV Pilot candidates"
          />
        </div>

        {/* Candidate Add/Edit Modal */}
        {showModal && (
          <CandidateModal
            candidate={modalCandidate}
            users={users}
            masterStatuses={masterStatuses}
            onClose={() => { setShowModal(false); setModalCandidate(null); }}
            onSaved={() => { setShowModal(false); setModalCandidate(null); fetchCandidates(); }}
          />
        )}

        {/* View Details Modal */}
        {viewCandidate && (
          <ViewCandidateModal
            candidate={viewCandidate}
            onClose={() => setViewCandidate(null)}
            onEdit={(cand) => { setViewCandidate(null); setModalCandidate(cand); setShowModal(true); }}
          />
        )}

        {/* Bulk Upload Modal */}
        {showUpload && (
          <BulkUploadModal
            onClose={() => setShowUpload(false)}
            onUploaded={() => { setShowUpload(false); fetchCandidates(); }}
          />
        )}

        {/* Delete Confirmation */}
        <ConfirmModal
          isOpen={confirm.open}
          title={confirm.bulk ? "Delete Selected Candidates?" : "Delete Pilot Candidate?"}
          message={confirm.bulk
            ? `Are you sure you want to permanently delete ${selected.size} selected candidates? This action cannot be undone.`
            : `Are you sure you want to delete ${confirm.candidate?.name}? This action cannot be undone.`
          }
          confirmLabel={confirm.bulk ? `Delete (${selected.size})` : "Delete"}
          confirmVariant="danger"
          onConfirm={() => confirm.bulk ? handleBulkDelete() : handleDelete(confirm.candidate)}
          onCancel={() => setConfirm({ open: false, candidate: null, bulk: false })}
        />
      </div>
    </AppLayout>
  );
};

export default JobRequestsPage;
