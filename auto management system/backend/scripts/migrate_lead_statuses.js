require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sequelize } = require('../config/db');

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('Connected to PostgreSQL database.');

    // 1. Convert status column in crm_leads to VARCHAR(100) if it is still an ENUM
    console.log('Migrating crm_leads.status to VARCHAR...');
    await sequelize.query(`
      DO $$
      BEGIN
        BEGIN
          ALTER TABLE crm_leads ALTER COLUMN status DROP DEFAULT;
          ALTER TABLE crm_leads ALTER COLUMN status TYPE VARCHAR(100) USING status::text;
          ALTER TABLE crm_leads ALTER COLUMN status SET DEFAULT 'new';
        EXCEPTION
          WHEN others THEN
            RAISE NOTICE 'status alter skipped or already varchar: %', SQLERRM;
        END;
      END $$;
    `);

    // 2. Add columns to crm_leads
    console.log('Adding new columns to crm_leads...');
    await sequelize.query(`
      ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS source VARCHAR(255) DEFAULT 'Direct Website';
      ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS "sourceLink" TEXT;
      ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS "leadType" VARCHAR(50) DEFAULT 'partner';
      ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS "autosCount" INTEGER DEFAULT 1;
      ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS city VARCHAR(100);
      ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS "cibilScore" VARCHAR(100);
      ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS "licenseType" VARCHAR(150);
      ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS "preferredArea" VARCHAR(150);
      ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS experience VARCHAR(150);
    `);

    // 3. Create crm_lead_statuses table
    console.log('Creating crm_lead_statuses table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS crm_lead_statuses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        key VARCHAR(100) NOT NULL,
        color VARCHAR(50) DEFAULT '#06b6d4',
        "badgeClass" VARCHAR(50) DEFAULT 'badge-info',
        "order" INTEGER DEFAULT 0,
        "isDefault" BOOLEAN DEFAULT false,
        "isActive" BOOLEAN DEFAULT true,
        "organizationId" UUID REFERENCES crm_organizations(id) ON DELETE SET NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 4. Seed initial default statuses
    console.log('Seeding initial statuses if empty...');
    const [existing] = await sequelize.query(`SELECT count(*) FROM crm_lead_statuses;`);
    const count = parseInt(existing[0].count, 10);
    if (count === 0) {
      const defaultStatuses = [
        { name: 'New', key: 'new', color: '#06b6d4', badgeClass: 'badge-info', order: 1, isDefault: true },
        { name: 'Contacted', key: 'contacted', color: '#3b82f6', badgeClass: 'badge-info', order: 2, isDefault: false },
        { name: 'Requirement Received', key: 'requirement_received', color: '#8b5cf6', badgeClass: 'badge-purple', order: 3, isDefault: false },
        { name: 'Follow Ups', key: 'follow_ups', color: '#0ea5e9', badgeClass: 'badge-sky', order: 4, isDefault: false },
        { name: 'Call Back', key: 'call_back', color: '#6366f1', badgeClass: 'badge-indigo', order: 5, isDefault: false },
        { name: 'Number Busy', key: 'number_busy', color: '#fb923c', badgeClass: 'badge-warning', order: 6, isDefault: false },
        { name: 'Not Answering', key: 'not_answering', color: '#f59e0b', badgeClass: 'badge-warning', order: 7, isDefault: false },
        { name: 'Quote Sent', key: 'quote_sent', color: '#eab308', badgeClass: 'badge-yellow', order: 8, isDefault: false },
        { name: 'Document Verification', key: 'document_verification', color: '#14b8a6', badgeClass: 'badge-teal', order: 9, isDefault: false },
        { name: 'Loan Approved', key: 'loan_approved', color: '#10b981', badgeClass: 'badge-emerald', order: 10, isDefault: false },
        { name: 'Converted', key: 'converted', color: '#22c55e', badgeClass: 'badge-success', order: 11, isDefault: false },
        { name: 'Not Interested', key: 'not_interested', color: '#94a3b8', badgeClass: 'badge-secondary', order: 12, isDefault: false },
        { name: 'Not Participating', key: 'not_participating', color: '#f87171', badgeClass: 'badge-danger', order: 13, isDefault: false },
        { name: 'Lost', key: 'lost', color: '#ef4444', badgeClass: 'badge-danger', order: 14, isDefault: false }
      ];

      for (const st of defaultStatuses) {
        await sequelize.query(`
          INSERT INTO crm_lead_statuses (id, name, key, color, "badgeClass", "order", "isDefault", "isActive", "createdAt", "updatedAt")
          VALUES (gen_random_uuid(), :name, :key, :color, :badgeClass, :order, :isDefault, true, NOW(), NOW());
        `, { replacements: st });
      }
      console.log(`Seeded ${defaultStatuses.length} default lead statuses.`);
    } else {
      console.log(`crm_lead_statuses already has ${count} records.`);
    }

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
