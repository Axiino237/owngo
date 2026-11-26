const express = require('express');
const router = express.Router();
const { Lead, User, Organization, Permission, Expo } = require('../models');
const { protect } = require('../middleware/auth');
const { Op } = require('sequelize');

router.use(protect);

// @desc   Get closed (converted) sales/leads with granular scoping, filters, and value sorting
// @route  GET /api/closed-sales
router.get('/', async (req, res) => {
  try {
    const {
      search = '',
      page = 1,
      limit = 10,
      financialYear = 'all',
      company = 'all',
      contactPerson = 'all',
      sortBy = 'updatedAt',
      sortOrder = 'DESC'
    } = req.query;

    const userRole = req.user.role?.level;
    const isSuper = req.user.isSuperAdmin || userRole === 'super_admin';

    // Check permissions for closed_sales (All vs Own, Filters, Name Filter, Sorting)
    let hasAllAccess = isSuper;
    let hasOwnAccess = isSuper;
    let canUseFilters = isSuper;
    let canUseNameFilter = isSuper;
    let canUseSort = isSuper;

    if (!isSuper && req.user.roleId) {
      const perms = await Permission.findAll({
        where: {
          roleId: req.user.roleId,
          module: 'closed_sales',
          screen: { [Op.in]: ['closed-sales-all', 'closed-sales-list', 'closed-sales-filters', 'closed-sales-name-filter', 'closed-sales-sort'] }
        }
      });
      hasAllAccess = perms.some(p => p.screen === 'closed-sales-all' && p.canView);
      hasOwnAccess = perms.some(p => p.screen === 'closed-sales-list' && p.canView);
      canUseFilters = perms.some(p => p.screen === 'closed-sales-filters' && p.canView);
      canUseNameFilter = perms.some(p => p.screen === 'closed-sales-name-filter' && p.canView);
      canUseSort = perms.some(p => p.screen === 'closed-sales-sort' && p.canView);
    }

    // If user has neither permission, deny access
    if (!hasAllAccess && !hasOwnAccess) {
      return res.status(403).json({
        success: false,
        message: "Access denied: You don't have permission to view closed sales."
      });
    }

    // Base filter: Only status 'converted'
    const where = {
      status: 'converted'
    };

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { companyName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
        { designation: { [Op.iLike]: `%${search}%` } },
        { notes: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // ── Apply Scoping based on Permission ──
    if (hasAllAccess) {
      if (!isSuper && req.user.organizationId) {
        where.organizationId = req.user.organizationId;
      }
    } else {
      where.assignedTo = req.user.id;
    }

    // Base scoping condition to fetch distinct filter options
    const baseScopeWhere = { ...where };

    // ── Apply Advanced Filters (if user has permission) ──
    if (canUseFilters || isSuper) {
      // 1. Company Filter
      if (company && company !== 'all') {
        where.companyName = company;
      }

      // 2. Financial Year Filter (Indian FY: April 1 to March 31)
      if (financialYear && financialYear !== 'all') {
        const match = financialYear.match(/(\d{4})/);
        if (match) {
          const startYr = parseInt(match[1], 10);
          const endYr = startYr + 1;
          const startDt = new Date(`${startYr}-04-01T00:00:00.000+05:30`);
          const endDt = new Date(`${endYr}-03-31T23:59:59.999+05:30`);
          where.createdAt = {
            [Op.between]: [startDt, endDt]
          };
        }
      }
    }

    // ── Apply Name Filter (controlled by canUseNameFilter permission in UAM) ──
    if (canUseNameFilter || canUseFilters || isSuper) {
      if (contactPerson && contactPerson !== 'all') {
        where.name = contactPerson;
      }
    }

    // ── Apply Dynamic Sorting (if user has permission) ──
    let orderClause = [['updatedAt', 'DESC']];
    if (canUseSort || isSuper) {
      const orderDir = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      switch (sortBy) {
        case 'value':
          orderClause = [['value', orderDir]];
          break;
        case 'totalValue':
          orderClause = [[Lead.sequelize.fn('COALESCE', Lead.sequelize.col('totalValue'), Lead.sequelize.col('value')), orderDir]];
          break;
        case 'paidAmount':
          orderClause = [[Lead.sequelize.fn('COALESCE', Lead.sequelize.col('paidAmount'), 0), orderDir]];
          break;
        case 'balance':
          orderClause = [[Lead.sequelize.literal('GREATEST(0, COALESCE("totalValue", "value", 0) - COALESCE("paidAmount", 0))'), orderDir]];
          break;
        case 'vendorPaidAmount':
          orderClause = [[Lead.sequelize.fn('COALESCE', Lead.sequelize.col('vendorPaidAmount'), 0), orderDir]];
          break;
        case 'companyName':
          orderClause = [['companyName', orderDir]];
          break;
        case 'name':
          orderClause = [['name', orderDir]];
          break;
        case 'createdAt':
          orderClause = [['createdAt', orderDir]];
          break;
        case 'updatedAt':
        default:
          orderClause = [['updatedAt', orderDir]];
          break;
      }
    }
    orderClause.push(['id', 'DESC']);

    const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);

    const [result, summaryResult, filterCompanies, filterContacts] = await Promise.all([
      Lead.findAndCountAll({
        where,
        distinct: true,
        include: [
          { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
          { model: Organization, as: 'organization', attributes: ['id', 'name'] },
          { model: Expo, as: 'expoMaster', attributes: ['id', 'name', 'type', 'startDate', 'endDate', 'venue'] }
        ],
        order: orderClause,
        limit: parsedLimit,
        offset: (parsedPage - 1) * parsedLimit
      }),
      Lead.findAll({
        where,
        attributes: [
          [Lead.sequelize.fn('COALESCE', Lead.sequelize.fn('SUM', Lead.sequelize.col('value')), 0), 'baseValue'],
          [
            Lead.sequelize.literal(`COALESCE(SUM(CASE WHEN "applyGst" = true THEN COALESCE("gstAmount", "value" * 0.18) ELSE 0 END), 0)`),
            'totalGst'
          ],
          [
            Lead.sequelize.literal(`COALESCE(SUM(CASE WHEN "applyTds" = true THEN COALESCE("tdsAmount", "value" * 0.02) ELSE 0 END), 0)`),
            'totalTds'
          ],
          [
            Lead.sequelize.literal(`COALESCE(SUM(COALESCE("totalValue", "value")), 0)`),
            'totalDealValue'
          ],
          [Lead.sequelize.fn('COALESCE', Lead.sequelize.fn('SUM', Lead.sequelize.col('paidAmount')), 0), 'totalPaid'],
          [Lead.sequelize.fn('COALESCE', Lead.sequelize.fn('SUM', Lead.sequelize.col('vendorPaidAmount')), 0), 'totalVendor']
        ],
        raw: true
      }),
      Lead.findAll({
        where: {
          ...baseScopeWhere,
          companyName: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] }
        },
        attributes: [[Lead.sequelize.fn('DISTINCT', Lead.sequelize.col('companyName')), 'companyName']],
        order: [[Lead.sequelize.col('companyName'), 'ASC']],
        raw: true
      }),
      Lead.findAll({
        where: {
          ...baseScopeWhere,
          name: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] }
        },
        attributes: [[Lead.sequelize.fn('DISTINCT', Lead.sequelize.col('name')), 'name']],
        order: [[Lead.sequelize.col('name'), 'ASC']],
        raw: true
      })
    ]);

    const baseValue = parseFloat(summaryResult[0]?.baseValue) || 0;
    const totalGst = parseFloat(summaryResult[0]?.totalGst) || 0;
    const totalTds = parseFloat(summaryResult[0]?.totalTds) || 0;
    const totalDealValue = parseFloat(summaryResult[0]?.totalDealValue) || 0;
    const totalPaid = parseFloat(summaryResult[0]?.totalPaid) || 0;
    const totalVendor = parseFloat(summaryResult[0]?.totalVendor) || 0;
    const totalBalance = totalDealValue - totalPaid;

    res.json({
      success: true,
      canViewAll: hasAllAccess,
      canUseFilters,
      canUseNameFilter: canUseNameFilter || isSuper,
      canUseSort,
      scopeType: hasAllAccess ? 'all' : 'own',
      total: result.count,
      page: parsedPage,
      totalPages: Math.ceil(result.count / parsedLimit),
      leads: result.rows,
      summary: {
        baseValue,
        totalGst,
        totalTds,
        totalDealValue,
        totalPaid,
        totalBalance,
        totalVendor
      },
      filterOptions: {
        companies: filterCompanies.map(c => c.companyName).filter(Boolean),
        contactPersons: filterContacts.map(c => c.name).filter(Boolean)
      }
    });
  } catch (error) {
    console.error('Error fetching closed sales:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
