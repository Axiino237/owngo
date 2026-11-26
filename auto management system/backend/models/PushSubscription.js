const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const PushSubscription = sequelize.define('PushSubscription', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'crm_users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  endpoint: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  p256dh: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  auth: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  userAgent: {
    type: DataTypes.STRING,
    allowNull: true
  },
  deviceType: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'crm_push_subscriptions',
  timestamps: true,
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['endpoint']
    }
  ]
});

module.exports = PushSubscription;
