const express = require('express');
const router = express.Router();
const { LeadStatus, Lead, Organization } = require('../models');
const { protect } = require('../middleware/auth');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');

// @desc   Get all lead statuses (Master List)
// @route  GET /api/lead-statuses
router.get('/', async (req, res) => {
  try {
    const { activeOnly = 'true' } = req.query;

    const where = {};
    if (activeOnly === 'true') {
      where.isActive = true;
    }

    const statuses = await LeadStatus.findAll({
      where,
      order: [
        ['order', 'ASC'],
        ['createdAt', 'ASC']
      ]
    });

    // Compute real-time lead counts per status
    const statusCounts = await Lead.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    }).catch(() => []);

    const countMap = {};
    statusCounts.forEach(r => {
      if (r.status) countMap[r.status] = parseInt(r.count, 10);
    });

    const result = statuses.map(s => {
      const data = s.toJSON();
      return {
        ...data,
        leadCount: countMap[data.key] || countMap[data.name.toLowerCase()] || 0
      };
    });

    res.json({
      success: true,
      count: result.length,
      statuses: result
    });
  } catch (error) {
    console.error('Error fetching lead statuses:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// All mutating routes require authentication
router.use(protect);

// Helper to generate key from name
const toSlug = (str) => {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
};

// @desc   Create new lead status in master table
// @route  POST /api/lead-statuses
router.post('/', async (req, res) => {
  try {
    const { name, color, badgeClass, order, isDefault } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Status name is required' });
    }

    const trimmedName = name.trim();
    const generatedKey = toSlug(trimmedName);

    // Check if status with same key or name exists
    const existing = await LeadStatus.findOne({
      where: {
        [Op.or]: [
          sequelize.where(sequelize.fn('LOWER', sequelize.fn('TRIM', sequelize.col('name'))), trimmedName.toLowerCase()),
          { key: generatedKey }
        ]
      }
    });

    if (existing) {
      if (!existing.isActive) {
        await existing.update({ isActive: true });
      }
      return res.json({
        success: true,
        message: 'Status already exists',
        status: existing,
        isExisting: true
      });
    }

    // Determine order if not specified
    let targetOrder = order;
    if (targetOrder === undefined || targetOrder === null) {
      const maxOrder = await LeadStatus.max('order') || 0;
      targetOrder = maxOrder + 1;
    }

    // If marked as default, unset other defaults
    if (isDefault) {
      await LeadStatus.update({ isDefault: false }, { where: {} });
    }

    const newStatus = await LeadStatus.create({
      name: trimmedName,
      key: generatedKey,
      color: color || '#06b6d4',
      badgeClass: badgeClass || 'badge-info',
      order: targetOrder,
      isDefault: Boolean(isDefault),
      isActive: true,
      organizationId: req.user.organizationId || null
    });

    res.status(201).json({
      success: true,
      message: 'Status created successfully',
      status: newStatus
    });
  } catch (error) {
    console.error('Error creating lead status:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc   Update a lead status
// @route  PUT /api/lead-statuses/:id
router.put('/:id', async (req, res) => {
  try {
    const statusItem = await LeadStatus.findByPk(req.params.id);
    if (!statusItem) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }

    const { name, color, badgeClass, order, isActive, isDefault } = req.body;
    const updates = {};

    if (statusItem.isSystem) {
      if (isActive === false) {
        return res.status(400).json({ success: false, message: 'Core lifecycle statuses cannot be deactivated' });
      }
      if (color !== undefined) updates.color = color;
      if (badgeClass !== undefined) updates.badgeClass = badgeClass;
      if (order !== undefined) updates.order = parseInt(order, 10);
    } else {
      if (name !== undefined && name.trim()) {
        updates.name = name.trim();
      }
      if (color !== undefined) updates.color = color;
      if (badgeClass !== undefined) updates.badgeClass = badgeClass;
      if (order !== undefined) updates.order = parseInt(order, 10);
      if (isActive !== undefined) updates.isActive = Boolean(isActive);
    }
    if (isDefault !== undefined && isDefault) {
      updates.isDefault = true;
      await LeadStatus.update({ isDefault: false }, { where: { id: { [Op.ne]: statusItem.id } } });
    } else if (isDefault !== undefined) {
      updates.isDefault = false;
    }

    await statusItem.update(updates);

    res.json({
      success: true,
      message: 'Status updated successfully',
      status: statusItem
    });
  } catch (error) {
    console.error('Error updating lead status:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc   Delete or deactivate a lead status
// @route  DELETE /api/lead-statuses/:id
router.delete('/:id', async (req, res) => {
  try {
    const statusItem = await LeadStatus.findByPk(req.params.id);
    if (!statusItem) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }

    if (statusItem.isSystem) {
      return res.status(403).json({ success: false, message: 'Core lifecycle statuses cannot be deleted' });
    }

    // Check if leads exist with this status
    const leadsCount = await Lead.count({
      where: {
        status: { [Op.in]: [statusItem.key, statusItem.name.toLowerCase()] }
      }
    });

    if (leadsCount > 0) {
      // Soft deactivate
      await statusItem.update({ isActive: false });
      return res.json({
        success: true,
        message: `Status deactivated (${leadsCount} active leads using this status)`
      });
    }

    await statusItem.destroy();
    res.json({
      success: true,
      message: 'Status deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting lead status:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
