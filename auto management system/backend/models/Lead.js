const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Lead = sequelize.define('Lead', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  companyName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  email: DataTypes.STRING,
  phone: DataTypes.STRING,
  status: {
    type: DataTypes.STRING(100),
    defaultValue: 'new'
  },
  source: {
    type: DataTypes.STRING(255),
    defaultValue: 'Direct Website'
  },
  sourceLink: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  leadType: {
    type: DataTypes.STRING(50),
    defaultValue: 'partner' // 'partner' | 'pilot' | 'general'
  },
  autosCount: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  cibilScore: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  licenseType: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  preferredArea: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  experience: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  expo: {
    type: DataTypes.STRING,
    defaultValue: 'other'
  },
  value: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00
  },
  notes: DataTypes.TEXT,
  designation: DataTypes.STRING,
  expoType: DataTypes.STRING,
  expoName: DataTypes.STRING,
  address: DataTypes.TEXT,
  expoMode: DataTypes.STRING,
  lastContactedDate: DataTypes.DATEONLY,
  nextFollowUp: DataTypes.DATEONLY,
  alternatePhone: DataTypes.STRING,
  expoDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  productionDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  expoId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'crm_expos', key: 'id' }
  },
  assignedTo: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'crm_users', key: 'id' }
  },
  organizationId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'crm_organizations', key: 'id' }
  },
  paidAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00
  },
  vendorPaidAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00
  },
  applyGst: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  applyTds: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  gstAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00
  },
  tdsAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00
  },
  totalValue: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: null
  },
  designStatus: {
    type: DataTypes.ENUM('pending', 'completed', 'change'),
    defaultValue: 'pending'
  }
}, {
  tableName: 'crm_leads',
  timestamps: true
});

module.exports = Lead;
