const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const JobRequest = sequelize.define('JobRequest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  city: {
    type: DataTypes.STRING(100),
    defaultValue: 'Chennai'
  },
  preferredArea: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  licenseType: {
    type: DataTypes.STRING(150),
    defaultValue: 'Commercial 3-Wheeler Auto Badge'
  },
  experience: {
    type: DataTypes.STRING(150),
    defaultValue: '2 to 5 Years'
  },
  source: {
    type: DataTypes.STRING(255),
    defaultValue: 'Website Pilot Form'
  },
  sourceLink: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(100),
    defaultValue: 'new'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  lastContactedDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  nextFollowUp: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  assignedTo: {
    type: DataTypes.UUID,
    allowNull: true
  },
  organizationId: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'crm_job_requests',
  timestamps: true
});

module.exports = JobRequest;
