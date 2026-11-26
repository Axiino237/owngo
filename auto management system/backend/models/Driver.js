const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/db');

const Driver = sequelize.define('Driver', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  alternatePhone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // ── Driving License & Compliance (Key Alert Fields) ──
  licenseNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'e.g. TN09 20180004561'
  },
  licenseType: {
    type: DataTypes.STRING,
    defaultValue: 'Commercial 3-Wheeler Transport',
    allowNull: true
  },
  licenseExpiryDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Driving License Expiry Date - Critical alert trigger'
  },
  badgeNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Public Transport Driver Badge Number'
  },
  badgeExpiryDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  policeVerificationStatus: {
    type: DataTypes.ENUM('verified', 'pending', 'rejected', 'expired'),
    defaultValue: 'verified'
  },
  policeVerificationExpiryDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  medicalFitnessExpiryDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  aadharNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  emergencyContactName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  emergencyContactPhone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'on_duty', 'on_leave', 'suspended', 'blacklisted'),
    defaultValue: 'active'
  },
  // ── Auto Assignment ──
  assignedAutoId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  assignedAutoNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  totalTrips: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  rating: {
    type: DataTypes.FLOAT,
    defaultValue: 5.0
  },
  photoUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  organizationId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  companyId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'drivers',
  timestamps: true,
  indexes: [
    { fields: ['phone'] },
    { fields: ['licenseNumber'] },
    { fields: ['licenseExpiryDate'] },
    { fields: ['status'] },
    { fields: ['assignedAutoId'] }
  ]
});

/**
 * Real-time alert computation for driver license and certifications
 */
Driver.computeAlerts = function (driver) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checkDoc = (dateStr, docLabel) => {
    if (!dateStr) return null;
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        key: docLabel,
        status: 'expired',
        days: Math.abs(diffDays),
        label: `${docLabel} EXPIRED ${Math.abs(diffDays)} day(s) ago!`,
        date: dateStr,
        severity: 'danger'
      };
    } else if (diffDays <= 30) {
      return {
        key: docLabel,
        status: 'expiring_soon',
        days: diffDays,
        label: `${docLabel} expires in ${diffDays} day(s)`,
        date: dateStr,
        severity: diffDays <= 7 ? 'danger' : 'warning'
      };
    }
    return {
      key: docLabel,
      status: 'valid',
      days: diffDays,
      label: `${docLabel} Valid (${diffDays} days left)`,
      date: dateStr,
      severity: 'success'
    };
  };

  const docs = [
    checkDoc(driver.licenseExpiryDate, 'Driving License'),
    checkDoc(driver.badgeExpiryDate, 'Auto Badge'),
    checkDoc(driver.policeVerificationExpiryDate, 'Police Clearance'),
    checkDoc(driver.medicalFitnessExpiryDate, 'Medical Fitness')
  ].filter(Boolean);

  const expiredList = docs.filter(d => d.status === 'expired');
  const expiringSoonList = docs.filter(d => d.status === 'expiring_soon');

  let overallStatus = 'valid';
  if (expiredList.length > 0) overallStatus = 'expired';
  else if (expiringSoonList.length > 0) overallStatus = 'expiring_soon';

  return {
    overallStatus,
    hasExpired: expiredList.length > 0,
    hasExpiringSoon: expiringSoonList.length > 0,
    isLicenseExpired: expiredList.some(d => d.key === 'Driving License'),
    isLicenseExpiringSoon: expiringSoonList.some(d => d.key === 'Driving License'),
    expiredCount: expiredList.length,
    expiringSoonCount: expiringSoonList.length,
    expiredDocs: expiredList,
    expiringSoonDocs: expiringSoonList,
    allDocs: docs
  };
};

module.exports = Driver;
