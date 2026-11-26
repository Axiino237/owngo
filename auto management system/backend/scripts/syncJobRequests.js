require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { sequelize } = require('../config/db');
const { JobRequest, JobRequestStatus, Organization, Lead } = require('../models');

async function syncAndSeed() {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL connected.');

    // Sync models
    await JobRequestStatus.sync({ alter: true });
    console.log('crm_job_request_statuses table synced.');
    await JobRequest.sync({ alter: true });
    console.log('crm_job_requests table synced.');

    // Find OwnGo organization
    const org = await Organization.findOne({ where: { code: 'OWNGO' } });
    const orgId = org ? org.id : null;

    const defaultStatuses = [
      { name: 'New Candidate', key: 'new', color: '#3b82f6', badgeClass: 'badge-info', order: 1, isDefault: true },
      { name: 'Phone Screening', key: 'screening', color: '#f59e0b', badgeClass: 'badge-warning', order: 2 },
      { name: 'Document Verification', key: 'doc_verification', color: '#8b5cf6', badgeClass: 'badge-info', order: 3 },
      { name: 'Loan Approved', key: 'loan_approved', color: '#10b981', badgeClass: 'badge-success', order: 4 },
      { name: 'Converted', key: 'converted', color: '#059669', badgeClass: 'badge-success', order: 5 },
      { name: 'Rejected', key: 'rejected', color: '#ef4444', badgeClass: 'badge-danger', order: 6 },
    ];

    for (const s of defaultStatuses) {
      const [record, created] = await JobRequestStatus.findOrCreate({
        where: { key: s.key },
        defaults: {
          ...s,
          organizationId: orgId,
          isActive: true
        }
      });
      if (created) {
        console.log(`Created status: ${s.name}`);
      } else {
        console.log(`Status exists: ${s.name}`);
      }
    }

    // Also migrate any existing pilot leads from crm_leads to crm_job_requests if there are any
    const pilotLeads = await Lead.findAll({
      where: {
        [sequelize.Sequelize.Op.or]: [
          { leadType: 'pilot' },
          { source: { [sequelize.Sequelize.Op.iLike]: '%pilot%' } }
        ]
      }
    });

    console.log(`Found ${pilotLeads.length} pilot leads in crm_leads to migrate.`);
    for (const lead of pilotLeads) {
      // Check if already in JobRequest
      const existing = await JobRequest.findOne({ where: { phone: lead.phone } });
      if (!existing) {
        await JobRequest.create({
          name: lead.name || lead.companyName || 'Pilot Candidate',
          phone: lead.phone,
          email: lead.email,
          city: lead.city || 'Chennai',
          preferredArea: lead.preferredArea || lead.address,
          licenseType: lead.licenseType || 'Commercial 3-Wheeler Auto Badge',
          experience: lead.experience || '2 to 5 Years',
          source: lead.source || 'Website Pilot Form',
          sourceLink: lead.sourceLink,
          status: lead.status || 'new',
          notes: lead.notes,
          assignedTo: lead.assignedTo,
          organizationId: orgId,
          createdAt: lead.createdAt
        });
        console.log(`Migrated pilot candidate: ${lead.name || lead.phone}`);
      }
    }

    console.log('✅ Sync and seed completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error during sync and seed:', err);
    process.exit(1);
  }
}

syncAndSeed();
