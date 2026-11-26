const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { LoanApplication, Lead, JobRequest, Organization, Company, sequelize } = require('../models');
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');

// Helper to clean phone to last 10 digits
function cleanPhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

// @desc    Sync / Webhook endpoint from Bajaj Loan App (Public with optional API Key or open within network)
// @route   POST /api/loan-applications/sync
router.post('/sync', async (req, res) => {
  try {
    const {
      applicationId,
      applicantFullName,
      mobileNumber,
      panNumber,
      status,
      eligibility,
      formData = {},
      lockedByAdminName,
      completedByAdminName,
      completedAt
    } = req.body;

    if (!applicationId || !mobileNumber) {
      return res.status(400).json({ success: false, message: 'applicationId and mobileNumber are required' });
    }

    // Extract useful fields from formData if present
    const personal = formData.personal || {};
    const vehicle = formData.vehicle || {};
    const occupation = formData.occupation || {};
    const address = formData.address || {};

    const fullName = applicantFullName || personal.applicant_full_name || 'Valued Applicant';
    const mobile = mobileNumber || personal.mobile_number || '';
    const pan = (panNumber || formData?.kyc?.pan_number || '').toUpperCase();
    const model = vehicle.model || null;
    const price = vehicle.on_road_price ? parseFloat(vehicle.on_road_price) : null;
    const income = occupation.gross_monthly_income ? parseFloat(occupation.gross_monthly_income) : null;
    const city = address.city || null;
    const state = address.state || null;

    let loanApp = await LoanApplication.findOne({ where: { applicationId } });

    // Reviewer / Underwriter tracking
    let reviewerName = null;
    if (status === 'WORK_IN_PROGRESS') {
      reviewerName = lockedByAdminName || completedByAdminName || (loanApp ? loanApp.underwriterName : null) || 'Bajaj Underwriter';
    } else if (status === 'COMPLETED') {
      reviewerName = completedByAdminName || lockedByAdminName || (loanApp ? loanApp.underwriterName : null) || 'Underwriter';
    } else if (status === 'NEW') {
      reviewerName = null; // Lock released
    }

    if (!loanApp) {
      loanApp = await LoanApplication.create({
        applicationId,
        applicantFullName: fullName,
        mobileNumber: mobile,
        panNumber: pan,
        status: status || 'NEW',
        eligibility: eligibility || 'PENDING',
        vehicleModel: model,
        onRoadPrice: price,
        monthlyIncome: income,
        city,
        state,
        underwriterName: reviewerName,
        completedAt: completedAt ? new Date(completedAt) : null,
        formData
      });
    } else {
      loanApp.applicantFullName = fullName;
      loanApp.mobileNumber = mobile;
      loanApp.panNumber = pan;
      if (status) {
        loanApp.status = status;
        if (status === 'NEW') {
          loanApp.underwriterName = null;
        } else if (reviewerName) {
          loanApp.underwriterName = reviewerName;
        }
      }
      if (eligibility) loanApp.eligibility = eligibility;
      if (model) loanApp.vehicleModel = model;
      if (price) loanApp.onRoadPrice = price;
      if (income) loanApp.monthlyIncome = income;
      if (city) loanApp.city = city;
      if (state) loanApp.state = state;
      if (completedByAdminName) loanApp.underwriterName = completedByAdminName;
      if (completedAt) loanApp.completedAt = new Date(completedAt);
      if (formData && Object.keys(formData).length > 0) loanApp.formData = formData;
      await loanApp.save();
    }

    // MATCHING & INVESTED STATUS LOGIC:
    // Only promote to Fleet Partner ('Invested') IF the candidate or lead is ALREADY confirmed/converted!
    // If candidate is still in screening/new/pending, loan eligibility is recorded but candidate is not promoted yet.
    const isEligible = String(loanApp.eligibility).toUpperCase() === 'YES';
    let matchedLead = null;

    if (isEligible) {
      const targetPhoneDigits = cleanPhone(mobile);
      if (targetPhoneDigits.length >= 10) {
        // Find existing leads
        const allLeads = await Lead.findAll();
        matchedLead = allLeads.find(l => {
          const lDigits = cleanPhone(l.phone);
          return lDigits && lDigits === targetPhoneDigits;
        });

        // Also check JobRequest candidates
        const allJobRequests = await JobRequest.findAll();
        const matchedJob = allJobRequests.find(j => {
          const jDigits = cleanPhone(j.phone);
          return jDigits && jDigits === targetPhoneDigits;
        });

        const isJobConverted = matchedJob && (matchedJob.status || '').toLowerCase() === 'converted';
        const isLeadConverted = matchedLead && ['converted', 'invested'].includes((matchedLead.status || '').toLowerCase());

        if (isJobConverted || isLeadConverted) {
          const autoCount = matchedLead?.autosCount || matchedJob?.autosCount || 1;
          const capitalVal = autoCount * 100000;
          const origSource = (matchedJob && matchedJob.source) ? matchedJob.source : ((matchedLead && matchedLead.source) ? matchedLead.source : 'Direct Website');
          const origSourceLink = (matchedJob && matchedJob.sourceLink) ? matchedJob.sourceLink : ((matchedLead && matchedLead.sourceLink) ? matchedLead.sourceLink : null);

          if (matchedLead) {
            matchedLead.status = 'Invested';
            matchedLead.autosCount = autoCount;
            matchedLead.value = capitalVal;
            matchedLead.totalValue = capitalVal;
            if (origSource && origSource !== 'Direct Website') matchedLead.source = origSource;
            if (origSourceLink) matchedLead.sourceLink = origSourceLink;
            matchedLead.cibilScore = matchedLead.cibilScore || '750+ (Loan Verified)';
            if (model && !matchedLead.notes) matchedLead.notes = `Bajaj Loan Approved: ${model} (App ID: ${applicationId})`;
            await matchedLead.save();

            loanApp.leadId = matchedLead.id;
            await loanApp.save();
          } else if (matchedJob) {
            const newLead = await Lead.create({
              name: matchedJob.name || fullName,
              phone: matchedJob.phone || mobile,
              email: matchedJob.email || personal.email_address || null,
              city: matchedJob.city || city || 'Chennai',
              status: 'Invested',
              source: origSource,
              sourceLink: origSourceLink,
              leadType: 'partner',
              autosCount: autoCount,
              value: capitalVal,
              totalValue: capitalVal,
              cibilScore: '750+ (Loan Verified)',
              notes: `Converted from Job Request. Loan Approved: ${model || 'Bajaj EV Auto'} (App ID: ${applicationId})`
            });
            loanApp.leadId = newLead.id;
            await loanApp.save();
            matchedLead = newLead;
          }
        } else {
          // Candidate or lead exists but is NOT yet converted:
          // Keep their current pipeline stage (do NOT promote to Invested yet), but record CIBIL/Loan link
          if (matchedLead) {
            matchedLead.cibilScore = matchedLead.cibilScore || '750+ (Loan Verified)';
            await matchedLead.save();
            loanApp.leadId = matchedLead.id;
            await loanApp.save();
          }
        }
      }
    }

    // Broadcast live event via Socket.IO if available
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('loan_application:updated', {
          id: loanApp.id,
          applicationId: loanApp.applicationId,
          applicantFullName: loanApp.applicantFullName,
          mobileNumber: loanApp.mobileNumber,
          panNumber: loanApp.panNumber,
          status: loanApp.status,
          eligibility: loanApp.eligibility,
          underwriterName: loanApp.underwriterName,
          leadId: loanApp.leadId
        });
      }
    } catch (sErr) {
      console.warn('Socket broadcast warning:', sErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Loan application synced successfully',
      data: loanApp,
      leadUpdated: matchedLead ? { id: matchedLead.id, name: matchedLead.name, status: matchedLead.status } : null
    });
  } catch (error) {
    console.error('Error syncing loan application:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get all loan applications (with filters, pagination & export)
// @route   GET /api/loan-applications
router.get('/', protect, checkPermission('finance', 'loan-applications-list', 'canView'), async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, eligibility, export: isExport } = req.query;

    const where = {};
    if (status && status !== 'all') {
      where.status = status;
    }
    if (eligibility && eligibility !== 'all') {
      where.eligibility = eligibility;
    }
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      where[Op.or] = [
        { applicationId: { [Op.iLike]: q } },
        { applicantFullName: { [Op.iLike]: q } },
        { mobileNumber: { [Op.iLike]: q } },
        { panNumber: { [Op.iLike]: q } },
        { vehicleModel: { [Op.iLike]: q } },
        { city: { [Op.iLike]: q } }
      ];
    }

    if (isExport === 'true' || isExport === true) {
      const applications = await LoanApplication.findAll({
        where,
        order: [['createdAt', 'DESC']],
        limit: 10000,
        include: [{ model: Lead, as: 'lead', attributes: ['id', 'name', 'phone', 'status'] }]
      });

      const csvRows = [
        ['Application ID', 'Applicant Name', 'Mobile Number', 'PAN Number', 'Vehicle Model', 'On-Road Price', 'Eligibility', 'Status', 'Underwriter', 'Submission Date', 'Matched Lead Status'].join(',')
      ];

      applications.forEach(app => {
        csvRows.push([
          `"${app.applicationId || ''}"`,
          `"${(app.applicantFullName || '').replace(/"/g, '""')}"`,
          `"${app.mobileNumber || ''}"`,
          `"${app.panNumber || ''}"`,
          `"${app.vehicleModel || ''}"`,
          `"${app.onRoadPrice || 0}"`,
          `"${app.eligibility || 'PENDING'}"`,
          `"${app.status || 'NEW'}"`,
          `"${app.underwriterName || '—'}"`,
          `"${app.createdAt ? new Date(app.createdAt).toISOString().split('T')[0] : ''}"`,
          `"${app.lead ? app.lead.status : 'None'}"`
        ].join(','));
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=bajaj_loan_applications_${Date.now()}.csv`);
      return res.status(200).send(csvRows.join('\n'));
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const { count, rows } = await LoanApplication.findAndCountAll({
      where,
      limit: parseInt(limit, 10),
      offset,
      order: [['createdAt', 'DESC']],
      attributes: { exclude: ['formData'] },
      include: [{ model: Lead, as: 'lead', attributes: ['id', 'name', 'phone', 'status'] }]
    });

    return res.status(200).json({
      success: true,
      total: count,
      page: parseInt(page, 10),
      totalPages: Math.ceil(count / parseInt(limit, 10)),
      applications: rows
    });
  } catch (error) {
    console.error('Error fetching loan applications:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get loan applications statistics
// @route   GET /api/loan-applications/stats
router.get('/stats', protect, checkPermission('finance', 'loan-applications-list', 'canView'), async (req, res) => {
  try {
    const [total, eligible, ineligible, pending, newCount, workInProgress, completed] = await Promise.all([
      LoanApplication.count(),
      LoanApplication.count({ where: { eligibility: 'YES' } }),
      LoanApplication.count({ where: { eligibility: 'NO' } }),
      LoanApplication.count({ where: { eligibility: 'PENDING' } }),
      LoanApplication.count({ where: { status: 'NEW' } }),
      LoanApplication.count({ where: { status: 'WORK_IN_PROGRESS' } }),
      LoanApplication.count({ where: { status: 'COMPLETED' } })
    ]);

    return res.status(200).json({
      success: true,
      stats: { total, eligible, ineligible, pending, newCount, workInProgress, completed }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get single loan application details with full formData
// @route   GET /api/loan-applications/:id
router.get('/:id', protect, checkPermission('finance', 'loan-applications-list', 'canView'), async (req, res) => {
  try {
    const { id } = req.params;
    const isNum = !isNaN(id) && Number.isInteger(Number(id));
    const whereClause = isNum 
      ? { [Op.or]: [{ id: parseInt(id, 10) }, { applicationId: String(id) }] }
      : { applicationId: String(id) };

    const application = await LoanApplication.findOne({
      where: whereClause,
      include: [{ model: Lead, as: 'lead' }]
    });

    if (!application) {
      return res.status(404).json({ success: false, message: 'Loan application not found' });
    }
    return res.status(200).json({ success: true, application });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Update eligibility manually from CRM
// @route   PATCH /api/loan-applications/:id/eligibility
router.patch('/:id/eligibility', protect, checkPermission('finance', 'loan-application-edit', 'canEdit'), async (req, res) => {
  try {
    const { eligibility, decisionNotes } = req.body;
    if (!['YES', 'NO', 'PENDING'].includes(eligibility)) {
      return res.status(400).json({ success: false, message: 'Eligibility must be YES, NO, or PENDING' });
    }

    const app = await LoanApplication.findByPk(req.params.id);
    if (!app) return res.status(404).json({ success: false, message: 'Loan application not found' });

    app.eligibility = eligibility;
    app.status = 'COMPLETED';
    app.underwriterName = req.user?.name || 'CRM Admin';
    app.completedAt = new Date();
    await app.save();

    // Trigger Invested matching ONLY IF set to YES AND candidate/lead is already converted
    let matchedLead = null;
    if (eligibility === 'YES') {
      const targetPhoneDigits = cleanPhone(app.mobileNumber);
      if (targetPhoneDigits.length >= 10) {
        const allLeads = await Lead.findAll();
        matchedLead = allLeads.find(l => cleanPhone(l.phone) === targetPhoneDigits);

        const allJobRequests = await JobRequest.findAll();
        const matchedJob = allJobRequests.find(j => cleanPhone(j.phone) === targetPhoneDigits);

        const isJobConverted = matchedJob && (matchedJob.status || '').toLowerCase() === 'converted';
        const isLeadConverted = matchedLead && ['converted', 'invested'].includes((matchedLead.status || '').toLowerCase());

        if (isJobConverted || isLeadConverted) {
          const autoCount = matchedLead?.autosCount || matchedJob?.autosCount || 1;
          const capitalVal = autoCount * 100000;
          const origSource = (matchedJob && matchedJob.source) ? matchedJob.source : ((matchedLead && matchedLead.source) ? matchedLead.source : 'Direct Website');
          const origSourceLink = (matchedJob && matchedJob.sourceLink) ? matchedJob.sourceLink : ((matchedLead && matchedLead.sourceLink) ? matchedLead.sourceLink : null);

          if (matchedLead) {
            matchedLead.status = 'Invested';
            matchedLead.autosCount = autoCount;
            matchedLead.value = capitalVal;
            matchedLead.totalValue = capitalVal;
            if (origSource && origSource !== 'Direct Website') matchedLead.source = origSource;
            if (origSourceLink) matchedLead.sourceLink = origSourceLink;
            matchedLead.cibilScore = matchedLead.cibilScore || '750+ (Loan Verified)';
            await matchedLead.save();
            app.leadId = matchedLead.id;
            await app.save();
          } else if (matchedJob) {
            const newLead = await Lead.create({
              name: matchedJob.name || app.applicantFullName,
              phone: matchedJob.phone || app.mobileNumber,
              email: matchedJob.email || null,
              city: matchedJob.city || app.city || 'Chennai',
              status: 'Invested',
              source: origSource,
              sourceLink: origSourceLink,
              leadType: 'partner',
              autosCount: autoCount,
              value: capitalVal,
              totalValue: capitalVal,
              cibilScore: '750+ (Loan Verified)',
              notes: `Converted from Job Request. Loan Approved (App ID: ${app.applicationId})`
            });
            app.leadId = newLead.id;
            await app.save();
            matchedLead = newLead;
          }
        } else if (matchedLead) {
          matchedLead.cibilScore = matchedLead.cibilScore || '750+ (Loan Verified)';
          await matchedLead.save();
          app.leadId = matchedLead.id;
          await app.save();
        }
      }
    }

    // Two-Way Sync to Bajaj Loan Backend (if reachable)
    try {
      const bajajApiUrl = process.env.BAJAJ_API_URL || 'http://127.0.0.1:3001/api/applications';
      await fetch(`${bajajApiUrl}/${app.applicationId}/eligibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eligibility: app.eligibility,
          adminId: 'CRM_ADMIN',
          adminName: req.user?.name || 'CRM Director'
        })
      });
    } catch (syncErr) {
      console.log('Notice: Bajaj two-way sync for eligibility:', syncErr.message);
    }

    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('loan_application:updated', {
          id: app.id,
          applicationId: app.applicationId,
          status: app.status,
          eligibility: app.eligibility,
          underwriterName: app.underwriterName,
          leadId: app.leadId
        });
      }
    } catch (sErr) {}

    return res.status(200).json({
      success: true,
      message: `Eligibility updated to ${eligibility}`,
      application: app,
      matchedLead
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Update workflow status manually from CRM (NEW -> WORK_IN_PROGRESS -> COMPLETED)
// @route   PATCH /api/loan-applications/:id/status
router.patch('/:id/status', protect, checkPermission('finance', 'loan-application-edit', 'canEdit'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['NEW', 'WORK_IN_PROGRESS', 'COMPLETED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be NEW, WORK_IN_PROGRESS, or COMPLETED' });
    }

    const app = await LoanApplication.findByPk(req.params.id);
    if (!app) return res.status(404).json({ success: false, message: 'Loan application not found' });

    app.status = status;
    if (status === 'COMPLETED') {
      app.completedAt = new Date();
    }
    await app.save();

    // Two-Way Sync to Bajaj Loan Backend
    try {
      const bajajApiUrl = process.env.BAJAJ_API_URL || 'http://127.0.0.1:3001/api/applications';
      await fetch(`${bajajApiUrl}/${app.applicationId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          adminId: 'CRM_ADMIN',
          adminName: req.user?.name || 'CRM Director'
        })
      });
    } catch (syncErr) {
      console.log('Notice: Bajaj two-way sync for status:', syncErr.message);
    }

    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('loan_application:updated', {
          id: app.id,
          applicationId: app.applicationId,
          status: app.status,
          eligibility: app.eligibility,
          underwriterName: app.underwriterName,
          leadId: app.leadId
        });
      }
    } catch (sErr) {}

    return res.status(200).json({
      success: true,
      message: `Workflow status updated to ${status}`,
      application: app
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
