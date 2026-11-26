const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { connectDB, sequelize } = require('../config/db');
const { Role, Permission } = require('../models');

const NEW_SCREENS = [
  'closed-sales-total-value',
  'closed-sales-gst-view',
  'closed-sales-tds-view'
];

const migrate = async () => {
  await connectDB();
  console.log('🔄 Running migration for Account team GST, TDS, Total Value columns & UAM permissions...\n');

  // Step 1: Add columns to crm_leads table
  console.log('📦 Step 1: Adding columns to crm_leads table...');
  await sequelize.query('ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS "applyGst" BOOLEAN DEFAULT false');
  await sequelize.query('ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS "applyTds" BOOLEAN DEFAULT false');
  await sequelize.query('ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS "gstAmount" DECIMAL(12, 2) DEFAULT 0.00');
  await sequelize.query('ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS "tdsAmount" DECIMAL(12, 2) DEFAULT 0.00');
  await sequelize.query('ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS "totalValue" DECIMAL(12, 2) DEFAULT NULL');
  console.log('  ✅ Columns added to crm_leads successfully!');

  // Step 2: Add new ENUM values to enum_crm_permissions_screen
  console.log('\n🛡️ Step 2: Adding ENUM values to enum_crm_permissions_screen...');
  for (const val of NEW_SCREENS) {
    try {
      await sequelize.query(
        `DO $$ BEGIN
           IF NOT EXISTS (
             SELECT 1 FROM pg_enum
             WHERE enumlabel = '${val}'
             AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_crm_permissions_screen')
           ) THEN
             ALTER TYPE "enum_crm_permissions_screen" ADD VALUE '${val}';
           END IF;
         END $$;`
      );
      console.log(`  ✅ ENUM value added: ${val}`);
    } catch (err) {
      console.log(`  ⚠️  Skipping ENUM '${val}': ${err.message}`);
    }
  }

  // Step 3: Seed permissions for all roles
  const roles = await Role.findAll();
  console.log(`\n📋 Found ${roles.length} roles — seeding permissions...\n`);

  for (const role of roles) {
    const isHighRole = role.code === 'SUPER_ADMIN' ||
                       role.level === 'super_admin' ||
                       role.level === 'admin' ||
                       role.name?.toLowerCase().includes('admin') ||
                       role.name?.toLowerCase().includes('manager');

    for (const screen of NEW_SCREENS) {
      const [perm, created] = await Permission.findOrCreate({
        where: { roleId: role.id, module: 'closed_sales', screen },
        defaults: {
          roleId: role.id,
          module: 'closed_sales',
          screen,
          canView: isHighRole,
          canCreate: false,
          canEdit: isHighRole,
          canDelete: false
        }
      });

      if (created) {
        console.log(`  ➕ Added [${screen}] to role [${role.name}] (canView: ${isHighRole})`);
      } else {
        console.log(`  ✓  [${screen}] already exists for role [${role.name}]`);
      }
    }
  }

  console.log('\n🎉 Migration completed successfully!');
  process.exit(0);
};

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
