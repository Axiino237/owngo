const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const JobRequestStatus = sequelize.define('JobRequestStatus', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  key: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  color: {
    type: DataTypes.STRING(50),
    defaultValue: '#06b6d4'
  },
  badgeClass: {
    type: DataTypes.STRING(50),
    defaultValue: 'badge-info'
  },
  order: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isSystem: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  organizationId: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'crm_job_request_statuses',
  timestamps: true
});

module.exports = JobRequestStatus;
