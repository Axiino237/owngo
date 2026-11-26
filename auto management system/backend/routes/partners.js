const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Lead, LoanApplication, AutoVehicle } = require('../models');
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');

// @desc    Get all Invested Fleet Partners
// @route   GET /api/partners
router.get('/', protect, checkPermission('partners', 'partners-list', 'canView'), async (req, res) => {
  try {
    const { page = 1, limit = 20, search, export: isExport } = req.query;

    const where = {
      status: {
        [Op.in]: ['Invested', 'INVESTED', 'invested']
      },
      leadType: 'partner'
    };

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      where[Op.and] = [
        where,
        {
          [Op.or]: [
            { name: { [Op.iLike]: q } },
            { phone: { [Op.iLike]: q } },
            { email: { [Op.iLike]: q } },
            { city: { [Op.iLike]: q } }
          ]
        }
      ];
    }

    if (isExport === 'true' || isExport === true) {
      const partners = await Lead.findAll({
        where,
        order: [['updatedAt', 'DESC']],
        limit: 10000,
        include: [{ model: LoanApplication, as: 'loanApplication' }]
      });

      const csvRows = [
        ['Partner Name', 'Phone', 'Email', 'City', 'Invested Autos', 'Loan App Ref', 'Loan Eligibility', 'Status', 'Invested Date'].join(',')
      ];

      partners.forEach(p => {
        csvRows.push([
          `"${(p.name || '').replace(/"/g, '""')}"`,
          `"${p.phone || ''}"`,
          `"${p.email || ''}"`,
          `"${p.city || ''}"`,
          `"${p.autosCount || 1}"`,
          `"${p.loanApplication ? p.loanApplication.applicationId : 'Direct'}"`,
          `"${p.loanApplication ? p.loanApplication.eligibility : 'N/A'}"`,
          `"${p.status}"`,
          `"${p.updatedAt ? new Date(p.updatedAt).toISOString().split('T')[0] : ''}"`
        ].join(','));
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=fleet_partners_${Date.now()}.csv`);
      return res.status(200).send(csvRows.join('\n'));
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const { count, rows } = await Lead.findAndCountAll({
      where,
      limit: parseInt(limit, 10),
      offset,
      order: [['updatedAt', 'DESC']],
      include: [{ model: LoanApplication, as: 'loanApplication' }]
    });

    return res.status(200).json({
      success: true,
      total: count,
      page: parseInt(page, 10),
      totalPages: Math.ceil(count / parseInt(limit, 10)),
      partners: rows
    });
  } catch (error) {
    console.error('Error fetching partners:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get Partners statistics
// @route   GET /api/partners/stats
router.get('/stats', protect, checkPermission('partners', 'partners-list', 'canView'), async (req, res) => {
  try {
    const where = {
      status: { [Op.in]: ['Invested', 'INVESTED', 'invested'] },
      leadType: 'partner'
    };

    const partners = await Lead.findAll({ where });
    const totalPartners = partners.length;
    const totalAutos = partners.reduce((sum, p) => sum + (p.autosCount || 1), 0);
    const totalCapital = totalAutos * 100000; // ₹1 Lakh per auto investment model

    return res.status(200).json({
      success: true,
      stats: {
        totalPartners,
        totalAutos,
        totalCapital,
        activePartners: totalPartners
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Create new Partner manually
// @route   POST /api/partners
router.post('/', protect, checkPermission('partners', 'partner-create', 'canCreate'), async (req, res) => {
  try {
    const { name, phone, email, city, autosCount = 1, notes } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and Phone are required' });
    }

    const cleanDigits = (p) => {
      if (!p) return '';
      const d = String(p).replace(/\D/g, '');
      return d.length >= 10 ? d.slice(-10) : d;
    };
    const phoneDigits = cleanDigits(phone);
    if (phoneDigits.length !== 10 || !['6', '7', '8', '9'].includes(phoneDigits[0])) {
      return res.status(400).json({ success: false, message: 'Please provide a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9' });
    }

    const allLeads = await Lead.findAll({ attributes: ['id', 'name', 'phone', 'status'] });
    const duplicate = allLeads.find(l => cleanDigits(l.phone) === phoneDigits);
    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: `Mobile number ${phoneDigits} is already registered under '${duplicate.name}' (Status: ${duplicate.status}). Duplicate entries are not allowed.`
      });
    }

    const autos = parseInt(autosCount, 10) || 1;
    const capital = autos * 100000;

    const partner = await Lead.create({
      name: String(name).trim(),
      phone: phoneDigits,
      email: email ? String(email).trim() : null,
      city: city || 'Chennai',
      autosCount: autos,
      value: capital,
      totalValue: capital,
      status: 'Invested',
      source: 'Direct Partner Onboarding',
      leadType: 'partner',
      cibilScore: '750+',
      notes
    });

    return res.status(201).json({ success: true, message: 'Partner created successfully', partner });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
