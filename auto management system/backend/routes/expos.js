const express = require('express');
const router = express.Router();
const { Expo, Lead, Organization } = require('../models');
const { protect } = require('../middleware/auth');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');

router.use(protect);

// @desc   Get all expos (Master List)
// @route  GET /api/expos
router.get('/', async (req, res) => {
  try {
    const { search = '', activeOnly = 'true' } = req.query;

    const where = {};
    if (activeOnly === 'true') {
      where.isActive = true;
    }
    if (search && search.trim()) {
      where.name = { [Op.iLike]: `%${search.trim()}%` };
    }
    if (!req.user.isSuperAdmin && req.user.organizationId) {
      where[Op.or] = [
        { organizationId: req.user.organizationId },
        { organizationId: null }
      ];
    }

    const expos = await Expo.findAll({
      where,
      order: [['name', 'ASC']]
    });

    // Compute lead count per expo
    const leadCounts = await Lead.findAll({
      attributes: [
        'expoId',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: { expoId: { [Op.ne]: null } },
      group: ['expoId'],
      raw: true
    }).catch(() => []);

    const countMap = {};
    leadCounts.forEach(r => { countMap[r.expoId] = parseInt(r.count, 10); });

    const result = expos.map(e => ({
      ...e.toJSON(),
      leadCount: countMap[e.id] || 0
    }));

    res.json({
      success: true,
      count: result.length,
      expos: result
    });
  } catch (error) {
    console.error('Error fetching expos:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc   Create new expo in master table
// @route  POST /api/expos
router.post('/', async (req, res) => {
  try {
    const { name, type, startDate, endDate, venue, city, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Expo name is required' });
    }

    const trimmedName = name.trim();
    const orgId = req.user.organizationId || null;

    // Check if an expo with the same trimmed name already exists
    const existing = await Expo.findOne({
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.fn('TRIM', sequelize.col('name'))),
        trimmedName.toLowerCase()
      )
    });

    if (existing) {
      // If it exists and is inactive, reactivate it
      if (!existing.isActive) {
        await existing.update({ isActive: true });
      }
      return res.json({
        success: true,
        message: 'Expo already exists',
        expo: existing,
        isExisting: true
      });
    }

    const expo = await Expo.create({
      name: trimmedName,
      type: type ? type.trim() : null,
      startDate: startDate || null,
      endDate: endDate || null,
      venue: venue ? venue.trim() : null,
      city: city ? city.trim() : null,
      description: description ? description.trim() : null,
      organizationId: orgId,
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: 'Expo created successfully',
      expo
    });
  } catch (error) {
    console.error('Error creating expo:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc   Update an expo
// @route  PUT /api/expos/:id
router.put('/:id', async (req, res) => {
  try {
    const expo = await Expo.findByPk(req.params.id);
    if (!expo) {
      return res.status(404).json({ success: false, message: 'Expo not found' });
    }

    const { name, type, startDate, endDate, venue, city, description, isActive } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (type !== undefined) updates.type = type ? type.trim() : null;
    if (startDate !== undefined) updates.startDate = startDate || null;
    if (endDate !== undefined) updates.endDate = endDate || null;
    if (venue !== undefined) updates.venue = venue ? venue.trim() : null;
    if (city !== undefined) updates.city = city ? city.trim() : null;
    if (description !== undefined) updates.description = description ? description.trim() : null;
    if (isActive !== undefined) updates.isActive = Boolean(isActive);

    await expo.update(updates);

    // If name was updated, also update expoName in associated leads
    if (updates.name && updates.name !== expo.name) {
      await Lead.update(
        { expoName: updates.name },
        { where: { expoId: expo.id } }
      ).catch(() => {});
    }

    res.json({
      success: true,
      message: 'Expo updated successfully',
      expo
    });
  } catch (error) {
    console.error('Error updating expo:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc   Delete / Deactivate an expo
// @route  DELETE /api/expos/:id
router.delete('/:id', async (req, res) => {
  try {
    const expo = await Expo.findByPk(req.params.id);
    if (!expo) {
      return res.status(404).json({ success: false, message: 'Expo not found' });
    }

    // Check if leads are attached
    const leadsCount = await Lead.count({ where: { expoId: expo.id } });
    if (leadsCount > 0) {
      // Soft-delete / deactivate so historical leads are not broken
      await expo.update({ isActive: false });
      return res.json({
        success: true,
        message: `Expo deactivated (${leadsCount} leads attached)`
      });
    }

    await expo.destroy();
    res.json({
      success: true,
      message: 'Expo deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting expo:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;

