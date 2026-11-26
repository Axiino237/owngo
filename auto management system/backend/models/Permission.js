const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Permission = sequelize.define('Permission', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  roleId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  module: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  screen: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  canView: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  canCreate: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  canEdit: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  canDelete: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'crm_permissions',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['roleId', 'module', 'screen'] }
  ]
});

module.exports = Permission;
