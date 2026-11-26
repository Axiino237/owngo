const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Driver, AutoVehicle, AuditLog } = require('../models');
const { protect } = require('../middleware/auth');

/**
 * Format Driver record with real-time computed alerts
 */
const formatDriver = (d) => {
  const plain = d.toJSON ? d.toJSON() : { ...d };
  const alertInfo = Driver.computeAlerts(plain);
  return {
    ...plain,
    alerts: alertInfo
  };
};

/**
 * @route   GET /api/drivers/stats
 * @desc    Driver management & compliance statistics
 * @access  Private
 */
router.get('/stats', protect, async (req, res) => {
  try {
    const where = {};
    if (!req.user.isSuperAdmin && req.user.organizationId) {
      where.organizationId = req.user.organizationId;
    }

    const allDrivers = await Driver.findAll({ where });
    const formatted = allDrivers.map(formatDriver);

    const total = formatted.length;
    const onDuty = formatted.filter(d => d.status === 'on_duty').length;
    const active = formatted.filter(d => d.status === 'active').length;
    const onLeave = formatted.filter(d => d.status === 'on_leave').length;
    const suspended = formatted.filter(d => d.status === 'suspended').length;
    const assigned = formatted.filter(d => !!d.assignedAutoId).length;
    const unassigned = formatted.filter(d => !d.assignedAutoId).length;

    // License expiry alerts
    const licenseExpiredCount = formatted.filter(d => d.alerts.isLicenseExpired).length;
    const licenseExpiringSoonCount = formatted.filter(d => d.alerts.isLicenseExpiringSoon).length;
    const allValidCount = formatted.filter(d => d.alerts.overallStatus === 'valid').length;

    res.json({
      success: true,
      stats: {
        total,
        onDuty,
        active,
        onLeave,
        suspended,
        assigned,
        unassigned,
        licenseExpiredCount,
        licenseExpiringSoonCount,
        allValidCount
      }
    });
  } catch (err) {
    console.error('Error fetching driver stats:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch driver stats' });
  }
});

/**
 * @route   GET /api/drivers
 * @desc    Get drivers list with search, status, assignment & license filter
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const {
      search = '',
      status = 'all',
      assignment = 'all', // 'all' | 'assigned' | 'unassigned'
      licenseStatus = 'all', // 'all' | 'expired' | 'expiring_soon' | 'valid'
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

    if (assignment === 'assigned') {
      where.assignedAutoId = { [Op.ne]: null };
    } else if (assignment === 'unassigned') {
      where.assignedAutoId = null;
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      where[Op.or] = [
        { name: { [Op.iLike]: q } },
        { phone: { [Op.iLike]: q } },
        { alternatePhone: { [Op.iLike]: q } },
        { licenseNumber: { [Op.iLike]: q } },
        { badgeNumber: { [Op.iLike]: q } },
        { assignedAutoNumber: { [Op.iLike]: q } }
      ];
    }

    const drivers = await Driver.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    let formatted = drivers.map(formatDriver);

    // Filter by license / compliance status if requested
    if (licenseStatus === 'expired') {
      formatted = formatted.filter(d => d.alerts.hasExpired);
    } else if (licenseStatus === 'expiring_soon') {
      formatted = formatted.filter(d => !d.alerts.hasExpired && d.alerts.hasExpiringSoon);
    } else if (licenseStatus === 'valid') {
      formatted = formatted.filter(d => d.alerts.overallStatus === 'valid');
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
      drivers: paginated
    });
  } catch (err) {
    console.error('Error fetching drivers:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch drivers list' });
  }
});

/**
 * @route   GET /api/drivers/:id
 * @desc    Get single driver details
 * @access  Private
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const driver = await Driver.findByPk(req.params.id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }
    res.json({ success: true, driver: formatDriver(driver) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch driver details' });
  }
});

/**
 * @route   POST /api/drivers
 * @desc    Create new Driver
 * @access  Private
 */
router.post('/', protect, async (req, res) => {
  try {
    let {
      name,
      phone,
      alternatePhone,
      email,
      address,
      licenseNumber,
      licenseType = 'Commercial 3-Wheeler Transport',
      licenseExpiryDate,
      badgeNumber,
      badgeExpiryDate,
      policeVerificationStatus = 'verified',
      policeVerificationExpiryDate,
      medicalFitnessExpiryDate,
      aadharNumber,
      emergencyContactName,
      emergencyContactPhone,
      status = 'active',
      assignedAutoId,
      remarks
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Driver name is required' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: 'Contact phone number is required' });
    }
    if (!licenseNumber || !licenseNumber.trim()) {
      return res.status(400).json({ success: false, message: 'Driving license number is required' });
    }
    if (!licenseExpiryDate) {
      return res.status(400).json({ success: false, message: 'License expiry date is required for compliance alert tracking' });
    }

    phone = phone.trim();
    licenseNumber = licenseNumber.trim().toUpperCase().replace(/\s+/g, ' ');

    // Check duplicate phone or license
    const existingPhone = await Driver.findOne({ where: { phone } });
    if (existingPhone) {
      return res.status(400).json({ success: false, message: `A driver with phone ${phone} already exists` });
    }

    const existingLicense = await Driver.findOne({ where: { licenseNumber } });
    if (existingLicense) {
      return res.status(400).json({ success: false, message: `A driver with license "${licenseNumber}" already exists` });
    }

    let assignedAutoNumber = null;
    let autoRecord = null;
    if (assignedAutoId) {
      autoRecord = await AutoVehicle.findByPk(assignedAutoId);
      if (autoRecord) {
        assignedAutoNumber = autoRecord.autoNumber;
        status = 'on_duty';
      }
    }

    const created = await Driver.create({
      name: name.trim(),
      phone,
      alternatePhone: alternatePhone?.trim() || null,
      email: email?.trim() || null,
      address: address?.trim() || null,
      licenseNumber,
      licenseType: licenseType || 'Commercial 3-Wheeler Transport',
      licenseExpiryDate,
      badgeNumber: badgeNumber?.trim() || null,
      badgeExpiryDate: badgeExpiryDate || null,
      policeVerificationStatus: policeVerificationStatus || 'verified',
      policeVerificationExpiryDate: policeVerificationExpiryDate || null,
      medicalFitnessExpiryDate: medicalFitnessExpiryDate || null,
      aadharNumber: aadharNumber?.trim() || null,
      emergencyContactName: emergencyContactName?.trim() || null,
      emergencyContactPhone: emergencyContactPhone?.trim() || null,
      status,
      assignedAutoId: autoRecord ? autoRecord.id : null,
      assignedAutoNumber,
      organizationId: req.user.organizationId || null,
      companyId: req.user.companyId || null,
      remarks: remarks?.trim() || null
    });

    // If auto assigned, update auto side as well
    if (autoRecord) {
      await autoRecord.update({
        assignedDriverId: created.id,
        assignedDriverName: created.name,
        assignedDriverPhone: created.phone,
        driverLicenseNumber: created.licenseNumber
      });
    }

    // Audit log
    try {
      await AuditLog.create({
        action: 'CREATE_DRIVER',
        module: 'autos',
        userId: req.user.id,
        userEmail: req.user.email,
        details: `Added new driver ${created.name} (${created.phone}) with license ${created.licenseNumber}`,
        ipAddress: req.ip
      });
    } catch (e) {}

    res.status(201).json({
      success: true,
      message: `Driver ${created.name} added successfully`,
      driver: formatDriver(created)
    });
  } catch (err) {
    console.error('Error creating driver:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to create driver' });
  }
});

/**
 * @route   PUT /api/drivers/:id
 * @desc    Update driver details & certifications
 * @access  Private
 */
router.put('/:id', protect, async (req, res) => {
  try {
    const driver = await Driver.findByPk(req.params.id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    let { phone, licenseNumber } = req.body;
    if (phone && phone.trim() !== driver.phone) {
      const conflict = await Driver.findOne({ where: { phone: phone.trim() } });
      if (conflict) {
        return res.status(400).json({ success: false, message: `Phone number ${phone} is already in use` });
      }
      req.body.phone = phone.trim();
    }

    if (licenseNumber && licenseNumber.trim().toUpperCase() !== driver.licenseNumber) {
      const formattedLicense = licenseNumber.trim().toUpperCase().replace(/\s+/g, ' ');
      const conflict = await Driver.findOne({ where: { licenseNumber: formattedLicense } });
      if (conflict) {
        return res.status(400).json({ success: false, message: `License number ${licenseNumber} is already in use` });
      }
      req.body.licenseNumber = formattedLicense;
    }

    // Clean empty date strings
    const dateFields = ['licenseExpiryDate', 'badgeExpiryDate', 'policeVerificationExpiryDate', 'medicalFitnessExpiryDate'];
    for (const f of dateFields) {
      if (f in req.body && (!req.body[f] || req.body[f] === '')) {
        req.body[f] = null;
      }
    }

    await driver.update(req.body);

    // If driver is currently assigned to an auto, update cached info on auto side too
    if (driver.assignedAutoId) {
      await AutoVehicle.update({
        assignedDriverName: driver.name,
        assignedDriverPhone: driver.phone,
        driverLicenseNumber: driver.licenseNumber
      }, { where: { id: driver.assignedAutoId } });
    }

    res.json({
      success: true,
      message: `Driver ${driver.name} updated successfully`,
      driver: formatDriver(driver)
    });
  } catch (err) {
    console.error('Error updating driver:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to update driver' });
  }
});

/**
 * @route   POST /api/drivers/:id/assign
 * @desc    Dynamically assign or reassign driver to an auto
 * @access  Private
 */
router.post('/:id/assign', protect, async (req, res) => {
  try {
    const driver = await Driver.findByPk(req.params.id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    const { autoId } = req.body; // pass null to unassign

    // Case 1: Unassign driver
    if (!autoId) {
      const oldAutoId = driver.assignedAutoId;
      await driver.update({
        assignedAutoId: null,
        assignedAutoNumber: null,
        status: driver.status === 'on_duty' ? 'active' : driver.status
      });

      if (oldAutoId) {
        await AutoVehicle.update({
          assignedDriverId: null,
          assignedDriverName: null,
          assignedDriverPhone: null,
          driverLicenseNumber: null,
          status: 'idle'
        }, { where: { id: oldAutoId } });
      }

      return res.json({
        success: true,
        message: `Driver ${driver.name} has been unassigned`,
        driver: formatDriver(driver)
      });
    }

    // Case 2: Assign driver to target auto
    const targetAuto = await AutoVehicle.findByPk(autoId);
    if (!targetAuto) {
      return res.status(404).json({ success: false, message: 'Target auto not found' });
    }

    // Check license validity before assigning
    const alerts = Driver.computeAlerts(driver);
    let warningMsg = null;
    if (alerts.isLicenseExpired) {
      warningMsg = `⚠️ Caution: Driver ${driver.name}'s license has EXPIRED! Please ensure renewal before road duty.`;
    }

    // 1. If target auto already has another driver assigned, unassign that driver first
    if (targetAuto.assignedDriverId && targetAuto.assignedDriverId !== driver.id) {
      await Driver.update({
        assignedAutoId: null,
        assignedAutoNumber: null,
        status: 'active'
      }, { where: { id: targetAuto.assignedDriverId } });
    }

    // 2. If this driver was previously assigned to a different auto, clear that auto
    if (driver.assignedAutoId && driver.assignedAutoId !== targetAuto.id) {
      await AutoVehicle.update({
        assignedDriverId: null,
        assignedDriverName: null,
        assignedDriverPhone: null,
        driverLicenseNumber: null,
        status: 'idle'
      }, { where: { id: driver.assignedAutoId } });
    }

    // 3. Atomically assign both
    await driver.update({
      assignedAutoId: targetAuto.id,
      assignedAutoNumber: targetAuto.autoNumber,
      status: 'on_duty'
    });

    await targetAuto.update({
      assignedDriverId: driver.id,
      assignedDriverName: driver.name,
      assignedDriverPhone: driver.phone,
      driverLicenseNumber: driver.licenseNumber,
      status: targetAuto.status === 'maintenance' ? 'maintenance' : 'active'
    });

    // Audit log
    try {
      await AuditLog.create({
        action: 'ASSIGN_DRIVER',
        module: 'autos',
        userId: req.user.id,
        userEmail: req.user.email,
        details: `Assigned driver ${driver.name} to auto ${targetAuto.autoNumber}`,
        ipAddress: req.ip
      });
    } catch (e) {}

    res.json({
      success: true,
      message: `Driver ${driver.name} assigned to Auto ${targetAuto.autoNumber} successfully!`,
      warning: warningMsg,
      driver: formatDriver(driver),
      auto: targetAuto
    });
  } catch (err) {
    console.error('Error assigning driver:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to assign driver' });
  }
});

/**
 * @route   DELETE /api/drivers/:id
 * @desc    Delete driver from system
 * @access  Private
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    const driver = await Driver.findByPk(req.params.id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    const driverName = driver.name;
    const assignedAutoId = driver.assignedAutoId;

    // If assigned to an auto, clear the auto assignment first
    if (assignedAutoId) {
      await AutoVehicle.update({
        assignedDriverId: null,
        assignedDriverName: null,
        assignedDriverPhone: null,
        driverLicenseNumber: null
      }, { where: { id: assignedAutoId } });
    }

    await driver.destroy();

    // Audit log
    try {
      await AuditLog.create({
        action: 'DELETE_DRIVER',
        module: 'autos',
        userId: req.user.id,
        userEmail: req.user.email,
        details: `Deleted driver ${driverName}`,
        ipAddress: req.ip
      });
    } catch (e) {}

    res.json({ success: true, message: `Driver ${driverName} deleted successfully` });
  } catch (err) {
    console.error('Error deleting driver:', err);
    res.status(500).json({ success: false, message: 'Failed to delete driver' });
  }
});

/**
 * @route   POST /api/drivers/seed-defaults
 * @desc    Seed realistic starter drivers with varied license statuses
 * @access  Private
 */
router.post('/seed-defaults', protect, async (req, res) => {
  try {
    const count = await Driver.count();
    if (count > 0) {
      return res.json({ success: true, message: `System already has ${count} drivers.` });
    }

    const today = new Date();
    const addDays = (d) => {
      const date = new Date(today);
      date.setDate(date.getDate() + d);
      return date.toISOString().split('T')[0];
    };

    const starterDrivers = [
      {
        name: 'Murugan K',
        phone: '9840123456',
        alternatePhone: '9444123456',
        email: 'murugan.auto@gmail.com',
        address: '14, Kannagi Street, T. Nagar, Chennai - 600017',
        licenseNumber: 'TN09 20180004561',
        licenseType: 'Commercial 3-Wheeler Transport',
        licenseExpiryDate: addDays(420), // Valid
        badgeNumber: 'BDG-CHN-8819',
        badgeExpiryDate: addDays(300),
        policeVerificationStatus: 'verified',
        policeVerificationExpiryDate: addDays(200),
        medicalFitnessExpiryDate: addDays(180),
        aadharNumber: '8812 4491 0021',
        emergencyContactName: 'Kavitha M (Wife)',
        emergencyContactPhone: '9840991122',
        status: 'on_duty',
        totalTrips: 1240,
        rating: 4.9,
        remarks: 'Senior EV Auto driver with 6+ years clean record.'
      },
      {
        name: 'Senthil Nathan',
        phone: '9841987654',
        alternatePhone: '9789123450',
        email: 'senthil.n@gmail.com',
        address: '22, Bazaar Road, Mylapore, Chennai - 600004',
        licenseNumber: 'TN01 20150007812',
        licenseType: 'Commercial 3-Wheeler Transport',
        licenseExpiryDate: addDays(18), // ⚠️ EXPIRING SOON in 18 days!
        badgeNumber: 'BDG-CHN-7721',
        badgeExpiryDate: addDays(18),
        policeVerificationStatus: 'verified',
        policeVerificationExpiryDate: addDays(150),
        medicalFitnessExpiryDate: addDays(120),
        aadharNumber: '6610 2218 9904',
        emergencyContactName: 'Ramesh N (Brother)',
        emergencyContactPhone: '9841002233',
        status: 'on_duty',
        totalTrips: 980,
        rating: 4.8,
        remarks: 'License renewal application submitted at RTO Chennai Central.'
      },
      {
        name: 'Karthik Raja',
        phone: '9790554433',
        alternatePhone: '9884001122',
        email: 'karthik.raja@gmail.com',
        address: '5/12, Kamarajar Salai, Adyar, Chennai - 600020',
        licenseNumber: 'TN07 20200003419',
        licenseType: 'Commercial 3-Wheeler Transport',
        licenseExpiryDate: addDays(-14), // 🚨 EXPIRED 14 days ago!
        badgeNumber: 'BDG-CHN-9941',
        badgeExpiryDate: addDays(-14),
        policeVerificationStatus: 'verified',
        policeVerificationExpiryDate: addDays(90),
        medicalFitnessExpiryDate: addDays(-5),
        aadharNumber: '7721 8830 1192',
        emergencyContactName: 'Lakshmi R (Mother)',
        emergencyContactPhone: '9790881144',
        status: 'active',
        totalTrips: 650,
        rating: 4.7,
        remarks: 'Driving License expired! Prohibited from active road trips until renewal proof.'
      },
      {
        name: 'Venkatesh P',
        phone: '9884112233',
        alternatePhone: '9445112233',
        email: 'venkat.p@gmail.com',
        address: '88, GST Road, Guindy, Chennai - 600032',
        licenseNumber: 'TN04 20190008819',
        licenseType: 'Commercial 3-Wheeler Transport',
        licenseExpiryDate: addDays(600), // Valid
        badgeNumber: 'BDG-CHN-4412',
        badgeExpiryDate: addDays(500),
        policeVerificationStatus: 'verified',
        policeVerificationExpiryDate: addDays(300),
        medicalFitnessExpiryDate: addDays(250),
        aadharNumber: '5519 3320 8812',
        emergencyContactName: 'Priya V (Wife)',
        emergencyContactPhone: '9884990011',
        status: 'on_duty',
        totalTrips: 1120,
        rating: 5.0,
        remarks: 'Dedicated long-range shuttle driver.'
      },
      {
        name: 'Saravanan M',
        phone: '9840998877',
        alternatePhone: '9710998877',
        email: 'saravanan.m@gmail.com',
        address: '10, Station Road, Kodambakkam, Chennai - 600024',
        licenseNumber: 'TN02 20160001129',
        licenseType: 'Commercial 3-Wheeler Transport',
        licenseExpiryDate: addDays(280), // Valid
        badgeNumber: 'BDG-CHN-5591',
        badgeExpiryDate: addDays(280),
        policeVerificationStatus: 'verified',
        policeVerificationExpiryDate: addDays(180),
        medicalFitnessExpiryDate: addDays(140),
        aadharNumber: '4419 8820 7731',
        emergencyContactName: 'Mohan (Father)',
        emergencyContactPhone: '9840887766',
        status: 'active',
        totalTrips: 840,
        rating: 4.8,
        remarks: 'Available for immediate vehicle assignment.'
      }
    ];

    await Driver.bulkCreate(starterDrivers);

    // Also auto-link starter autos if they exist
    const autos = await AutoVehicle.findAll();
    const drivers = await Driver.findAll();
    for (const d of drivers) {
      const match = autos.find(a => a.assignedDriverPhone === d.phone);
      if (match) {
        await d.update({ assignedAutoId: match.id, assignedAutoNumber: match.autoNumber, status: 'on_duty' });
        await match.update({ assignedDriverId: d.id });
      }
    }

    res.json({
      success: true,
      message: `Successfully seeded ${starterDrivers.length} drivers with license compliance tracking!`
    });
  } catch (err) {
    console.error('Error seeding drivers:', err);
    res.status(500).json({ success: false, message: 'Failed to seed drivers' });
  }
});

module.exports = router;
