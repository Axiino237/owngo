const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { connectDB, sequelize } = require('../config/db');
const { Role, Permission } = require('../models');

const NEW_SCREENS = [
  'lead-edit-upload-date'
];

const migrate = async () => {
  await connectDB();
  console.log('🔄 Running migration for lead-edit-upload-date in UAM...\n');

  // Step 1: Add new ENUM values to enum_crm_permissions_screen in Postgres
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

  // Step 2: Seed permissions for all roles
  const roles = await Role.findAll();
  console.log(`\n📋 Found ${roles.length} roles — seeding lead-edit-upload-date permission...\n`);

  for (const role of roles) {
    const isSuperAdmin = role.code === 'SUPER_ADMIN' || role.level === 'super_admin';

    for (const screen of NEW_SCREENS) {
      const [perm, created] = await Permission.findOrCreate({
        where: { roleId: role.id, module: 'leads', screen },
        defaults: {
          roleId: role.id,
          module: 'leads',
          screen,
          canView: true,
          canCreate: false,
          canEdit: isSuperAdmin,
          canDelete: false
        }
      });

      if (created) {
        console.log(`  ➕ Added [${screen}] to role [${role.name}] (canEdit: ${isSuperAdmin})`);
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
