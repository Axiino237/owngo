require('dotenv').config();
const { connectDB, sequelize } = require('./config/db');
const { User, Role, Permission, Organization, LeadStatus, JobRequestStatus, CampaignLink } = require('./models');

const ALL_PERMISSIONS = [
  { module: 'dashboard', screen: 'dashboard-home' },
  { module: 'dashboard', screen: 'leads-widget' },
  { module: 'dashboard', screen: 'calls-widget' },
  { module: 'dashboard', screen: 'interested-leads-widget' },
  { module: 'dashboard', screen: 'projects-widget' },
  { module: 'dashboard', screen: 'pending-projects-widget' },
  { module: 'dashboard', screen: 'completed-projects-widget' },
  { module: 'dashboard', screen: 'total-profit-card' },
  { module: 'dashboard', screen: 'monthly-profit-card' },
  { module: 'dashboard', screen: 'deductions-card' },
  { module: 'dashboard', screen: 'profit-trend-chart' },
  { module: 'dashboard', screen: 'recent-leads-list' },
  { module: 'dashboard', screen: 'recent-projects-list' },
  { module: 'dashboard', screen: 'org-overview' },
  { module: 'dashboard', screen: 'system-overview' },
  { module: 'uam', screen: 'users-list' },
  { module: 'uam', screen: 'user-create' },
  { module: 'uam', screen: 'user-edit' },
  { module: 'uam', screen: 'audit-logs-list' },
  { module: 'uam', screen: 'status-master' },
  { module: 'roles', screen: 'roles-list' },
  { module: 'roles', screen: 'role-create' },
  { module: 'roles', screen: 'role-edit' },
  { module: 'permissions', screen: 'permissions-list' },
  { module: 'permissions', screen: 'permission-edit' },
  { module: 'organizations', screen: 'organizations-list' },
  { module: 'organizations', screen: 'organization-create' },
  { module: 'organizations', screen: 'organization-edit' },
  { module: 'companies', screen: 'companies-list' },
  { module: 'companies', screen: 'company-create' },
  { module: 'companies', screen: 'company-edit' },
  { module: 'departments', screen: 'departments-list' },
  { module: 'departments', screen: 'department-create' },
  { module: 'departments', screen: 'department-edit' },
  { module: 'leads', screen: 'leads-list' },
  { module: 'leads', screen: 'lead-create' },
  { module: 'leads', screen: 'lead-edit' },
  { module: 'leads', screen: 'lead-delete' },
  { module: 'jobs', screen: 'job-requests-list' },
  { module: 'jobs', screen: 'job-request-create' },
  { module: 'jobs', screen: 'job-request-edit' },
  { module: 'jobs', screen: 'job-request-delete' },
  { module: 'tools', screen: 'link-generator' }
];

async function seedAll() {
  await connectDB();
  console.log('🌱 Seeding OwnGo CRM...');

  // 1. Organization
  let [org] = await Organization.findOrCreate({
    where: { code: 'OWNGO' },
    defaults: {
      name: 'OwnGo Commercial EV Fleet',
      code: 'OWNGO',
      isActive: true
    }
  });
  console.log(`✅ Organization initialized: ${org.name} (ID: ${org.id})`);

  // 2. Roles
  let [superAdminRole] = await Role.findOrCreate({
    where: { code: 'SUPER_ADMIN' },
    defaults: {
      name: 'Super Admin',
      description: 'System-level Super Administrator',
      level: 'super_admin',
      isSystem: true,
      isActive: true
    }
  });

  // 3. Permissions
  for (const perm of ALL_PERMISSIONS) {
    await Permission.findOrCreate({
      where: { roleId: superAdminRole.id, module: perm.module, screen: perm.screen },
      defaults: {
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true
      }
    });
  }
  console.log('✅ Permissions seeded');

  // 4. Super Admin User
  let [user] = await User.findOrCreate({
    where: { email: process.env.SUPER_ADMIN_EMAIL || 'superadmin@crm.com' },
    defaults: {
      name: process.env.SUPER_ADMIN_NAME || 'Super Admin',
      password: process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123',
      roleId: superAdminRole.id,
      organizationId: org.id,
      isSuperAdmin: true,
      isActive: true
    }
  });
  // Update organizationId in case it was null
  if (!user.organizationId) {
    user.organizationId = org.id;
    await user.save();
  }
  console.log(`✅ Super Admin ready: ${user.email}`);

  // 5. Lead Statuses
  const defaultLeadStatuses = [
    { key: 'new', name: 'New Lead', color: '#3B82F6', order: 1, isDefault: true },
    { key: 'contacted', name: 'Contacted', color: '#EAB308', order: 2 },
    { key: 'meeting', name: 'Pitch / Meeting', color: '#8B5CF6', order: 3 },
    { key: 'interested', name: 'Interested', color: '#10B981', order: 4 },
    { key: 'converted', name: 'Partner Onboarded', color: '#059669', order: 5 },
    { key: 'lost', name: 'Lost / Dropped', color: '#EF4444', order: 6 }
  ];
  for (const st of defaultLeadStatuses) {
    await LeadStatus.findOrCreate({
      where: { key: st.key, organizationId: org.id },
      defaults: { ...st, organizationId: org.id }
    });
  }
  console.log('✅ Lead statuses seeded');

  // 6. Job Request Statuses
  const defaultJobStatuses = [
    { key: 'new', name: 'New Application', color: '#3B82F6', order: 1, isDefault: true },
    { key: 'interview_scheduled', name: 'Interview Scheduled', color: '#EAB308', order: 2 },
    { key: 'background_check', name: 'Verification', color: '#8B5CF6', order: 3 },
    { key: 'onboarded', name: 'Onboarded Pilot', color: '#059669', order: 4 },
    { key: 'rejected', name: 'Rejected', color: '#EF4444', order: 5 }
  ];
  for (const jst of defaultJobStatuses) {
    await JobRequestStatus.findOrCreate({
      where: { key: jst.key, organizationId: org.id },
      defaults: { ...jst, organizationId: org.id }
    });
  }
  console.log('✅ Job Request statuses seeded');

  console.log('🎉 All seeds completed successfully!');
  await sequelize.close();
}

seedAll().catch(e => {
  console.error('❌ Seeder error:', e);
  process.exit(1);
});
