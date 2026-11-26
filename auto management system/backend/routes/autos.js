const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { AutoVehicle, Organization, Company, AuditLog } = require('../models');
const { protect } = require('../middleware/auth');

/**
 * ── Helper: Format Vehicle With Real-time Computed Alert Badges ──
 */
const formatVehicle = (v) => {
  const plain = v.toJSON ? v.toJSON() : { ...v };
  const alertInfo = AutoVehicle.computeAlerts(plain);
  return {
    ...plain,
    alerts: alertInfo
  };
};

/**
 * @route   GET /api/autos/stats
 * @desc    Get comprehensive fleet & compliance statistics
 * @access  Private
 */
router.get('/stats', protect, async (req, res) => {
  try {
    const where = {};
    if (!req.user.isSuperAdmin && req.user.organizationId) {
      where.organizationId = req.user.organizationId;
    }

    const allVehicles = await AutoVehicle.findAll({ where });
    const formatted = allVehicles.map(formatVehicle);

    const total = formatted.length;
    const active = formatted.filter(v => v.status === 'active').length;
    const charging = formatted.filter(v => v.status === 'charging').length;
    const maintenance = formatted.filter(v => v.status === 'maintenance').length;
    const idle = formatted.filter(v => v.status === 'idle').length;
    const evCount = formatted.filter(v => (v.vehicleType || '').toLowerCase().includes('ev') || (v.vehicleType || '').toLowerCase().includes('electric')).length;

    // Compliance alerts:
    const expiredCount = formatted.filter(v => v.alerts.hasExpired).length;
    const expiringSoonCount = formatted.filter(v => !v.alerts.hasExpired && v.alerts.hasExpiringSoon).length;
    const allValidCount = formatted.filter(v => v.alerts.overallStatus === 'valid').length;

    // Total expired document count across all vehicles
    const totalExpiredDocsCount = formatted.reduce((acc, v) => acc + v.alerts.expiredCount, 0);
    const totalExpiringSoonDocsCount = formatted.reduce((acc, v) => acc + v.alerts.expiringSoonCount, 0);

    res.json({
      success: true,
      stats: {
        total,
        active,
        charging,
        maintenance,
        idle,
        evCount,
        expiredCount,
        expiringSoonCount,
        allValidCount,
        totalExpiredDocsCount,
        totalExpiringSoonDocsCount
      }
    });
  } catch (err) {
    console.error('Error fetching auto stats:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch auto fleet stats' });
  }
});

/**
 * @route   GET /api/autos/alerts/urgent
 * @desc    Get list of urgent expired or expiring-soon documents
 * @access  Private
 */
router.get('/alerts/urgent', protect, async (req, res) => {
  try {
    const where = {};
    if (!req.user.isSuperAdmin && req.user.organizationId) {
      where.organizationId = req.user.organizationId;
    }

    const allVehicles = await AutoVehicle.findAll({ where, order: [['updatedAt', 'DESC']] });
    const urgentItems = [];

    for (const v of allVehicles) {
      const f = formatVehicle(v);
      if (f.alerts.hasExpired || f.alerts.hasExpiringSoon) {
        urgentItems.push({
          autoId: f.id,
          autoNumber: f.autoNumber,
          model: `${f.make || ''} ${f.model || ''}`.trim() || f.vehicleType,
          driverName: f.assignedDriverName || 'Unassigned',
          driverPhone: f.assignedDriverPhone || '',
          alerts: f.alerts
        });
      }
    }

    res.json({
      success: true,
      count: urgentItems.length,
      alerts: urgentItems
    });
  } catch (err) {
    console.error('Error fetching urgent auto alerts:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch urgent alerts' });
  }
});

/**
 * @route   GET /api/autos
 * @desc    Get auto fleet list with search, status & compliance filter
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const {
      search = '',
      status = 'all',
      vehicleType = 'all',
      compliance = 'all', // 'all' | 'expired' | 'expiring_soon' | 'valid'
      page = 1,
      limit = 100
    } = req.query;

    const where = {};
    if (!req.user.isSuperAdmin && req.user.organizationId) {
      where.organizationId = req.user.organizationId;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (vehicleType && vehicleType !== 'all') {
      where.vehicleType = vehicleType;
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      where[Op.or] = [
        { autoNumber: { [Op.iLike]: q } },
        { make: { [Op.iLike]: q } },
        { model: { [Op.iLike]: q } },
        { assignedDriverName: { [Op.iLike]: q } },
        { assignedDriverPhone: { [Op.iLike]: q } },
        { chassisNumber: { [Op.iLike]: q } },
        { motorNumber: { [Op.iLike]: q } },
        { insurancePolicyNumber: { [Op.iLike]: q } },
        { permitNumber: { [Op.iLike]: q } }
      ];
    }

    const vehicles = await AutoVehicle.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    let formatted = vehicles.map(formatVehicle);

    // Filter by compliance status if requested
    if (compliance === 'expired') {
      formatted = formatted.filter(v => v.alerts.hasExpired);
    } else if (compliance === 'expiring_soon') {
      formatted = formatted.filter(v => !v.alerts.hasExpired && v.alerts.hasExpiringSoon);
    } else if (compliance === 'valid') {
      formatted = formatted.filter(v => v.alerts.overallStatus === 'valid');
    }

    const total = formatted.length;
    const pageNum = Math.max(1, parseInt(page, 10));
    const pageSize = Math.max(1, parseInt(limit, 10));
    const paginated = formatted.slice((pageNum - 1) * pageSize, pageNum * pageSize);

    res.json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / pageSize) || 1,
      autos: paginated
    });
  } catch (err) {
    console.error('Error fetching autos:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch autos list' });
  }
});

/**
 * @route   GET /api/autos/:id
 * @desc    Get single auto details
 * @access  Private
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const auto = await AutoVehicle.findByPk(req.params.id);
    if (!auto) {
      return res.status(404).json({ success: false, message: 'Auto not found' });
    }
    res.json({ success: true, auto: formatVehicle(auto) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch auto details' });
  }
});

/**
 * @route   POST /api/autos
 * @desc    Create / Add new Auto into system
 * @access  Private
 */
router.post('/', protect, async (req, res) => {
  try {
    let {
      autoNumber,
      vehicleType = 'EV Auto',
      make,
      model,
      manufacturingYear,
      chassisNumber,
      motorNumber,
      batteryCapacityKwh,
      batteryType = 'Lithium-ion',
      batterySerialNumber,
      rangePerChargeKm,
      assignedDriverName,
      assignedDriverPhone,
      driverLicenseNumber,
      status = 'active',
      rcExpiryDate,
      fitnessExpiryDate,
      insuranceExpiryDate,
      insurancePolicyNumber,
      insuranceProvider,
      permitExpiryDate,
      permitNumber,
      pucExpiryDate,
      batteryWarrantyExpiryDate,
      roadTaxExpiryDate,
      lastServiceDate,
      nextServiceDueDate,
      remarks
    } = req.body;

    if (!autoNumber || !autoNumber.trim()) {
      return res.status(400).json({ success: false, message: 'Auto / Registration Number is required' });
    }

    // Clean & standardize registration number (e.g. TN-09-AB-1234)
    autoNumber = autoNumber.trim().toUpperCase().replace(/\s+/g, '-');

    // Check duplicate
    const existing = await AutoVehicle.findOne({ where: { autoNumber } });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `An auto with number "${autoNumber}" already exists in the system.`
      });
    }

    const created = await AutoVehicle.create({
      autoNumber,
      vehicleType: vehicleType || 'EV Auto',
      make: make?.trim() || null,
      model: model?.trim() || null,
      manufacturingYear: manufacturingYear ? parseInt(manufacturingYear, 10) : null,
      chassisNumber: chassisNumber?.trim() || null,
      motorNumber: motorNumber?.trim() || null,
      batteryCapacityKwh: batteryCapacityKwh ? parseFloat(batteryCapacityKwh) : null,
      batteryType: batteryType || 'Lithium-ion',
      batterySerialNumber: batterySerialNumber?.trim() || null,
      rangePerChargeKm: rangePerChargeKm ? parseInt(rangePerChargeKm, 10) : null,
      assignedDriverName: assignedDriverName?.trim() || null,
      assignedDriverPhone: assignedDriverPhone?.trim() || null,
      driverLicenseNumber: driverLicenseNumber?.trim() || null,
      status: status || 'active',
      rcExpiryDate: rcExpiryDate || null,
      fitnessExpiryDate: fitnessExpiryDate || null,
      insuranceExpiryDate: insuranceExpiryDate || null,
      insurancePolicyNumber: insurancePolicyNumber?.trim() || null,
      insuranceProvider: insuranceProvider?.trim() || null,
      permitExpiryDate: permitExpiryDate || null,
      permitNumber: permitNumber?.trim() || null,
      pucExpiryDate: pucExpiryDate || null,
      batteryWarrantyExpiryDate: batteryWarrantyExpiryDate || null,
      roadTaxExpiryDate: roadTaxExpiryDate || null,
      lastServiceDate: lastServiceDate || null,
      nextServiceDueDate: nextServiceDueDate || null,
      organizationId: req.user.organizationId || null,
      companyId: req.user.companyId || null,
      remarks: remarks?.trim() || null
    });

    // Record audit log
    try {
      await AuditLog.create({
        action: 'CREATE_AUTO',
        module: 'autos',
        userId: req.user.id,
        userEmail: req.user.email,
        details: `Added new auto ${autoNumber} (${created.vehicleType})`,
        ipAddress: req.ip
      });
    } catch (e) {}

    res.status(201).json({
      success: true,
      message: `Auto ${autoNumber} added successfully`,
      auto: formatVehicle(created)
    });
  } catch (err) {
    console.error('Error creating auto:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to create auto' });
  }
});

/**
 * @route   PUT /api/autos/:id
 * @desc    Update auto details or renew expiry dates
 * @access  Private
 */
router.put('/:id', protect, async (req, res) => {
  try {
    const auto = await AutoVehicle.findByPk(req.params.id);
    if (!auto) {
      return res.status(404).json({ success: false, message: 'Auto not found' });
    }

    let { autoNumber } = req.body;
    if (autoNumber) {
      autoNumber = autoNumber.trim().toUpperCase().replace(/\s+/g, '-');
      // If changing number, ensure no conflict
      if (autoNumber !== auto.autoNumber) {
        const conflict = await AutoVehicle.findOne({ where: { autoNumber } });
        if (conflict) {
          return res.status(400).json({ success: false, message: `Auto number "${autoNumber}" already exists` });
        }
      }
      req.body.autoNumber = autoNumber;
    }

    // Sanitize numeric fields
    if ('batteryCapacityKwh' in req.body) {
      req.body.batteryCapacityKwh = req.body.batteryCapacityKwh ? parseFloat(req.body.batteryCapacityKwh) : null;
    }
    if ('rangePerChargeKm' in req.body) {
      req.body.rangePerChargeKm = req.body.rangePerChargeKm ? parseInt(req.body.rangePerChargeKm, 10) : null;
    }
    if ('manufacturingYear' in req.body) {
      req.body.manufacturingYear = req.body.manufacturingYear ? parseInt(req.body.manufacturingYear, 10) : null;
    }

    // Clean empty date strings to null
    const dateFields = [
      'rcExpiryDate', 'fitnessExpiryDate', 'insuranceExpiryDate',
      'permitExpiryDate', 'pucExpiryDate', 'batteryWarrantyExpiryDate',
      'roadTaxExpiryDate', 'lastServiceDate', 'nextServiceDueDate'
    ];
    for (const f of dateFields) {
      if (f in req.body && (!req.body[f] || req.body[f] === '')) {
        req.body[f] = null;
      }
    }

    await auto.update(req.body);

    res.json({
      success: true,
      message: `Auto ${auto.autoNumber} updated successfully`,
      auto: formatVehicle(auto)
    });
  } catch (err) {
    console.error('Error updating auto:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to update auto' });
  }
});

/**
 * @route   DELETE /api/autos/:id
 * @desc    Delete auto from system
 * @access  Private
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    const auto = await AutoVehicle.findByPk(req.params.id);
    if (!auto) {
      return res.status(404).json({ success: false, message: 'Auto not found' });
    }

    const num = auto.autoNumber;
    await auto.destroy();

    // Audit log
    try {
      await AuditLog.create({
        action: 'DELETE_AUTO',
        module: 'autos',
        userId: req.user.id,
        userEmail: req.user.email,
        details: `Deleted auto ${num}`,
        ipAddress: req.ip
      });
    } catch (e) {}

    res.json({ success: true, message: `Auto ${num} deleted successfully` });
  } catch (err) {
    console.error('Error deleting auto:', err);
    res.status(500).json({ success: false, message: 'Failed to delete auto' });
  }
});

/**
 * @route   POST /api/autos/seed-defaults
 * @desc    Seeds realistic starter EV Autos if fleet is empty
 * @access  Private
 */
router.post('/seed-defaults', protect, async (req, res) => {
  try {
    const count = await AutoVehicle.count();
    if (count > 0) {
      return res.json({ success: true, message: `Fleet already contains ${count} autos.` });
    }

    const today = new Date();
    const addDays = (d) => {
      const date = new Date(today);
      date.setDate(date.getDate() + d);
      return date.toISOString().split('T')[0];
    };

    const starterFleet = [
      {
        autoNumber: 'TN-09-EV-1001',
        vehicleType: 'EV Auto',
        make: 'Mahindra',
        model: 'Treo Electric',
        manufacturingYear: 2024,
        chassisNumber: 'MA1TREOEV2024001',
        motorNumber: 'MHD-8KW-9021',
        batteryCapacityKwh: 7.37,
        batteryType: 'Lithium-ion',
        rangePerChargeKm: 130,
        assignedDriverName: 'Murugan K',
        assignedDriverPhone: '9840123456',
        driverLicenseNumber: 'TN0920180004561',
        status: 'active',
        // Valid compliance
        rcExpiryDate: addDays(400),
        fitnessExpiryDate: addDays(180),
        insuranceExpiryDate: addDays(150),
        insurancePolicyNumber: 'HDFC-ERGO-AUTO-8819',
        insuranceProvider: 'HDFC ERGO',
        permitExpiryDate: addDays(210),
        permitNumber: 'PERMIT-CHN-2024-88',
        pucExpiryDate: addDays(120),
        batteryWarrantyExpiryDate: addDays(700),
        roadTaxExpiryDate: addDays(300),
        remarks: 'Dedicated passenger EV in T. Nagar route.'
      },
      {
        autoNumber: 'TN-01-EV-2045',
        vehicleType: 'EV Auto',
        make: 'Piaggio',
        model: 'Ape E-City FX',
        manufacturingYear: 2023,
        chassisNumber: 'PIAPEEFX2023772',
        motorNumber: 'PIAG-5.4KW-1104',
        batteryCapacityKwh: 7.5,
        batteryType: 'Fixed Lithium',
        rangePerChargeKm: 115,
        assignedDriverName: 'Senthil Nathan',
        assignedDriverPhone: '9841987654',
        driverLicenseNumber: 'TN0120150007812',
        status: 'active',
        // ⚠️ EXPIRING SOON (< 30 days)
        rcExpiryDate: addDays(350),
        fitnessExpiryDate: addDays(14), // ⚠️ 14 days left!
        insuranceExpiryDate: addDays(22), // ⚠️ 22 days left!
        insurancePolicyNumber: 'ICICI-LOMB-77218',
        insuranceProvider: 'ICICI Lombard',
        permitExpiryDate: addDays(190),
        pucExpiryDate: addDays(8), // ⚠️ 8 days left!
        batteryWarrantyExpiryDate: addDays(550),
        roadTaxExpiryDate: addDays(200),
        remarks: 'Fitness and Insurance renewal submitted to RTO.'
      },
      {
        autoNumber: 'TN-07-EV-3180',
        vehicleType: 'EV Auto',
        make: 'Bajaj',
        model: 'RE E-TEC 9.0',
        manufacturingYear: 2024,
        chassisNumber: 'BAJAREETEC900318',
        motorNumber: 'BAJ-ETEC-9KW-081',
        batteryCapacityKwh: 8.9,
        batteryType: 'Lithium-ion',
        rangePerChargeKm: 145,
        assignedDriverName: 'Karthik Raja',
        assignedDriverPhone: '9790554433',
        driverLicenseNumber: 'TN0720200003419',
        status: 'charging',
        // 🚨 EXPIRED ALERT!
        rcExpiryDate: addDays(250),
        fitnessExpiryDate: addDays(-12), // 🚨 Expired 12 days ago!
        insuranceExpiryDate: addDays(-5), // 🚨 Expired 5 days ago!
        insurancePolicyNumber: 'TATA-AIG-EV-4412',
        insuranceProvider: 'Tata AIG',
        permitExpiryDate: addDays(90),
        pucExpiryDate: addDays(-20), // 🚨 Expired!
        batteryWarrantyExpiryDate: addDays(600),
        roadTaxExpiryDate: addDays(180),
        remarks: 'Vehicle currently halted for statutory FC & Insurance renewal.'
      },
      {
        autoNumber: 'TN-04-EV-4490',
        vehicleType: 'EV Auto',
        make: 'Montra Electric',
        model: 'Super Auto',
        manufacturingYear: 2024,
        chassisNumber: 'MONTRA2024EV994',
        motorNumber: 'TI-MONT-7KW-440',
        batteryCapacityKwh: 10.0,
        batteryType: 'LFP Blade',
        rangePerChargeKm: 160,
        assignedDriverName: 'Venkatesh P',
        assignedDriverPhone: '9884112233',
        driverLicenseNumber: 'TN0420190008819',
        status: 'active',
        // Valid
        rcExpiryDate: addDays(500),
        fitnessExpiryDate: addDays(220),
        insuranceExpiryDate: addDays(180),
        insurancePolicyNumber: 'BAJAJ-ALL-88912',
        insuranceProvider: 'Bajaj Allianz',
        permitExpiryDate: addDays(240),
        pucExpiryDate: addDays(150),
        batteryWarrantyExpiryDate: addDays(850),
        roadTaxExpiryDate: addDays(400),
        remarks: 'High-range long-distance shuttle.'
      },
      {
        autoNumber: 'TN-02-EV-5512',
        vehicleType: 'EV Auto',
        make: 'Altigreen',
        model: 'neEV High Deck',
        manufacturingYear: 2023,
        chassisNumber: 'ALTI2023EV5512',
        motorNumber: 'ALTI-8KW-331',
        batteryCapacityKwh: 11.0,
        batteryType: 'Lithium-ion',
        rangePerChargeKm: 150,
        assignedDriverName: 'Saravanan M',
        assignedDriverPhone: '9840998877',
        driverLicenseNumber: 'TN0220160001129',
        status: 'maintenance',
        // ⚠️ Permit expiring soon
        rcExpiryDate: addDays(200),
        fitnessExpiryDate: addDays(110),
        insuranceExpiryDate: addDays(140),
        insurancePolicyNumber: 'CHOLA-MS-9921',
        insuranceProvider: 'Cholamandalam MS',
        permitExpiryDate: addDays(6), // ⚠️ Permit expires in 6 days!
        pucExpiryDate: addDays(80),
        batteryWarrantyExpiryDate: addDays(450),
        roadTaxExpiryDate: addDays(190),
        remarks: 'Scheduled 10,000 km motor & brake checkup.'
      }
    ];

    await AutoVehicle.bulkCreate(starterFleet);
    res.json({
      success: true,
      message: `Successfully seeded ${starterFleet.length} starter EV Autos with compliance tracking!`
    });
  } catch (err) {
    console.error('Error seeding defaults:', err);
    res.status(500).json({ success: false, message: 'Failed to seed starter autos' });
  }
});

/**
 * @route   POST /api/autos/simulate-telemetry
 * @desc    Simulate or tick live telemetry for autos in fleet (Chennai GPS routes, battery, speed)
 * @access  Private
 */
router.post('/simulate-telemetry', protect, async (req, res) => {
  try {
    const CHENNAI_WAYPOINTS = [
      { name: 'T. Nagar Hub', lat: 13.0418, lng: 80.2341 },
      { name: 'Anna Nagar West Depot', lat: 13.0850, lng: 80.2100 },
      { name: 'Guindy Industrial Estate', lat: 13.0067, lng: 80.2026 },
      { name: 'OMR Thoraipakkam Hub', lat: 12.9352, lng: 80.2312 },
      { name: 'Velachery Bypass Route', lat: 12.9815, lng: 80.2180 },
      { name: 'Koyambedu CMBT Terminal', lat: 13.0694, lng: 80.1948 },
      { name: 'Marina Beach Road', lat: 13.0500, lng: 80.2824 },
      { name: 'Tambaram Sanatorium Station', lat: 12.9350, lng: 80.1250 },
      { name: 'Chennai Central Station', lat: 13.0827, lng: 80.2707 },
      { name: 'Adyar Bridge Depot', lat: 13.0012, lng: 80.2565 }
    ];

    const autos = await AutoVehicle.findAll();
    for (let i = 0; i < autos.length; i++) {
      const a = autos[i];
      const wp = CHENNAI_WAYPOINTS[(i + Math.floor(Math.random() * 3)) % CHENNAI_WAYPOINTS.length];
      
      // small jitter
      const latJitter = (Math.random() - 0.5) * 0.008;
      const lngJitter = (Math.random() - 0.5) * 0.008;

      let speed = 0;
      let socDelta = 0;
      if (a.status === 'active') {
        speed = Math.floor(22 + Math.random() * 26); // 22-48 km/h typical EV auto city speed
        socDelta = -(Math.floor(Math.random() * 3) + 1); // -1% to -3%
      } else if (a.status === 'charging') {
        speed = 0;
        socDelta = Math.floor(Math.random() * 5) + 3; // +3% to +8%
      }

      let newSoc = Math.min(100, Math.max(8, (a.batterySocPct || 80) + socDelta));
      let newDist = parseFloat((a.dailyDistanceKm || 0) + (speed > 0 ? (speed * 0.1).toFixed(1) * 1 : 0));

      await a.update({
        currentLatitude: parseFloat((wp.lat + latJitter).toFixed(5)),
        currentLongitude: parseFloat((wp.lng + lngJitter).toFixed(5)),
        currentLocationName: wp.name,
        currentSpeedKm: speed,
        batterySocPct: newSoc,
        dailyDistanceKm: newDist,
        lastTelemetryAt: new Date()
      });
    }

    const updated = await AutoVehicle.findAll({ order: [['updatedAt', 'DESC']] });
    res.json({
      success: true,
      message: 'Fleet telematics refreshed with live Chennai GPS coordinates',
      autos: updated.map(formatVehicle)
    });
  } catch (err) {
    console.error('Error simulating telemetry:', err);
    res.status(500).json({ success: false, message: 'Failed to update telemetry' });
  }
});

/**
 * @route   POST /api/autos/:id/assign-driver
 * @desc    Assign or unassign driver to auto
 * @access  Private
 */
router.post('/:id/assign-driver', protect, async (req, res) => {
  try {
    const { Driver } = require('../models');
    const auto = await AutoVehicle.findByPk(req.params.id);
    if (!auto) {
      return res.status(404).json({ success: false, message: 'Auto not found' });
    }

    const { driverId } = req.body; // null or undefined to unassign

    if (!driverId) {
      // Unassign existing driver
      const oldDriverId = auto.assignedDriverId;
      await auto.update({
        assignedDriverId: null,
        assignedDriverName: null,
        assignedDriverPhone: null,
        driverLicenseNumber: null,
        status: auto.status === 'maintenance' ? 'maintenance' : 'idle'
      });

      if (oldDriverId) {
        await Driver.update({
          assignedAutoId: null,
          assignedAutoNumber: null,
          status: 'active'
        }, { where: { id: oldDriverId } });
      }

      return res.json({
        success: true,
        message: `Driver unassigned from ${auto.autoNumber}`,
        auto: formatVehicle(auto)
      });
    }

    // Find driver
    const driver = await Driver.findByPk(driverId);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    // Check license validity
    const alerts = Driver.computeAlerts(driver);
    let warningMsg = null;
    if (alerts.isLicenseExpired) {
      warningMsg = `⚠️ Caution: Driver ${driver.name}'s license has EXPIRED! Assigning to ${auto.autoNumber} may violate road compliance.`;
    }

    // 1. If auto had an old driver, clear old driver
    if (auto.assignedDriverId && auto.assignedDriverId !== driver.id) {
      await Driver.update({
        assignedAutoId: null,
        assignedAutoNumber: null,
        status: 'active'
      }, { where: { id: auto.assignedDriverId } });
    }

    // 2. If driver was in another auto, clear that auto
    if (driver.assignedAutoId && driver.assignedAutoId !== auto.id) {
      await AutoVehicle.update({
        assignedDriverId: null,
        assignedDriverName: null,
        assignedDriverPhone: null,
        driverLicenseNumber: null,
        status: 'idle'
      }, { where: { id: driver.assignedAutoId } });
    }

    // 3. Update both
    await auto.update({
      assignedDriverId: driver.id,
      assignedDriverName: driver.name,
      assignedDriverPhone: driver.phone,
      driverLicenseNumber: driver.licenseNumber,
      status: auto.status === 'maintenance' ? 'maintenance' : 'active'
    });

    await driver.update({
      assignedAutoId: auto.id,
      assignedAutoNumber: auto.autoNumber,
      status: 'on_duty'
    });

    res.json({
      success: true,
      message: `Driver ${driver.name} assigned to ${auto.autoNumber}`,
      warning: warningMsg,
      auto: formatVehicle(auto)
    });
  } catch (err) {
    console.error('Error assigning driver to auto:', err);
    res.status(500).json({ success: false, message: 'Failed to assign driver' });
  }
});

module.exports = router;
