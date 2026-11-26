require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sequelize } = require('../config/db');

async function main() {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully.');
    const [cols] = await sequelize.query(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'crm_leads'
      ORDER BY ordinal_position;
    `);
    console.log('crm_leads columns:');
    cols.forEach(c => console.log(` - ${c.column_name}: ${c.data_type} (${c.udt_name})`));
    process.exit(0);
  } catch (err) {
    console.error('Database query error:', err.message);
    process.exit(1);
  }
}

main();
