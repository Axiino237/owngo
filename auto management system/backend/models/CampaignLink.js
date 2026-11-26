const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const CampaignLink = sequelize.define('CampaignLink', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  target: {
    type: DataTypes.STRING(50),
    defaultValue: 'Leads' // 'Leads' | 'EV Pilots' | 'Home'
  },
  targetBadge: {
    type: DataTypes.STRING(50),
    defaultValue: 'badge-success'
  },
  url: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  isOfficial: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  createdById: {
    type: DataTypes.UUID,
    allowNull: true
  },
  organizationId: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'crm_campaign_links',
  timestamps: true
});

module.exports = CampaignLink;
