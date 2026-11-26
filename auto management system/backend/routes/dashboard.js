const express = require('express');
const router = express.Router();
const { Lead, Project, User, DesignOrder, Department, Role, Permission, Attendance } = require('../models');
const { protect } = require('../middleware/auth');
const { sequelize } = require('../config/db');
const { Op } = require('sequelize');

router.use(protect);

// Helper to seed dummy data if empty
async function seedDummyDataIfEmpty() {
  try {
    const leadCount = await Lead.count();
    if (leadCount === 0) {
      await Lead.bulkCreate([
        { name: 'John Doe', companyName: 'Google Inc.', email: 'john@google.com', phone: '+1 555-1234', status: 'converted', expo: 'Website', value: 50000.00, notes: 'Interested in CRM custom systems' },
        { name: 'Jane Smith', companyName: 'Acme Corp', email: 'jane@acme.com', phone: '+1 555-5678', status: 'qualified', expo: 'Referral', value: 25000.00, notes: 'Follow up next Tuesday' },
        { name: 'Vijay Kumar', companyName: 'Vee Tech', email: 'vijay@veetech.in', phone: '+91 9876543210', status: 'contacted', expo: 'LinkedIn', value: 15000.00, notes: 'Shared brochure' },
        { name: 'Sarah Connor', companyName: 'Cyberdyne Systems', email: 'sarah@cyberdyne.com', phone: '+1 555-9000', status: 'new', expo: 'Google Ads', value: 120000.00, notes: 'Very high intent lead' },
        { name: 'Robert Downey', companyName: 'Stark Industries', email: 'tony@stark.com', phone: '+1 555-3000', status: 'converted', expo: 'Partner', value: 450000.00, notes: 'Signed contract' },
        { name: 'Elon Musk', companyName: 'X Corp', email: 'elon@x.com', phone: '+1 555-4242', status: 'lost', expo: 'Cold Email', value: 90000.00, notes: 'Not interested at this time' },
        { name: 'Sundar Pichai', companyName: 'Alphabet', email: 'sundar@google.com', phone: '+1 555-1111', status: 'new', expo: 'Website', value: 80000.00, notes: 'Requested demo request' },
        { name: 'Mark Zuckerberg', companyName: 'Meta', email: 'mark@meta.com', phone: '+1 555-2222', status: 'contacted', expo: 'LinkedIn', value: 150000.00, notes: 'Interested in enterprise subscription' }
      ]);
      console.log('✅ Dummy leads seeded successfully!');
    }

    const projectCount = await Project.count();
    if (projectCount === 0) {
      // Seed projects over the last few months with realistic revenues & deductions
      await Project.bulkCreate([
        { name: 'CRM Customization', description: 'Enterprise CRM integration', status: 'completed', revenue: 75000.00, deductions: 12000.00, startDate: '2026-01-10', endDate: '2026-03-15' },
        { name: 'HR Portal App', description: 'Internal employee hub', status: 'completed', revenue: 45000.00, deductions: 8000.00, startDate: '2026-02-01', endDate: '2026-04-20' },
        { name: 'Supabase SQL Setup', description: 'Database migration and seeding', status: 'in_progress', revenue: 30000.00, deductions: 5000.00, startDate: '2026-05-15', endDate: null },
        { name: 'Mobile Companion iOS', description: 'Vite-based PWA application wrapper', status: 'pending', revenue: 60000.00, deductions: 15000.00, startDate: '2026-06-01', endDate: null },
        { name: 'AI Search Agent Integration', description: 'Integrating semantic web search agents', status: 'in_progress', revenue: 95000.00, deductions: 22000.00, startDate: '2026-06-15', endDate: null },
        { name: 'E-commerce API Integration', description: 'Payment gateway and checkout', status: 'completed', revenue: 40000.00, deductions: 9000.00, startDate: '2026-03-01', endDate: '2026-05-10' },
        { name: 'Security Audit & Compliance', description: 'SOC2 readiness', status: 'cancelled', revenue: 20000.00, deductions: 4000.00, startDate: '2026-04-01', endDate: '2026-04-10' }
      ]);
      console.log('✅ Dummy projects seeded successfully!');
    }
  } catch (error) {
    console.error('❌ Error seeding dummy business data:', error);
  }
}

// Stats Endpoint
router.get('/stats', async (req, res) => {
  try {
    const isSuper = req.user.isSuperAdmin || req.user.role?.level === 'super_admin';
    const isOrgAdmin = req.user.role?.level === 'org_admin';
    let hasDashboardAll = isSuper || isOrgAdmin;
    let hasDashboardOwn = isSuper || isOrgAdmin;
    let canUseDateFilter = isSuper || isOrgAdmin;
    let canUseUserFilter = isSuper || isOrgAdmin;
    let canSeeTopPerformers = true; // Always visible to everyone as requested
    let canSeeUpcomingExpos = isSuper || isOrgAdmin;

    if (!isSuper && req.user.roleId) {
      const perms = await Permission.findAll({
        where: {
          roleId: req.user.roleId,
          module: 'dashboard',
          screen: { [Op.in]: ['dashboard-home', 'dashboard-all', 'dashboard-date-filter', 'dashboard-user-filter', 'top-performers-widget', 'upcoming-expos-widget'] }
        }
      });
      hasDashboardAll = isOrgAdmin || perms.some(p => p.screen === 'dashboard-all' && p.canView);
      hasDashboardOwn = isOrgAdmin || perms.some(p => p.screen === 'dashboard-home' && p.canView) || true;
      canUseDateFilter = isOrgAdmin || perms.some(p => p.screen === 'dashboard-date-filter' && p.canView);
      canUseUserFilter = isOrgAdmin || perms.some(p => p.screen === 'dashboard-user-filter' && p.canView);
      canSeeTopPerformers = true; // Top 3 Sales Performers is visible to all staff
      canSeeUpcomingExpos = isOrgAdmin || perms.some(p => p.screen === 'upcoming-expos-widget' && p.canView);
    }

    // Fetch available staff members for user filter if permitted
    let availableUsers = [];
    if (canUseUserFilter) {
      const userWhere = { isActive: true };
      if (!isSuper && req.user.organizationId) {
        userWhere.organizationId = req.user.organizationId;
      }
      availableUsers = await User.findAll({
        where: userWhere,
        attributes: ['id', 'name', 'email', 'avatar'],
        include: [{ model: Role, as: 'role', attributes: ['id', 'name', 'code', 'level'] }],
        order: [['name', 'ASC']]
      });
    }

    const {
      scope: requestedScope,
      datePreset = 'all',
      startDate,
      endDate,
      userId: requestedUserId,
      performersPreset = 'this_month'
    } = req.query;

    const isFilteredByUser = canUseUserFilter && requestedUserId && requestedUserId !== 'all';
    const effectiveScope = isFilteredByUser ? 'user' : ((requestedScope === 'own') ? 'own' : (hasDashboardAll ? 'all' : 'own'));

    // ── Build Date Range Clause (Controlled by canUseDateFilter in UAM) ──
    let dateClause = null;
    let computedStart = null;
    let computedEnd = null;

    if (canUseDateFilter && datePreset && datePreset !== 'all') {
      const now = new Date();
      if (datePreset === 'today') {
        computedStart = new Date();
        computedStart.setHours(0, 0, 0, 0);
        computedEnd = new Date();
        computedEnd.setHours(23, 59, 59, 999);
      } else if (datePreset === 'yesterday') {
        computedStart = new Date();
        computedStart.setDate(computedStart.getDate() - 1);
        computedStart.setHours(0, 0, 0, 0);
        computedEnd = new Date(computedStart);
        computedEnd.setHours(23, 59, 59, 999);
      } else if (datePreset === 'this_week') {
        computedStart = new Date();
        const day = computedStart.getDay();
        const diff = computedStart.getDate() - day + (day === 0 ? -6 : 1); // Monday
        computedStart.setDate(diff);
        computedStart.setHours(0, 0, 0, 0);
        computedEnd = new Date();
        computedEnd.setHours(23, 59, 59, 999);
      } else if (datePreset === 'this_month') {
        computedStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        computedEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      } else if (datePreset === 'last_month') {
        computedStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        computedEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      } else if (datePreset === 'custom' || startDate || endDate) {
        if (startDate) {
          computedStart = new Date(`${startDate}T00:00:00.000`);
          if (isNaN(computedStart.getTime())) computedStart = new Date(startDate);
        }
        if (endDate) {
          computedEnd = new Date(`${endDate}T23:59:59.999`);
          if (isNaN(computedEnd.getTime())) computedEnd = new Date(endDate);
        }
      }

      if (computedStart && computedEnd) {
        dateClause = { [Op.between]: [computedStart, computedEnd] };
      } else if (computedStart) {
        dateClause = { [Op.gte]: computedStart };
      } else if (computedEnd) {
        dateClause = { [Op.lte]: computedEnd };
      }
    }

    const countsWhere = {};
    const changeWhere = {};
    const designOrderWhere = {};

    if (isFilteredByUser) {
      // 🎯 User Filter: Focus purely on what the selected staff member did
      countsWhere.assignedTo = requestedUserId;

      // Design orders: submitted by user OR assigned to user as designer
      designOrderWhere[Op.or] = [
        { submittedBy: requestedUserId },
        { assignedDesignerId: requestedUserId }
      ];

      // Find all leads associated with designs assigned to this user (for design changes)
      const userDesignOrders = await DesignOrder.findAll({
        where: { assignedDesignerId: requestedUserId },
        attributes: ['leadId'],
        raw: true
      });
      const userDesignLeadIds = userDesignOrders.map(d => d.leadId).filter(Boolean);

      if (userDesignLeadIds.length > 0) {
        changeWhere[Op.or] = [
          { assignedTo: requestedUserId },
          { id: { [Op.in]: userDesignLeadIds } }
        ];
      } else {
        changeWhere.assignedTo = requestedUserId;
      }

      if (req.user.organizationId && !isSuper) {
        countsWhere.organizationId = req.user.organizationId;
        changeWhere.organizationId = req.user.organizationId;
        designOrderWhere.organizationId = req.user.organizationId;
      }
    } else if (effectiveScope === 'own') {
      countsWhere.assignedTo = req.user.id;

      // Design orders: submitted by user OR assigned to user as designer
      designOrderWhere[Op.or] = [
        { submittedBy: req.user.id },
        { assignedDesignerId: req.user.id }
      ];

      // Find all leads associated with designs assigned to this user (for design changes)
      const myDesignOrders = await DesignOrder.findAll({
        where: { assignedDesignerId: req.user.id },
        attributes: ['leadId'],
        raw: true
      });
      const myDesignLeadIds = myDesignOrders.map(d => d.leadId).filter(Boolean);

      if (myDesignLeadIds.length > 0) {
        changeWhere[Op.or] = [
          { assignedTo: req.user.id },
          { id: { [Op.in]: myDesignLeadIds } }
        ];
      } else {
        changeWhere.assignedTo = req.user.id;
      }

      if (req.user.organizationId && !isSuper) {
        countsWhere.organizationId = req.user.organizationId;
        changeWhere.organizationId = req.user.organizationId;
        designOrderWhere.organizationId = req.user.organizationId;
      }
    } else {
      // 'all' scope
      if (!isSuper && req.user.organizationId) {
        countsWhere.organizationId = req.user.organizationId;
        changeWhere.organizationId = req.user.organizationId;
        designOrderWhere.organizationId = req.user.organizationId;
      }
    }

    // Apply Date Range Filter across metrics if enabled
    if (dateClause) {
      countsWhere.createdAt = dateClause;
      changeWhere.createdAt = dateClause;
      designOrderWhere.createdAt = dateClause;
    }

    // Converted leads represent projects in this CRM
    const convertedProjectsWhere = { ...countsWhere, status: 'converted' };
    const financialWhere = { ...convertedProjectsWhere };

    // 📈 Monthly Sales Trend: Spans rolling months so trend curves are visible
    // Preserves staff/org boundaries if active, but is NOT restricted by a single-day/month dateClause
    const monthlyTrendWhere = { status: 'converted' };
    if (countsWhere.assignedTo) monthlyTrendWhere.assignedTo = countsWhere.assignedTo;
    if (countsWhere.organizationId) monthlyTrendWhere.organizationId = countsWhere.organizationId;

    // Total Projects = all converted leads
    // Completed Projects = converted leads where full amount has been completely paid (paidAmount >= totalValue/value)
    const completedProjectsWhere = {
      ...convertedProjectsWhere,
      [Op.and]: [
        sequelize.literal('COALESCE("paidAmount", 0) >= COALESCE("totalValue", "value", 0) AND COALESCE("totalValue", "value", 0) > 0')
      ]
    };

    const pendingProjectsWhere = {
      ...convertedProjectsWhere,
      [Op.or]: [
        sequelize.literal('COALESCE("paidAmount", 0) < COALESCE("totalValue", "value", 0)'),
        sequelize.literal('COALESCE("totalValue", "value", 0) <= 0'),
        { paidAmount: null }
      ]
    };

    // Calls made: status has changed from 'new' to any other status or lastContactedDate is recorded
    const callsWhere = {
      ...countsWhere
    };
    if (dateClause) {
      delete callsWhere.createdAt;
      callsWhere[Op.and] = [
        {
          [Op.or]: [
            { lastContactedDate: dateClause },
            {
              [Op.and]: [
                { status: { [Op.ne]: 'new' } },
                { createdAt: dateClause }
              ]
            }
          ]
        }
      ];
    } else {
      callsWhere[Op.or] = [
        { status: { [Op.ne]: 'new' } },
        { lastContactedDate: { [Op.ne]: null } }
      ];
    }

    // Interested leads: status is 'qualified' or modern interested statuses
    const interestedLeadsWhere = {
      ...countsWhere,
      status: {
        [Op.in]: ['qualified', 'requirement_received', 'call_back', 'follow_ups', 'design_sent', 'quote_sent']
      }
    };

    // 🏆 Top Sales Performers Query (Shows company-wide Top 3 to everyone, reacts to monthly/yearly filters)
    let performersDateClause = null;
    if (performersPreset && performersPreset !== 'all') {
      const pNow = new Date();
      if (performersPreset === 'this_month') {
        const pStart = new Date(pNow.getFullYear(), pNow.getMonth(), 1, 0, 0, 0, 0);
        const pEnd = new Date(pNow.getFullYear(), pNow.getMonth() + 1, 0, 23, 59, 59, 999);
        performersDateClause = { [Op.between]: [pStart, pEnd] };
      } else if (performersPreset === 'last_month') {
        const pStart = new Date(pNow.getFullYear(), pNow.getMonth() - 1, 1, 0, 0, 0, 0);
        const pEnd = new Date(pNow.getFullYear(), pNow.getMonth(), 0, 23, 59, 59, 999);
        performersDateClause = { [Op.between]: [pStart, pEnd] };
      } else if (performersPreset === 'this_year') {
        const pStart = new Date(pNow.getFullYear(), 0, 1, 0, 0, 0, 0);
        const pEnd = new Date(pNow.getFullYear(), 11, 31, 23, 59, 59, 999);
        performersDateClause = { [Op.between]: [pStart, pEnd] };
      } else if (performersPreset === 'last_year') {
        const pStart = new Date(pNow.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
        const pEnd = new Date(pNow.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        performersDateClause = { [Op.between]: [pStart, pEnd] };
      } else if (/^\d{4}-\d{2}$/.test(performersPreset)) {
        const [yr, mo] = performersPreset.split('-').map(Number);
        const pStart = new Date(yr, mo - 1, 1, 0, 0, 0, 0);
        const pEnd = new Date(yr, mo, 0, 23, 59, 59, 999);
        performersDateClause = { [Op.between]: [pStart, pEnd] };
      } else if (/^\d{4}$/.test(performersPreset)) {
        const yr = Number(performersPreset);
        const pStart = new Date(yr, 0, 1, 0, 0, 0, 0);
        const pEnd = new Date(yr, 11, 31, 23, 59, 59, 999);
        performersDateClause = { [Op.between]: [pStart, pEnd] };
      }
    } else if (performersPreset === 'all') {
      performersDateClause = null;
    } else if (dateClause) {
      performersDateClause = dateClause;
    }

    const topPerformersWhere = {
      status: { [Op.in]: ['converted', 'sales_closed', 'invested', 'Invested'] }
    };
    if (!isSuper && req.user.organizationId) {
      topPerformersWhere.organizationId = req.user.organizationId;
    }
    // Company-wide leaderboard so everyone can see the top 3 champions
    if (performersDateClause) {
      topPerformersWhere[Op.or] = [
        { updatedAt: performersDateClause },
        { createdAt: performersDateClause }
      ];
    }

    // 📅 Upcoming Closed Projects / Expos (auto-removes once expo date is past)
    const TIMEZONE = process.env.TIMEZONE || 'Asia/Kolkata';
    const todayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    const upcomingExposWhere = {
      status: { [Op.in]: ['converted', 'sales_closed'] },
      [Op.or]: [
        { expoDate: { [Op.gte]: todayStr } },
        { productionDate: { [Op.gte]: todayStr } }
      ]
    };
    if (!isSuper && req.user.organizationId) {
      upcomingExposWhere.organizationId = req.user.organizationId;
    }
    if (isFilteredByUser) {
      upcomingExposWhere.assignedTo = requestedUserId;
    } else if (effectiveScope === 'own') {
      upcomingExposWhere.assignedTo = req.user.id;
    }

    // 💰 Quote Sent Where Clauses (Active filter, Own scope, Team scope)
    const quoteSentWhere = { ...countsWhere, status: 'quote_sent' };
    const ownQuoteWhere = {
      status: 'quote_sent',
      assignedTo: req.user.id,
      ...(req.user.organizationId && !isSuper ? { organizationId: req.user.organizationId } : {}),
      ...(dateClause ? { createdAt: dateClause } : {})
    };
    const teamQuoteWhere = {
      status: 'quote_sent',
      ...(req.user.organizationId && !isSuper ? { organizationId: req.user.organizationId } : {}),
      ...(dateClause ? { createdAt: dateClause } : {})
    };

    const [
      totalLeads,
      totalCalls,
      totalInterestedLeads,
      totalProjects,
      pendingProjects,
      completedProjects,
      totalQuoteSentCount,
      quoteSentValueResult,
      ownQuoteCountResult,
      ownQuoteValueResult,
      teamQuoteCountResult,
      teamQuoteValueResult,
      totalDesigns,
      pendingDesigns,
      completedDesigns,
      changeDesigns,
      financeStats,
      pendingBalanceDealsCount,
      monthlyData,
      recentLeads,
      recentConvertedLeads,
      topSalesGroup,
      upcomingLeads
    ] = await Promise.all([
      Lead.count({ where: countsWhere }),
      Lead.count({ where: callsWhere }),
      Lead.count({ where: interestedLeadsWhere }),
      Lead.count({ where: convertedProjectsWhere }),
      Lead.count({ where: pendingProjectsWhere }),
      Lead.count({ where: completedProjectsWhere }),
      // Quote Sent counts and values
      Lead.count({ where: quoteSentWhere }),
      Lead.findOne({
        attributes: [[sequelize.fn('SUM', sequelize.col('value')), 'totalQuoteValue']],
        where: quoteSentWhere,
        raw: true
      }),
      Lead.count({ where: ownQuoteWhere }),
      Lead.findOne({
        attributes: [[sequelize.fn('SUM', sequelize.col('value')), 'ownQuoteValue']],
        where: ownQuoteWhere,
        raw: true
      }),
      Lead.count({ where: teamQuoteWhere }),
      Lead.findOne({
        attributes: [[sequelize.fn('SUM', sequelize.col('value')), 'teamQuoteValue']],
        where: teamQuoteWhere,
        raw: true
      }),
      DesignOrder.count({ where: designOrderWhere }),
      DesignOrder.count({ where: { ...designOrderWhere, status: { [Op.in]: ['pending', 'in_progress'] } } }),
      DesignOrder.count({ where: { ...designOrderWhere, status: 'completed' } }),
      Lead.count({ where: { ...changeWhere, status: 'converted', designStatus: 'change' } }),
      Lead.findOne({
        attributes: [
          [sequelize.fn('SUM', sequelize.col('value')), 'totalBaseRevenue'],
          [
            sequelize.fn(
              'SUM',
              sequelize.fn('COALESCE', sequelize.col('totalValue'), sequelize.col('value'))
            ),
            'totalTaxedRevenue'
          ],
          [sequelize.fn('SUM', sequelize.fn('COALESCE', sequelize.col('paidAmount'), 0)), 'totalPaidAmount'],
          [
            sequelize.fn(
              'SUM',
              sequelize.literal('GREATEST(0, COALESCE("totalValue", "value", 0) - COALESCE("paidAmount", 0))')
            ),
            'overallBalance'
          ],
          [sequelize.fn('SUM', sequelize.col('vendorPaidAmount')), 'totalDeductions']
        ],
        where: financialWhere,
        raw: true
      }),
      Lead.count({
        where: {
          ...financialWhere,
          [Op.and]: [
            sequelize.literal('COALESCE("totalValue", "value", 0) > COALESCE("paidAmount", 0)')
          ]
        }
      }),
      Lead.findAll({
        attributes: [
          [sequelize.fn('date_trunc', 'month', sequelize.col('createdAt')), 'month'],
          [
            sequelize.fn(
              'SUM',
              sequelize.fn('COALESCE', sequelize.col('totalValue'), sequelize.col('value'), 0)
            ),
            'revenue'
          ],
          [sequelize.fn('SUM', sequelize.fn('COALESCE', sequelize.col('vendorPaidAmount'), 0)), 'deductions'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'dealsCount']
        ],
        where: monthlyTrendWhere,
        group: [sequelize.fn('date_trunc', 'month', sequelize.col('createdAt'))],
        order: [[sequelize.fn('date_trunc', 'month', sequelize.col('createdAt')), 'ASC']],
        raw: true
      }),
      Lead.findAll({
        where: countsWhere,
        include: [{ model: User, as: 'assignee', attributes: ['id', 'name', 'email', 'avatar'] }],
        order: [['createdAt', 'DESC']],
        limit: 5
      }),
      Lead.findAll({
        where: convertedProjectsWhere,
        include: [{ model: User, as: 'assignee', attributes: ['id', 'name', 'email', 'avatar'] }],
        order: [['updatedAt', 'DESC']],
        limit: 5
      }),
      Lead.findAll({
        where: topPerformersWhere,
        attributes: [
          [sequelize.fn('COALESCE', sequelize.fn('NULLIF', sequelize.fn('TRIM', sequelize.col('source')), ''), 'Direct Website'), 'sourceName'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'salesCount'],
          [
            sequelize.fn(
              'SUM',
              sequelize.fn('COALESCE', sequelize.col('totalValue'), sequelize.col('value'), 0)
            ),
            'totalRevenue'
          ],
          [sequelize.fn('SUM', sequelize.col('value')), 'baseRevenue'],
          [
            sequelize.literal('ROUND(SUM(COALESCE("totalValue", "value", 0)) / NULLIF(COUNT("id"), 0))'),
            'avgDealValue'
          ]
        ],
        group: [sequelize.literal('COALESCE(NULLIF(TRIM("source"), \'\'), \'Direct Website\')')],
        order: [
          [sequelize.literal('"totalRevenue"'), 'DESC'],
          [sequelize.literal('"salesCount"'), 'DESC']
        ],
        limit: 3,
        raw: true
      }),
      Lead.findAll({
        where: upcomingExposWhere,
        include: [
          { model: User, as: 'assignee', attributes: ['id', 'name', 'email', 'avatar'] }
        ],
        order: [
          [
            sequelize.literal(
              `CASE 
                 WHEN "expoDate" >= '${todayStr}' AND "productionDate" >= '${todayStr}' THEN LEAST("expoDate", "productionDate") 
                 WHEN "expoDate" >= '${todayStr}' THEN "expoDate" 
                 ELSE "productionDate" 
               END`
            ),
            'ASC'
          ]
        ],
        limit: 10
      })
    ]);

    const recentProjects = recentConvertedLeads.map(l => {
      const val = parseFloat(l.value) || 0;
      const totalVal = (l.totalValue !== null && l.totalValue !== undefined) ? parseFloat(l.totalValue) : val;
      const paid = parseFloat(l.paidAmount) || 0;
      const isCompleted = totalVal > 0 && paid >= totalVal;
      return {
        id: l.id,
        name: l.companyName || l.name || 'Project Deal',
        startDate: l.updatedAt ? new Date(l.updatedAt).toISOString().split('T')[0] : '',
        revenue: totalVal,
        paidAmount: paid,
        deductions: parseFloat(l.vendorPaidAmount) || 0,
        status: isCompleted ? 'completed' : 'pending',
        assignee: l.assignee ? {
          id: l.assignee.id,
          name: l.assignee.name,
          email: l.assignee.email,
          avatar: l.assignee.avatar
        } : null
      };
    });

    const totalBaseRevenue = parseFloat(financeStats?.totalBaseRevenue || 0);
    const totalTaxedRevenue = parseFloat(financeStats?.totalTaxedRevenue || 0);
    const totalPaidAmount = parseFloat(financeStats?.totalPaidAmount || 0);
    const overallBalance = parseFloat(financeStats?.overallBalance || 0);
    const totalDeductions = parseFloat(financeStats?.totalDeductions || 0);

    // Proper Net Profit Calculation:
    // Net Profit = Base Deal Value (real business earnings) - Vendor Deductions
    const totalProfit = totalBaseRevenue - totalDeductions;
    const profitMargin = totalBaseRevenue > 0 ? Math.round((totalProfit / totalBaseRevenue) * 100) : 0;
    const expenseRatio = totalBaseRevenue > 0 ? Math.round((totalDeductions / totalBaseRevenue) * 100) : 0;

    const monthlyList = (monthlyData || []).map(m => {
      const rev = parseFloat(m.revenue || 0);
      const ded = parseFloat(m.deductions || 0);
      const deals = parseInt(m.dealsCount, 10) || 0;
      let monthStr = 'Jan 2026';
      if (m.month) {
        const d = new Date(m.month);
        monthStr = !isNaN(d.getTime()) ? d.toLocaleString('en-US', { month: 'short', year: 'numeric' }) : String(m.month);
      }
      return { month: monthStr, revenue: rev, deductions: ded, profit: Math.max(0, rev - ded), dealsCount: deals };
    });
    const perMonthProfit = totalProfit / Math.max(1, monthlyList.length);
    const perMonthSales = totalBaseRevenue / Math.max(1, monthlyList.length);

    // 🏆 Build Top 3 Sales Sources (Channels) Leaderboard
    const channelMetadata = {
      instagram: { name: 'Instagram', icon: '📸', color: '#E1306C' },
      whatsapp: { name: 'WhatsApp', icon: '💬', color: '#25D366' },
      offline_poster: { name: 'Auto Stand Poster QR', icon: '🛺', color: '#06b6d4' },
      'auto stand': { name: 'Auto Stand Campaign', icon: '🛺', color: '#06b6d4' },
      'auto stand campaign': { name: 'Auto Stand Campaign', icon: '🛺', color: '#06b6d4' },
      direct: { name: 'Direct Website', icon: '🌐', color: '#10b981' },
      'direct website': { name: 'Direct Website', icon: '🌐', color: '#10b981' },
      google_ads: { name: 'Google Ads', icon: '🎯', color: '#4285F4' },
      'google ads': { name: 'Google Ads', icon: '🎯', color: '#4285F4' },
      facebook: { name: 'Facebook', icon: '📘', color: '#1877F2' },
      meta: { name: 'Meta / Facebook', icon: '📘', color: '#1877F2' },
      agent_referral: { name: 'Sales Agent Referral', icon: '🤝', color: '#a855f7' },
      referral: { name: 'Agent / Partner Referral', icon: '🤝', color: '#a855f7' },
      'agent / partner referral': { name: 'Agent / Partner Referral', icon: '🤝', color: '#a855f7' },
      'driver referral': { name: 'Driver Referral', icon: '🛺', color: '#059669' },
      'walk-in': { name: 'Walk-in', icon: '🚶', color: '#64748b' }
    };

    const topPerformers = (topSalesGroup || []).map((item, idx) => {
      const rawName = (item.sourceName || 'Direct Website').trim();
      const lower = rawName.toLowerCase();
      const meta = channelMetadata[lower] || {
        name: rawName,
        icon: '🔗',
        color: '#10b981'
      };
      const sCount = parseInt(item.salesCount, 10) || 0;
      const totRev = parseFloat(item.totalRevenue) || 0;
      const avgDeal = sCount > 0 ? Math.round(totRev / sCount) : 0;
      return {
        rank: idx + 1,
        source: rawName,
        name: meta.name || rawName,
        icon: meta.icon,
        color: meta.color,
        role: 'Acquisition Channel',
        salesCount: sCount,
        totalRevenue: totRev,
        baseRevenue: parseFloat(item.baseRevenue) || 0,
        avgDealValue: avgDeal
      };
    });

    // 📅 Build Upcoming Closed Sales / Expos list
    const upcomingClosedSales = (upcomingLeads || []).map(l => {
      const val = parseFloat(l.value) || 0;
      const totalVal = (l.totalValue !== null && l.totalValue !== undefined) ? parseFloat(l.totalValue) : val;
      return {
        id: l.id,
        companyName: l.companyName || l.name || 'Client',
        contactPerson: l.name || '',
        expoName: l.expoName || l.expoType || l.expo || 'Exhibition',
        expoDate: l.expoDate,
        productionDate: l.productionDate,
        value: val,
        totalValue: totalVal,
        paidAmount: parseFloat(l.paidAmount) || 0,
        assignee: l.assignee ? {
          id: l.assignee.id,
          name: l.assignee.name,
          email: l.assignee.email,
          avatar: l.assignee.avatar
        } : null
      };
    });

    // ── Attendance Statistics (Overall & Individual calculated via In-Time & Out-Time for Last 30 Days) ──
    let attendance = {
      overall: {
        totalStaff: 11,
        presentCount: 0,
        absentCount: 0,
        presentPercentage: 0,
        absentPercentage: 100
      },
      individual: {
        userName: req.user.name,
        targetUserId: req.user.id,
        roleName: 'Staff',
        windowDays: 30,
        workingDays: 26,
        presentDays: 0,
        absentDays: 26,
        presentPercentage: 0,
        absentPercentage: 100,
        todayInTime: '-',
        todayOutTime: '-',
        isTodayActive: false,
        isTodayLate: false,
        lateArrivals: 0,
        onTimeArrivals: 0,
        totalHoursWorked: 0,
        expectedHours: 234
      },
      staffList: []
    };

    try {
      const now = new Date();
      // IST current time & date (Asia/Kolkata +05:30)
      const istDateStr = new Intl.DateTimeFormat('en-CA', { 
        timeZone: 'Asia/Kolkata', 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      }).format(now);

      // Rolling 30 Days window (Last 30 Days)
      const d30 = new Date(now.getTime() - (29 * 24 * 60 * 60 * 1000));
      const start30Str = new Intl.DateTimeFormat('en-CA', { 
        timeZone: 'Asia/Kolkata', 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      }).format(d30);

      // 1. Overall Team Attendance (Today in IST) - Exclude users where attendance is not required
      const userScopeWhere = { 
        isActive: true,
        attendanceRequired: { [Op.ne]: false }
      };
      if (!req.user.isSuperAdmin && req.user.organizationId) {
        userScopeWhere.organizationId = req.user.organizationId;
      }
      const activeStaff = await User.findAll({ 
        where: userScopeWhere,
        attributes: ['id', 'name', 'email', 'avatar', 'attendanceRequired'],
        include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }],
        order: [['name', 'ASC']]
      });

      const activeStaffIdSet = new Set(activeStaff.map(u => String(u.id)));

      const attScopeWhere = { date: istDateStr };
      if (!req.user.isSuperAdmin && req.user.organizationId) {
        attScopeWhere.organizationId = req.user.organizationId;
      }

      const todayAttRecords = await Attendance.findAll({
        where: attScopeWhere,
        attributes: ['userId', 'status', 'checkIn', 'checkOut']
      });

      const todayPresentCount = todayAttRecords.filter(r => 
        activeStaffIdSet.has(String(r.userId)) && 
        (['present', 'late', 'half_day'].includes(r.status) || !!r.checkIn)
      ).length;
      const totalStaff = Math.max(activeStaff.length, 1);
      const todayAbsentCount = Math.max(0, totalStaff - todayPresentCount);
      const overallPresentPct = Math.round((todayPresentCount / totalStaff) * 100);

      attendance.overall = {
        totalStaff,
        presentCount: todayPresentCount,
        absentCount: todayAbsentCount,
        presentPercentage: overallPresentPct,
        absentPercentage: 100 - overallPresentPct
      };

      // 2. Working days in Last 30 Days window (excluding Sundays)
      let workingDaysCount = 0;
      for (let i = 0; i < 30; i++) {
        const cur = new Date(d30.getTime() + (i * 24 * 60 * 60 * 1000));
        if (cur.getDay() !== 0) workingDaysCount++; // 0 = Sunday
      }
      workingDaysCount = Math.max(1, workingDaysCount);

      // Fetch all attendance logs for this 30-day window for active staff
      const activeUserIds = activeStaff.map(u => u.id);
      const allMonthRecords = await Attendance.findAll({
        where: {
          userId: { [Op.in]: activeUserIds },
          date: { [Op.between]: [start30Str, istDateStr] }
        },
        attributes: ['id', 'userId', 'date', 'status', 'checkIn', 'checkOut'],
        order: [['date', 'ASC']]
      });

      // Group records by user
      const userRecordsMap = {};
      activeUserIds.forEach(id => { userRecordsMap[id] = []; });
      allMonthRecords.forEach(r => {
        if (!userRecordsMap[r.userId]) userRecordsMap[r.userId] = [];
        userRecordsMap[r.userId].push(r);
      });

      // Helper to compute individual attendance from In-Time & Out-Time across 30 days
      const computeUserAttendance = (u, records) => {
        let creditedPresent = 0;
        let totalMins = 0;
        let lateCount = 0;
        let onTimeCount = 0;
        let todayIn = '-';
        let todayOut = '-';
        let isTodayActive = false;
        let isTodayLate = false;

        records.forEach(r => {
          let mins = 0;
          if (r.checkIn) {
            const inDate = new Date(r.checkIn);
            const inIST = inDate.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });
            const isLate = inIST > '09:30:59';
            if (isLate) lateCount++; else onTimeCount++;

            if (r.date === istDateStr) {
              todayIn = inDate.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
              isTodayLate = isLate;
            }

            if (r.checkOut) {
              const outDate = new Date(r.checkOut);
              mins = Math.max(0, Math.round((outDate - inDate) / 60000));
              if (r.date === istDateStr) {
                todayOut = outDate.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
              }
            } else if (r.date === istDateStr) {
              mins = Math.max(0, Math.round((now - inDate) / 60000));
              const h = Math.floor(mins / 60);
              const m = mins % 60;
              todayOut = `Active (${h}h ${m}m)`;
              isTodayActive = true;
            } else {
              // Past day with no checkout recorded: treat as 8 hours (480 mins)
              mins = 480;
            }
          }

          totalMins += mins;
          const hrs = mins / 60;

          // In-Time & Out-Time duration based credit:
          if (hrs >= 7.5) {
            creditedPresent += 1.0;
          } else if (hrs >= 4.0) {
            creditedPresent += 0.5;
          } else if (r.date === istDateStr && r.checkIn && !r.checkOut) {
            // Currently active at work today
            creditedPresent += 1.0;
          } else if (hrs > 0) {
            // Short duration (e.g. 58 seconds test punch): 0 credit
            creditedPresent += Math.min(0.25, Math.round((hrs / 8.0) * 100) / 100);
          }
        });

        creditedPresent = Math.min(workingDaysCount, Math.round(creditedPresent * 10) / 10);
        const absent = Math.max(0, Math.round((workingDaysCount - creditedPresent) * 10) / 10);
        const presentPct = workingDaysCount > 0 ? Math.round((creditedPresent / workingDaysCount) * 100) : 0;
        const totalHrs = Math.round((totalMins / 60) * 10) / 10;
        const expectedHrs = workingDaysCount * 9;

        return {
          userId: u.id,
          userName: u.name,
          userEmail: u.email,
          userAvatar: u.avatar,
          roleName: u.role?.name || 'Staff',
          windowDays: 30,
          workingDays: workingDaysCount,
          presentDays: creditedPresent,
          absentDays: absent,
          presentPercentage: presentPct,
          absentPercentage: 100 - presentPct,
          todayInTime: todayIn,
          todayOutTime: todayOut,
          isTodayActive,
          isTodayLate,
          lateArrivals: lateCount,
          onTimeArrivals: onTimeCount,
          totalHoursWorked: totalHrs,
          expectedHours: expectedHrs
        };
      };

      // Generate for all active staff
      const staffList = activeStaff.map(u => computeUserAttendance(u, userRecordsMap[u.id] || []));
      attendance.staffList = staffList;

      // Determine target user:
      // Priority: individualUserId -> (if filtered by user in dashboard) requestedUserId -> req.user.id
      const { individualUserId } = req.query;
      const targetUserId = individualUserId || ((isFilteredByUser && requestedUserId !== 'all') ? requestedUserId : req.user.id);
      
      const foundTarget = staffList.find(s => s.userId === targetUserId);
      if (foundTarget) {
        attendance.individual = foundTarget;
      } else {
        const u = await User.findByPk(targetUserId, { 
          attributes: ['id', 'name', 'email', 'avatar', 'attendanceRequired'],
          include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }]
        });
        if (u && u.attendanceRequired === false) {
          attendance.individual = {
            userId: u.id,
            userName: u.name,
            roleName: u.role?.name || 'Staff',
            avatar: u.avatar,
            attendanceRequired: false,
            isAttendanceExempt: true,
            windowDays: 30,
            workingDays: 0,
            presentDays: 0,
            absentDays: 0,
            presentPercentage: 100,
            absentPercentage: 0,
            todayInTime: 'Exempt',
            todayOutTime: 'Exempt',
            isTodayActive: false,
            isTodayLate: false,
            totalHoursWorked: 0,
            expectedHours: 0
          };
        } else {
          const records = userRecordsMap[targetUserId] || [];
          attendance.individual = u ? computeUserAttendance(u, records) : attendance.individual;
        }
      }
    } catch (attErr) {
      console.warn('Attendance stats computation warning:', attErr.message);
    }

    res.json({
      success: true,
      canViewAll: hasDashboardAll,
      canUseDateFilter,
      canUseUserFilter,
      canSeeTopPerformers,
      canSeeUpcomingExpos,
      selectedUserId: isFilteredByUser ? requestedUserId : 'all',
      availableUsers: availableUsers.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        avatar: u.avatar,
        role: u.role ? { id: u.role.id, name: u.role.name, level: u.role.level } : null
      })),
      scopeType: effectiveScope,
      dateFilter: {
        preset: datePreset || 'all',
        startDate: computedStart ? computedStart.toISOString() : (startDate || null),
        endDate: computedEnd ? computedEnd.toISOString() : (endDate || null)
      },
      stats: {
        totalLeads,
        totalCalls,
        totalInterestedLeads,
        totalProjects,
        pendingProjects,
        completedProjects,
        totalQuoteSent: parseInt(totalQuoteSentCount, 10) || 0,
        totalQuoteValue: parseFloat(quoteSentValueResult?.totalQuoteValue) || 0,
        ownQuoteSent: parseInt(ownQuoteCountResult, 10) || 0,
        ownQuoteValue: parseFloat(ownQuoteValueResult?.ownQuoteValue) || 0,
        teamQuoteSent: parseInt(teamQuoteCountResult, 10) || 0,
        teamQuoteValue: parseFloat(teamQuoteValueResult?.teamQuoteValue) || 0,
        totalDesigns,
        pendingDesigns,
        completedDesigns,
        changeDesigns,
        totalSales: totalBaseRevenue,
        totalRevenue: totalBaseRevenue,
        totalSalesBase: totalBaseRevenue,
        totalSalesTaxed: totalTaxedRevenue,
        totalPaidAmount,
        overallBalance,
        pendingBalanceDealsCount,
        totalDeductions,
        totalProfit,
        profitMargin,
        expenseRatio,
        perMonthProfit,
        perMonthSales,
        monthlyData: monthlyList.length > 0 ? monthlyList : [{ month: 'Oct 2026', revenue: totalBaseRevenue, deductions: totalDeductions, profit: totalProfit }]
      },
      attendance,
      topPerformers,
      performersPreset,
      upcomingClosedSales,
      recentLeads,
      recentProjects
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});


// 🏆 Full Sales Performance Leaderboard Endpoint (All sales members ranked top to bottom)
router.get('/leaderboard', async (req, res) => {
  try {
    const isSuper = req.user.isSuperAdmin || req.user.role?.level === 'super_admin';
    const { performersPreset = 'this_month' } = req.query;

    let performersDateClause = null;
    const pNow = new Date();
    if (performersPreset === 'this_month') {
      const pStart = new Date(pNow.getFullYear(), pNow.getMonth(), 1, 0, 0, 0, 0);
      const pEnd = new Date(pNow.getFullYear(), pNow.getMonth() + 1, 0, 23, 59, 59, 999);
      performersDateClause = { [Op.between]: [pStart, pEnd] };
    } else if (performersPreset === 'last_month') {
      const pStart = new Date(pNow.getFullYear(), pNow.getMonth() - 1, 1, 0, 0, 0, 0);
      const pEnd = new Date(pNow.getFullYear(), pNow.getMonth(), 0, 23, 59, 59, 999);
      performersDateClause = { [Op.between]: [pStart, pEnd] };
    } else if (performersPreset === 'this_year') {
      const pStart = new Date(pNow.getFullYear(), 0, 1, 0, 0, 0, 0);
      const pEnd = new Date(pNow.getFullYear(), 11, 31, 23, 59, 59, 999);
      performersDateClause = { [Op.between]: [pStart, pEnd] };
    } else if (performersPreset === 'last_year') {
      const pStart = new Date(pNow.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
      const pEnd = new Date(pNow.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      performersDateClause = { [Op.between]: [pStart, pEnd] };
    } else if (/^\d{4}-\d{2}$/.test(performersPreset)) {
      const [yr, mo] = performersPreset.split('-').map(Number);
      const pStart = new Date(yr, mo - 1, 1, 0, 0, 0, 0);
      const pEnd = new Date(yr, mo, 0, 23, 59, 59, 999);
      performersDateClause = { [Op.between]: [pStart, pEnd] };
    } else if (/^\d{4}$/.test(performersPreset)) {
      const yr = Number(performersPreset);
      const pStart = new Date(yr, 0, 1, 0, 0, 0, 0);
      const pEnd = new Date(yr, 11, 31, 23, 59, 59, 999);
      performersDateClause = { [Op.between]: [pStart, pEnd] };
    }

    const where = {
      status: { [Op.in]: ['converted', 'sales_closed'] },
      assignedTo: { [Op.ne]: null }
    };
    if (!isSuper && req.user.organizationId) {
      where.organizationId = req.user.organizationId;
    }
    if (performersDateClause) {
      where[Op.or] = [
        { updatedAt: performersDateClause },
        { createdAt: performersDateClause }
      ];
    }

    const salesGroup = await Lead.findAll({
      where,
      attributes: [
        'assignedTo',
        [sequelize.fn('COUNT', sequelize.col('id')), 'salesCount'],
        [
          sequelize.fn(
            'SUM',
            sequelize.fn('COALESCE', sequelize.col('totalValue'), sequelize.col('value'), 0)
          ),
          'totalRevenue'
        ],
        [sequelize.fn('SUM', sequelize.col('value')), 'baseRevenue']
      ],
      group: ['assignedTo'],
      order: [
        [sequelize.literal('"totalRevenue"'), 'DESC'],
        [sequelize.literal('"salesCount"'), 'DESC']
      ],
      raw: true
    });

    const userWhere = { isActive: true };
    if (!isSuper && req.user.organizationId) {
      userWhere.organizationId = req.user.organizationId;
    }

    // Fetch all active staff
    const allUsers = await User.findAll({
      where: userWhere,
      attributes: ['id', 'name', 'email', 'avatar'],
      include: [{ model: Role, as: 'role', attributes: ['id', 'name', 'level'] }]
    });

    const statMap = {};
    salesGroup.forEach(g => {
      statMap[g.assignedTo] = {
        salesCount: parseInt(g.salesCount, 10) || 0,
        totalRevenue: parseFloat(g.totalRevenue) || 0,
        baseRevenue: parseFloat(g.baseRevenue) || 0
      };
    });

    // Filter to sales members (or users who closed deals, or roles matching sales/director/tele)
    const salesMembers = allUsers.filter(u => {
      const roleName = (u.role?.name || '').toLowerCase();
      const hasDeals = !!statMap[u.id];
      return hasDeals || roleName.includes('sales') || roleName.includes('director') || roleName.includes('tele');
    });

    let companyTotalRevenue = 0;
    let companyTotalDeals = 0;

    const leaderboard = salesMembers.map(u => {
      const s = statMap[u.id] || { salesCount: 0, totalRevenue: 0, baseRevenue: 0 };
      const avgDeal = s.salesCount > 0 ? Math.round(s.totalRevenue / s.salesCount) : 0;
      companyTotalRevenue += s.totalRevenue;
      companyTotalDeals += s.salesCount;
      return {
        userId: u.id,
        name: u.name,
        email: u.email,
        avatar: u.avatar,
        role: u.role ? u.role.name : 'Sales Executive',
        salesCount: s.salesCount,
        totalRevenue: s.totalRevenue,
        baseRevenue: s.baseRevenue,
        avgDealValue: avgDeal
      };
    });

    // Rank from Top to Bottom: highest revenue first, then highest deals, then name
    leaderboard.sort((a, b) => {
      if (b.totalRevenue !== a.totalRevenue) return b.totalRevenue - a.totalRevenue;
      if (b.salesCount !== a.salesCount) return b.salesCount - a.salesCount;
      return a.name.localeCompare(b.name);
    });

    // Assign 1-based ranks & revenue contribution percentage
    leaderboard.forEach((m, idx) => {
      m.rank = idx + 1;
      m.revenueShare = companyTotalRevenue > 0 ? Math.round((m.totalRevenue / companyTotalRevenue) * 100) : 0;
    });

    // Compute Overall (All-Time) Top 3 Sales Champions for the top podium cards
    const overallWhere = {
      status: { [Op.in]: ['converted', 'sales_closed'] },
      assignedTo: { [Op.ne]: null }
    };
    if (!isSuper && req.user.organizationId) {
      overallWhere.organizationId = req.user.organizationId;
    }

    const overallSalesGroup = await Lead.findAll({
      where: overallWhere,
      attributes: [
        'assignedTo',
        [sequelize.fn('COUNT', sequelize.col('id')), 'salesCount'],
        [
          sequelize.fn(
            'SUM',
            sequelize.fn('COALESCE', sequelize.col('totalValue'), sequelize.col('value'), 0)
          ),
          'totalRevenue'
        ],
        [sequelize.fn('SUM', sequelize.col('value')), 'baseRevenue']
      ],
      group: ['assignedTo'],
      order: [
        [sequelize.literal('"totalRevenue"'), 'DESC'],
        [sequelize.literal('"salesCount"'), 'DESC']
      ],
      limit: 3,
      raw: true
    });

    const overallUserIds = (overallSalesGroup || []).map(g => g.assignedTo).filter(Boolean);
    const overallUsers = await User.findAll({
      where: { id: { [Op.in]: overallUserIds } },
      attributes: ['id', 'name', 'email', 'avatar'],
      include: [{ model: Role, as: 'role', attributes: ['id', 'name', 'level'] }]
    });
    const oMap = {};
    overallUsers.forEach(u => { oMap[u.id] = u; });

    let overallTotalCompanyRev = 0;
    overallSalesGroup.forEach(g => {
      overallTotalCompanyRev += parseFloat(g.totalRevenue) || 0;
    });

    const overallTop3 = overallSalesGroup.map((item, idx) => {
      const u = oMap[item.assignedTo];
      const sCount = parseInt(item.salesCount, 10) || 0;
      const totRev = parseFloat(item.totalRevenue) || 0;
      const avgDeal = sCount > 0 ? Math.round(totRev / sCount) : 0;
      return {
        rank: idx + 1,
        userId: item.assignedTo,
        name: u ? u.name : 'Unknown Staff',
        email: u ? u.email : '',
        avatar: u ? u.avatar : null,
        role: u?.role?.name || 'Sales Staff',
        salesCount: sCount,
        totalRevenue: totRev,
        baseRevenue: parseFloat(item.baseRevenue) || 0,
        avgDealValue: avgDeal,
        revenueShare: overallTotalCompanyRev > 0 ? Math.round((totRev / overallTotalCompanyRev) * 100) : 0
      };
    });

    res.json({
      success: true,
      performersPreset,
      companyStats: {
        totalRevenue: companyTotalRevenue,
        totalDeals: companyTotalDeals,
        avgDealValue: companyTotalDeals > 0 ? Math.round(companyTotalRevenue / companyTotalDeals) : 0,
        activeSalesStaff: leaderboard.length
      },
      overallTop3,
      leaderboard
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;

