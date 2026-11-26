import { useState, useEffect, useCallback } from 'react';
import {
  RiCheckboxCircleLine, RiSearchLine, RiRefreshLine, RiEyeLine,
  RiUserHeartLine, RiCalendarLine, RiMoneyDollarBoxLine, RiCloseLine,
  RiEditLine, RiSaveLine, RiWallet3Line, RiCopperCoinLine, RiUserReceivedLine,
  RiLockLine, RiPercentLine, RiCoinsLine, RiFileTextLine
} from 'react-icons/ri';
import AppLayout from '../../components/AppLayout';
import PaginationBar from '../../components/PaginationBar';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const formatCurrency = (v) => {
  const n = parseFloat(v) || 0;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
};

const truncate = (str, max = 10) => {
  if (!str) return '—';
  const clean = String(str).trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max)}...`;
};

const ClosedSalesPage = () => {
  const { hasPermission, user } = useAuth();
  const isSuper = user?.isSuperAdmin || user?.role?.level === 'super_admin';

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(10);

  // View & Edit Modal states
  const [viewLead, setViewLead] = useState(null);
  const [editLead, setEditLead] = useState(null);
  const [editForm, setEditForm] = useState({ value: '', totalValue: '', paidAmount: '', vendorPaidAmount: '', notes: '', designStatus: 'pending', expoDate: '', productionDate: '' });
  const [saving, setSaving] = useState(false);

  // Overview Cards Permissions (Separate UAM control)
  const canViewCardBaseValue = isSuper || hasPermission('closed_sales', 'closed-sales-card-base-value', 'canView');
  const canViewCardGst = isSuper || hasPermission('closed_sales', 'closed-sales-card-gst', 'canView');
  const canViewCardTds = isSuper || hasPermission('closed_sales', 'closed-sales-card-tds', 'canView');
  const canViewCardTotalValue = isSuper || hasPermission('closed_sales', 'closed-sales-card-total-value', 'canView');
  const canViewCardPaid = isSuper || hasPermission('closed_sales', 'closed-sales-card-paid', 'canView');
  const canViewCardBalance = isSuper || hasPermission('closed_sales', 'closed-sales-card-balance', 'canView');
  const canViewCardVendor = isSuper || hasPermission('closed_sales', 'closed-sales-card-vendor', 'canView');

  // Table Columns Permissions (Separate UAM control)
  const canViewColBaseValue = isSuper || hasPermission('closed_sales', 'closed-sales-value', 'canView');
  const canEditValue = isSuper || hasPermission('closed_sales', 'closed-sales-value', 'canEdit');

  const canViewColTotalValue = isSuper || hasPermission('closed_sales', 'closed-sales-total-value', 'canView');
  const canViewColGst = isSuper || hasPermission('closed_sales', 'closed-sales-gst-view', 'canView');
  const canViewColTds = isSuper || hasPermission('closed_sales', 'closed-sales-tds-view', 'canView');

  const canViewColPaid = isSuper || hasPermission('closed_sales', 'closed-sales-paid', 'canView');
  const canEditPaid = isSuper || hasPermission('closed_sales', 'closed-sales-paid', 'canEdit');

  const canViewColBalance = isSuper || hasPermission('closed_sales', 'closed-sales-balance', 'canView');

  const canViewColVendor = isSuper || hasPermission('closed_sales', 'closed-sales-vendor-payout', 'canView');
  const canEditVendorPay = isSuper || hasPermission('closed_sales', 'closed-sales-vendor-payout', 'canEdit');

  const canUseTaxCalc = isSuper || hasPermission('closed_sales', 'closed-sales-tax-calc', 'canView') || hasPermission('closed_sales', 'closed-sales-tax-calc', 'canEdit');

  // Filters & Sorting UAM Permissions
  const canUseFilters = isSuper || hasPermission('closed_sales', 'closed-sales-filters', 'canView');
  const canUseNameFilter = isSuper || hasPermission('closed_sales', 'closed-sales-name-filter', 'canView');
  const canUseSort = isSuper || hasPermission('closed_sales', 'closed-sales-sort', 'canView');

  const canEditList = isSuper || hasPermission('closed_sales', ['closed-sales-list', 'closed-sales-all'], 'canEdit');
  // Can open edit modal if user has list edit permission OR permission to edit any of the fields
  const canEdit = canEditList || canEditValue || canEditPaid || canEditVendorPay;

  // Filter & Sort States
  const [financialYear, setFinancialYear] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [contactFilter, setContactFilter] = useState('all');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [filterOptions, setFilterOptions] = useState({ companies: [], contactPersons: [] });

  const [scopeInfo, setScopeInfo] = useState({ canViewAll: true, scopeType: 'all' });
  const [overallSummary, setOverallSummary] = useState({
    baseValue: 0,
    totalGst: 0,
    totalTds: 0,
    totalDealValue: 0,
    totalValue: 0,
    totalPaid: 0,
    totalVendor: 0,
    totalBalance: 0
  });

  // Tax calculation states
  const [applyGst, setApplyGst] = useState(false);
  const [applyTds, setApplyTds] = useState(false);

  const fetchClosedSales = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        page: String(page),
        limit: String(limit),
        financialYear,
        company: companyFilter,
        contactPerson: contactFilter,
        sortBy,
        sortOrder
      });
      const res = await api.get(`/closed-sales?${params.toString()}`);
      if (res.data.success) {
        setLeads(res.data.leads || []);
        setTotal(res.data.total || 0);
        if (res.data.summary) {
          setOverallSummary(res.data.summary);
        }
        if (res.data.filterOptions) {
          setFilterOptions(res.data.filterOptions);
        }
        setScopeInfo({
          canViewAll: res.data.canViewAll ?? true,
          scopeType: res.data.scopeType || (isSuper ? 'all' : 'own')
        });
      }
    } catch (err) {
      toast.error('Failed to load closed sales data');
    }
    setLoading(false);
  }, [search, page, limit, financialYear, companyFilter, contactFilter, sortBy, sortOrder, isSuper]);

  useEffect(() => {
    fetchClosedSales();
  }, [fetchClosedSales]);

  // Overall aggregate values across ALL closed sales (for accounts team)
  const baseValue = overallSummary.baseValue ?? leads.reduce((sum, l) => sum + (parseFloat(l.value) || 0), 0);
  const totalGst = overallSummary.totalGst ?? leads.reduce((sum, l) => sum + (l.applyGst ? (parseFloat(l.gstAmount) || (parseFloat(l.value) * 0.18)) : 0), 0);
  const totalTds = overallSummary.totalTds ?? leads.reduce((sum, l) => sum + (l.applyTds ? (parseFloat(l.tdsAmount) || (parseFloat(l.value) * 0.02)) : 0), 0);
  const totalDealValue = overallSummary.totalDealValue ?? overallSummary.totalValue ?? leads.reduce((sum, l) => sum + (parseFloat(l.totalValue ?? l.value) || 0), 0);
  const totalPaid = overallSummary.totalPaid ?? leads.reduce((sum, l) => sum + (parseFloat(l.paidAmount) || 0), 0);
  const totalVendor = overallSummary.totalVendor ?? leads.reduce((sum, l) => sum + (parseFloat(l.vendorPaidAmount) || 0), 0);
  const totalBalance = overallSummary.totalBalance ?? (totalDealValue - totalPaid);

  const totalPages = Math.ceil(total / limit) || 1;

  const handleEditClick = (lead) => {
    setEditLead(lead);
    const initialBase = lead.value ?? '';
    const isGst = Boolean(lead.applyGst);
    const isTds = Boolean(lead.applyTds);
    const baseNum = parseFloat(initialBase) || 0;
    const gstNum = isGst ? (parseFloat(lead.gstAmount) || baseNum * 0.18) : 0;
    const tdsNum = isTds ? (parseFloat(lead.tdsAmount) || baseNum * 0.02) : 0;
    const initialTotal = lead.totalValue !== null && lead.totalValue !== undefined
      ? lead.totalValue
      : (isGst || isTds ? (baseNum + gstNum - tdsNum) : initialBase);

    setEditForm({
      value: initialBase,
      totalValue: initialTotal,
      paidAmount: lead.paidAmount ?? '',
      vendorPaidAmount: lead.vendorPaidAmount ?? '',
      notes: lead.notes || '',
      designStatus: lead.designStatus || 'pending',
      expoDate: lead.expoDate || '',
      productionDate: lead.productionDate || ''
    });
    setApplyGst(isGst);
    setApplyTds(isTds);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const baseNum = parseFloat(editForm.value) || 0;
      const gstNum = applyGst ? (baseNum * 0.18) : 0;
      const tdsNum = applyTds ? (baseNum * 0.02) : 0;
      const finalTotal = (applyGst || applyTds) ? (baseNum + gstNum - tdsNum) : baseNum;

      const payload = {
        notes: editForm.notes,
        designStatus: editForm.designStatus,
        applyGst,
        applyTds,
        gstAmount: gstNum,
        tdsAmount: tdsNum,
        totalValue: finalTotal,
        expoDate: editForm.expoDate || null,
        productionDate: editForm.productionDate || null
      };
      if (canEditValue) {
        payload.value = baseNum;
      }
      if (canEditPaid) {
        payload.paidAmount = parseFloat(editForm.paidAmount) || 0;
      }
      if (canEditVendorPay) {
        payload.vendorPaidAmount = parseFloat(editForm.vendorPaidAmount) || 0;
      }

      const res = await api.put(`/leads/${editLead.id}`, payload);
      if (res.data.success) {
        toast.success('Sales financial details updated successfully!');
        setEditLead(null);
        fetchClosedSales();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update details');
    }
    setSaving(false);
  };

  const handleSortToggle = (field) => {
    if (!canUseSort) return;
    if (sortBy === field) {
      setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(field);
      setSortOrder('DESC');
    }
    setPage(1);
  };

  const getSortIndicator = (field) => {
    if (!canUseSort) return null;
    if (sortBy !== field) {
      return <span style={{ opacity: 0.35, marginLeft: 4, fontSize: '0.72rem' }}>⇅</span>;
    }
    return (
      <span style={{ color: 'var(--accent)', marginLeft: 4, fontSize: '0.75rem', fontWeight: 800 }}>
        {sortOrder === 'ASC' ? '▲' : '▼'}
      </span>
    );
  };

  const handleResetFilters = () => {
    setSearch('');
    setFinancialYear('all');
    setCompanyFilter('all');
    setContactFilter('all');
    setSortBy('updatedAt');
    setSortOrder('DESC');
    setPage(1);
  };

  const hasActiveFilters = search || financialYear !== 'all' || companyFilter !== 'all' || contactFilter !== 'all' || sortBy !== 'updatedAt';

  return (
    <AppLayout>
      <div className="page-header" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
              <RiCheckboxCircleLine style={{ color: 'var(--success)' }} /> Closed Sales
            </h1>

            {scopeInfo.scopeType === 'all' ? (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: '0.75rem',
                fontWeight: 600,
                background: 'rgba(59, 130, 246, 0.12)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.3)'
              }}>
                <span>👥</span> All Closed Sales (Team / Org Scope)
              </span>
            ) : (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: '0.75rem',
                fontWeight: 600,
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                <span>👤</span> My Closed Sales (Assigned Only)
              </span>
            )}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 6 }}>
            {scopeInfo.scopeType === 'all'
              ? 'Monitoring all closed and won sales across your team & organization.'
              : 'Viewing only closed sales specifically assigned to your account.'}
          </p>
        </div>
      </div>

      {/* Aggregate Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 16, marginBottom: 24 }}>
        
        {/* 1. Base Deal Value Card */}
        {canViewCardBaseValue && (
          <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(59,130,246,0.1)', color: 'rgb(59,130,246)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.35rem' }}>
              <RiMoneyDollarBoxLine />
            </div>
            <div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Base Deal Value</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>{formatCurrency(baseValue)}</div>
            </div>
          </div>
        )}

        {/* 2. Total GST (18%) Card */}
        {canViewCardGst && (
          <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-glow)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.35rem' }}>
              <RiPercentLine />
            </div>
            <div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Total GST (18%)</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent)', marginTop: 2 }}>+{formatCurrency(totalGst)}</div>
            </div>
          </div>
        )}

        {/* 3. Total TDS (2%) Card */}
        {canViewCardTds && (
          <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.35rem' }}>
              <RiCoinsLine />
            </div>
            <div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Total TDS (2%)</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b', marginTop: 2 }}>−{formatCurrency(totalTds)}</div>
            </div>
          </div>
        )}

        {/* 4. Total Deal Value (Net Invoice Value) Card */}
        {canViewCardTotalValue && (
          <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, border: '1px solid rgba(56, 189, 248, 0.25)' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(56,189,248,0.12)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.35rem' }}>
              <RiFileTextLine />
            </div>
            <div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Total Deal Value</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8', marginTop: 2 }}>{formatCurrency(totalDealValue)}</div>
            </div>
          </div>
        )}

        {/* 5. Amount Paid Card */}
        {canViewCardPaid && (
          <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(16,185,129,0.1)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.35rem' }}>
              <RiWallet3Line />
            </div>
            <div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Amount Paid</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)', marginTop: 2 }}>{formatCurrency(totalPaid)}</div>
            </div>
          </div>
        )}

        {/* 6. Pending Balance Card */}
        {canViewCardBalance && (
          <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.35rem' }}>
              <RiCopperCoinLine />
            </div>
            <div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Pending Balance</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--danger)', marginTop: 2 }}>{formatCurrency(totalBalance)}</div>
            </div>
          </div>
        )}

        {/* 7. Paid to Vendor Card */}
        {canViewCardVendor && (
          <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(245,158,11,0.1)', color: 'rgb(245,158,11)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.35rem' }}>
              <RiUserReceivedLine />
            </div>
            <div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Paid to Vendor</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'rgb(245,158,11)', marginTop: 2 }}>{formatCurrency(totalVendor)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Filter, Search & Value Sorting Bar */}
      <div className="card" style={{ padding: '16px', background: 'var(--bg-card)', marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Row 1: Search & Reset */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '8px 12px',
            flex: '1 1 280px'
          }}>
            <RiSearchLine style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }} />
            <input
              type="text"
              placeholder="Search by caller, company, contact person, remarks..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                width: '100%',
                fontSize: '0.85rem'
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none' }}>
                <RiCloseLine />
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <RiRefreshLine /> Reset Filters
            </button>
          )}
        </div>

        {/* Row 2: Financial Year, Company, Name, and Sorting Dropdowns (Controlled by UAM permissions) */}
        {(canUseFilters || canUseNameFilter || canUseSort) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', paddingTop: 6, borderTop: '1px solid var(--border)' }}>
            {/* 1. Financial Year Filter (Indian FY: April 1 to March 31) */}
            {canUseFilters && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 150 }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Financial Year</label>
                <select
                  value={financialYear}
                  onChange={e => { setFinancialYear(e.target.value); setPage(1); }}
                  style={{
                    padding: '7px 10px',
                    borderRadius: 6,
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">All Financial Years</option>
                  <option value="2026-2027">FY 2026-27 (Apr 26 - Mar 27)</option>
                  <option value="2025-2026">FY 2025-26 (Apr 25 - Mar 26)</option>
                  <option value="2024-2025">FY 2024-25 (Apr 24 - Mar 25)</option>
                  <option value="2023-2024">FY 2023-24 (Apr 23 - Mar 24)</option>
                </select>
              </div>
            )}

            {/* 2. Company Name Filter */}
            {canUseFilters && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 160 }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Company</label>
                <select
                  value={companyFilter}
                  onChange={e => { setCompanyFilter(e.target.value); setPage(1); }}
                  style={{
                    padding: '7px 10px',
                    borderRadius: 6,
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">All Companies ({filterOptions.companies?.length || 0})</option>
                  {filterOptions.companies?.map(comp => (
                    <option key={comp} value={comp}>{comp}</option>
                  ))}
                </select>
              </div>
            )}

            {/* 3. Name Filter (Controlled strictly by UAM: closed-sales-name-filter) */}
            {canUseNameFilter && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 160 }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Name</label>
                <select
                  value={contactFilter}
                  onChange={e => { setContactFilter(e.target.value); setPage(1); }}
                  style={{
                    padding: '7px 10px',
                    borderRadius: 6,
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">All Names ({filterOptions.contactPersons?.length || 0})</option>
                  {filterOptions.contactPersons?.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* 4. Value & Column Sorting Dropdown */}
            {canUseSort && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 170 }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Sort Deals By</label>
                <select
                  value={`${sortBy}_${sortOrder}`}
                  onChange={e => {
                    const [f, d] = e.target.value.split('_');
                    setSortBy(f);
                    setSortOrder(d);
                    setPage(1);
                  }}
                  style={{
                    padding: '7px 10px',
                    borderRadius: 6,
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  <option value="updatedAt_DESC">Latest Updated</option>
                  <option value="value_DESC">Base Value: High to Low</option>
                  <option value="value_ASC">Base Value: Low to High</option>
                  <option value="totalValue_DESC">Total Value: High to Low</option>
                  <option value="totalValue_ASC">Total Value: Low to High</option>
                  <option value="paidAmount_DESC">Paid Amount: High to Low</option>
                  <option value="balance_DESC">Pending Balance: High to Low</option>
                  <option value="companyName_ASC">Company Name (A to Z)</option>
                  <option value="name_ASC">Contact Person (A to Z)</option>
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <div style={{ color: 'var(--text-secondary)' }}>Loading closed sales...</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {leads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
              No closed sales found.
            </div>
          ) : (
            <>
              <div className="table-wrapper">
                <table className="table table-sticky-actions">
                  <thead>
                    <tr>
                      <th onClick={() => handleSortToggle('companyName')} style={{ cursor: canUseSort ? 'pointer' : 'default', userSelect: 'none' }}>
                        Company Name {getSortIndicator('companyName')}
                      </th>
                      <th onClick={() => handleSortToggle('name')} style={{ cursor: canUseSort ? 'pointer' : 'default', userSelect: 'none' }}>
                        Contact Person {getSortIndicator('name')}
                      </th>
                      <th>Phone Number</th>
                      <th>Expo Name</th>
                      {canViewColBaseValue && (
                        <th onClick={() => handleSortToggle('value')} style={{ textAlign: 'right', cursor: canUseSort ? 'pointer' : 'default', userSelect: 'none' }}>
                          Base Value {getSortIndicator('value')}
                        </th>
                      )}
                      {canViewColGst && <th style={{ textAlign: 'right' }}>GST (18%)</th>}
                      {canViewColTds && <th style={{ textAlign: 'right' }}>TDS (2%)</th>}
                      {canViewColTotalValue && (
                        <th onClick={() => handleSortToggle('totalValue')} style={{ textAlign: 'right', cursor: canUseSort ? 'pointer' : 'default', userSelect: 'none' }}>
                          Total Value {getSortIndicator('totalValue')}
                        </th>
                      )}
                      {canViewColPaid && (
                        <th onClick={() => handleSortToggle('paidAmount')} style={{ textAlign: 'right', cursor: canUseSort ? 'pointer' : 'default', userSelect: 'none' }}>
                          Paid {getSortIndicator('paidAmount')}
                        </th>
                      )}
                      {canViewColBalance && (
                        <th onClick={() => handleSortToggle('balance')} style={{ textAlign: 'right', cursor: canUseSort ? 'pointer' : 'default', userSelect: 'none' }}>
                          Balance {getSortIndicator('balance')}
                        </th>
                      )}
                      {canViewColVendor && (
                        <th onClick={() => handleSortToggle('vendorPaidAmount')} style={{ textAlign: 'right', cursor: canUseSort ? 'pointer' : 'default', userSelect: 'none' }}>
                          Vendor Payout {getSortIndicator('vendorPaidAmount')}
                        </th>
                      )}
                      <th>Caller</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map(lead => {
                      const val = parseFloat(lead.value) || 0;
                      const gstAmt = lead.applyGst ? (parseFloat(lead.gstAmount) || val * 0.18) : 0;
                      const tdsAmt = lead.applyTds ? (parseFloat(lead.tdsAmount) || val * 0.02) : 0;
                      // Formula: Base Value + GST (18%) - TDS (2%) = Total Value
                      const totalVal = lead.totalValue !== null && lead.totalValue !== undefined
                        ? (parseFloat(lead.totalValue) || 0)
                        : (lead.applyGst || lead.applyTds ? (val + gstAmt - tdsAmt) : val);
                      const paid = parseFloat(lead.paidAmount) || 0;
                      // Formula: Total Value - Paid Amount = Pending Balance
                      const bal = totalVal - paid;
                      const expoVal = lead.expoName || lead.expoType || lead.expo || '';

                      return (
                        <tr key={lead.id}>
                          {/* 1. Company Name */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 30,
                                height: 30,
                                borderRadius: '50%',
                                background: 'rgba(16,185,129,0.1)',
                                color: 'var(--success)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                flexShrink: 0
                              }}>
                                {(lead.companyName || lead.name || '?').charAt(0).toUpperCase()}
                              </div>
                              <span
                                title={lead.companyName || ''}
                                style={{
                                  fontWeight: 700,
                                  color: 'var(--text-primary)',
                                  whiteSpace: 'nowrap',
                                  cursor: lead.companyName?.length > 10 ? 'help' : 'default'
                                }}
                              >
                                {truncate(lead.companyName, 10)}
                              </span>
                            </div>
                          </td>

                          {/* 2. Contact Person */}
                          <td>
                            <span
                              title={lead.name || 'N/A'}
                              style={{
                                fontWeight: 600,
                                color: lead.name ? 'var(--text-primary)' : 'var(--text-muted)',
                                whiteSpace: 'nowrap',
                                cursor: lead.name?.length > 10 ? 'help' : 'default'
                              }}
                            >
                              {truncate(lead.name, 10)}
                            </span>
                          </td>

                          {/* 3. Phone Number */}
                          <td>
                            <span style={{ fontSize: '0.8125rem', color: lead.phone ? 'var(--text-secondary)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                              {lead.phone || '—'}
                            </span>
                          </td>

                          {/* 4. Expo Name */}
                          <td>
                            <span
                              title={expoVal || '—'}
                              style={{
                                fontSize: '0.8125rem',
                                color: expoVal ? 'var(--text-secondary)' : 'var(--text-muted)',
                                whiteSpace: 'nowrap',
                                cursor: expoVal.length > 10 ? 'help' : 'default'
                              }}
                            >
                              {truncate(expoVal, 10)}
                            </span>
                          </td>

                          {/* 5. Base Value */}
                          {canViewColBaseValue && (
                            <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                              {formatCurrency(lead.value)}
                            </td>
                          )}

                          {/* 6. GST (18%) */}
                          {canViewColGst && (
                            <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                              {lead.applyGst ? (
                                <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.8125rem' }}>
                                  +{formatCurrency(gstAmt)}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>—</span>
                              )}
                            </td>
                          )}

                          {/* 7. TDS (2%) */}
                          {canViewColTds && (
                            <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                              {lead.applyTds ? (
                                <span style={{ color: '#f59e0b', fontWeight: 600, fontSize: '0.8125rem' }}>
                                  −{formatCurrency(tdsAmt)}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>—</span>
                              )}
                            </td>
                          )}

                          {/* 8. Total Value */}
                          {canViewColTotalValue && (
                            <td style={{ textAlign: 'right', fontWeight: 800, color: '#38bdf8', whiteSpace: 'nowrap' }}>
                              {formatCurrency(totalVal)}
                            </td>
                          )}

                          {/* 9. Paid */}
                          {canViewColPaid && (
                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)', whiteSpace: 'nowrap' }}>
                              {formatCurrency(lead.paidAmount)}
                            </td>
                          )}

                          {/* 10. Balance */}
                          {canViewColBalance && (
                            <td style={{ textAlign: 'right', fontWeight: 700, color: bal > 0 ? 'var(--danger)' : 'var(--success)', whiteSpace: 'nowrap' }}>
                              {formatCurrency(bal)}
                            </td>
                          )}

                          {/* 11. Vendor Payout */}
                          {canViewColVendor && (
                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'rgb(245,158,11)', whiteSpace: 'nowrap' }}>
                              {formatCurrency(lead.vendorPaidAmount)}
                            </td>
                          )}

                          {/* 9. Caller */}
                          <td>
                            <span
                              title={lead.assignee?.name || 'Unassigned'}
                              style={{
                                fontSize: '0.8125rem',
                                color: 'var(--text-secondary)',
                                whiteSpace: 'nowrap',
                                cursor: lead.assignee?.name?.length > 10 ? 'help' : 'default'
                              }}
                            >
                              {truncate(lead.assignee?.name || 'Unassigned', 10)}
                            </span>
                          </td>

                          {/* 10. Actions */}
                          <td style={{ textAlign: 'center' }}>
                            <div className="flex gap-2" style={{ justifyContent: 'center' }}>
                              <button
                                className="btn btn-icon btn-sm"
                                onClick={() => setViewLead(lead)}
                                title="View Details"
                              >
                                <RiEyeLine />
                              </button>
                              {canEdit && (
                                <button
                                  className="btn btn-icon btn-sm"
                                  onClick={() => handleEditClick(lead)}
                                  title="Edit Financials"
                                >
                                  <RiEditLine />
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

              {/* Pagination */}
              <PaginationBar
                page={page}
                setPage={setPage}
                total={total}
                limit={limit}
                setLimit={setLimit}
                label="deals"
                pageSizeOptions={[10, 25, 50, 100]}
              />
            </>
          )}
        </div>
      )}

      {/* Details View Modal */}
      {viewLead && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 500, padding: 24, position: 'relative' }}>
            <button
              onClick={() => setViewLead(null)}
              style={{
                position: 'absolute', top: 16, right: 16, background: 'none',
                border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.25rem'
              }}
            >
              <RiCloseLine />
            </button>

            <h3 style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--text-primary)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <RiUserHeartLine style={{ color: 'var(--success)' }} /> Deal Information
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Lead Name</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 700 }}>{viewLead.name || 'N/A'}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Company Name</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 700 }}>{viewLead.companyName}</div>
              </div>

              <div className="form-grid-2" style={{ gap: 12 }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Phone</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{viewLead.phone || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Email</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{viewLead.email || '—'}</div>
                </div>
              </div>

              {(canViewColBaseValue || canViewColPaid) && (
                <div className="form-grid-2" style={{ gap: 12 }}>
                  {canViewColBaseValue && (
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Base Deal Value</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 700 }}>{formatCurrency(viewLead.value)}</div>
                    </div>
                  )}
                  {canViewColPaid && (
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Amount Paid</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--success)', fontWeight: 700 }}>{formatCurrency(viewLead.paidAmount)}</div>
                    </div>
                  )}
                </div>
              )}

              {(canViewColGst || canViewColTds) && (
                <div className="form-grid-2" style={{ gap: 12 }}>
                  {canViewColGst && (
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>GST (18%)</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--accent)', fontWeight: 700 }}>
                        {viewLead.applyGst ? `+${formatCurrency(viewLead.gstAmount || (parseFloat(viewLead.value) || 0) * 0.18)}` : 'Not Applied'}
                      </div>
                    </div>
                  )}
                  {canViewColTds && (
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>TDS (2%)</div>
                      <div style={{ fontSize: '0.875rem', color: '#f59e0b', fontWeight: 700 }}>
                        {viewLead.applyTds ? `−${formatCurrency(viewLead.tdsAmount || (parseFloat(viewLead.value) || 0) * 0.02)}` : 'Not Deducted'}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {(canViewColTotalValue || canViewColBalance) && (
                <div className="form-grid-2" style={{ gap: 12 }}>
                  {canViewColTotalValue && (
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Value (Net Deal)</div>
                      <div style={{ fontSize: '0.875rem', color: '#38bdf8', fontWeight: 700 }}>
                        {formatCurrency(
                          viewLead.totalValue !== null && viewLead.totalValue !== undefined
                            ? viewLead.totalValue
                            : ((parseFloat(viewLead.value) || 0) + (viewLead.applyGst ? (parseFloat(viewLead.value) || 0) * 0.18 : 0) - (viewLead.applyTds ? (parseFloat(viewLead.value) || 0) * 0.02 : 0))
                        )}
                      </div>
                    </div>
                  )}
                  {canViewColBalance && (
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Outstanding Balance</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--danger)', fontWeight: 700 }}>
                        {formatCurrency(
                          (viewLead.totalValue !== null && viewLead.totalValue !== undefined
                            ? parseFloat(viewLead.totalValue) || 0
                            : ((parseFloat(viewLead.value) || 0) + (viewLead.applyGst ? (parseFloat(viewLead.value) || 0) * 0.18 : 0) - (viewLead.applyTds ? (parseFloat(viewLead.value) || 0) * 0.02 : 0))
                          ) - (parseFloat(viewLead.paidAmount) || 0)
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {canViewColVendor && (
                <div className="form-grid-2" style={{ gap: 12 }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Vendor Payout</div>
                    <div style={{ fontSize: '0.875rem', color: 'rgb(245,158,11)', fontWeight: 700 }}>{formatCurrency(viewLead.vendorPaidAmount)}</div>
                  </div>
                </div>
              )}

              <div className="form-grid-2" style={{ gap: 12 }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Design Status</div>
                  <div style={{
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: viewLead.designStatus === 'completed' ? 'var(--success)' : viewLead.designStatus === 'change' ? 'var(--danger)' : 'var(--warning)',
                    marginTop: 2,
                    textTransform: 'capitalize'
                  }}>
                    {viewLead.designStatus || 'Pending'} Design
                  </div>
                </div>
              </div>

              {viewLead.notes && (
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Sales Remarks</div>
                  <div style={{
                    background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 8,
                    fontSize: '0.8rem', color: 'var(--text-secondary)', border: '1px solid var(--border)',
                    marginTop: 4, whiteSpace: 'pre-wrap'
                  }}>
                    {viewLead.notes}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Financial Details Modal */}
      {editLead && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(5px)',
          padding: '16px'
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: 540,
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            position: 'relative',
            borderRadius: 14,
            overflow: 'hidden',
            boxShadow: 'var(--shadow-lg, 0 20px 25px -5px rgba(0, 0, 0, 0.5))'
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 22px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-card)'
            }}>
              <h3 style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <RiEditLine style={{ color: 'var(--accent)' }} /> Edit Deal Financials
              </h3>
              <button
                type="button"
                onClick={() => setEditLead(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 4
                }}
              >
                <RiCloseLine />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, margin: 0 }}>
              {/* Scrollable Body */}
              <div style={{
                padding: '20px 22px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                flex: 1
              }}>

                {/* Deal Value & Paid Amount in a Responsive Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: (canViewColBaseValue && canViewColPaid) ? 'repeat(auto-fit, minmax(210px, 1fr))' : '1fr',
                  gap: 14
                }}>
                  {canViewColBaseValue && (
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>Base Deal Value (INR) {canEditValue && '*'}</span>
                        {!canEditValue && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <RiLockLine /> Read Only
                          </span>
                        )}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        value={editForm.value}
                        onChange={e => setEditForm(p => ({ ...p, value: e.target.value }))}
                        required={canEditValue}
                        disabled={!canEditValue}
                        placeholder="Contract deal base value"
                        style={!canEditValue ? { opacity: 0.65, cursor: 'not-allowed', background: 'rgba(255,255,255,0.03)' } : {}}
                      />
                    </div>
                  )}

                  {canViewColPaid && (
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>Paid Amount (INR)</span>
                        {!canEditPaid && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <RiLockLine /> Read Only
                          </span>
                        )}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        value={editForm.paidAmount}
                        onChange={e => setEditForm(p => ({ ...p, paidAmount: e.target.value }))}
                        disabled={!canEditPaid}
                        placeholder="Amount paid by client"
                        style={!canEditPaid ? { opacity: 0.65, cursor: 'not-allowed', background: 'rgba(255,255,255,0.03)' } : {}}
                      />
                    </div>
                  )}
                </div>

                {/* ── Tax Calculator (GST 18% & TDS 2%) — UAM Controlled ── */}
                {canUseTaxCalc && (
                  <div style={{
                    background: (applyGst || applyTds) ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)' : 'rgba(255, 255, 255, 0.02)',
                    border: (applyGst || applyTds) ? '1px solid rgba(99, 102, 241, 0.35)' : '1px dashed var(--border)',
                    borderRadius: 10,
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>🧾</span> Tax Calculator (GST & TDS)
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: canEditValue ? 'pointer' : 'not-allowed', fontSize: '0.8125rem', fontWeight: 600, color: applyGst ? '#818cf8' : 'var(--text-secondary)' }}>
                          <input
                            type="checkbox"
                            checked={applyGst}
                            disabled={!canEditValue}
                            onChange={e => setApplyGst(e.target.checked)}
                            style={{ accentColor: 'var(--accent)', cursor: canEditValue ? 'pointer' : 'not-allowed', width: 16, height: 16 }}
                          />
                          <span>GST (18%)</span>
                        </label>

                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: canEditValue ? 'pointer' : 'not-allowed', fontSize: '0.8125rem', fontWeight: 600, color: applyTds ? '#fbbf24' : 'var(--text-secondary)' }}>
                          <input
                            type="checkbox"
                            checked={applyTds}
                            disabled={!canEditValue}
                            onChange={e => setApplyTds(e.target.checked)}
                            style={{ accentColor: '#fbbf24', cursor: canEditValue ? 'pointer' : 'not-allowed', width: 16, height: 16 }}
                          />
                          <span>TDS (2%)</span>
                        </label>
                      </div>
                    </div>

                    <div style={{
                      background: 'rgba(15, 23, 42, 0.75)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 8,
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10
                    }}>
                      {/* 3 Responsive Cards for Base, GST, TDS */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                        gap: 8
                      }}>
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Base Value</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                            {formatCurrency(parseFloat(editForm.value) || 0)}
                          </div>
                        </div>

                        <div style={{ background: applyGst ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: 6, border: applyGst ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ fontSize: '0.6875rem', color: applyGst ? '#818cf8' : 'var(--text-muted)', fontWeight: 600 }}>GST (18%)</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: applyGst ? '#818cf8' : 'var(--text-muted)', marginTop: 2 }}>
                            {applyGst ? `+${formatCurrency((parseFloat(editForm.value) || 0) * 0.18)}` : '—'}
                          </div>
                        </div>

                        <div style={{ background: applyTds ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: 6, border: applyTds ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ fontSize: '0.6875rem', color: applyTds ? '#fbbf24' : 'var(--text-muted)', fontWeight: 600 }}>TDS (2%)</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: applyTds ? '#fbbf24' : 'var(--text-muted)', marginTop: 2 }}>
                            {applyTds ? `−${formatCurrency((parseFloat(editForm.value) || 0) * 0.02)}` : '—'}
                          </div>
                        </div>
                      </div>

                      {/* Calculated Total Deal Value Display */}
                      <div style={{
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                        paddingTop: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 10
                      }}>
                        <div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Calculated Total Value (Invoice Amount):</div>
                          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#38bdf8', marginTop: 1 }}>
                            {formatCurrency(
                              (parseFloat(editForm.value) || 0) +
                              (applyGst ? (parseFloat(editForm.value) || 0) * 0.18 : 0) -
                              (applyTds ? (parseFloat(editForm.value) || 0) * 0.02 : 0)
                            )}
                          </div>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', maxWidth: 220, textAlign: 'right' }}>
                          * Base value is kept separate; total value is calculated automatically for accounts.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Calculated Balance Card */}
                {canViewColBalance && (
                  <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Calculated Balance (Total Value − Paid):</span>
                    <span style={{
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      color: (
                        ((parseFloat(editForm.value) || 0) + (applyGst ? (parseFloat(editForm.value) || 0) * 0.18 : 0) - (applyTds ? (parseFloat(editForm.value) || 0) * 0.02 : 0)) -
                        (parseFloat(editForm.paidAmount) || 0)
                      ) > 0 ? 'var(--danger)' : 'var(--success)'
                    }}>
                      {formatCurrency(
                        ((parseFloat(editForm.value) || 0) + (applyGst ? (parseFloat(editForm.value) || 0) * 0.18 : 0) - (applyTds ? (parseFloat(editForm.value) || 0) * 0.02 : 0)) -
                        (parseFloat(editForm.paidAmount) || 0)
                      )}
                    </span>
                  </div>
                )}

                {canViewColVendor && (
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>Paid to Vendor (INR)</span>
                      {!canEditVendorPay && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <RiLockLine /> Read Only
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={editForm.vendorPaidAmount}
                      onChange={e => setEditForm(p => ({ ...p, vendorPaidAmount: e.target.value }))}
                      disabled={!canEditVendorPay}
                      placeholder="Amount paid to vendor/partner"
                      style={!canEditVendorPay ? { opacity: 0.65, cursor: 'not-allowed', background: 'rgba(255,255,255,0.03)' } : {}}
                    />
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Expo Date <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span>
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={editForm.expoDate || ''}
                      onChange={e => setEditForm(p => ({ ...p, expoDate: e.target.value }))}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Production Date <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span>
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={editForm.productionDate || ''}
                      onChange={e => setEditForm(p => ({ ...p, productionDate: e.target.value }))}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Remarks / Notes</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={editForm.notes}
                    onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Update sales notes..."
                    style={{ resize: 'none' }}
                  />
                </div>

              </div>

              {/* Sticky Footer */}
              <div style={{
                padding: '14px 22px',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                background: 'var(--bg-card)'
              }}>
                <button type="button" className="btn btn-outline" onClick={() => setEditLead(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <div className="spinner spinner-sm" /> : <RiSaveLine />} Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default ClosedSalesPage;
