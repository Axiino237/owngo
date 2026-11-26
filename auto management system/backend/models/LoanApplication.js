const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const LoanApplication = sequelize.define('LoanApplication', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  applicationId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  applicantFullName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  mobileNumber: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  panNumber: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'NEW' // 'NEW' | 'WORK_IN_PROGRESS' | 'COMPLETED' | 'REJECTED'
  },
  eligibility: {
    type: DataTypes.STRING(50),
    defaultValue: 'PENDING' // 'YES' | 'NO' | 'PENDING'
  },
  vehicleModel: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  onRoadPrice: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  loanAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  tenureMonths: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  monthlyIncome: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  state: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  underwriterName: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  formData: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  leadId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  organizationId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  companyId: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'crm_loan_applications',
  timestamps: true,
  indexes: [
    { fields: ['applicationId'], unique: true },
    { fields: ['mobileNumber'] },
    { fields: ['eligibility'] },
    { fields: ['status'] },
    { fields: ['leadId'] }
  ]
});

module.exports = LoanApplication;
