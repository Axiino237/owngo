const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const multer = require('multer');
const XLSX = require('xlsx');
const { Lead, User, Organization, Permission, Role, Expo, LeadStatus, LoanApplication } = require('../models');
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');

// @desc   Download CSV template
// @route  GET /api/leads/csv-template
router.get('/csv-template', (req, res) => {
  const headers = 'Company Name,Contact Person,Email,Phone Number,Designation,Expo Type,Expo Name,Address,Assigned To,Status,Expo Mode,Last Contacted Date,Next Follow Up,Remarks,Alternate Phone';
  const sample  = 'Acme Corp,John Doe,john@acme.com,9876543210,CEO,Social Media,Google Ads,123 Main St,admin@crm.com,new,Online,2026-06-30,2026-07-15,Looking for CRM options,9876543211';
  const csv = `${headers}\n${sample}\n`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="leads_template.csv"');
  res.send(csv);
});

// Helper: Normalize lead source to category level (prevent agent codes from creating new sources)
const normalizeLeadSource = (src, link) => {
  if (!src) return 'Direct Website';
  const s = String(src).trim();
  const lower = s.toLowerCase();
  if (
    lower.startsWith('ref-') ||
    lower.startsWith('ref_') ||
    lower === 'agent_referral' ||
    lower === 'agent referral' ||
    lower === 'partner_referral' ||
    lower === 'partner referral' ||
    lower === 'sales agent referral' ||
    lower === 'referral' ||
    (link && (String(link).includes('ref=') || String(link).toLowerCase().includes('utm_source=agent_referral')))
  ) {
    return 'Agent / Partner Referral';
  }
  return s;
};

// @desc   Public Intake for Website leads (Partner and Pilot)
// @route  POST /api/leads/website
router.post('/website', async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      leadType = 'partner', // 'partner' | 'pilot'
      autos = 1,
      city,
      cibil,
      licenseType,
      preferredArea,
      experience,
      source = 'Direct Website',
      sourceLink,
      status = 'new'
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and Phone number are required' });
    }

    const cleanName = String(name).trim();
    const cleanPhone = String(phone).trim();
    const resolvedType = (leadType && String(leadType).toLowerCase() === 'pilot') ? 'pilot' : 'partner';
    const resolvedSource = normalizeLeadSource(source, sourceLink);
    const resolvedLink = sourceLink || null;

    // Build comprehensive remarks / notes
    let notes = '';
    if (resolvedType === 'pilot') {
      notes = `[Website EV Pilot Application]\n- Pilot Name: ${cleanName}\n- License: ${licenseType || 'Auto Rickshaw'}\n- Preferred Zone: ${preferredArea || 'Chennai'}\n- Experience: ${experience || '1-3 Years'}\n- Source Link: ${resolvedLink || resolvedSource}`;
    } else {
      notes = `[Website Fleet Partner Application]\n- Partner Name: ${cleanName}\n- Autos: ${autos || 1} Auto(s) (₹${(parseInt(autos, 10) || 1) * 1} Lakh Capital)\n- Target City: ${city || 'Chennai'}\n- CIBIL Score: ${cibil || 'N/A'}\n- Source Link: ${resolvedLink || resolvedSource}`;
    }

    const companyName = resolvedType === 'pilot' 
      ? `EV Pilot Candidate - ${cleanName}` 
      : `Fleet Partner - ${cleanName}`;

    // Get default organization if any
    const defaultOrg = await Organization.findOne({ order: [['createdAt', 'ASC']] }).catch(() => null);

    const lead = await Lead.create({
      name: cleanName,
      companyName: companyName,
      phone: cleanPhone,
      email: email ? String(email).trim() : null,
      status: 'new', // Default status for website leads is strictly 'new'
      expo: 'website',
      expoType: resolvedType === 'pilot' ? 'EV Pilot Lead' : 'Partner Lead',
      expoName: resolvedSource,
      notes: notes,
      source: resolvedSource,
      sourceLink: resolvedLink,
      leadType: resolvedType,
      autosCount: parseInt(autos, 10) || 1,
      city: city || (resolvedType === 'pilot' ? preferredArea : 'Chennai'),
      cibilScore: cibil || null,
      licenseType: licenseType || null,
      preferredArea: preferredArea || null,
      experience: experience || null,
      designation: resolvedType === 'pilot' ? 'EV Pilot Driver' : 'Fleet Partner',
      organizationId: defaultOrg ? defaultOrg.id : null
    });

    // Notify connected CRM clients in real-time
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('new_lead', {
          id: lead.id,
          name: lead.name,
          phone: lead.phone,
          leadType: lead.leadType,
          status: lead.status,
          source: lead.source,
          sourceLink: lead.sourceLink,
          createdAt: lead.createdAt
        });
      }
    } catch (e) {}

    res.status(201).json({
      success: true,
      message: `${resolvedType === 'pilot' ? 'EV Pilot' : 'Partner'} application successfully stored in CRM`,
      leadId: lead.id,
      lead
    });
  } catch (err) {
    console.error('Error saving website lead:', err);
    res.status(500).json({ success: false, message: 'Server error saving website lead', error: err.message });
  }
});

router.use(protect);

// @desc   Get eligible assignees for leads filter & assignment
// @route  GET /api/leads/assignees
router.get('/assignees', checkPermission('leads', 'leads-list', 'canView'), async (req, res) => {
  try {
    const isSuper = req.user.isSuperAdmin || req.user.role?.level === 'super_admin' || req.user.role?.level === 'admin';
    const { getDeptHeadScope } = require('../utils/departmentScope');
    const scopeInfo = await getDeptHeadScope(req.user);
    const { isOrgAdmin, isCompanyAdmin, isDeptHead, teamUserIds } = scopeInfo;

    const { Permission } = require('../models');
    let hasLeadsAll = isSuper || isOrgAdmin;
    if (!hasLeadsAll && req.user.roleId) {
      const permAll = await Permission.findOne({
        where: { roleId: req.user.roleId, module: 'leads', screen: 'leads-all', canView: true }
      });
      if (permAll) hasLeadsAll = true;
    }

    const where = { isActive: true };
    if (!isSuper && !hasLeadsAll) {
      if (isOrgAdmin && req.user.organizationId) {
        where.organizationId = req.user.organizationId;
      } else if (isCompanyAdmin && req.user.companyId) {
        where.companyId = req.user.companyId;
      } else if (isDeptHead && teamUserIds.length > 0) {
        where.id = { [Op.in]: [...teamUserIds, req.user.id] };
      } else if (req.user.organizationId) {
        where.organizationId = req.user.organizationId;
      }
    } else if (req.user.organizationId && !isSuper) {
      where.organizationId = req.user.organizationId;
    }

    const users = await User.findAll({
      where,
      attributes: ['id', 'name', 'email'],
      include: [
        { model: Role, as: 'role', attributes: ['id', 'name', 'code'] }
      ],
      order: [['name', 'ASC']]
    });

    const { sequelize } = require('../config/db');
    const assignedRows = await Lead.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('assignedTo')), 'assignedTo']],
      where: {
        assignedTo: { [Op.ne]: null },
        ...(req.user.organizationId && !isSuper ? { organizationId: req.user.organizationId } : {})
      },
      raw: true
    }).catch(() => []);

    const existingIds = new Set(users.map(u => u.id));
    const missingIds = assignedRows
      .map(r => r.assignedTo)
      .filter(id => id && !existingIds.has(id));

    if (missingIds.length > 0) {
      const extraUsers = await User.findAll({
        where: { id: { [Op.in]: missingIds } },
        attributes: ['id', 'name', 'email'],
        include: [{ model: Role, as: 'role', attributes: ['id', 'name', 'code'] }]
      });
      users.push(...extraUsers);
    }

    users.sort((a, b) => (a.name || a.email || '').localeCompare(b.name || b.email || ''));

    res.json({ success: true, assignees: users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @desc   Get leads scheduled for follow-up today for current user
// @route  GET /api/leads/followups-today
router.get('/followups-today', async (req, res) => {
  try {
    const TIMEZONE = process.env.TIMEZONE || 'Asia/Kolkata';
    const todayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    const isSuper = req.user.isSuperAdmin || req.user.role?.level === 'super_admin' || req.user.role?.level === 'admin';
    const { Permission } = require('../models');
    let hasLeadsAll = isSuper;
    if (!hasLeadsAll && req.user.roleId) {
      const permAll = await Permission.findOne({
        where: { roleId: req.user.roleId, module: 'leads', screen: 'leads-all', canView: true }
      });
      if (permAll) hasLeadsAll = true;
    }

    const where = {
      nextFollowUp: todayStr,
      status: { [Op.notIn]: ['sales_closed', 'converted', 'lost'] }
    };

    if (!hasLeadsAll) {
      where.assignedTo = req.user.id;
    } else if (req.user.organizationId) {
      where.organizationId = req.user.organizationId;
    }

    const followups = await Lead.findAll({
      where,
      attributes: ['id', 'name', 'companyName', 'phone', 'email', 'status', 'nextFollowUp', 'lastContactedDate'],
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name'] }
      ],
      order: [['companyName', 'ASC']]
    });

    res.json({
      success: true,
      date: todayStr,
      count: followups.length,
      followups
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// Multer — memory storage for CSV / Excel parsing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (['csv', 'xlsx', 'xls'].includes(ext)) cb(null, true);
    else cb(new Error('Only CSV or Excel files are allowed'));
  }
});

// Simple CSV parser — no external dependencies needed
const parseCSV = (buffer) => {
  const text = buffer.toString('utf8');
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    // Handle quoted fields with commas inside
    const values = [];
    let current = '';
    let inQuotes = false;
    for (const ch of lines[i]) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
      else current += ch;
    }
    values.push(current.trim());

    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
    rows.push(row);
  }
  return { headers, rows };
};

const VALID_STATUSES = [
  'new',
  'not_answering',
  'number_busy',
  'not_interested',
  'not_participating',
  'requirement_received',
  'call_back',
  'follow_ups',
  'design_sent',
  'quote_sent',
  'converted',
  'sales_closed',
  'contacted',
  'qualified',
  'lost',
  'shell_scheme',
  'shell scheme'
];
const VALID_EXPOS = ['website', 'referral', 'social_media', 'cold_call', 'email', 'other'];

// @desc   Get all leads
// @route  GET /api/leads
router.get('/', checkPermission('leads', 'leads-list', 'canView'), async (req, res) => {
  try {
    const {
      search = '',
      status,
      expo,
      expoName,
      assignedTo,
      startDate,
      endDate,
      date,
      leadType,
      source,
      city,
      page = 1,
      limit = 10
    } = req.query;

    // Base search + expo + org scope (shared between table and badge counts)
    const baseWhere = {};
    if (search) {
      baseWhere[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { companyName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
        { designation: { [Op.iLike]: `%${search}%` } },
        { expoType: { [Op.iLike]: `%${search}%` } },
        { expoName: { [Op.iLike]: `%${search}%` } },
        { address: { [Op.iLike]: `%${search}%` } },
        { expoMode: { [Op.iLike]: `%${search}%` } },
        { alternatePhone: { [Op.iLike]: `%${search}%` } },
        { notes: { [Op.iLike]: `%${search}%` } },
        { source: { [Op.iLike]: `%${search}%` } },
        { city: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (expo) baseWhere.expo = expo;
    if (expoName) {
      baseWhere.expoName = { [Op.iLike]: `%${expoName.trim()}%` };
    }
    if (leadType && leadType !== 'all') {
      baseWhere.leadType = leadType;
    }
    if (source) {
      baseWhere.source = { [Op.iLike]: `%${source.trim()}%` };
    }
    if (city && city !== 'all') {
      baseWhere.city = { [Op.iLike]: `%${city.trim()}%` };
    }

    // Exclude 'Invested' leads from regular leads view (they are displayed in Partners Page)
    if (!status) {
      baseWhere.status = { [Op.notIn]: ['Invested', 'INVESTED', 'invested'] };
    }

    // Date range filtering on createdAt
    const effStartDate = startDate || (date ? date : null);
    const effEndDate = endDate || (date ? date : null);
    if (effStartDate || effEndDate) {
      const dateCond = {};
      if (effStartDate) {
        dateCond[Op.gte] = new Date(`${effStartDate}T00:00:00.000Z`);
      }
      if (effEndDate) {
        dateCond[Op.lte] = new Date(`${effEndDate}T23:59:59.999Z`);
      }
      baseWhere.createdAt = dateCond;
    }

    // Scope by org / role hierarchy / UAM leads-all permission
    const { getDeptHeadScope } = require('../utils/departmentScope');
    const scopeInfo = await getDeptHeadScope(req.user);
    const { isSuper, isOrgAdmin, isCompanyAdmin, isDeptHead, teamUserIds } = scopeInfo;

    const { Permission } = require('../models');
    let hasLeadsAll = isSuper || isOrgAdmin;
    if (!hasLeadsAll && req.user.roleId) {
      const permAll = await Permission.findOne({
        where: { roleId: req.user.roleId, module: 'leads', screen: 'leads-all', canView: true }
      });
      if (permAll) hasLeadsAll = true;
    }

    if (!isSuper) {
      if (hasLeadsAll && req.user.organizationId) {
        // User with leads-all can view all leads across their organization without assignee restriction
        baseWhere.organizationId = req.user.organizationId;
      } else if (isOrgAdmin && req.user.organizationId) {
        baseWhere.organizationId = req.user.organizationId;
      } else if (isCompanyAdmin && req.user.companyId) {
        // Company admin sees leads assigned to company users or unassigned in company scope
        const companyUserIds = (await User.findAll({
          where: { companyId: req.user.companyId },
          attributes: ['id']
        })).map(u => u.id);
        baseWhere.organizationId = req.user.organizationId;
        baseWhere.assignedTo = { [Op.or]: [{ [Op.in]: companyUserIds }, null] };
      } else if (isDeptHead && teamUserIds.length > 0) {
        // Department Head sees all leads assigned to any member of their department(s)
        baseWhere.organizationId = req.user.organizationId;
        baseWhere.assignedTo = { [Op.in]: teamUserIds };
      } else {
        // Regular users ("mathavangal") only see leads assigned directly to them
        baseWhere.organizationId = req.user.organizationId;
        baseWhere.assignedTo = req.user.id;
      }
    }

    // Specific Assignee filter (within permissible scope)
    if (assignedTo !== undefined && assignedTo !== '') {
      if (assignedTo === 'unassigned') {
        baseWhere.assignedTo = null;
      } else if (isSuper || isOrgAdmin || hasLeadsAll) {
        baseWhere.assignedTo = assignedTo;
      } else if (isDeptHead && teamUserIds.includes(assignedTo)) {
        baseWhere.assignedTo = assignedTo;
      } else if (isCompanyAdmin) {
        baseWhere.assignedTo = assignedTo;
      } else if (assignedTo === req.user.id) {
        baseWhere.assignedTo = req.user.id;
      }
    }

    const isExport = req.query.export === 'true' || req.query.format === 'csv';
    const parsedLimit = isExport ? 10000 : Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);

    // Table query — includes status filter if provided
    const tableWhere = { ...baseWhere };
    if (status) tableWhere.status = status;

    const { count, rows } = await Lead.findAndCountAll({
      where: tableWhere,
      distinct: true,
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
        { model: Organization, as: 'organization', attributes: ['id', 'name'] },
        { model: Expo, as: 'expoMaster', attributes: ['id', 'name', 'type', 'startDate', 'endDate', 'venue'] }
      ],
      order: [['createdAt', 'DESC'], ['id', 'DESC']],
      limit: parsedLimit,
      offset: (parsedPage - 1) * parsedLimit
    });

    // Per-status badge counts — uses baseWhere WITHOUT status filter
    // so all status pills always show real totals across the whole dataset
    const { sequelize } = require('../config/db');
    const statusCountRows = await Lead.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: baseWhere,
      group: ['status'],
      raw: true
    });
    const statusCounts = {};
    statusCountRows.forEach(r => { statusCounts[r.status] = parseInt(r.count, 10); });

    // Master Expos List + Distinct legacy expo names
    const masterExpos = await Expo.findAll({
      where: {
        isActive: true,
        ...(req.user.organizationId && !isSuper ? {
          [Op.or]: [{ organizationId: req.user.organizationId }, { organizationId: null }]
        } : {})
      },
      attributes: ['id', 'name', 'type', 'startDate', 'endDate', 'venue', 'city'],
      order: [['name', 'ASC']]
    }).catch(() => []);

    const distinctExpos = await Lead.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('expoName')), 'expoName']],
      where: {
        ...(req.user.organizationId && !isSuper ? { organizationId: req.user.organizationId } : {}),
        expoName: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] }
      },
      raw: true
    }).catch(() => []);
    const leadExpoNames = distinctExpos.map(e => e.expoName).filter(Boolean);
    const masterExpoNames = masterExpos.map(e => e.name).filter(Boolean);
    const expoNames = Array.from(new Set([...masterExpoNames, ...leadExpoNames])).sort((a, b) => a.localeCompare(b));

    // Assignees for filter dropdown
    const assigneesWhere = { isActive: true };
    if (!isSuper) {
      if (isOrgAdmin && req.user.organizationId) {
        assigneesWhere.organizationId = req.user.organizationId;
      } else if (isCompanyAdmin && req.user.companyId) {
        assigneesWhere.companyId = req.user.companyId;
      } else if (isDeptHead && teamUserIds.length > 0) {
        assigneesWhere.id = { [Op.in]: [...teamUserIds, req.user.id] };
      } else if (req.user.organizationId) {
        assigneesWhere.organizationId = req.user.organizationId;
      }
    }
    const assigneesList = await User.findAll({
      where: assigneesWhere,
      attributes: ['id', 'name', 'email'],
      order: [['name', 'ASC']]
    }).catch(() => []);

    // Master Lead Statuses
    const masterStatuses = await LeadStatus.findAll({
      where: { isActive: true },
      order: [['order', 'ASC'], ['createdAt', 'ASC']]
    }).catch(() => []);

    const distinctCities = await Lead.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('city')), 'city']],
      where: {
        ...(req.user.organizationId && !isSuper ? { organizationId: req.user.organizationId } : {}),
        city: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] }
      },
      raw: true
    }).catch(() => []);
    const cities = distinctCities.map(c => c.city).filter(Boolean).sort();

    const distinctSources = await Lead.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('source')), 'source']],
      where: {
        ...(req.user.organizationId && !isSuper ? { organizationId: req.user.organizationId } : {}),
        source: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] }
      },
      raw: true
    }).catch(() => []);
    const sources = distinctSources.map(s => s.source).filter(Boolean).sort();

    res.json({
      success: true,
      total: count,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(count / parsedLimit) || 1,
      leads: rows,
      statusCounts,
      statuses: masterStatuses,
      cities,
      sources,
      expoNames,
      expos: masterExpos,
      assignees: assigneesList
    });
  } catch (error) {
    console.error('[Leads Route Error]:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});




// @desc   Get single lead
// @route  GET /api/leads/:id
router.get('/:id', checkPermission('leads', 'leads-list', 'canView'), async (req, res) => {
  try {
    const lead = await Lead.findByPk(req.params.id, {
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
        { model: Organization, as: 'organization', attributes: ['id', 'name'] }
      ]
    });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const { getDeptHeadScope } = require('../utils/departmentScope');
    const scopeInfo = await getDeptHeadScope(req.user);
    const { isSuper, isOrgAdmin, isCompanyAdmin, isDeptHead, teamUserIds } = scopeInfo;

    const { Permission } = require('../models');
    let hasLeadsAll = isSuper || isOrgAdmin;
    if (!hasLeadsAll && req.user.roleId) {
      const permAll = await Permission.findOne({
        where: { roleId: req.user.roleId, module: 'leads', screen: 'leads-all', canView: true }
      });
      if (permAll) hasLeadsAll = true;
    }

    let isAuthorized = false;
    if (isSuper) {
      isAuthorized = true;
    } else if (lead.organizationId === req.user.organizationId) {
      if (isOrgAdmin || hasLeadsAll) {
        isAuthorized = true;
      } else if (lead.assignedTo === req.user.id) {
        isAuthorized = true;
      } else if (isDeptHead && lead.assignedTo && teamUserIds.includes(lead.assignedTo)) {
        isAuthorized = true;
      } else if (isCompanyAdmin && req.user.companyId) {
        if (lead.assignedTo) {
          const assigneeUser = await User.findByPk(lead.assignedTo, { attributes: ['companyId'] });
          if (assigneeUser && assigneeUser.companyId === req.user.companyId) isAuthorized = true;
        } else {
          isAuthorized = true; // Company Admin sees unassigned
        }
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Access denied: You are not authorized to view this lead' });
    }

    res.json({ success: true, lead });
  } catch (error) {
    console.error('[Leads Route Error]:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc   Create lead
// @route  POST /api/leads
router.post('/', checkPermission('leads', 'leads-list', 'canCreate'), async (req, res) => {
  try {
    const {
      name, companyName, email, phone, status, expo, value, notes, assignedTo,
      designation, expoType, expoName, expoId, address, expoMode, lastContactedDate, nextFollowUp, alternatePhone,
      expoDate, productionDate,
      paidAmount, vendorPaidAmount, designStatus, createdAt,
      source, sourceLink, leadType, autosCount, city, cibilScore,
      licenseType, preferredArea, experience
    } = req.body;

    let resolvedExpoId = expoId || null;
    let resolvedExpoName = expoName ? expoName.trim() : null;
    if (resolvedExpoId) {
      const ex = await Expo.findByPk(resolvedExpoId);
      if (ex) {
        resolvedExpoName = ex.name;
      }
    } else if (resolvedExpoName) {
      const ex = await Expo.findOne({
        where: sequelize.where(
          sequelize.fn('LOWER', sequelize.fn('TRIM', sequelize.col('name'))),
          resolvedExpoName.toLowerCase()
        )
      });
      if (ex) {
        resolvedExpoId = ex.id;
        resolvedExpoName = ex.name;
      }
    }
    const effectiveCompany = (companyName || name || '').trim();
    if (!effectiveCompany) return res.status(400).json({ success: false, message: 'Company Name is required' });

    let customCreatedAt = undefined;
    if (createdAt) {
      const isSuper = req.user.isSuperAdmin || req.user.role?.level === 'super_admin';
      let canEditUpload = isSuper;
      if (!canEditUpload && req.user.roleId) {
        const perm = await Permission.findOne({
          where: { roleId: req.user.roleId, module: 'leads', screen: 'lead-edit-upload-date', canEdit: true }
        });
        if (perm) canEditUpload = true;
      }
      if (canEditUpload) {
        const parsed = new Date(createdAt);
        if (!isNaN(parsed.getTime())) {
          customCreatedAt = parsed;
        }
      }
    }

    let leadStatus = status || 'new';
    if (leadStatus === 'sales_closed') leadStatus = 'converted';
    // If status is 'new', it is NEVER a call made yet, so lastContactedDate must be null
    let effectiveLastContactedDate = null;
    if (leadStatus !== 'new') {
      effectiveLastContactedDate = lastContactedDate || new Date().toISOString().split('T')[0];
    }

    const lead = await Lead.create({
      name: name ? name.trim() : null,
      companyName: (companyName ? companyName.trim() : effectiveCompany) || null,
      email: email || null,
      phone: phone || null,
      status: leadStatus,
      expo: expo || 'other',
      value: value || 0,
      notes: notes || null,
      assignedTo: assignedTo || req.user.id, // ✅ Auto-assign to creator always
      designation: designation || null,
      expoType: expoType || null,
      expoName: resolvedExpoName || null,
      expoId: resolvedExpoId || null,
      address: address || null,
      expoMode: expoMode || null,
      lastContactedDate: effectiveLastContactedDate,
      nextFollowUp: nextFollowUp || null,
      alternatePhone: alternatePhone || null,
      expoDate: expoDate || null,
      productionDate: productionDate || null,
      paidAmount: paidAmount || 0,
      vendorPaidAmount: vendorPaidAmount || 0,
      designStatus: designStatus || 'pending',
      organizationId: req.user.organizationId || null,
      source: normalizeLeadSource(source, sourceLink),
      sourceLink: sourceLink || null,
      leadType: leadType || 'partner',
      autosCount: autosCount !== undefined ? (parseInt(autosCount, 10) || 1) : 1,
      city: city || null,
      cibilScore: cibilScore || null,
      licenseType: licenseType || null,
      preferredArea: preferredArea || null,
      experience: experience || null,
      ...(customCreatedAt ? { createdAt: customCreatedAt } : {})
    });

    if (customCreatedAt) {
      await Lead.sequelize.query(
        'UPDATE crm_leads SET "createdAt" = :dt WHERE id = :id',
        { replacements: { dt: customCreatedAt, id: lead.id } }
      );
    }

    const created = await Lead.findByPk(lead.id, {
      include: [{ model: User, as: 'assignee', attributes: ['id', 'name', 'email'] }]
    });

    if (leadStatus === 'requirement_received') {
      const { DesignOrder } = require('../models');
      await DesignOrder.create({
        leadId: lead.id,
        companyName: lead.companyName || lead.name || 'Unnamed Company',
        exhibitionName: lead.expoName || lead.expoType || '',
        organizationId: lead.organizationId || req.user.organizationId || null,
        submittedBy: req.user.id || lead.assignedTo || null,
        status: 'pending'
      }).catch(err => console.error('Auto DesignOrder creation error on POST:', err));
      await lead.update({ designStatus: 'pending' });
    }

    const { logAction } = require('../utils/auditLogger');
    await logAction(req, 'CREATE', 'leads', lead.id, lead.companyName || lead.name, `Created lead "${lead.companyName || lead.name}"`);

    res.status(201).json({ success: true, message: 'Lead created successfully', lead: created });
  } catch (error) {
    console.error('[Leads Route Error]:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc   Update lead
// @route  PUT /api/leads/:id
router.put('/:id', async (req, res, next) => {
  try {
    const userRole = req.user.role?.level;
    if (req.user.isSuperAdmin || userRole === 'super_admin') {
      return next();
    }

    // Check if user has edit permission for leads, closed sales list/all, or financial fields
    const hasLeadsEdit = await Permission.findOne({
      where: { roleId: req.user.roleId, module: 'leads', screen: { [Op.in]: ['leads-list', 'leads-all'] }, canEdit: true }
    });
    
    const hasClosedSalesEdit = await Permission.findOne({
      where: { roleId: req.user.roleId, module: 'closed_sales', screen: { [Op.in]: ['closed-sales-list', 'closed-sales-all'] }, canEdit: true }
    });

    const hasFinancialEdit = await Permission.findOne({
      where: {
        roleId: req.user.roleId,
        module: 'closed_sales',
        screen: { [Op.in]: ['closed-sales-value', 'closed-sales-paid', 'closed-sales-vendor-payout'] },
        canEdit: true
      }
    });
    
    if (hasLeadsEdit || hasClosedSalesEdit || hasFinancialEdit) {
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: "Access denied: You don't have permission to edit leads/closed-sales"
    });
  } catch (error) {
    console.error('❌ Lead update permission check error:', error);
    return res.status(500).json({ success: false, message: 'Permission check failed', error: error.message });
  }
}, async (req, res) => {
  try {
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    if (!req.user.isSuperAdmin && lead.organizationId && req.user.organizationId && lead.organizationId !== req.user.organizationId) {
      return res.status(403).json({ success: false, message: 'Access denied: You cannot edit leads from another organization' });
    }

    const {
      name, companyName, email, phone, status, expo, value, notes, assignedTo,
      designation, expoType, expoName, expoId, address, expoMode, lastContactedDate, nextFollowUp, alternatePhone,
      expoDate, productionDate,
      paidAmount, vendorPaidAmount, designStatus, createdAt,
      applyGst, applyTds, gstAmount, tdsAmount, totalValue,
      source, sourceLink, leadType, autosCount, city, cibilScore,
      licenseType, preferredArea, experience
    } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (companyName !== undefined) updates.companyName = companyName;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (expo !== undefined) updates.expo = expo;
    if (source !== undefined) updates.source = normalizeLeadSource(source, sourceLink !== undefined ? sourceLink : lead.sourceLink);
    if (sourceLink !== undefined) updates.sourceLink = sourceLink;
    if (leadType !== undefined) updates.leadType = leadType;
    if (autosCount !== undefined) updates.autosCount = parseInt(autosCount, 10) || 1;
    if (city !== undefined) updates.city = city;
    if (cibilScore !== undefined) updates.cibilScore = cibilScore;
    if (licenseType !== undefined) updates.licenseType = licenseType;
    if (preferredArea !== undefined) updates.preferredArea = preferredArea;
    if (experience !== undefined) updates.experience = experience;
    if (value !== undefined) updates.value = value;
    if (notes !== undefined) updates.notes = notes;
    if (assignedTo !== undefined) updates.assignedTo = assignedTo || null;
    if (designation !== undefined) updates.designation = designation;
    if (expoType !== undefined) updates.expoType = expoType;
    if (expoId !== undefined) {
      updates.expoId = expoId || null;
      if (expoId) {
        const ex = await Expo.findByPk(expoId);
        if (ex) updates.expoName = ex.name;
      }
    }
    if (expoName !== undefined && updates.expoName === undefined) {
      updates.expoName = expoName ? expoName.trim() : null;
      if (expoName && !updates.expoId) {
        const ex = await Expo.findOne({
          where: sequelize.where(
            sequelize.fn('LOWER', sequelize.fn('TRIM', sequelize.col('name'))),
            expoName.trim().toLowerCase()
          )
        });
        if (ex) updates.expoId = ex.id;
      }
    }
    if (address !== undefined) updates.address = address;
    if (expoMode !== undefined) updates.expoMode = expoMode;
    if (expoDate !== undefined) updates.expoDate = expoDate ? expoDate : null;
    if (productionDate !== undefined) updates.productionDate = productionDate ? productionDate : null;
    if (nextFollowUp !== undefined) updates.nextFollowUp = nextFollowUp || null;
    if (alternatePhone !== undefined) updates.alternatePhone = alternatePhone;
    if (paidAmount !== undefined) updates.paidAmount = paidAmount;
    if (vendorPaidAmount !== undefined) updates.vendorPaidAmount = vendorPaidAmount;
    if (designStatus !== undefined) updates.designStatus = designStatus;
    if (applyGst !== undefined) updates.applyGst = Boolean(applyGst);
    if (applyTds !== undefined) updates.applyTds = Boolean(applyTds);
    if (gstAmount !== undefined) updates.gstAmount = parseFloat(gstAmount) || 0;
    if (tdsAmount !== undefined) updates.tdsAmount = parseFloat(tdsAmount) || 0;
    if (totalValue !== undefined) updates.totalValue = totalValue === null || totalValue === '' ? null : (parseFloat(totalValue) || 0);
    if (createdAt !== undefined && createdAt !== null && createdAt !== '') {
      const parsed = new Date(createdAt);
      if (!isNaN(parsed.getTime())) {
        updates.createdAt = parsed;
      }
    }

    // Enforce field-level edit permissions for financial fields and upload date
    const isSuper = req.user.isSuperAdmin || req.user.role?.level === 'super_admin' || req.user.role?.level === 'admin' || req.user.role?.level === 'org_admin' || req.user.role?.level === 'company_admin' || req.user.role?.name?.toLowerCase().includes('admin');
    if (!isSuper) {
      if (updates.createdAt !== undefined) {
        const canEditUpload = await Permission.findOne({
          where: { roleId: req.user.roleId, module: 'leads', screen: 'lead-edit-upload-date', canEdit: true }
        });
        if (!canEditUpload) {
          delete updates.createdAt;
        }
      }
      if (value !== undefined && parseFloat(value) !== parseFloat(lead.value)) {
        const canEditVal = await Permission.findOne({
          where: { roleId: req.user.roleId, module: 'closed_sales', screen: 'closed-sales-value', canEdit: true }
        });
        if (!canEditVal) {
          delete updates.value;
        }
      }
      if (paidAmount !== undefined && parseFloat(paidAmount) !== parseFloat(lead.paidAmount)) {
        const canEditPaid = await Permission.findOne({
          where: { roleId: req.user.roleId, module: 'closed_sales', screen: 'closed-sales-paid', canEdit: true }
        });
        if (!canEditPaid) {
          delete updates.paidAmount;
        }
      }
      if (vendorPaidAmount !== undefined && parseFloat(vendorPaidAmount) !== parseFloat(lead.vendorPaidAmount)) {
        const canEditVendor = await Permission.findOne({
          where: { roleId: req.user.roleId, module: 'closed_sales', screen: 'closed-sales-vendor-payout', canEdit: true }
        });
        if (!canEditVendor) {
          delete updates.vendorPaidAmount;
        }
      }
    }

    if (status !== undefined) {
      let resolvedStatus = status === 'sales_closed' ? 'converted' : status;
      updates.status = resolvedStatus;

      // When lead is converted, check if eligible for Fleet Partner via Loan App (Strictly for Partner Leads)
      if (lead.leadType === 'partner' && (resolvedStatus === 'converted' || resolvedStatus === 'Invested')) {
        const cleanDigits = (p) => {
          if (!p) return '';
          const d = String(p).replace(/\D/g, '');
          return d.length >= 10 ? d.slice(-10) : d;
        };
        const targetDigits = cleanDigits(lead.phone);
        if (targetDigits.length >= 10) {
          try {
            const allLoanApps = await LoanApplication.findAll();
            const loanApp = allLoanApps.find(app => cleanDigits(app.mobileNumber) === targetDigits || app.leadId === lead.id);
            if (loanApp && String(loanApp.eligibility).toUpperCase() === 'YES') {
              updates.status = 'Invested';
              const autos = lead.autosCount || 1;
              updates.autosCount = autos;
              updates.value = autos * 100000;
              updates.totalValue = autos * 100000;
              updates.cibilScore = lead.cibilScore || '750+ (Loan Verified)';
              loanApp.leadId = lead.id;
              await loanApp.save();
            } else if (resolvedStatus === 'Invested') {
              // Loan not approved yet; keep in pipeline as converted until loan eligibility is YES
              updates.status = 'converted';
            }
          } catch (loanErr) {
            console.warn('Loan eligibility check on lead conversion:', loanErr.message);
          }
        }
      }

      if (resolvedStatus === 'new') {
        // Reverting or setting to 'new' -> MUST clear lastContactedDate so call count is 0
        updates.lastContactedDate = null;
      } else {
        // Changing from new to an active/contacted status -> MUST count as a call made
        if (lastContactedDate) {
          updates.lastContactedDate = lastContactedDate;
        } else if (!lead.lastContactedDate || lead.status === 'new') {
          updates.lastContactedDate = new Date().toISOString().split('T')[0];
        }
      }
    } else if (lastContactedDate !== undefined) {
      if (lead.status === 'new') {
        updates.lastContactedDate = null;
      } else {
        updates.lastContactedDate = lastContactedDate || null;
      }
    }

    const targetCreatedAt = updates.createdAt;
    if (targetCreatedAt) {
      delete updates.createdAt;
    }

    await lead.update(updates);

    if (targetCreatedAt) {
      await Lead.sequelize.query(
        'UPDATE crm_leads SET "createdAt" = :dt WHERE id = :id',
        { replacements: { dt: targetCreatedAt, id: lead.id } }
      );
      await lead.reload();
    }

    if (updates.status === 'requirement_received' || (lead.status === 'requirement_received' && updates.designStatus !== 'completed')) {
      const { DesignOrder } = require('../models');
      const existingOrder = await DesignOrder.findOne({ where: { leadId: lead.id } });
      if (!existingOrder) {
        await DesignOrder.create({
          leadId: lead.id,
          companyName: updates.companyName || lead.companyName || lead.name || 'Unnamed Company',
          exhibitionName: updates.expoName || lead.expoName || updates.expoType || lead.expoType || '',
          organizationId: lead.organizationId || req.user.organizationId || null,
          submittedBy: req.user.id || lead.assignedTo || null,
          status: 'pending'
        }).catch(err => console.error('Auto DesignOrder creation error on PUT:', err));
        await lead.update({ designStatus: 'pending' });
      }
    }

    const updated = await Lead.findByPk(lead.id, {
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
        { model: Expo, as: 'expoMaster', attributes: ['id', 'name', 'type', 'startDate', 'endDate', 'venue'] }
      ]
    });

    const { logAction } = require('../utils/auditLogger');
    const isClosedSalesAction = status === 'converted' || paidAmount !== undefined || vendorPaidAmount !== undefined;
    const logModule = isClosedSalesAction ? 'closed_sales' : 'leads';
    await logAction(req, 'UPDATE', logModule, lead.id, lead.companyName || lead.name, {
      description: `Updated lead "${lead.companyName || lead.name}"`,
      changes: { ...updates, ...(targetCreatedAt ? { createdAt: targetCreatedAt } : {}) }
    });

    // Notify assigned user if lead was assigned/reassigned
    if (updates.assignedTo && String(updates.assignedTo) !== String(req.user.id)) {
      try {
        const { sendPushToUser } = require('../utils/webPush');
        sendPushToUser(updates.assignedTo, {
          title: '🎯 Lead Assigned',
          body: `You have been assigned lead: "${lead.companyName || lead.name}" by ${req.user.name}`,
          url: '/leads',
          tag: `lead-assigned-${lead.id}`
        }).catch(err => console.warn('[Lead WebPush error]:', err.message));
      } catch (e) {}
    }

    res.json({ success: true, message: 'Lead updated successfully', lead: updated });
  } catch (error) {
    console.error('❌ Lead update execution error:', error);
    console.error('[Leads Route Error]:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc   Bulk Delete leads
// @route  DELETE /api/leads/bulk-delete
router.delete('/bulk-delete', checkPermission('leads', 'leads-list', 'canDelete'), async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No lead IDs provided' });
    }

    const where = { id: { [Op.in]: ids } };
    // Scope to org for non-super-admins
    if (!req.user.isSuperAdmin && req.user.organizationId) {
      where.organizationId = req.user.organizationId;
    }

    const deleted = await Lead.destroy({ where });

    const { logAction } = require('../utils/auditLogger');
    await logAction(req, 'DELETE', 'leads', null, `${deleted} leads`, `Bulk deleted ${deleted} lead(s)`);

    res.json({ success: true, message: `${deleted} lead(s) deleted successfully`, count: deleted });
  } catch (error) {
    console.error('[Leads Route Error]:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc   Delete lead
// @route  DELETE /api/leads/:id
router.delete('/:id', checkPermission('leads', 'leads-list', 'canDelete'), async (req, res) => {
  try {
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    if (!req.user.isSuperAdmin && lead.organizationId && req.user.organizationId && lead.organizationId !== req.user.organizationId) {
      return res.status(403).json({ success: false, message: 'Access denied: You cannot delete leads from another organization' });
    }

    await lead.destroy();

    const { logAction } = require('../utils/auditLogger');
    await logAction(req, 'DELETE', 'leads', lead.id, lead.companyName || lead.name, `Deleted lead "${lead.companyName || lead.name}"`);

    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('[Leads Route Error]:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

router.post('/bulk-upload', checkPermission('leads', 'leads-list', 'canCreate'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const ext = req.file.originalname.split('.').pop().toLowerCase();
    let rows = [];
    if (ext === 'xlsx' || ext === 'xls') {
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      rows = rawRows.map(row => {
        const newRow = {};
        for (const [key, value] of Object.entries(row)) {
          newRow[key.trim().toLowerCase()] = String(value).trim();
        }
        return newRow;
      });
    } else {
      const parsed = parseCSV(req.file.buffer);
      rows = parsed.rows;
    }

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Uploaded file is empty or has no data rows' });
    }

    const { User, LeadStatus } = require('../models');
    const allUsers = await User.findAll({ attributes: ['id', 'name', 'email'] });
    const dbStatuses = await LeadStatus.findAll({ attributes: ['key', 'slug', 'name'], raw: true }).catch(() => []);
    const validStatusKeys = new Set([
      ...VALID_STATUSES,
      ...dbStatuses.map(s => s.key || s.slug).filter(Boolean)
    ]);

    const results = { created: 0, skipped: 0, errors: [] };
    const orgId = req.user.organizationId || null;

    const parseCSVDate = (val) => {
      if (!val) return null;
      // If it is a potential Excel serial date number
      if (!isNaN(val) && parseFloat(val) > 20000 && parseFloat(val) < 60000) {
        const date = new Date(Math.round((parseFloat(val) - 25569) * 86400 * 1000));
        return date.toISOString().split('T')[0];
      }
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 because row 1 is header, data starts at row 2

      // Map Name / Contact Person
      const name = (
        row['name'] ||
        row['full name'] ||
        row['fullname'] ||
        row['partner name'] ||
        row['partnername'] ||
        row['driver name'] ||
        row['drivername'] ||
        row['applicant name'] ||
        row['contact person'] ||
        row['contactperson'] ||
        row['lead name'] ||
        row['leadname'] ||
        ''
      ).trim();

      const companyNameRaw = (row['company name'] || row['companyname'] || row['company'] || '').trim();

      if (!name && !companyNameRaw) {
        results.errors.push({ row: rowNum, error: 'Name is required' });
        results.skipped++;
        continue;
      }

      // Determine Lead Category (Fleet Partner vs EV Pilot)
      const rawCategory = (
        row['category'] ||
        row['lead type'] ||
        row['leadtype'] ||
        row['type'] ||
        ''
      ).trim().toLowerCase();

      let leadType = 'partner';
      if (
        rawCategory.includes('pilot') ||
        rawCategory.includes('driver') ||
        row['license type'] ||
        row['licensetype'] ||
        row['license'] ||
        row['badge'] ||
        row['driving experience'] ||
        row['experience']
      ) {
        leadType = 'pilot';
      } else if (
        rawCategory.includes('partner') ||
        rawCategory.includes('fleet') ||
        rawCategory.includes('investor') ||
        row['autos count'] ||
        row['autoscount'] ||
        row['autos'] ||
        row['cibil score'] ||
        row['cibilscore'] ||
        row['cibil']
      ) {
        leadType = 'partner';
      }

      const effectiveName = name || companyNameRaw;
      const effectiveCompany = companyNameRaw || (leadType === 'pilot' ? `EV Pilot Candidate - ${effectiveName}` : `Fleet Partner - ${effectiveName}`);

      // Contact details
      const phone = (
        row['phone number'] ||
        row['phonenumber'] ||
        row['phone'] ||
        row['mobile'] ||
        row['mobile number'] ||
        row['mobilenumber'] ||
        row['contact'] ||
        ''
      ).trim() || null;

      const email = (row['email'] || row['email address'] || '').trim() || null;

      // Location / City
      const city = (
        row['city'] ||
        row['target city'] ||
        row['targetcity'] ||
        row['preferred zone'] ||
        row['preferredzone'] ||
        row['preferred area'] ||
        row['preferredarea'] ||
        row['zone'] ||
        row['area'] ||
        'Chennai'
      ).trim();

      // Partner specific
      const autosCount = parseInt(
        row['autos count'] ||
        row['autoscount'] ||
        row['autos'] ||
        row['number of autos'] ||
        '1',
        10
      ) || 1;

      const cibilScore = (
        row['cibil score'] ||
        row['cibilscore'] ||
        row['cibil'] ||
        ''
      ).trim() || null;

      // Pilot specific
      const licenseType = (
        row['license type'] ||
        row['licensetype'] ||
        row['license'] ||
        row['badge'] ||
        ''
      ).trim() || null;

      const preferredArea = (
        row['preferred area'] ||
        row['preferredarea'] ||
        row['preferred zone'] ||
        row['preferredzone'] ||
        row['zone'] ||
        row['area'] ||
        city
      ).trim() || null;

      const experience = (
        row['experience'] ||
        row['driving experience'] ||
        row['experience years'] ||
        ''
      ).trim() || null;

      // Source tracking
      const source = (
        row['source'] ||
        row['lead source'] ||
        row['leadsource'] ||
        'Bulk Upload'
      ).trim();

      const sourceLink = (
        row['source link'] ||
        row['sourcelink'] ||
        row['url'] ||
        row['link'] ||
        ''
      ).trim() || null;

      // Status mapping (default to 'new')
      let statusRaw = (row['status'] || 'new').trim().toLowerCase().replace(/[\s-]+/g, '_');
      let status = 'new';
      if (['call_not_picked', 'not_picked', 'not_pick_call', 'not_picked_call', 'contacted', 'no_answer'].includes(statusRaw)) {
        status = 'contacted';
      } else if (['qualified', 'interested', 'qualified_(interested)'].includes(statusRaw)) {
        status = 'requirement_received';
      } else if (['not_interested', 'not_intrestd', 'not_intrested', 'not_interest'].includes(statusRaw)) {
        status = 'not_interested';
      } else if (['lost', 'closed_lost'].includes(statusRaw)) {
        status = 'lost';
      } else if (['converted', 'won', 'closed_won', 'sales_closed'].includes(statusRaw)) {
        status = 'converted';
      } else if (validStatusKeys.has(statusRaw)) {
        status = statusRaw;
      } else {
        const foundByName = dbStatuses.find(s => s.name?.toLowerCase().replace(/[\s-]+/g, '_') === statusRaw);
        if (foundByName) {
          status = foundByName.key || foundByName.slug;
        }
      }

      // Assignee lookup
      const assignedToVal = (row['assigned to'] || row['assignedto'] || row['assignee'] || '').trim().toLowerCase();
      let assignedToId = null;
      if (assignedToVal) {
        const found = allUsers.find(u =>
          u.email.toLowerCase() === assignedToVal ||
          u.name.toLowerCase() === assignedToVal
        );
        if (found) {
          assignedToId = found.id;
        }
      } else if (req.user.role?.level === 'user') {
        assignedToId = req.user.id;
      }

      const notes = (
        row['remarks'] ||
        row['notes'] ||
        row['note'] ||
        row['comments'] ||
        ''
      ).trim() || null;

      try {
        await Lead.create({
          name: effectiveName,
          companyName: effectiveCompany,
          leadType,
          email,
          phone,
          city,
          autosCount,
          cibilScore,
          licenseType,
          preferredArea,
          experience,
          source,
          sourceLink,
          status,
          notes,
          lastContactedDate: status === 'new' ? null : parseCSVDate(row['last contacted date'] || row['lastcontacteddate']),
          nextFollowUp: parseCSVDate(row['next follow up'] || row['nextfollowup']),
          assignedTo: assignedToId,
          organizationId: orgId
        });
        results.created++;
      } catch (err) {
        results.errors.push({ row: rowNum, name: effectiveName, error: err.message });
        results.skipped++;
      }
    }

    const { logAction } = require('../utils/auditLogger');
    await logAction(req, 'CREATE', 'leads', null, 'Bulk Upload', `Bulk uploaded leads: ${results.created} created, ${results.skipped} skipped`);

    res.json({
      success: true,
      message: `Bulk upload complete: ${results.created} created, ${results.skipped} skipped`,
      results
    });
  } catch (error) {
    console.error('[Leads Route Error]:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
