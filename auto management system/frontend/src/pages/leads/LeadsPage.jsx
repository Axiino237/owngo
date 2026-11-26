import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  RiUserAddLine, RiSearchLine, RiEditLine, RiDeleteBinLine,
  RiRefreshLine, RiCloseLine, RiSaveLine, RiPhoneLine,
  RiMailLine, RiMoneyDollarBoxLine, RiFilterLine,
  RiUpload2Line, RiDownloadLine, RiCheckboxLine, RiCheckboxBlankLine,
  RiDeleteBin5Line, RiFileExcelLine, RiCheckboxMultipleLine, RiEyeLine, RiDraftLine,
  RiCalendarLine, RiBuilding2Line, RiUserLine, RiSettings4Line, RiExternalLinkLine, RiAddLine,
  RiMapPinLine, RiShareForwardLine, RiWhatsappLine
} from 'react-icons/ri';
import AppLayout from '../../components/AppLayout';
import ConfirmModal from '../../components/ConfirmModal';
import PaginationBar from '../../components/PaginationBar';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';

// Status config
const STATUS_CONFIG = {
  new:                  { label: 'New',                  cls: 'badge-info',      dot: '#06b6d4' },
  not_answering:        { label: 'Not Answering',        cls: 'badge-warning',   dot: '#f59e0b' },
  number_busy:          { label: 'Number Busy',          cls: 'badge-warning',   dot: '#fb923c' },
  not_interested:       { label: 'Not Interested',       cls: 'badge-secondary', dot: '#94a3b8' },
  not_participating:    { label: 'Not Participating',    cls: 'badge-danger',    dot: '#f87171' },
  requirement_received: { label: 'Requirement Received', cls: 'badge-info',      dot: '#38bdf8' },
  call_back:            { label: 'Call Back',            cls: 'badge-warning',   dot: '#eab308' },
  follow_ups:           { label: 'Follow Ups',           cls: 'badge-accent',    dot: '#a855f7' },
  design_sent:          { label: 'Design Sent',          cls: 'badge-accent',    dot: '#6366f1' },
  quote_sent:           { label: 'Quote Sent',           cls: 'badge-info',      dot: '#0284c7' },
  converted:            { label: 'Sales Closed',         cls: 'badge-success',   dot: '#10b981' },
  shell_scheme:         { label: 'Shell Scheme',         cls: 'badge-accent',    dot: '#ec4899' },
};

const getStatusConfig = (st, masterStatuses = []) => {
  if (masterStatuses && masterStatuses.length > 0) {
    const found = masterStatuses.find(m => m.key === st || m.slug === st || m.name?.toLowerCase() === st?.toLowerCase());
    if (found) {
      return {
        label: found.name,
        cls: found.colorClass || 'badge-info',
        dot: found.color || '#38bdf8'
      };
    }
  }
  if (st && STATUS_CONFIG[st]) return STATUS_CONFIG[st];
  if (st === 'contacted') return STATUS_CONFIG.not_answering;
  if (st === 'qualified') return STATUS_CONFIG.requirement_received;
  if (st === 'lost') return STATUS_CONFIG.not_participating;
  if (st === 'sales_closed') return STATUS_CONFIG.converted;
  if (st === 'shell_scheme' || st === 'shell scheme') return STATUS_CONFIG.shell_scheme;
  return STATUS_CONFIG.new;
};

const EXPO_LABELS = {
  website: 'Website', referral: 'Referral', social_media: 'Social Media',
  cold_call: 'Cold Call', email: 'Email', other: 'Other'
};

const EMPTY_FORM = {
  name: '', companyName: '', email: '', phone: '',
  status: 'new', leadType: 'partner', source: 'Website', sourceLink: '',
  autosCount: 1, city: 'Chennai', cibilScore: '',
  licenseType: '', preferredArea: '', experience: '',
  expo: 'other', value: '', notes: '', assignedTo: '',
  designation: '', expoType: '', expoName: '', expoId: '', address: '',
  expoMode: '', lastContactedDate: '', nextFollowUp: '', alternatePhone: '',
  expoDate: '', productionDate: ''
};

const MODAL_INPUT_STYLE = { width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
const MODAL_LABEL_STYLE = { fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, display: 'block' };

const MoveToDesignRow = ({ children }) => (
  <div className="form-grid-2" style={{ gap: 14, marginBottom: 14 }}>
    {children}
  </div>
);

const MoveToDesignField = ({ label, value, onChange, type = 'text', placeholder }) => (
  <div>
    <label style={MODAL_LABEL_STYLE}>{label}</label>
    <input type={type} placeholder={placeholder || ''} value={value} onChange={onChange} style={MODAL_INPUT_STYLE} />
  </div>
);

const MoveToDesignSelectField = ({ label, value, onChange, options }) => (
  <div>
    <label style={MODAL_LABEL_STYLE}>{label}</label>
    <select value={value} onChange={onChange} style={{ ...MODAL_INPUT_STYLE, cursor: 'pointer' }}>
      <option value="">Select...</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

// ── Move to Design Form ───────────────────────────────────────────────────────
const MoveToDesignModal = ({ lead, onClose, onDone }) => {
  const [form, setForm] = useState({
    companyName: lead?.companyName || lead?.name || '',
    website: '',
    exhibitionName: '',
    stallNo: '',
    hallNo: '',
    stallSize: '',
    sidesOpen: '',
    receptionCounter: '',
    roundTableBarStool: '',
    closedMeetingRoom: '',
    productDisplayPodiums: '',
    productNature: '',
    productsCount: '',
    postersRequired: '',
    brochureStand: '',
    pantryStorageArea: '',
    plasmaTV: '',
    flooringType: '',
    otherInfo: '',
    colorScheme: '',
    approxBudget: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.companyName.trim()) return toast.error('Company Name is required');
    setSaving(true);
    try {
      const fd = new FormData();
      if (lead?.id) fd.append('leadId', lead.id);
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (imageFile) fd.append('referenceImage', imageFile);
      await api.post('/designs', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Moved to Design team successfully!');
      onDone?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit design order');
    }
    setSaving(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 820, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              🎨 Move to Design Team
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0, marginTop: 4 }}>Fill in the stall design requirements. Auto-filled from lead data where available.</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.25rem', display: 'flex' }}><RiCloseLine /></button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          {/* Section 1: Client Info */}
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Client Information</div>
          <MoveToDesignRow>
            <MoveToDesignField label="Company Name *" value={form.companyName} onChange={e => set('companyName', e.target.value)} placeholder="Required" />
            <MoveToDesignField label="Website" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://..." />
          </MoveToDesignRow>
          <MoveToDesignRow>
            <MoveToDesignField label="Exhibition Name" value={form.exhibitionName} onChange={e => set('exhibitionName', e.target.value)} placeholder="e.g. MEDICALL 2026" />
            <div />
          </MoveToDesignRow>

          {/* Section 2: Stall Info */}
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, marginTop: 8 }}>Requirements for Stall Design</div>
          <MoveToDesignRow>
            <MoveToDesignField label="Stall No." value={form.stallNo} onChange={e => set('stallNo', e.target.value)} />
            <MoveToDesignField label="Hall No." value={form.hallNo} onChange={e => set('hallNo', e.target.value)} />
          </MoveToDesignRow>
          <MoveToDesignRow>
            <MoveToDesignField label="Stall Size" value={form.stallSize} onChange={e => set('stallSize', e.target.value)} placeholder="e.g. 6m x 3m" />
            <MoveToDesignField label="No. of Sides Open" value={form.sidesOpen} onChange={e => set('sidesOpen', e.target.value)} placeholder="e.g. 3 sides open" />
          </MoveToDesignRow>
          <MoveToDesignRow>
            <MoveToDesignSelectField label="Reception Counter (y/n)" value={form.receptionCounter} onChange={e => set('receptionCounter', e.target.value)} options={['y', 'n']} />
            <MoveToDesignField label="Round Table + Bar Stool (y/n + count)" value={form.roundTableBarStool} onChange={e => set('roundTableBarStool', e.target.value)} placeholder="e.g. y, 2" />
          </MoveToDesignRow>
          <MoveToDesignRow>
            <MoveToDesignField label="Closed Meeting Room (y/n + count)" value={form.closedMeetingRoom} onChange={e => set('closedMeetingRoom', e.target.value)} placeholder="e.g. n" />
            <MoveToDesignSelectField label="Product Display Podiums (y/n)" value={form.productDisplayPodiums} onChange={e => set('productDisplayPodiums', e.target.value)} options={['y', 'n', 'L-shaped podium', 'Other']} />
          </MoveToDesignRow>

          {/* Products */}
          <div style={{ marginBottom: 14 }}>
            <label style={MODAL_LABEL_STYLE}>Nature / Specifications of Products to be Displayed</label>
            <textarea value={form.productNature} onChange={e => set('productNature', e.target.value)} rows={2} placeholder="Describe products..." style={{ ...MODAL_INPUT_STYLE, resize: 'vertical', minHeight: 60 }} />
          </div>
          <MoveToDesignRow>
            <MoveToDesignField label="No. of Products / Dimensions" value={form.productsCount} onChange={e => set('productsCount', e.target.value)} placeholder="e.g. 10 items, 30x40cm each" />
            <MoveToDesignSelectField label="Posters Required" value={form.postersRequired} onChange={e => set('postersRequired', e.target.value)} options={['Flex', 'Backlit', 'Sunboard', 'None']} />
          </MoveToDesignRow>
          <MoveToDesignRow>
            <MoveToDesignSelectField label="Brochure Stand (y/n)" value={form.brochureStand} onChange={e => set('brochureStand', e.target.value)} options={['y', 'n']} />
            <MoveToDesignSelectField label="Pantry / Storage Area (y/n)" value={form.pantryStorageArea} onChange={e => set('pantryStorageArea', e.target.value)} options={['y', 'n']} />
          </MoveToDesignRow>
          <MoveToDesignRow>
            <MoveToDesignSelectField label="Plasma TV (y/n)" value={form.plasmaTV} onChange={e => set('plasmaTV', e.target.value)} options={['y', 'n']} />
            <MoveToDesignSelectField label="Flooring Type" value={form.flooringType} onChange={e => set('flooringType', e.target.value)} options={['Carpet', 'Wooden Finish', 'Raised Platform', 'Other']} />
          </MoveToDesignRow>
          <MoveToDesignRow>
            <MoveToDesignField label="Color Scheme" value={form.colorScheme} onChange={e => set('colorScheme', e.target.value)} placeholder="e.g. Logo colors" />
            <MoveToDesignField label="Approx. Budget (Rs. Lacs)" value={form.approxBudget} onChange={e => set('approxBudget', e.target.value)} type="number" placeholder="e.g. 2.5" />
          </MoveToDesignRow>

          {/* Other info */}
          <div style={{ marginBottom: 14 }}>
            <label style={MODAL_LABEL_STYLE}>Any Other Information</label>
            <textarea value={form.otherInfo} onChange={e => set('otherInfo', e.target.value)} rows={2} placeholder="Any additional requirements..." style={{ ...MODAL_INPUT_STYLE, resize: 'vertical', minHeight: 60 }} />
          </div>

          {/* Reference Image */}
          <div style={{ marginBottom: 24 }}>
            <label style={MODAL_LABEL_STYLE}>Reference Image (optional)</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-secondary)', border: `2px dashed ${imageFile ? 'var(--success)' : 'var(--border)'}`, borderRadius: 10, padding: '14px 18px', cursor: 'pointer', transition: 'all 0.2s' }}>
              <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => setImageFile(e.target.files[0] || null)} />
              <RiDraftLine style={{ fontSize: '1.4rem', color: imageFile ? 'var(--success)' : 'var(--text-muted)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.875rem', color: imageFile ? 'var(--success)' : 'var(--text-secondary)' }}>
                {imageFile ? `📎 ${imageFile.name}` : 'Click to upload reference image or PDF (max 10MB)'}
              </span>
            </label>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 20, marginTop: 10 }}>
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ minWidth: 160 }}>
              {saving ? <><div className="spinner spinner-sm" /> Submitting...</> : <><RiDraftLine /> Send to Design Team</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const formatCurrency = (v) => {
  const n = parseFloat(v) || 0;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
};

// ── Lead Modal ──────────────────────────────────────────────────────────────
const LeadModal = ({ lead, users = [], onClose, onSaved, masterStatuses = [] }) => {
  const leadType = 'partner';
  const [form, setForm] = useState(lead ? {
    name: lead.name || '',
    phone: lead.phone || '',
    email: lead.email || '',
    city: lead.city || 'Chennai',
    autosCount: lead.autosCount !== undefined && lead.autosCount !== null ? lead.autosCount : 1,
    cibilScore: lead.cibilScore || '750+',
    licenseType: lead.licenseType || 'Commercial 3-Wheeler Auto Badge',
    preferredArea: lead.preferredArea || 'Central Chennai',
    experience: lead.experience || '2 to 5 Years',
    source: lead.source || (lead?.leadType === 'pilot' ? 'Website Pilot Form' : 'Website Partner Form'),
    sourceLink: lead.sourceLink || '',
    status: lead.status || 'new',
    assignedTo: lead.assignedTo || '',
    nextFollowUp: lead.nextFollowUp || '',
    notes: lead.notes || ''
  } : {
    name: '',
    phone: '',
    email: '',
    city: 'Chennai',
    autosCount: 1,
    cibilScore: '750+',
    licenseType: 'Commercial 3-Wheeler Auto Badge',
    preferredArea: 'Central Chennai',
    experience: '2 to 5 Years',
    source: 'Direct Website',
    sourceLink: '',
    status: 'new',
    assignedTo: '',
    nextFollowUp: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name?.trim()) return toast.error(leadType === 'pilot' ? 'Driver Full Name is required' : 'Partner / Investor Name is required');
    if (!form.phone?.trim()) return toast.error('Phone number is required');
    setSaving(true);
    try {
      const cleanName = form.name.trim();
      const companyName = leadType === 'pilot' ? `EV Pilot Candidate - ${cleanName}` : `Fleet Partner - ${cleanName}`;
      const payload = {
        name: cleanName,
        companyName,
        leadType,
        phone: form.phone.trim(),
        email: form.email?.trim() || null,
        city: form.city || (leadType === 'pilot' ? form.preferredArea : 'Chennai'),
        autosCount: leadType === 'partner' ? (parseInt(form.autosCount, 10) || 1) : 1,
        cibilScore: leadType === 'partner' ? form.cibilScore : null,
        licenseType: leadType === 'pilot' ? form.licenseType : null,
        preferredArea: leadType === 'pilot' ? form.preferredArea : null,
        experience: leadType === 'pilot' ? form.experience : null,
        source: form.source?.trim() || 'Direct Website',
        sourceLink: form.sourceLink?.trim() || null,
        status: form.status || 'new',
        assignedTo: form.assignedTo || null,
        nextFollowUp: form.nextFollowUp || null,
        notes: form.notes?.trim() || null,
        lastContactedDate: form.status === 'new' ? null : new Date().toISOString().split('T')[0]
      };

      if (lead) {
        const res = await api.put(`/leads/${lead.id}`, payload);
        toast.success('Lead updated successfully!');
        onSaved(res.data?.lead);
      } else {
        const res = await api.post('/leads', payload);
        toast.success(leadType === 'pilot' ? 'EV Pilot candidate created!' : 'Fleet Partner lead created!');
        onSaved(res.data?.lead);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save lead');
    }
    setSaving(false);
  };

  const inputStyle = {
    width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '10px 14px', color: 'var(--text-primary)',
    fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit'
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            {lead ? '✏️ Edit Lead' : '➕ Add New Lead'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.25rem', display: 'flex' }}><RiCloseLine /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '22px 24px' }}>
          {/* Form fields */}
          <div className="form-grid-2" style={{ gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 5, fontWeight: 600 }}>
                Partner / Investor Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                style={inputStyle}
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Rajesh Sharma"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 5, fontWeight: 600 }}>
                Phone Number <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                style={inputStyle}
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="+91 XXXXX XXXXX"
                required
              />
            </div>

            {leadType === 'partner' ? (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 5, fontWeight: 600 }}>Email Address</label>
                  <input
                    style={inputStyle}
                    type="email"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    placeholder="partner@example.com"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 5, fontWeight: 600 }}>Target City</label>
                  <input
                    style={inputStyle}
                    value={form.city}
                    onChange={e => set('city', e.target.value)}
                    placeholder="e.g. Chennai"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 5, fontWeight: 600 }}>Number of Autos</label>
                  <input
                    style={inputStyle}
                    type="number"
                    min="1"
                    value={form.autosCount}
                    onChange={e => set('autosCount', parseInt(e.target.value, 10) || 1)}
                    placeholder="1"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 5, fontWeight: 600 }}>CIBIL Score Range</label>
                  <select
                    style={{ ...inputStyle, cursor: 'pointer' }}
                    value={form.cibilScore}
                    onChange={e => set('cibilScore', e.target.value)}
                  >
                    <option value="750+">Excellent (750+)</option>
                    <option value="700 - 749">Good (700 - 749)</option>
                    <option value="650 - 699">Average (650 - 699)</option>
                    <option value="Below 650">Below 650</option>
                  </select>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 5, fontWeight: 600 }}>Preferred Zone / Area</label>
                  <input
                    style={inputStyle}
                    value={form.preferredArea}
                    onChange={e => set('preferredArea', e.target.value)}
                    placeholder="e.g. Anna Nagar / Central Chennai"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 5, fontWeight: 600 }}>License / Badge Type</label>
                  <select
                    style={{ ...inputStyle, cursor: 'pointer' }}
                    value={form.licenseType}
                    onChange={e => set('licenseType', e.target.value)}
                  >
                    <option value="Commercial 3-Wheeler Auto Badge">Commercial 3-Wheeler Auto Badge</option>
                    <option value="Commercial 4-Wheeler LMV">Commercial 4-Wheeler LMV</option>
                    <option value="Non-Commercial Driver License">Non-Commercial Driver License</option>
                    <option value="Badge in Process">Badge in Process</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 5, fontWeight: 600 }}>Driving Experience</label>
                  <select
                    style={{ ...inputStyle, cursor: 'pointer' }}
                    value={form.experience}
                    onChange={e => set('experience', e.target.value)}
                  >
                    <option value="Less than 1 Year">Less than 1 Year</option>
                    <option value="1 to 2 Years">1 to 2 Years</option>
                    <option value="2 to 5 Years">2 to 5 Years</option>
                    <option value="5+ Years">5+ Years</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 5, fontWeight: 600 }}>Email Address (Optional)</label>
                  <input
                    style={inputStyle}
                    type="email"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    placeholder="driver@example.com (optional)"
                  />
                </div>
              </>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 5, fontWeight: 600 }}>Lead Source</label>
              <input
                style={inputStyle}
                value={form.source}
                onChange={e => set('source', e.target.value)}
                placeholder="e.g. Website, Instagram, Referral"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 5, fontWeight: 600 }}>Source Link (URL)</label>
              <input
                style={inputStyle}
                value={form.sourceLink}
                onChange={e => set('sourceLink', e.target.value)}
                placeholder="https://example.com/?ref=..."
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 5, fontWeight: 600 }}>Status</label>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={form.status}
                onChange={e => set('status', e.target.value)}
              >
                {masterStatuses.length > 0 ? (
                  masterStatuses.map(m => (
                    <option key={m.id || m.key} value={m.key || m.slug}>
                      {m.name}
                    </option>
                  ))
                ) : (
                  Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)
                )}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 5, fontWeight: 600 }}>Assign To Staff</label>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={form.assignedTo}
                onChange={e => set('assignedTo', e.target.value)}
              >
                <option value="">Unassigned</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 5, fontWeight: 600 }}>Next Follow Up Date</label>
              <input
                style={inputStyle}
                type="date"
                value={form.nextFollowUp}
                onChange={e => set('nextFollowUp', e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 5, fontWeight: 600 }}>Remarks / Notes</label>
            <textarea
              style={{ ...inputStyle, minHeight: 64, resize: 'vertical' }}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Any comments, call notes, or follow-up details..."
            />
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <div className="spinner spinner-sm" /> : <RiSaveLine />}
              {saving ? 'Saving...' : (lead ? 'Update Lead' : 'Create Lead')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── View Lead Modal ─────────────────────────────────────────────────────────
const ViewLeadModal = ({ lead, onClose, masterStatuses = [] }) => {
  if (!lead) return null;
  const st = getStatusConfig(lead.status, masterStatuses);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
          <h3 style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>🎯 Lead Profile</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.25rem' }}><RiCloseLine /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: '0.875rem' }}>
          {/* Lead Type Banner */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, background: lead.leadType === 'pilot' ? 'rgba(250,204,21,0.08)' : 'rgba(16,185,129,0.08)', padding: '10px 14px', borderRadius: 10, border: `1px solid ${lead.leadType === 'pilot' ? 'rgba(250,204,21,0.3)' : 'rgba(16,185,129,0.3)'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {lead.leadType === 'pilot' ? (
                <span className="badge badge-warning" style={{ fontWeight: 800, fontSize: '0.82rem' }}>🛺 EV Pilot Driver Candidate</span>
              ) : (
                <span className="badge badge-success" style={{ fontWeight: 800, fontSize: '0.82rem' }}>🏢 Fleet Partner (₹1 Lakh)</span>
              )}
            </div>
            <span className={`badge ${st.cls}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.dot }} />
              {st.label}
            </span>
          </div>

          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Company / Application</div>
            <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.05rem' }}>{lead.companyName || '—'}</div>
          </div>
          {lead.name && (
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Contact Person</div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{lead.name} {lead.designation ? `(${lead.designation})` : ''}</div>
            </div>
          )}
          <div className="form-grid-2" style={{ gap: 12 }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Email</div>
              <div style={{ color: 'var(--text-primary)' }}>{lead.email || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Phone Number</div>
              <div style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{lead.phone || '—'}</div>
            </div>
          </div>

          {/* Lead Source & Source Link Display */}
          <div className="form-grid-2" style={{ gap: 12, background: 'rgba(255,255,255,0.02)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Source</div>
              <span className="badge badge-secondary" style={{ fontWeight: 700 }}>{lead.source || 'Direct Website'}</span>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Source Link</div>
              {lead.sourceLink ? (
                <a
                  href={lead.sourceLink.startsWith('http') ? lead.sourceLink : `https://${lead.sourceLink}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--accent)', fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none' }}
                >
                  <RiExternalLinkLine /> View Source Link
                </a>
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Direct / None</span>
              )}
            </div>
          </div>

          {/* Category specific cards */}
          {lead.leadType === 'pilot' ? (
            <div style={{ background: 'rgba(250,204,21,0.05)', border: '1px solid rgba(250,204,21,0.25)', borderRadius: 10, padding: 12 }}>
              <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#facc15', marginBottom: 8, textTransform: 'uppercase' }}>
                🛺 EV Pilot Details
              </div>
              <div className="form-grid-2" style={{ gap: 10 }}>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>License Type</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{lead.licenseType || 'Auto Rickshaw (3-Wheeler)'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Preferred Hub / Zone</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{lead.preferredArea || lead.city || 'Central Chennai'}</div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Experience</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{lead.experience || '1-3 Years'}</div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 10, padding: 12 }}>
              <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#10b981', marginBottom: 8, textTransform: 'uppercase' }}>
                🏢 Fleet Partner Investment
              </div>
              <div className="form-grid-2" style={{ gap: 10 }}>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Autos Requested</div>
                  <div style={{ fontWeight: 700, color: '#10b981' }}>{lead.autosCount || 1} Auto(s) · ₹{(lead.autosCount || 1) * 1} Lakhs</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Target City</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{lead.city || 'Chennai'}</div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>CIBIL Score Range</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{lead.cibilScore || '750+ (Fast Track)'}</div>
                </div>
              </div>
            </div>
          )}
          {lead.alternatePhone && (
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Alternate Phone</div>
              <div style={{ color: 'var(--text-primary)' }}>{lead.alternatePhone}</div>
            </div>
          )}
          <div className="form-grid-2" style={{ gap: 12 }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Expo Type</div>
              <div style={{ color: 'var(--text-primary)' }}>{lead.expoType || EXPO_LABELS[lead.expo] || lead.expo || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Expo Name / Mode</div>
              <div style={{ color: 'var(--text-primary)' }}>{lead.expoName ? `${lead.expoName} ${lead.expoMode ? `(${lead.expoMode})` : ''}` : '—'}</div>
            </div>
          </div>
          <div className="form-grid-2" style={{ gap: 12 }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Uploaded Date</div>
              <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Last Contacted</div>
              <div style={{ color: 'var(--text-primary)' }}>{lead.lastContactedDate || '—'}</div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Next Follow Up</div>
            <div style={{ color: 'var(--warning)', fontWeight: 700 }}>{lead.nextFollowUp || '—'}</div>
          </div>
          {(lead.expoDate || lead.productionDate) && (
            <div style={{ display: 'flex', gap: 16 }}>
              {lead.expoDate && (
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Expo Date</div>
                  <div style={{ color: 'var(--info)', fontWeight: 700 }}>{lead.expoDate}</div>
                </div>
              )}
              {lead.productionDate && (
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Production Date</div>
                  <div style={{ color: 'var(--accent)', fontWeight: 700 }}>{lead.productionDate}</div>
                </div>
              )}
            </div>
          )}
          {lead.address && (
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Address</div>
              <div style={{ color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>{lead.address}</div>
            </div>
          )}
          {lead.notes && (
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Remarks / Notes</div>
              <div style={{ color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>{lead.notes}</div>
            </div>
          )}
          {(lead.status === 'quote_sent' || Number(lead.value) > 0) && (
            <div style={{
              background: 'rgba(234, 179, 8, 0.08)',
              border: '1px solid rgba(234, 179, 8, 0.25)',
              borderRadius: 8,
              padding: '10px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#eab308', textTransform: 'uppercase', fontWeight: 700 }}>Quote Value</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fef08a' }}>
                  {Number(lead.value) > 0 ? `₹${Number(lead.value).toLocaleString('en-IN')}` : 'Not Specified'}
                </div>
              </div>
              <span className="badge badge-warning" style={{ fontWeight: 700 }}>Quote Sent</span>
            </div>
          )}
          <div className="form-grid-2" style={{ gap: 12, borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 6 }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Status</div>
              <span className={`badge ${st.cls}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.dot }} />
                {st.label}
              </span>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Assigned To</div>
              <div style={{ color: 'var(--text-primary)' }}>{lead.assignee?.name || 'Unassigned'}</div>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 20, textAlign: 'right' }}>
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

// ── Quote Value Quick Modal ─────────────────────────────────────────────
const QuoteValueModal = ({ lead, onClose, onSaved }) => {
  const [val, setVal] = useState(lead?.value ? String(lead.value) : '');
  const [saving, setSaving] = useState(false);

  if (!lead) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const numVal = parseFloat(val) || 0;
      const res = await api.put(`/leads/${lead.id}`, { value: numVal, status: 'quote_sent' });
      toast.success(`Quote value ₹${numVal.toLocaleString('en-IN')} saved!`);
      if (onSaved) onSaved(res.data?.lead || { ...lead, value: numVal, status: 'quote_sent' });
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update quote value');
    } finally {
      setSaving(false);
    }
  };

  const modalInputStyle = {
    width: '100%',
    background: 'var(--bg-secondary)',
    border: '1px solid rgba(234, 179, 8, 0.4)',
    borderRadius: 8,
    padding: '8px 12px 8px 30px',
    color: '#fef08a',
    fontSize: '1.05rem',
    fontWeight: 700,
    outline: 'none',
    boxSizing: 'border-box'
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(234, 179, 8, 0.4)', borderRadius: 16, width: '100%', maxWidth: 420, padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.25rem' }}>💰</span>
            <h3 style={{ fontWeight: 800, fontSize: '1.05rem', color: '#facc15', margin: 0 }}>Quote Value</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.2rem' }}><RiCloseLine /></button>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: 16 }}>
          Enter the quotation amount for <strong>{lead.companyName || lead.name || 'this lead'}</strong>.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>
              Amount in Rupees (₹)
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#facc15', fontWeight: 800, fontSize: '1rem' }}>₹</span>
              <input
                autoFocus
                type="number"
                step="any"
                min="0"
                value={val}
                onChange={e => setVal(e.target.value)}
                placeholder="e.g. 250000"
                style={modalInputStyle}
              />
            </div>
            {val && Number(val) > 0 ? (
              <div style={{ fontSize: '0.75rem', color: '#facc15', marginTop: 4, fontWeight: 600 }}>
                ₹{Number(val).toLocaleString('en-IN')}
              </div>
            ) : null}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} className="btn btn-outline btn-sm">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn btn-sm btn-primary" style={{ background: '#eab308', color: '#000', fontWeight: 700, border: 'none' }}>
              {saving ? 'Saving...' : 'Save Quote Value'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Bulk Upload Modal ───────────────────────────────────────────────────────
const BulkUploadModal = ({ onClose, onDone }) => {
  const fileInputRef = useRef();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (f) => {
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext)) { toast.error('Only CSV or Excel files are allowed'); return; }
    setFile(f);
    setResult(null);
  };

  const downloadPartnerTemplate = () => {
    const headers = 'Category,Name,Phone,Email,City,Autos Count,CIBIL Score,Source,Source Link,Status,Next Follow Up,Remarks';
    const sample  = 'partner,Rajesh Sharma,9876543210,rajesh@example.com,Chennai,3,750+,Website Partner Form,https://owngo.in/partner?utm_source=instagram,new,2026-12-01,Interested in 3 EV autos';
    const csvContent = "\uFEFF" + [headers, sample].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "owngo_fleet_partners_template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPilotTemplate = () => {
    const headers = 'Category,Name,Phone,Email,Preferred Zone,License Type,Experience,Source,Source Link,Status,Next Follow Up,Remarks';
    const sample  = 'pilot,Murugan K,9840112233,,Anna Nagar,Commercial 3-Wheeler Auto Badge,3 Years,Website Pilot Form,https://owngo.in/pilot?utm_source=google_ads,new,2026-12-01,Wants Anna Nagar / Koyambedu zone';
    const csvContent = "\uFEFF" + [headers, sample].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "owngo_ev_pilots_template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpload = async () => {
    if (!file) return toast.error('Please select a CSV or Excel file');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/leads/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(res.data.results);
      toast.success(res.data.message);
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    }
    setUploading(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <RiUpload2Line style={{ color: 'var(--accent)' }} /> Bulk Upload OwnGo Leads
            </h2>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
              Upload Fleet Partners or EV Pilots in bulk via CSV or Excel (.xlsx / .xls)
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.25rem', display: 'flex' }}><RiCloseLine /></button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Download templates */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, marginBottom: 18 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
              DOWNLOAD SAMPLE TEMPLATES
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={downloadPartnerTemplate}
                style={{ fontSize: '0.78rem', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <RiDownloadLine style={{ color: '#10b981' }} /> Fleet Partners Template
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={downloadPilotTemplate}
                style={{ fontSize: '0.78rem', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <RiDownloadLine style={{ color: '#facc15' }} /> EV Pilots Template
              </button>
            </div>
          </div>

          {/* Drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
            style={{
              border: `2px dashed ${dragging ? 'var(--accent)' : file ? 'var(--success)' : 'var(--border)'}`,
              borderRadius: 12, padding: '32px 20px', textAlign: 'center', cursor: 'pointer',
              background: dragging ? 'rgba(129,140,248,0.05)' : file ? 'rgba(16,185,129,0.04)' : 'transparent',
              transition: 'all 0.2s', marginBottom: 18
            }}
          >
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
            {file ? (
              <>
                <RiFileExcelLine style={{ fontSize: '2.5rem', color: 'var(--success)', display: 'block', margin: '0 auto 10px' }} />
                <div style={{ fontWeight: 700, color: 'var(--success)', marginBottom: 4 }}>{file.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{(file.size / 1024).toFixed(1)} KB · Click to change file</div>
              </>
            ) : (
              <>
                <RiUpload2Line style={{ fontSize: '2.5rem', color: 'var(--accent)', display: 'block', margin: '0 auto 10px' }} />
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Choose or Drop CSV / Excel File</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Supports .csv, .xlsx, .xls · Max 5MB</div>
              </>
            )}
          </div>

          {/* Upload result */}
          {result && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>{result.created}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>✅ Leads Created</div>
                </div>
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--danger)' }}>{result.skipped}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>❌ Skipped</div>
                </div>
              </div>
              {result.errors?.length > 0 && (
                <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, padding: 12, maxHeight: 140, overflowY: 'auto' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--danger)', marginBottom: 6 }}>Upload Errors:</div>
                  {result.errors.map((e, i) => (
                    <div key={i} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 2 }}>
                      Row {e.row}{e.name ? ` (${e.name})` : ''}: {e.error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <button className="btn btn-outline" onClick={onClose}>Close</button>
            {!result && (
              <button className="btn btn-primary" onClick={handleUpload} disabled={!file || uploading}>
                {uploading ? <><div className="spinner spinner-sm" /> Uploading...</> : <><RiUpload2Line /> Upload Leads</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Status Master Modal ──────────────────────────────────────────────────
const StatusMasterModal = ({ isOpen, onClose, onStatusesUpdated, currentStatuses = [] }) => {
  const [statuses, setStatuses] = useState(currentStatuses);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#06b6d4');
  const [isDefault, setIsDefault] = useState(false);
  const [order, setOrder] = useState(currentStatuses.length + 1);
  const [saving, setSaving] = useState(false);

  const fetchStatuses = async () => {
    setLoading(true);
    try {
      const res = await api.get('/lead-statuses?activeOnly=false');
      if (res.data?.statuses) {
        setStatuses(res.data.statuses);
        if (onStatusesUpdated) onStatusesUpdated(res.data.statuses);
      }
    } catch (e) {
      toast.error('Failed to load statuses');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatuses();
      setOrder(currentStatuses.length + 1);
    }
  }, [isOpen]);

  const handleAddStatus = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Status name is required');
    setSaving(true);
    try {
      const res = await api.post('/lead-statuses', {
        name: name.trim(),
        color,
        order: parseInt(order, 10) || statuses.length + 1,
        isDefault
      });
      toast.success(res.data.message || 'Status added successfully');
      setName('');
      setColor('#06b6d4');
      setIsDefault(false);
      await fetchStatuses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add status');
    }
    setSaving(false);
  };

  const handleToggleActive = async (st) => {
    try {
      await api.put(`/lead-statuses/${st.id}`, { isActive: !st.isActive });
      toast.success(`Status ${!st.isActive ? 'activated' : 'deactivated'}`);
      await fetchStatuses();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (st) => {
    if (!window.confirm(`Are you sure you want to delete / deactivate status "${st.name}"?`)) return;
    try {
      const res = await api.delete(`/lead-statuses/${st.id}`);
      toast.success(res.data.message || 'Status deleted');
      await fetchStatuses();
    } catch (err) {
      toast.error('Failed to delete status');
    }
  };

  if (!isOpen) return null;

  const colorPresets = ['#06b6d4', '#10b981', '#3b82f6', '#8b5cf6', '#eab308', '#fb923c', '#ef4444', '#94a3b8', '#ec4899', '#14b8a6'];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 720, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <RiSettings4Line style={{ color: 'var(--accent)' }} /> Lead Status Master Table
            </h2>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
              Manage CRM lead statuses. Statuses configured here automatically appear in all dropdowns and filters.
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.25rem' }}>
            <RiCloseLine />
          </button>
        </div>

        {/* Add Status Form */}
        <form onSubmit={handleAddStatus} style={{ padding: '20px 24px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: 12 }}>
            ➕ Add New Master Status
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 12, alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>STATUS NAME</label>
              <input
                type="text"
                placeholder="e.g. Document Verification"
                value={name}
                onChange={e => setName(e.target.value)}
                style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>BADGE COLOR</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="color"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  style={{ width: 34, height: 34, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{color}</span>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>ORDER</label>
              <input
                type="number"
                min="1"
                value={order}
                onChange={e => setOrder(e.target.value)}
                style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
              style={{ padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
            >
              <RiAddLine /> {saving ? 'Adding...' : 'Add Status'}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Presets:</span>
            {colorPresets.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{
                  width: 20, height: 20, borderRadius: '50%', background: c,
                  border: color === c ? '2px solid #fff' : '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', padding: 0
                }}
              />
            ))}
            <label style={{ marginLeft: 16, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} />
              Set as Default Status for Website Incoming Leads
            </label>
          </div>
        </form>

        {/* Existing Statuses List */}
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
              Master Statuses ({statuses.length})
            </div>
            {loading && <div style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>Refreshing...</div>}
          </div>
          <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 14px', width: 45 }}>#</th>
                  <th style={{ padding: '10px 14px' }}>Status</th>
                  <th style={{ padding: '10px 14px' }}>Key</th>
                  <th style={{ padding: '10px 14px' }}>Leads Count</th>
                  <th style={{ padding: '10px 14px' }}>Default</th>
                  <th style={{ padding: '10px 14px' }}>Active</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {statuses.map((st, idx) => (
                  <tr key={st.id || st.key} style={{ borderBottom: '1px solid var(--border)', opacity: st.isActive === false ? 0.5 : 1 }}>
                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{st.order || idx + 1}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--text-primary)' }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: st.color || '#06b6d4' }} />
                        {st.name}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                      {st.key}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-primary)', fontWeight: 700 }}>
                        {st.leadCount || 0} leads
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {st.isDefault ? (
                        <span style={{ color: '#10b981', fontSize: '0.72rem', fontWeight: 800 }}>✓ Default</span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(st)}
                        style={{
                          background: st.isActive !== false ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                          color: st.isActive !== false ? '#10b981' : '#ef4444',
                          border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer'
                        }}
                      >
                        {st.isActive !== false ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleDelete(st)}
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 4 }}
                        title="Delete / Deactivate"
                      >
                        <RiDeleteBinLine />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', textAlign: 'right' }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ────────────────────────────────────────────────────────────────
const LeadsPage = () => {
  const { hasPermission, user } = useAuth();
  const [searchParams] = useSearchParams();
  const [leads, setLeads] = useState([]);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [leadTypeFilter, setLeadTypeFilter] = useState('partner'); // Strictly Fleet Partners on this page
  const [masterStatuses, setMasterStatuses] = useState([]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [cityFilter, setCityFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [citiesList, setCitiesList] = useState([]);
  const [sourcesList, setSourcesList] = useState([]);

  const fetchStatuses = useCallback(async () => {
    try {
      const res = await api.get('/lead-statuses?activeOnly=true');
      if (res.data?.statuses && Array.isArray(res.data.statuses)) {
        setMasterStatuses(res.data.statuses);
      }
    } catch (e) {
      console.warn('Could not load lead statuses:', e);
    }
  }, []);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [assignedToFilter, setAssignedToFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    const qStatus = searchParams.get('status');
    if (qStatus !== null) {
      setStatusFilter(qStatus);
    }
  }, [searchParams]);

  // Selection state for bulk delete
  const [selected, setSelected] = useState(new Set());

  const [modalLead, setModalLead] = useState(null);
  const [viewLead, setViewLead] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [confirm, setConfirm] = useState({ open: false, lead: null, bulk: false });
  const [designLead, setDesignLead] = useState(null); // lead being moved to design
  const [quoteValueModalLead, setQuoteValueModalLead] = useState(null);

  const canCreate = hasPermission('leads', 'leads-list', 'canCreate');
  const canEdit   = hasPermission('leads', 'leads-list', 'canEdit');
  const canDelete = hasPermission('leads', 'leads-list', 'canDelete');
  const canDesign = hasPermission('design', 'design-list', 'canCreate');
  const isSuperOrAdmin = user?.isSuperAdmin || user?.role?.level === 'super_admin' || user?.role?.level === 'admin' || user?.role?.level === 'org_admin' || user?.role?.level === 'company_admin' || user?.role?.name?.toLowerCase().includes('admin');
  const canEditUploadDate = isSuperOrAdmin || hasPermission('leads', 'lead-edit-upload-date', 'canEdit');

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setSelected(new Set()); // clear selection on reload
    try {
      const params = new URLSearchParams({ page, limit, search });
      if (statusFilter) params.set('status', statusFilter);
      params.set('leadType', 'partner'); // Always strictly Fleet Partners on Leads page
      if (cityFilter) params.set('city', cityFilter);
      if (sourceFilter) params.set('source', sourceFilter);
      if (assignedToFilter) params.set('assignedTo', assignedToFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const res = await api.get(`/leads?${params}`);
      setLeads(res.data.leads || []);
      setTotal(res.data.total || 0);
      setStatusCounts(res.data.statusCounts || {});
      if (res.data.statuses && Array.isArray(res.data.statuses)) {
        setMasterStatuses(res.data.statuses);
      }
      if (res.data.cities && Array.isArray(res.data.cities)) {
        setCitiesList(res.data.cities);
      }
      if (res.data.sources && Array.isArray(res.data.sources)) {
        setSourcesList(res.data.sources);
      }
      if (res.data.assignees && res.data.assignees.length > 0) {
        setUsers(res.data.assignees);
      }
    } catch { toast.error('Failed to load leads'); }
    setLoading(false);
  }, [page, limit, search, statusFilter, leadTypeFilter, cityFilter, sourceFilter, assignedToFilter, startDate, endDate]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/leads/assignees');
      if (res.data.assignees && res.data.assignees.length > 0) {
        setUsers(res.data.assignees);
        return;
      }
    } catch {}
    try {
      const res2 = await api.get('/uam/users?limit=100');
      if (res2.data.users) setUsers(res2.data.users);
    } catch {}
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openAdd = () => { setModalLead(null); setShowModal(true); };
  const openEdit = (lead) => { setModalLead(lead); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setModalLead(null); };
  const afterSave = (savedLead) => {
    closeModal();
    if (savedLead && modalLead) {
      setLeads(prev => prev.map(l => l.id === savedLead.id ? { ...l, ...savedLead } : l));
    } else {
      fetchLeads();
    }
  };

  const handleQuickStatusChange = async (leadId, newStatus, currentStatus) => {
    if (newStatus === currentStatus) return;
    const oldStatus = currentStatus;
    const newContactDate = newStatus === 'new' ? null : new Date().toISOString().split('T')[0];

    // Optimistic in-place update: row stays on the exact same page, in exact same order!
    setLeads(prevLeads => prevLeads.map(l => {
      if (l.id === leadId) {
        return {
          ...l,
          status: newStatus,
          lastContactedDate: newStatus === 'new' ? null : (l.lastContactedDate || newContactDate)
        };
      }
      return l;
    }));

    // Update status badge counts locally so count numbers update immediately
    setStatusCounts(prev => {
      const updated = { ...prev };
      if (oldStatus && updated[oldStatus] > 0) updated[oldStatus]--;
      updated[newStatus] = (updated[newStatus] || 0) + 1;
      return updated;
    });

    try {
      const payload = {
        status: newStatus,
        lastContactedDate: newContactDate
      };
      const res = await api.put(`/leads/${leadId}`, payload);
      if (res.data?.lead) {
        setLeads(prevLeads => prevLeads.map(l => l.id === leadId ? { ...l, ...res.data.lead } : l));
      }
      if (newStatus === 'new') {
        toast.success('Lead status reverted to New (Call count removed)');
      } else if (newStatus === 'requirement_received') {
        toast.success('Requirement Received — Lead automatically moved to Design List! 🎨');
      } else if (newStatus === 'quote_sent') {
        toast.success('Status updated to Quote Sent! 📄');
        const currentLead = leads.find(l => l.id === leadId);
        if (currentLead) {
          setQuoteValueModalLead({ ...currentLead, status: 'quote_sent' });
        }
      } else {
        toast.success(`Status updated to ${getStatusConfig(newStatus)?.label || newStatus} (Calls Made logged)`);
      }
    } catch (err) {
      // Revert if API failed
      setLeads(prevLeads => prevLeads.map(l => l.id === leadId ? { ...l, status: oldStatus } : l));
      setStatusCounts(prev => {
        const updated = { ...prev };
        if (updated[newStatus] > 0) updated[newStatus]--;
        if (oldStatus) updated[oldStatus] = (updated[oldStatus] || 0) + 1;
        return updated;
      });
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  // Row selection
  const isAllSelected = leads.length > 0 && leads.every(l => selected.has(l.id));
  const toggleAll = () => {
    if (isAllSelected) setSelected(new Set());
    else setSelected(new Set(leads.map(l => l.id)));
  };
  const toggleOne = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  // Single delete
  const handleDelete = async () => {
    try {
      await api.delete(`/leads/${confirm.lead.id}`);
      toast.success('Lead deleted');
      setConfirm({ open: false, lead: null, bulk: false });
      fetchLeads();
    } catch (err) { toast.error(err.response?.data?.message || 'Delete failed'); }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    try {
      const res = await api.delete('/leads/bulk-delete', { data: { ids: [...selected] } });
      toast.success(res.data.message);
      setConfirm({ open: false, lead: null, bulk: false });
      fetchLeads();
    } catch (err) { toast.error(err.response?.data?.message || 'Bulk delete failed'); }
  };

  const [exporting, setExporting] = useState(false);

  const downloadCSVData = (leadsList, fileNamePrefix = 'owngo_leads') => {
    if (!leadsList || leadsList.length === 0) {
      toast.error('No leads available to export');
      return;
    }

    const headers = [
      'Lead ID',
      'Company / Applicant',
      'Contact Person',
      'Designation',
      'Phone',
      'Email',
      'City',
      'Address',
      'Category',
      'Autos / Vehicles Count',
      'Source',
      'Source URL',
      'Status',
      'Last Contacted Date',
      'Next Follow Up Date',
      'Screening Notes',
      'Created Date'
    ];

    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = leadsList.map(lead => {
      const category = lead.leadType === 'partner' ? 'Fleet Partner' : (lead.leadType === 'pilot' ? 'EV Pilot' : 'Standard');
      const statusLabel = masterStatuses.find(m => m.key === lead.status || m.slug === lead.status)?.name || STATUS_CONFIG[lead.status]?.label || lead.status || 'New';

      return [
        escapeCSV(lead.id),
        escapeCSV(lead.companyName || lead.name || ''),
        escapeCSV(lead.name || ''),
        escapeCSV(lead.designation || ''),
        escapeCSV(lead.phone || ''),
        escapeCSV(lead.email || ''),
        escapeCSV(lead.city || ''),
        escapeCSV(lead.address || ''),
        escapeCSV(category),
        escapeCSV(lead.autosCount || ''),
        escapeCSV(lead.source || lead.expoType || lead.expo || ''),
        escapeCSV(lead.sourceLink || ''),
        escapeCSV(statusLabel),
        escapeCSV(lead.lastContactedDate || ''),
        escapeCSV(lead.nextFollowUp || ''),
        escapeCSV(lead.notes || ''),
        escapeCSV(lead.createdAt ? new Date(lead.createdAt).toISOString().split('T')[0] : '')
      ].join(',');
    });

    const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `${fileNamePrefix}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${leadsList.length} leads to CSV successfully! 📄`);
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      if (selected.size > 0) {
        const selectedLeads = leads.filter(l => selected.has(l.id));
        if (selectedLeads.length > 0) {
          downloadCSVData(selectedLeads, `owngo_selected_leads_${selectedLeads.length}`);
          setExporting(false);
          return;
        }
      }

      const params = new URLSearchParams({ page: 1, limit: 10000, export: 'true' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      params.set('leadType', 'partner');
      if (cityFilter) params.set('city', cityFilter);
      if (sourceFilter) params.set('source', sourceFilter);
      if (assignedToFilter) params.set('assignedTo', assignedToFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await api.get(`/leads?${params}`);
      const exportList = res.data?.leads || leads;
      downloadCSVData(exportList, 'owngo_fleet_partners');
    } catch (err) {
      toast.error('Failed to export leads');
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <AppLayout>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            🎯 Leads
          </h1>
          <p className="page-subtitle">Manage business leads and sales pipeline</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={fetchLeads} disabled={loading} title="Refresh">
            <RiRefreshLine style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          <button
            className="btn btn-outline"
            onClick={() => setShowStatusModal(true)}
            id="status-master-btn"
            title="Manage Dynamic Lead Status Master Table"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <RiSettings4Line style={{ color: 'var(--accent)' }} /> Status Master
          </button>
          <button
            className="btn btn-outline"
            onClick={handleExportCSV}
            disabled={exporting}
            id="export-leads-csv-btn"
            title="Export Leads to CSV"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <RiDownloadLine style={{ color: '#10b981' }} /> {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
          {canCreate && (
            <button className="btn btn-outline" onClick={() => setShowUpload(true)} id="bulk-upload-btn" title="Bulk Upload CSV">
              <RiUpload2Line /> Bulk Upload
            </button>
          )}
          {canCreate && (
            <button className="btn btn-primary" onClick={openAdd} id="add-lead-btn">
              <RiUserAddLine /> Add Lead
            </button>
          )}
        </div>
      </div>

      {/* Bulk selection toolbar */}
      {selected.size > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 10, padding: '10px 16px', marginBottom: 16,
          animation: 'fadeIn 0.2s ease', flexWrap: 'wrap'
        }}>
          <RiCheckboxMultipleLine style={{ color: 'var(--danger)', fontSize: '1.1rem' }} />
          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
            {selected.size} lead{selected.size !== 1 && 's'} selected
          </span>
          <button
            className="btn btn-sm btn-outline"
            onClick={handleExportCSV}
            disabled={exporting}
            id="bulk-export-leads-btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <RiDownloadLine style={{ color: '#10b981' }} /> Export Selected ({selected.size})
          </button>
          {canDelete && (
            <button
              className="btn btn-sm btn-danger"
              onClick={() => setConfirm({ open: true, lead: null, bulk: true })}
              id="bulk-delete-btn"
            >
              <RiDeleteBin5Line /> Delete Selected
            </button>
          )}
          <button
            className="btn btn-sm btn-outline"
            onClick={() => setSelected(new Set())}
            style={{ marginLeft: 'auto' }}
          >
            <RiCloseLine /> Deselect All
          </button>
        </div>
      )}

      {/* ── Main Filter Card (Search, Status, Expo, Assignee, Date, Reset) ── */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '16px 18px',
        marginBottom: 20,
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
          alignItems: 'center'
        }}>
          {/* 1. Search Bar */}
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gridColumn: 'span 2'
          }}>
            <RiSearchLine style={{
              position: 'absolute',
              left: 12,
              color: search ? 'var(--accent)' : 'var(--text-muted)',
              fontSize: '1.1rem',
              pointerEvents: 'none'
            }} />
            <input
              type="text"
              placeholder="Search by company, person, phone, email, notes..."
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
                outline: 'none',
                transition: 'var(--transition)'
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(''); setPage(1); }}
                title="Clear search"
                style={{
                  position: 'absolute',
                  right: 10,
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 2
                }}
              >
                <RiCloseLine style={{ fontSize: '1.1rem' }} />
              </button>
            )}
          </div>

          {/* 2. Status Filter Dropdown */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <RiFilterLine style={{
              position: 'absolute',
              left: 12,
              color: statusFilter ? 'var(--accent)' : 'var(--text-muted)',
              fontSize: '1.05rem',
              pointerEvents: 'none',
              zIndex: 1
            }} />
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              style={{
                width: '100%',
                background: 'var(--bg-secondary)',
                border: statusFilter ? '1px solid var(--accent)' : '1px solid var(--border)',
                borderRadius: 10,
                padding: '10px 30px 10px 36px',
                color: statusFilter ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: '0.875rem',
                outline: 'none',
                cursor: 'pointer',
                transition: 'var(--transition)'
              }}
            >
              <option value="">All Statuses ({Object.values(statusCounts).reduce((a, b) => a + b, 0) || total})</option>
              {masterStatuses.length > 0 ? (
                masterStatuses.map(m => {
                  const key = m.key || m.slug;
                  const count = statusCounts[key] || 0;
                  return (
                    <option key={m.id || key} value={key}>
                      {m.name} {count > 0 ? `(${count})` : ''}
                    </option>
                  );
                })
              ) : (
                Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                  const count = statusCounts[key] || 0;
                  return (
                    <option key={key} value={key}>
                      {cfg.label} {count > 0 ? `(${count})` : ''}
                    </option>
                  );
                })
              )}
            </select>
            {statusFilter && (
              <button
                type="button"
                onClick={() => { setStatusFilter(''); setPage(1); }}
                title="Clear Status filter"
                style={{
                  position: 'absolute',
                  right: 10,
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 2
                }}
              >
                <RiCloseLine />
              </button>
            )}
          </div>

          {/* 3. City Filter Dropdown */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <RiMapPinLine style={{
              position: 'absolute',
              left: 12,
              color: cityFilter ? 'var(--accent)' : 'var(--text-muted)',
              fontSize: '1.05rem',
              pointerEvents: 'none',
              zIndex: 1
            }} />
            <select
              value={cityFilter}
              onChange={e => { setCityFilter(e.target.value); setPage(1); }}
              style={{
                width: '100%',
                background: 'var(--bg-secondary)',
                border: cityFilter ? '1px solid var(--accent)' : '1px solid var(--border)',
                borderRadius: 10,
                padding: '10px 30px 10px 36px',
                color: cityFilter ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: '0.875rem',
                outline: 'none',
                cursor: 'pointer',
                transition: 'var(--transition)'
              }}
            >
              <option value="">All Cities</option>
              {['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
              {citiesList.filter(c => !['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem'].includes(c)).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {cityFilter && (
              <button
                type="button"
                onClick={() => { setCityFilter(''); setPage(1); }}
                title="Clear City filter"
                style={{
                  position: 'absolute',
                  right: 10,
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 2
                }}
              >
                <RiCloseLine />
              </button>
            )}
          </div>

          {/* 4. Lead Source Filter Dropdown */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <RiShareForwardLine style={{
              position: 'absolute',
              left: 12,
              color: sourceFilter ? 'var(--accent)' : 'var(--text-muted)',
              fontSize: '1.05rem',
              pointerEvents: 'none',
              zIndex: 1
            }} />
            <select
              value={sourceFilter}
              onChange={e => { setSourceFilter(e.target.value); setPage(1); }}
              style={{
                width: '100%',
                background: 'var(--bg-secondary)',
                border: sourceFilter ? '1px solid var(--accent)' : '1px solid var(--border)',
                borderRadius: 10,
                padding: '10px 30px 10px 36px',
                color: sourceFilter ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: '0.875rem',
                outline: 'none',
                cursor: 'pointer',
                transition: 'var(--transition)'
              }}
            >
              <option value="">All Lead Sources</option>
              <option value="Website Partner Form">Website Partner Form</option>
              <option value="Instagram">Instagram Bio / Ads</option>
              <option value="WhatsApp">WhatsApp Broadcast</option>
              <option value="Google Ads">Google Ads</option>
              <option value="Facebook">Facebook Ads</option>
              <option value="Referral">Agent / Partner Referral</option>
              <option value="Direct Entry">Direct Entry / Walk-in</option>
              {sourcesList.filter(s => !['Website Partner Form', 'Instagram', 'WhatsApp', 'Google Ads', 'Facebook', 'Referral', 'Direct Entry'].some(x => s.toLowerCase().includes(x.toLowerCase()))).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {sourceFilter && (
              <button
                type="button"
                onClick={() => { setSourceFilter(''); setPage(1); }}
                title="Clear Source filter"
                style={{
                  position: 'absolute',
                  right: 10,
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 2
                }}
              >
                <RiCloseLine />
              </button>
            )}
          </div>

          {/* 5. Upload From Date Filter */}
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-secondary)',
            border: startDate ? '1px solid var(--accent)' : '1px solid var(--border)',
            borderRadius: 10,
            padding: '5px 12px 5px 36px',
            minHeight: 42,
            transition: 'var(--transition)'
          }}>
            <RiCalendarLine style={{
              position: 'absolute',
              left: 12,
              color: startDate ? 'var(--accent)' : 'var(--text-muted)',
              fontSize: '1.05rem',
              pointerEvents: 'none',
              zIndex: 1
            }} />
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', overflow: 'hidden' }}>
              <span style={{
                fontSize: '0.625rem',
                fontWeight: 700,
                color: startDate ? 'var(--accent)' : 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                lineHeight: 1,
                marginBottom: 2
              }}>
                From Date
              </span>
              <input
                type="date"
                title="Filter by Upload From Date"
                value={startDate}
                onChange={e => { setStartDate(e.target.value); setPage(1); }}
                onClick={e => { if (e.target.showPicker) { try { e.target.showPicker(); } catch (_) {} } }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: startDate ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontSize: '0.8125rem',
                  outline: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  colorScheme: 'dark',
                  padding: 0
                }}
              />
            </div>
            {startDate && (
              <button
                type="button"
                onClick={() => { setStartDate(''); setPage(1); }}
                title="Clear From Date"
                style={{
                  position: 'absolute',
                  right: 8,
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 2,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <RiCloseLine />
              </button>
            )}
          </div>

          {/* 6. Upload To Date Filter */}
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-secondary)',
            border: endDate ? '1px solid var(--accent)' : '1px solid var(--border)',
            borderRadius: 10,
            padding: '5px 12px 5px 36px',
            minHeight: 42,
            transition: 'var(--transition)'
          }}>
            <RiCalendarLine style={{
              position: 'absolute',
              left: 12,
              color: endDate ? 'var(--accent)' : 'var(--text-muted)',
              fontSize: '1.05rem',
              pointerEvents: 'none',
              zIndex: 1
            }} />
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', overflow: 'hidden' }}>
              <span style={{
                fontSize: '0.625rem',
                fontWeight: 700,
                color: endDate ? 'var(--accent)' : 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                lineHeight: 1,
                marginBottom: 2
              }}>
                To Date
              </span>
              <input
                type="date"
                title="Filter by Upload To Date"
                value={endDate}
                onChange={e => { setEndDate(e.target.value); setPage(1); }}
                onClick={e => { if (e.target.showPicker) { try { e.target.showPicker(); } catch (_) {} } }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: endDate ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontSize: '0.8125rem',
                  outline: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  colorScheme: 'dark',
                  padding: 0
                }}
              />
            </div>
            {endDate && (
              <button
                type="button"
                onClick={() => { setEndDate(''); setPage(1); }}
                title="Clear To Date"
                style={{
                  position: 'absolute',
                  right: 8,
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 2,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <RiCloseLine />
              </button>
            )}
          </div>

          {/* 7. Reset All Button */}
          {(search || statusFilter || cityFilter || sourceFilter || assignedToFilter || startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStatusFilter('');
                setCityFilter('');
                setSourceFilter('');
                setAssignedToFilter('');
                setStartDate('');
                setEndDate('');
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
                gap: 6,
                transition: 'var(--transition)'
              }}
            >
              <RiRefreshLine style={{ fontSize: '1rem' }} /> Reset Filters
            </button>
          )}
        </div>

        {/* ── Active Filters Summary Bar ── */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginTop: 14,
          paddingTop: 12,
          borderTop: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              {total} lead{total !== 1 ? 's' : ''} found
            </span>
            {total > 0 && (
              <span style={{ color: 'var(--text-muted)' }}>
                · Showing {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} of {total}
              </span>
            )}
          </div>

          {/* Active Filter Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {statusFilter && (
              <span style={{
                fontSize: '0.75rem',
                padding: '3px 9px',
                borderRadius: 6,
                background: 'var(--accent-glow)',
                color: 'var(--accent)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}>
                Status: {STATUS_CONFIG[statusFilter]?.label || statusFilter}
                <RiCloseLine style={{ cursor: 'pointer' }} onClick={() => { setStatusFilter(''); setPage(1); }} />
              </span>
            )}
            {cityFilter && (
              <span style={{
                fontSize: '0.75rem',
                padding: '3px 9px',
                borderRadius: 6,
                background: 'var(--accent-glow)',
                color: 'var(--accent)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}>
                City: {cityFilter}
                <RiCloseLine style={{ cursor: 'pointer' }} onClick={() => { setCityFilter(''); setPage(1); }} />
              </span>
            )}
            {sourceFilter && (
              <span style={{
                fontSize: '0.75rem',
                padding: '3px 9px',
                borderRadius: 6,
                background: 'var(--accent-glow)',
                color: 'var(--accent)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}>
                Source: {sourceFilter}
                <RiCloseLine style={{ cursor: 'pointer' }} onClick={() => { setSourceFilter(''); setPage(1); }} />
              </span>
            )}
            {(startDate || endDate) && (
              <span style={{
                fontSize: '0.75rem',
                padding: '3px 9px',
                borderRadius: 6,
                background: 'var(--accent-glow)',
                color: 'var(--accent)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}>
                Date: {startDate || 'Start'} → {endDate || 'End'}
                <RiCloseLine style={{ cursor: 'pointer' }} onClick={() => { setStartDate(''); setEndDate(''); setPage(1); }} />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }} />
            <div style={{ color: 'var(--text-secondary)' }}>Loading leads...</div>
          </div>
        ) : leads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎯</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>No leads found</div>
            <div style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
              {search || statusFilter || cityFilter || sourceFilter || assignedToFilter || startDate || endDate ? 'Try changing your filters' : 'Start by adding your first lead'}
            </div>
            {canCreate && !search && !statusFilter && !cityFilter && !sourceFilter && !assignedToFilter && !startDate && !endDate && (
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button className="btn btn-outline" onClick={() => setShowUpload(true)}><RiUpload2Line /> Bulk Upload</button>
                <button className="btn btn-primary" onClick={openAdd}><RiUserAddLine /> Add Lead</button>
              </div>
            )}
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow-sm)' }}>
            <div className="table-responsive" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table className="table table-sticky-actions" style={{ margin: 0, minWidth: 1150 }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                    {canDelete && (
                      <th style={{ width: 44, paddingLeft: 18, textAlign: 'center' }}>
                        <button onClick={toggleAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: isAllSelected ? 'var(--accent)' : 'var(--text-muted)', fontSize: '1.1rem', display: 'flex', alignItems: 'center' }}>
                          {isAllSelected ? <RiCheckboxLine /> : <RiCheckboxBlankLine />}
                        </button>
                      </th>
                    )}
                    <th style={{ minWidth: 240, padding: '14px 16px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>APPLICANT / PARTNER</th>
                    <th style={{ minWidth: 160, padding: '14px 16px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>CATEGORY</th>
                    <th style={{ minWidth: 190, padding: '14px 16px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>CONTACT INFO</th>
                    <th style={{ minWidth: 160, padding: '14px 16px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>SOURCE & LINK</th>
                    <th style={{ minWidth: 130, padding: '14px 16px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>FOLLOW UP</th>
                    <th style={{ minWidth: 150, padding: '14px 16px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>STATUS</th>
                    <th style={{ textAlign: 'center', width: 130, padding: '14px 16px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map(lead => {
                    const st = getStatusConfig(lead.status, masterStatuses);
                    const isChecked = selected.has(lead.id);
                    const cleanPhone = (lead.phone || '').replace(/[^0-9]/g, '');
                    const displayName = lead.name || (lead.companyName ? lead.companyName.replace(/^Fleet Partner -\s*/i, '').replace(/^EV Pilot Candidate -\s*/i, '') : '—');

                    return (
                      <tr
                        key={lead.id}
                        className={isChecked ? 'row-selected' : ''}
                        style={{
                          background: isChecked ? 'rgba(16, 185, 129, 0.07)' : undefined,
                          transition: 'background 0.15s ease'
                        }}
                      >
                        {canDelete && (
                          <td style={{ paddingLeft: 18, textAlign: 'center' }}>
                            <button onClick={() => toggleOne(lead.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: isChecked ? 'var(--danger)' : 'var(--text-muted)', fontSize: '1.1rem', display: 'flex', alignItems: 'center' }}>
                              {isChecked ? <RiCheckboxLine style={{ color: 'var(--danger)' }} /> : <RiCheckboxBlankLine />}
                            </button>
                          </td>
                        )}

                        {/* Column 1: Applicant / Partner with Avatar Chip */}
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
                              {(displayName || '?').charAt(0).toUpperCase()}
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
                                onClick={() => setViewLead(lead)}
                              >
                                {displayName}
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
                                <span>{lead.city || 'Chennai'}{lead.createdAt ? ` • ${new Date(lead.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Column 2: Category */}
                        <td style={{ padding: '12px 16px' }}>
                          {lead.leadType === 'pilot' ? (
                            <span className="badge badge-warning" style={{ fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6 }}>
                              🛺 EV Pilot
                            </span>
                          ) : lead.leadType === 'partner' ? (
                            <span className="badge badge-success" style={{ fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6 }}>
                              🏢 Fleet Partner {lead.autosCount ? `(${lead.autosCount})` : ''}
                            </span>
                          ) : (
                            <span className="badge badge-secondary" style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                              Standard
                            </span>
                          )}
                        </td>

                        {/* Column 3: Contact Info with WhatsApp */}
                        <td style={{ padding: '12px 16px' }}>
                          {lead.phone ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <a
                                href={`tel:${lead.phone}`}
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
                                {lead.phone}
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
                          {lead.email && (
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                              <RiMailLine style={{ fontSize: '0.75rem' }} />
                              {lead.email}
                            </div>
                          )}
                        </td>

                        {/* Column 4: Source & Link */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0ea5e9' }} />
                            <span>{lead.source || lead.expoType || EXPO_LABELS[lead.expo] || lead.expo || 'Website'}</span>
                          </div>
                          {lead.sourceLink && (
                            <div>
                              <a
                                href={lead.sourceLink.startsWith('http') ? lead.sourceLink : `https://${lead.sourceLink}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`Open source URL: ${lead.sourceLink}`}
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
                                View Link <RiExternalLinkLine style={{ fontSize: '0.75rem' }} />
                              </a>
                            </div>
                          )}
                        </td>

                        {/* Column 5: Follow Up */}
                        <td style={{ padding: '12px 16px' }}>
                          {lead.nextFollowUp ? (
                            <div style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <RiCalendarLine /> {lead.nextFollowUp}
                            </div>
                          ) : lead.lastContactedDate ? (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Last: {lead.lastContactedDate}
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>

                        {/* Column 6: Status */}
                        <td style={{ padding: '12px 16px' }}>
                          {canEdit ? (
                            <select
                              value={lead.status || 'new'}
                              onChange={e => handleQuickStatusChange(lead.id, e.target.value, lead.status)}
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
                              title="Click to quickly change status"
                            >
                              {masterStatuses.length > 0 ? (
                                masterStatuses.map(m => (
                                  <option key={m.id || m.key} value={m.key || m.slug} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                                    {m.name}
                                  </option>
                                ))
                              ) : (
                                Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                  <option key={k} value={k} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                                    {v.label}
                                  </option>
                                ))
                              )}
                            </select>
                          ) : (
                            <span className={`badge ${st.cls}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.dot }} />
                              {st.label}
                            </span>
                          )}
                        </td>

                        {/* Column 7: Actions */}
                        <td style={{ textAlign: 'center', padding: '10px 14px' }}>
                          <div style={{ display: 'inline-flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                            <button
                              type="button"
                              className="action-btn action-btn-view"
                              title="View Details"
                              onClick={() => setViewLead(lead)}
                              id={`view-lead-${lead.id}`}
                            >
                              <RiEyeLine />
                            </button>
                            {canEdit && (
                              <button
                                type="button"
                                className="action-btn action-btn-edit"
                                title="Edit Lead"
                                onClick={() => openEdit(lead)}
                                id={`edit-lead-${lead.id}`}
                              >
                                <RiEditLine />
                              </button>
                            )}
                            {canDesign && (
                              <button
                                type="button"
                                className="action-btn"
                                style={{ color: 'var(--accent)' }}
                                title="Move to Design"
                                onClick={() => setDesignLead(lead)}
                                id={`design-lead-${lead.id}`}
                              >
                                <RiDraftLine />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                className="action-btn action-btn-delete"
                                title="Delete Lead"
                                onClick={() => setConfirm({ open: true, lead, bulk: false })}
                                id={`delete-lead-${lead.id}`}
                              >
                                <RiDeleteBinLine />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination Footer */}
        <PaginationBar
          page={page}
          setPage={setPage}
          total={total}
          limit={limit}
          setLimit={setLimit}
          label="leads"
          pageSizeOptions={[10, 25, 50, 100]}
        />
      </div>

      {/* Modals */}
      {showModal && (
        <LeadModal
          lead={modalLead}
          users={users}
          masterStatuses={masterStatuses}
          onClose={closeModal}
          onSaved={afterSave}
        />
      )}
      {showUpload && <BulkUploadModal onClose={() => setShowUpload(false)} onDone={fetchLeads} />}
      {viewLead && <ViewLeadModal lead={viewLead} onClose={() => setViewLead(null)} masterStatuses={masterStatuses} />}
      {designLead && <MoveToDesignModal lead={designLead} onClose={() => setDesignLead(null)} onDone={fetchLeads} />}
      {quoteValueModalLead && (
        <QuoteValueModal
          lead={quoteValueModalLead}
          onClose={() => setQuoteValueModalLead(null)}
          onSaved={(updatedLead) => {
            setLeads(prev => prev.map(l => l.id === updatedLead.id ? { ...l, ...updatedLead } : l));
            setQuoteValueModalLead(null);
          }}
        />
      )}
      <StatusMasterModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        onStatusesUpdated={(updated) => {
          setMasterStatuses(updated);
          fetchLeads();
        }}
        currentStatuses={masterStatuses}
      />

      {/* Confirm Delete (single or bulk) */}
      <ConfirmModal
        isOpen={confirm.open}
        title={confirm.bulk ? `Delete ${selected.size} Leads` : 'Delete Lead'}
        message={confirm.bulk
          ? `Are you sure you want to delete ${selected.size} selected lead${selected.size !== 1 ? 's' : ''}? This action cannot be undone.`
          : `Are you sure you want to delete "${confirm.lead?.name}"? This action cannot be undone.`
        }
        onConfirm={confirm.bulk ? handleBulkDelete : handleDelete}
        onCancel={() => setConfirm({ open: false, lead: null, bulk: false })}
        confirmText={confirm.bulk ? `Delete ${selected.size} Leads` : 'Delete'}
        type="danger"
      />
    </AppLayout>
  );
};

export default LeadsPage;
