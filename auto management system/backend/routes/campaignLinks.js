const express = require('express');
const router = express.Router();
const { CampaignLink, Permission } = require('../models');
const { protect } = require('../middleware/auth');

// Default standard official links
const DEFAULT_LINKS = [
  {
    name: '📸 Instagram Bio Link',
    target: 'Leads',
    targetBadge: 'badge-success',
    url: 'https://owngo.in/?utm_source=instagram&utm_medium=bio&utm_campaign=launch#apply',
    isOfficial: true
  },
  {
    name: '💬 WhatsApp Partner Broadcast',
    target: 'Leads',
    targetBadge: 'badge-success',
    url: 'https://owngo.in/?utm_source=whatsapp&utm_medium=broadcast#apply',
    isOfficial: true
  },
  {
    name: '🛺 Auto Stand Pilot Recruitment Poster',
    target: 'EV Pilots',
    targetBadge: 'badge-info',
    url: 'https://owngo.in/?utm_source=offline_poster&utm_medium=qr_stand#pilot-apply',
    isOfficial: true
  },
  {
    name: '🎯 Google Search Ads (Fleet Investment)',
    target: 'Leads',
    targetBadge: 'badge-success',
    url: 'https://owngo.in/?utm_source=google_ads&utm_medium=cpc&utm_campaign=ev_fleet#apply',
    isOfficial: true
  }
];

// Helper to check user permission strictly from UAM matrix (no role bypass)
const checkActionPermission = async (user, action = 'canView', screen = 'saved-links') => {
  if (!user.roleId) return false;

  const perm = await Permission.findOne({
    where: {
      roleId: user.roleId,
      module: 'tools',
      screen
    }
  });

  if (perm) return Boolean(perm[action]);

  // Fallback to link-generator if saved-links is not yet explicitly saved
  if (screen === 'saved-links') {
    const parentPerm = await Permission.findOne({
      where: {
        roleId: user.roleId,
        module: 'tools',
        screen: 'link-generator'
      }
    });
    if (parentPerm) return Boolean(parentPerm[action]);
  }

  return false;
};

// All routes require authentication
router.use(protect);

// @desc   Get all saved campaign links
// @route  GET /api/campaign-links
router.get('/', async (req, res) => {
  try {
    const canView = await checkActionPermission(req.user, 'canView');
    if (!canView) {
      return res.status(403).json({ success: false, message: 'You do not have permission to view marketing links' });
    }

    let links = await CampaignLink.findAll({
      order: [
        ['isOfficial', 'DESC'],
        ['createdAt', 'DESC']
      ]
    });

    // Seed defaults if table is empty
    if (links.length === 0) {
      await CampaignLink.bulkCreate(DEFAULT_LINKS);
      links = await CampaignLink.findAll({
        order: [
          ['isOfficial', 'DESC'],
          ['createdAt', 'DESC']
        ]
      });
    }

    // Include user permissions in response for frontend UI toggle
    const canCreate = await checkActionPermission(req.user, 'canCreate');
    const canEdit = await checkActionPermission(req.user, 'canEdit');
    const canDelete = await checkActionPermission(req.user, 'canDelete');

    res.json({
      success: true,
      count: links.length,
      links,
      permissions: {
        canView,
        canCreate,
        canEdit,
        canDelete
      }
    });
  } catch (error) {
    console.error('Error fetching campaign links:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc   Save new campaign link to team list
// @route  POST /api/campaign-links
router.post('/', async (req, res) => {
  try {
    const canCreate = await checkActionPermission(req.user, 'canCreate');
    if (!canCreate) {
      return res.status(403).json({ success: false, message: 'Permission denied: You cannot add official links' });
    }

    const { name, target, targetBadge, url } = req.body;
    if (!name || !url) {
      return res.status(400).json({ success: false, message: 'Link name and URL are required' });
    }

    const newLink = await CampaignLink.create({
      name: name.trim(),
      target: target || 'Leads',
      targetBadge: targetBadge || 'badge-success',
      url: url.trim(),
      isOfficial: false,
      createdById: req.user.id,
      organizationId: req.user.organizationId || null
    });

    res.status(201).json({
      success: true,
      message: 'Campaign link saved successfully',
      link: newLink
    });
  } catch (error) {
    console.error('Error creating campaign link:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc   Update a saved campaign link
// @route  PUT /api/campaign-links/:id
router.put('/:id', async (req, res) => {
  try {
    const canEdit = await checkActionPermission(req.user, 'canEdit');
    if (!canEdit) {
      return res.status(403).json({ success: false, message: 'Permission denied: You do not have permission to edit campaign links' });
    }

    const link = await CampaignLink.findByPk(req.params.id);
    if (!link) {
      return res.status(404).json({ success: false, message: 'Link not found' });
    }

    const { name, target, targetBadge, url } = req.body;
    if (!name || !url) {
      return res.status(400).json({ success: false, message: 'Link name and URL are required' });
    }

    let badge = targetBadge;
    if (!badge) {
      if (target === 'Leads') badge = 'badge-success';
      else if (target === 'EV Pilots') badge = 'badge-info';
      else badge = 'badge-primary';
    }

    link.name = name.trim();
    if (target) link.target = target;
    link.targetBadge = badge;
    link.url = url.trim();

    await link.save();

    res.json({
      success: true,
      message: 'Campaign link updated successfully',
      link
    });
  } catch (error) {
    console.error('Error updating campaign link:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc   Delete a saved campaign link
// @route  DELETE /api/campaign-links/:id
router.delete('/:id', async (req, res) => {
  try {
    const canDelete = await checkActionPermission(req.user, 'canDelete');
    if (!canDelete) {
      return res.status(403).json({ success: false, message: 'Permission denied: Only administrators can delete company links' });
    }

    const link = await CampaignLink.findByPk(req.params.id);
    if (!link) {
      return res.status(404).json({ success: false, message: 'Link not found' });
    }

    await link.destroy();
    res.json({ success: true, message: 'Campaign link deleted successfully' });
  } catch (error) {
    console.error('Error deleting campaign link:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @desc   Restore standard company links
// @route  POST /api/campaign-links/restore-defaults
router.post('/restore-defaults', async (req, res) => {
  try {
    const canDelete = await checkActionPermission(req.user, 'canDelete');
    if (!canDelete) {
      return res.status(403).json({ success: false, message: 'Permission denied: Only administrators can restore standard links' });
    }

    await CampaignLink.destroy({ where: {} });
    await CampaignLink.bulkCreate(DEFAULT_LINKS);

    const links = await CampaignLink.findAll({
      order: [
        ['isOfficial', 'DESC'],
        ['createdAt', 'DESC']
      ]
    });

    res.json({
      success: true,
      message: 'Standard official links restored',
      links
    });
  } catch (error) {
    console.error('Error restoring default campaign links:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
