const express = require('express');
const router = express.Router();
const { JobRequestStatus, JobRequest } = require('../models');
const { protect } = require('../middleware/auth');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');

// @desc   Get all job request statuses (Master List)
// @route  GET /api/job-request-statuses
router.get('/', async (req, res) => {
  try {
    const { activeOnly = 'true' } = req.query;

    const where = {};
    if (activeOnly === 'true') {
      where.isActive = true;
    }

    const statuses = await JobRequestStatus.findAll({
      where,
      order: [
        ['order', 'ASC'],
        ['createdAt', 'ASC']
      ]
    });

    // Compute real-time candidate counts per status
    const statusCounts = await JobRequest.findAll({
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
        jobRequestCount: countMap[data.key] || countMap[data.name.toLowerCase()] || 0
      };
    });

    res.json({
      success: true,
      count: result.length,
      statuses: result
    });
  } catch (error) {
    console.error('Error fetching job request statuses:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// All mutating routes require authentication
router.use(protect);

const toSlug = (str) => {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
};

// @desc   Create new job request status in master table
// @route  POST /api/job-request-statuses
router.post('/', async (req, res) => {
  try {
    const { name, color, badgeClass, order, isDefault } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Status name is required' });
    }

    const trimmedName = name.trim();
    const generatedKey = toSlug(trimmedName);

    const existing = await JobRequestStatus.findOne({
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

    let targetOrder = order;
    if (targetOrder === undefined || targetOrder === null) {
      const maxOrder = await JobRequestStatus.max('order') || 0;
      targetOrder = maxOrder + 1;
    }

    if (isDefault) {
      await JobRequestStatus.update({ isDefault: false }, { where: {} });
    }

    const newStatus = await JobRequestStatus.create({
      name: trimmedName,
      key: generatedKey,
      color: color || '#10b981',
      badgeClass: badgeClass || 'badge-success',
      order: targetOrder,
      isDefault: Boolean(isDefault),
      isActive: true,
      organizationId: req.user.organizationId || null
    });

    res.status(201).json({
      success: true,
      message: 'Job Request status created successfully',
      status: newStatus
    });
  } catch (error) {
    console.error('Error creating job request status:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc   Update a job request status
// @route  PUT /api/job-request-statuses/:id
router.put('/:id', async (req, res) => {
  try {
    const statusItem = await JobRequestStatus.findByPk(req.params.id);
    if (!statusItem) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }

    const { name, color, badgeClass, order, isActive, isDefault } = req.body;
    const updates = {};
    if (name !== undefined && name.trim()) {
      updates.name = name.trim();
    }
    if (color !== undefined) updates.color = color;
    if (badgeClass !== undefined) updates.badgeClass = badgeClass;
    if (order !== undefined) updates.order = parseInt(order, 10);
    if (isActive !== undefined) updates.isActive = Boolean(isActive);
    if (isDefault !== undefined && isDefault) {
      updates.isDefault = true;
      await JobRequestStatus.update({ isDefault: false }, { where: { id: { [Op.ne]: statusItem.id } } });
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
    console.error('Error updating job request status:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc   Delete or deactivate a job request status
// @route  DELETE /api/job-request-statuses/:id
router.delete('/:id', async (req, res) => {
  try {
    const statusItem = await JobRequestStatus.findByPk(req.params.id);
    if (!statusItem) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }

    const count = await JobRequest.count({
      where: {
        status: { [Op.in]: [statusItem.key, statusItem.name.toLowerCase()] }
      }
    });

    if (count > 0) {
      await statusItem.update({ isActive: false });
      return res.json({
        success: true,
        message: `Status deactivated (${count} candidate requests using this status)`
      });
    }

    await statusItem.destroy();
    res.json({
      success: true,
      message: 'Status deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting job request status:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
