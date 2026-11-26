import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  RiLinkM, RiFileCopyLine, RiCheckLine, RiQrCodeLine,
  RiExternalLinkLine, RiInstagramLine, RiWhatsappLine,
  RiGoogleLine, RiFacebookLine, RiQrScanLine, RiUserHeartLine,
  RiRefreshLine, RiStarLine, RiDownloadLine, RiDeleteBinLine, RiAddLine,
  RiEditLine, RiCloseLine
} from 'react-icons/ri';
import AppLayout from '../../components/AppLayout';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const DEFAULT_LINKS = [
  {
    id: 'link-1',
    name: '📸 Instagram Bio Link',
    target: 'Leads',
    targetBadge: 'badge-success',
    url: 'https://owngo.in/?utm_source=instagram&utm_medium=bio&utm_campaign=launch#apply'
  },
  {
    id: 'link-2',
    name: '💬 WhatsApp Partner Broadcast',
    target: 'Leads',
    targetBadge: 'badge-success',
    url: 'https://owngo.in/?utm_source=whatsapp&utm_medium=broadcast#apply'
  },
  {
    id: 'link-3',
    name: '🛺 Auto Stand Pilot Recruitment Poster',
    target: 'EV Pilots',
    targetBadge: 'badge-info',
    url: 'https://owngo.in/?utm_source=offline_poster&utm_medium=qr_stand#pilot-apply'
  },
  {
    id: 'link-4',
    name: '🎯 Google Search Ads (Fleet Investment)',
    target: 'Leads',
    targetBadge: 'badge-success',
    url: 'https://owngo.in/?utm_source=google_ads&utm_medium=cpc&utm_campaign=ev_fleet#apply'
  }
];

const PRESETS = [
  {
    id: 'insta-bio',
    name: 'Instagram Bio Link',
    icon: <RiInstagramLine />,
    color: '#E1306C',
    source: 'instagram',
    medium: 'bio',
    campaign: 'social_launch',
    target: 'partner'
  },
  {
    id: 'wa-broadcast',
    name: 'WhatsApp Broadcast',
    icon: <RiWhatsappLine />,
    color: '#25D366',
    source: 'whatsapp',
    medium: 'broadcast',
    campaign: 'direct_outreach',
    target: 'partner'
  },
  {
    id: 'pilot-stand-qr',
    name: 'Auto Stand Poster QR',
    icon: <RiQrScanLine />,
    color: '#06b6d4',
    source: 'offline_poster',
    medium: 'qr_code',
    campaign: 'chennai_stands',
    target: 'pilot'
  },
  {
    id: 'google-search',
    name: 'Google Ads (Search)',
    icon: <RiGoogleLine />,
    color: '#4285F4',
    source: 'google_ads',
    medium: 'cpc',
    campaign: 'ev_investment',
    target: 'partner'
  },
  {
    id: 'meta-fb',
    name: 'Facebook & Meta Ads',
    icon: <RiFacebookLine />,
    color: '#1877F2',
    source: 'facebook',
    medium: 'paid_social',
    campaign: 'fleet_growth',
    target: 'partner'
  },
  {
    id: 'agent-referral',
    name: 'Sales Agent Referral',
    icon: <RiUserHeartLine />,
    color: '#a855f7',
    source: 'agent_referral',
    medium: 'referral',
    campaign: 'staff_network',
    target: 'partner'
  }
];

const LinkGeneratorPage = () => {
  const [baseUrl, setBaseUrl] = useState('https://owngo.in');
  const [targetType, setTargetType] = useState('partner'); // 'partner' | 'pilot' | 'home'
  const [source, setSource] = useState('instagram');
  const [medium, setMedium] = useState('bio');
  const [campaign, setCampaign] = useState('social_launch');
  const [staffCode, setStaffCode] = useState('');
  const [copied, setCopied] = useState(false);

  const { user, hasPermission, permissions } = useAuth();

  // Pure UAM permissions: strictly obey matrix settings with NO bypass
  const checkSavedPerm = (action) => {
    const hasExplicitSavedLinks = Array.isArray(permissions) && permissions.some(p => p.module === 'tools' && p.screen === 'saved-links');
    if (hasExplicitSavedLinks) {
      return hasPermission('tools', 'saved-links', action);
    }
    return hasPermission('tools', 'link-generator', action);
  };

  const canViewSavedLinks = Boolean(checkSavedPerm('canView'));
  const canCreateLink = Boolean(checkSavedPerm('canCreate'));
  const canEditLink = Boolean(checkSavedPerm('canEdit'));
  const canDeleteLink = Boolean(checkSavedPerm('canDelete'));

  // Edit Modal State (Option A)
  const [editingLink, setEditingLink] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    target: 'Leads',
    url: ''
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Saved Links with Backend Database + UAM Sync (and localStorage fallback)
  const [savedLinks, setSavedLinks] = useState(() => {
    try {
      const stored = localStorage.getItem('owngo_saved_links');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return DEFAULT_LINKS;
  });
  const [loadingLinks, setLoadingLinks] = useState(false);

  const fetchSavedLinks = useCallback(async () => {
    try {
      setLoadingLinks(true);
      const res = await api.get('/campaign-links');
      if (res.data?.links && Array.isArray(res.data.links)) {
        setSavedLinks(res.data.links);
        try { localStorage.setItem('owngo_saved_links', JSON.stringify(res.data.links)); } catch (e) {}
      }
    } catch (err) {
      // Offline fallback: keep existing localStorage links
      console.warn('Could not load campaign links from API:', err);
    } finally {
      setLoadingLinks(false);
    }
  }, []);

  useEffect(() => {
    fetchSavedLinks();
  }, [fetchSavedLinks]);

  const handleOpenEdit = (link) => {
    if (!canEditLink) {
      toast.error('Permission denied: You do not have permission to edit company links');
      return;
    }
    setEditingLink(link);
    setEditFormData({
      name: link.name || '',
      target: link.target || 'Leads',
      url: link.url || ''
    });
    setIsEditModalOpen(true);
  };

  const handleCloseEdit = () => {
    setIsEditModalOpen(false);
    setEditingLink(null);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editFormData.name.trim() || !editFormData.url.trim()) {
      toast.error('Link name and URL are required');
      return;
    }

    setIsSavingEdit(true);
    let targetBadge = 'badge-success';
    if (editFormData.target === 'EV Pilots') targetBadge = 'badge-info';
    else if (editFormData.target === 'Home') targetBadge = 'badge-primary';

    const payload = {
      name: editFormData.name.trim(),
      target: editFormData.target,
      targetBadge,
      url: editFormData.url.trim()
    };

    try {
      const res = await api.put(`/campaign-links/${editingLink.id}`, payload);
      if (res.data?.link) {
        setSavedLinks(prev => prev.map(l => l.id === editingLink.id ? res.data.link : l));
        toast.success('Campaign link updated successfully!');
        handleCloseEdit();
        setIsSavingEdit(false);
        return;
      }
    } catch (err) {
      console.warn('API update failed, updating locally:', err);
    }

    // Fallback locally
    const updated = savedLinks.map(l => l.id === editingLink.id ? { ...l, ...payload } : l);
    setSavedLinks(updated);
    try { localStorage.setItem('owngo_saved_links', JSON.stringify(updated)); } catch (e) {}
    toast.success('Link updated successfully');
    handleCloseEdit();
    setIsSavingEdit(false);
  };

  const handleDeleteLink = async (id) => {
    if (!canDeleteLink) {
      toast.error('Only administrators can delete company links');
      return;
    }
    try {
      await api.delete(`/campaign-links/${id}`);
      setSavedLinks(prev => prev.filter(l => l.id !== id));
      toast.success('Link deleted successfully');
    } catch (err) {
      // Local fallback
      const updated = savedLinks.filter(l => l.id !== id);
      setSavedLinks(updated);
      try { localStorage.setItem('owngo_saved_links', JSON.stringify(updated)); } catch (e) {}
      toast.success('Link removed');
    }
  };

  const handleSaveCurrentLink = async () => {
    if (!canCreateLink) {
      toast.error('Permission denied: You do not have permission to add official links');
      return;
    }
    const newLinkPayload = {
      name: `🔗 ${source ? source.toUpperCase() : 'Custom'} (${medium || 'Link'})`,
      target: targetType === 'pilot' ? 'EV Pilots' : (targetType === 'home' ? 'Home' : 'Leads'),
      targetBadge: targetType === 'pilot' ? 'badge-info' : 'badge-success',
      url: generatedUrl
    };

    try {
      const res = await api.post('/campaign-links', newLinkPayload);
      if (res.data?.link) {
        setSavedLinks(prev => [res.data.link, ...prev]);
        toast.success('Link saved to team list!');
        return;
      }
    } catch (err) {
      console.warn('Failed to save link via API:', err);
    }

    // Fallback locally
    const fallbackLink = {
      id: `custom-${Date.now()}`,
      ...newLinkPayload
    };
    const updated = [fallbackLink, ...savedLinks];
    setSavedLinks(updated);
    try { localStorage.setItem('owngo_saved_links', JSON.stringify(updated)); } catch (e) {}
    toast.success('Link saved to table below!');
  };

  const handleResetDefaultLinks = async () => {
    if (!canDeleteLink) {
      toast.error('Only administrators can restore standard links');
      return;
    }
    try {
      const res = await api.post('/campaign-links/restore-defaults');
      if (res.data?.links) {
        setSavedLinks(res.data.links);
        toast.success('Standard official links restored');
        return;
      }
    } catch (err) {
      console.warn('Failed to restore via API:', err);
    }

    setSavedLinks(DEFAULT_LINKS);
    try { localStorage.setItem('owngo_saved_links', JSON.stringify(DEFAULT_LINKS)); } catch (e) {}
    toast.success('Standard links restored');
  };

  // Apply a preset
  const handleApplyPreset = (preset) => {
    setSource(preset.source);
    setMedium(preset.medium);
    setCampaign(preset.campaign);
    setTargetType(preset.target);
    toast.success(`Preset loaded: ${preset.name}`);
  };

  // Generate URL
  const generatedUrl = useMemo(() => {
    let cleanBase = baseUrl.replace(/\/+$/, '');
    let path = '';
    let hash = '';

    if (targetType === 'partner') {
      hash = '#apply';
    } else if (targetType === 'pilot') {
      hash = '#pilot-apply';
    }

    const params = new URLSearchParams();
    if (source.trim()) params.set('utm_source', source.trim().toLowerCase().replace(/\s+/g, '_'));
    if (medium.trim()) params.set('utm_medium', medium.trim().toLowerCase().replace(/\s+/g, '_'));
    if (campaign.trim()) params.set('utm_campaign', campaign.trim().toLowerCase().replace(/\s+/g, '_'));
    if (staffCode.trim()) {
      const cleanRef = staffCode.trim().toLowerCase().replace(/\s+/g, '-');
      params.set('ref', cleanRef);
    }

    const qs = params.toString();
    const queryPart = qs ? `?${qs}` : '';
    return `${cleanBase}${path}${queryPart}${hash}`;
  }, [baseUrl, targetType, source, medium, campaign, staffCode]);

  // QR Code Image URL
  const qrCodeUrl = useMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=12&data=${encodeURIComponent(generatedUrl)}`;
  }, [generatedUrl]);

  // Copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(generatedUrl).then(() => {
      setCopied(true);
      toast.success('Campaign link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    });
  };

  // Download QR Code
  const handleDownloadQR = async () => {
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `owngo_qr_${source || 'campaign'}_${Date.now()}.png`;
      a.click();
      toast.success('QR Code downloaded!');
    } catch (e) {
      toast.error('Failed to download QR code');
    }
  };

  return (
    <AppLayout>
      <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 50 }}>
        {/* Page Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', fontSize: '1.5rem' }}>
              <RiLinkM />
            </div>
            <div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Campaign Link & QR Generator
              </h1>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Generate tracked UTM marketing links & QR codes for Instagram, WhatsApp, Auto Stands, and Sales Team
              </p>
            </div>
          </div>
        </div>

        {/* 1-Click Fast Presets */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <RiStarLine style={{ color: '#f59e0b' }} /> Quick Channel Presets
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            {PRESETS.map(p => (
              <button
                key={p.id}
                onClick={() => handleApplyPreset(p)}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  boxShadow: 'var(--shadow-sm)'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = p.color;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <div style={{ width: 34, height: 34, borderRadius: 8, background: `${p.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: p.color, fontSize: '1.2rem', flexShrink: 0 }}>
                  {p.icon}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                    {p.source} • {p.target}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Builder & Output Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 24, alignItems: 'start' }}>
          {/* Left Form: Parameter Controls */}
          <div className="card" style={{ padding: 22, border: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 16px', color: 'var(--text-primary)' }}>
              1. Configure Campaign Parameters
            </h2>

            {/* Target Destination */}
            <div className="form-group" style={{ marginBottom: 18 }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Destination Page *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setTargetType('partner')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: targetType === 'partner' ? '2px solid #10b981' : '1px solid var(--border)',
                    background: targetType === 'partner' ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-secondary)',
                    color: targetType === 'partner' ? '#10b981' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '0.825rem',
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  🎯 Leads Form
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('pilot')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: targetType === 'pilot' ? '2px solid #06b6d4' : '1px solid var(--border)',
                    background: targetType === 'pilot' ? 'rgba(6, 182, 212, 0.12)' : 'var(--bg-secondary)',
                    color: targetType === 'pilot' ? '#06b6d4' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '0.825rem',
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  🛺 EV Pilot Form
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('home')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: targetType === 'home' ? '2px solid #6366f1' : '1px solid var(--border)',
                    background: targetType === 'home' ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-secondary)',
                    color: targetType === 'home' ? '#6366f1' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '0.825rem',
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  🌐 Website Home
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {/* Campaign Source */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>UTM Source (Platform) *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. instagram, whatsapp, poster"
                  value={source}
                  onChange={e => setSource(e.target.value)}
                  required
                />
              </div>

              {/* Campaign Medium */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>UTM Medium (Format)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. bio, broadcast, qr_code, cpc"
                  value={medium}
                  onChange={e => setMedium(e.target.value)}
                />
              </div>

              {/* Campaign Name */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>UTM Campaign Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. chennai_launch, diwali_offer"
                  value={campaign}
                  onChange={e => setCampaign(e.target.value)}
                />
              </div>

              {/* Staff / Referral Code */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Staff / Agent Referral Code</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. aravindhan, agent-01, team-a"
                  value={staffCode}
                  onChange={e => setStaffCode(e.target.value)}
                />
              </div>
            </div>

            {/* Base Domain */}
            <div className="form-group" style={{ marginTop: 14 }}>
              <label className="form-label" style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>Base Website Domain</label>
              <input
                type="text"
                className="form-control"
                style={{ fontSize: '0.85rem' }}
                value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
              />
            </div>
          </div>

          {/* Right Box: Live Output & QR Code */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Generated Link Box */}
            <div className="card" style={{ padding: 22, border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 14px', color: 'var(--text-primary)' }}>
                2. Generated Campaign Link
              </h2>

              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 14, wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.875rem', color: '#38bdf8', minHeight: 68, display: 'flex', alignItems: 'center' }}>
                {generatedUrl}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleCopy}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {copied ? <><RiCheckLine /> Copied!</> : <><RiFileCopyLine /> Copy Link</>}
                </button>
                {canCreateLink && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleSaveCurrentLink}
                    title="Save this link to the table below"
                  >
                    <RiAddLine /> Save Link
                  </button>
                )}
                <a
                  href={generatedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline"
                  title="Test in new tab"
                >
                  <RiExternalLinkLine /> Test
                </a>
              </div>
            </div>

            {/* QR Code Box */}
            <div className="card" style={{ padding: 22, border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  3. Offline QR Code
                </h2>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={handleDownloadQR}
                >
                  <RiDownloadLine /> Download PNG
                </button>
              </div>

              <div style={{ background: '#ffffff', padding: 16, borderRadius: 14, display: 'inline-block', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', margin: '0 auto 12px' }}>
                <img
                  src={qrCodeUrl}
                  alt="OwnGo Campaign QR Code"
                  style={{ width: 180, height: 180, display: 'block' }}
                />
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Print this QR code on posters at auto stands, flyers, visiting cards or standees.
              </div>
            </div>
          </div>
        </div>

        {/* Recent Pre-made Staff Quick Links Table */}
        {canViewSavedLinks && (
          <div className="card" style={{ marginTop: 28, padding: 20, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Official Standard & Saved Links ({savedLinks.length})
                </h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  1-click copy or delete marketing links from your team list
                </div>
              </div>
              {canDeleteLink && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={handleResetDefaultLinks}
                  title="Restore standard official links"
                >
                  <RiRefreshLine /> Restore Standard Links
                </button>
              )}
            </div>

            <div className="table-responsive">
              <table className="table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>CHANNEL / USE CASE</th>
                    <th>TARGET</th>
                    <th>TRACKING URL</th>
                    <th style={{ textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {savedLinks.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '28px', color: 'var(--text-muted)' }}>
                        No links saved. Click "Restore Standard Links" or "Save Link" above to add links.
                      </td>
                    </tr>
                  ) : (
                    savedLinks.map(link => (
                      <tr key={link.id}>
                        <td style={{ fontWeight: 600 }}>{link.name}</td>
                        <td>
                          <span className={`badge ${link.targetBadge || (link.target === 'Leads' ? 'badge-success' : 'badge-info')}`}>
                            {link.target}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                          {link.url}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => {
                                navigator.clipboard.writeText(link.url);
                                toast.success('Link copied!');
                              }}
                            >
                              <RiFileCopyLine /> Copy
                            </button>
                            {canEditLink && (
                              <button
                                type="button"
                                className="btn btn-icon btn-sm btn-outline"
                                title="Edit link details & URL"
                                onClick={() => handleOpenEdit(link)}
                              >
                                <RiEditLine />
                              </button>
                            )}
                            {canDeleteLink && (
                              <button
                                type="button"
                                className="btn btn-icon btn-sm btn-danger-icon"
                                title="Delete link"
                                onClick={() => handleDeleteLink(link.id)}
                              >
                                <RiDeleteBinLine />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Option A: Edit Campaign Link Modal */}
        {isEditModalOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '20px'
            }}
            onClick={handleCloseEdit}
          >
            <div
              style={{
                background: 'var(--bg-card, #121815)',
                border: '1px solid var(--border, #223028)',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '560px',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
                overflow: 'hidden'
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '18px 24px',
                  borderBottom: '1px solid var(--border, #223028)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem'
                    }}
                  >
                    <RiEditLine />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Edit Saved Campaign Link
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Update the tracking URL, target destination or channel label
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '1.25rem',
                    padding: 4
                  }}
                >
                  <RiCloseLine />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSaveEdit} style={{ padding: '20px 24px' }}>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    Channel / Use Case Label *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={editFormData.name}
                    onChange={e => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. 📸 Instagram Bio Link"
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    Target Audience / Form Type *
                  </label>
                  <select
                    className="form-control"
                    value={editFormData.target}
                    onChange={e => setEditFormData(prev => ({ ...prev, target: e.target.value }))}
                  >
                    <option value="Leads">Leads (Partner Allocation Form)</option>
                    <option value="EV Pilots">EV Pilots (Driver Recruitment Form)</option>
                    <option value="Home">Website Home</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    Tracking URL *
                  </label>
                  <textarea
                    className="form-control"
                    rows={3}
                    style={{ fontFamily: 'monospace', fontSize: '0.825rem', resize: 'vertical' }}
                    value={editFormData.url}
                    onChange={e => setEditFormData(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="https://owngo.in/?utm_source=..."
                    required
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                    Make sure the URL starts with <code>https://</code> or <code>http://</code>
                  </span>
                </div>

                {/* Modal Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleCloseEdit}
                    disabled={isSavingEdit}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSavingEdit}
                  >
                    {isSavingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default LinkGeneratorPage;
