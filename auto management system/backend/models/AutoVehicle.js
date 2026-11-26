const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/db');

const AutoVehicle = sequelize.define('AutoVehicle', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  autoNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Registration / Plate Number e.g. TN-09-AB-1234'
  },
  vehicleType: {
    type: DataTypes.STRING,
    defaultValue: 'EV Auto',
    allowNull: false,
    comment: 'EV Auto, Electric Rickshaw, CNG Auto, etc.'
  },
  make: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'e.g. Mahindra, Piaggio, Bajaj, Montra Electric'
  },
  model: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'e.g. Treo, Ape E-City, RE E-TEC 9.0'
  },
  manufacturingYear: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  chassisNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  motorNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Electric Motor / Engine Number'
  },
  batteryCapacityKwh: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Battery Pack capacity in kWh e.g. 7.5 or 10.2'
  },
  batteryType: {
    type: DataTypes.STRING,
    defaultValue: 'Lithium-ion',
    allowNull: true,
    comment: 'Lithium-ion, LFP, Swappable, Fixed'
  },
  batterySerialNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  rangePerChargeKm: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Expected real-world range per full charge in KM'
  },
  assignedDriverId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  assignedDriverName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  assignedDriverPhone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  driverLicenseNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // ── Live Telematics & Fleet Tracking ──
  currentLatitude: {
    type: DataTypes.FLOAT,
    defaultValue: 13.0418,
    allowNull: true
  },
  currentLongitude: {
    type: DataTypes.FLOAT,
    defaultValue: 80.2341,
    allowNull: true
  },
  currentLocationName: {
    type: DataTypes.STRING,
    defaultValue: 'T. Nagar, Chennai',
    allowNull: true
  },
  currentSpeedKm: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: true
  },
  batterySocPct: {
    type: DataTypes.INTEGER,
    defaultValue: 85,
    allowNull: true,
    comment: 'Battery charge percentage (0-100%)'
  },
  dailyDistanceKm: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    allowNull: true
  },
  lastTelemetryAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'charging', 'maintenance', 'idle', 'out_of_service'),
    defaultValue: 'active'
  },
  // ── Statutory & Expiry Tracking (Key Alert Fields) ──
  rcExpiryDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Registration Certificate Validity'
  },
  fitnessExpiryDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'FC (Fitness Certificate) Expiry Date'
  },
  insuranceExpiryDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Vehicle Insurance Expiry Date'
  },
  insurancePolicyNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  insuranceProvider: {
    type: DataTypes.STRING,
    allowNull: true
  },
  permitExpiryDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Auto-Rickshaw Stage Carrier / Contract Permit Expiry Date'
  },
  permitNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  pucExpiryDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Pollution / Green Fitness Clearance Expiry Date'
  },
  batteryWarrantyExpiryDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Battery Manufacturer Warranty Expiry Date'
  },
  roadTaxExpiryDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Road / Motor Vehicle Tax Expiry Date'
  },
  lastServiceDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  nextServiceDueDate: {
    type: DataTypes.DATEONLY,
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
  tableName: 'auto_vehicles',
  timestamps: true,
  indexes: [
    { fields: ['autoNumber'] },
    { fields: ['status'] },
    { fields: ['fitnessExpiryDate'] },
    { fields: ['insuranceExpiryDate'] },
    { fields: ['permitExpiryDate'] },
    { fields: ['rcExpiryDate'] }
  ]
});

/**
 * Helper to compute real-time document alerts for a vehicle record
 */
AutoVehicle.computeAlerts = function (vehicle) {
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
        label: `${docLabel} expired ${Math.abs(diffDays)} day(s) ago!`,
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
    checkDoc(vehicle.fitnessExpiryDate, 'Fitness (FC)'),
    checkDoc(vehicle.insuranceExpiryDate, 'Insurance'),
    checkDoc(vehicle.permitExpiryDate, 'Auto Permit'),
    checkDoc(vehicle.rcExpiryDate, 'RC Validity'),
    checkDoc(vehicle.pucExpiryDate, 'PUC / Green Fit'),
    checkDoc(vehicle.batteryWarrantyExpiryDate, 'Battery Warranty'),
    checkDoc(vehicle.roadTaxExpiryDate, 'Road Tax')
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
    expiredCount: expiredList.length,
    expiringSoonCount: expiringSoonList.length,
    expiredDocs: expiredList,
    expiringSoonDocs: expiringSoonList,
    allDocs: docs
  };
};

module.exports = AutoVehicle;
