const express = require('express');
const router = express.Router();
const { AuditLog } = require('../models');
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');
const { Op } = require('sequelize');

router.use(protect);

// @desc   Get audit logs
// @route  GET /api/audit-logs
router.get('/', checkPermission('uam', 'audit-logs-list', 'canView'), async (req, res) => {
  try {
    const { search = '', module = '', action = '', page = 1, limit = 10 } = req.query;

    const where = {};

    if (module) {
      where.module = module;
    }

    if (action) {
      where.action = action;
    }

    if (search) {
      where[Op.or] = [
        { userName: { [Op.iLike]: `%${search}%` } },
        { userEmail: { [Op.iLike]: `%${search}%` } },
        { targetName: { [Op.iLike]: `%${search}%` } },
        { action: { [Op.iLike]: `%${search}%` } },
        { module: { [Op.iLike]: `%${search}%` } },
        { details: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      distinct: true,
      order: [['createdAt', 'DESC']],
      limit: parsedLimit,
      offset: (parsedPage - 1) * parsedLimit
    });

    res.json({
      success: true,
      total: count,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(count / parsedLimit) || 1,
      logs: rows
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
