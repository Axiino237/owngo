const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const { JobRequest, JobRequestStatus, User, Organization } = require('../models');
const { protect } = require('../middleware/auth');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');

const cleanPhone = (phone) => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const parseCSV = (buffer) => {
  const text = buffer.toString('utf8');
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (const ch of lines[i]) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
      else current += ch;
    }
    values.push(current.trim());

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row);
  }
  return { headers, rows };
};

// ==========================================
// 1. PUBLIC WEBSITE INTAKE FOR EV PILOTS
// ==========================================
router.post('/website', async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      city = 'Chennai',
      preferredArea,
      licenseType = 'Commercial 3-Wheeler Auto Badge',
      experience = '2 to 5 Years',
      source = 'Website Pilot Form',
      sourceLink,
      notes
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Driver name and phone number are required' });
    }

    // Find default OwnGo organization
    const org = await Organization.findOne({ where: { code: 'OWNGO' } });
    const orgId = org ? org.id : null;

    // Check for existing pending request with same phone
    let candidate = await JobRequest.findOne({
      where: {
        phone: phone.trim(),
        ...(orgId ? { organizationId: orgId } : {})
      }
    });

    if (candidate) {
      // Append to notes
      const updatedNotes = [
        candidate.notes || '',
        `[${new Date().toLocaleString()}] Re-applied via Website Pilot Form: Area=${preferredArea || 'N/A'}, Exp=${experience || 'N/A'}`
      ].filter(Boolean).join('\n');

      await candidate.update({
        name: name.trim(),
        email: email ? email.trim() : candidate.email,
        preferredArea: preferredArea || candidate.preferredArea,
        licenseType: licenseType || candidate.licenseType,
        experience: experience || candidate.experience,
        sourceLink: sourceLink || candidate.sourceLink,
        notes: updatedNotes
      });

      return res.json({
        success: true,
        message: 'Application updated successfully',
        data: candidate
      });
    }

    candidate = await JobRequest.create({
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : null,
      city: city || 'Chennai',
      preferredArea: preferredArea ? preferredArea.trim() : null,
      licenseType: licenseType || 'Commercial 3-Wheeler Auto Badge',
      experience: experience || '2 to 5 Years',
      source: source || 'Website Pilot Form',
      sourceLink: sourceLink || null,
      status: 'new',
      notes: notes || `Direct EV Pilot driver application from website form`,
      organizationId: orgId
    });

    // Broadcast live event via Socket.IO if available
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('job_request:new', candidate);
        io.emit('notification', {
          title: '🛺 New EV Pilot Candidate Application!',
          message: `${candidate.name} applied for EV Pilot Driver (${candidate.preferredArea || 'Chennai'})`,
          type: 'job_request',
          link: '/job-requests'
        });
      }
    } catch (sErr) {
      console.warn('Socket broadcast warning:', sErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'EV Pilot application received successfully',
      data: candidate
    });
  } catch (error) {
    console.error('Error handling website pilot submission:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// All routes below require auth
router.use(protect);

// ==========================================
// 2. GET ALL JOB REQUESTS / CANDIDATES
// ==========================================
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      status,
      preferredArea,
      city,
      licenseType,
      assignedTo,
      fromDate,
      toDate,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const where = {};

    // Organization filter
    if (req.user && req.user.organizationId) {
      where.organizationId = req.user.organizationId;
    }

    // Search filter
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      where[Op.or] = [
        { name: { [Op.iLike]: q } },
        { phone: { [Op.iLike]: q } },
        { email: { [Op.iLike]: q } },
        { preferredArea: { [Op.iLike]: q } },
        { city: { [Op.iLike]: q } },
        { notes: { [Op.iLike]: q } },
        { source: { [Op.iLike]: q } }
      ];
    }

    // Status filter
    if (status && status !== 'all') {
      where.status = status;
    }

    // Preferred Area filter
    if (preferredArea && preferredArea !== 'all') {
      where.preferredArea = { [Op.iLike]: `%${preferredArea}%` };
    }

    // City filter
    if (city && city !== 'all') {
      where.city = city;
    }

    // License Type filter
    if (licenseType && licenseType !== 'all') {
      where.licenseType = licenseType;
    }

    // Assigned To filter
    if (assignedTo && assignedTo !== 'all') {
      if (assignedTo === 'unassigned') {
        where.assignedTo = null;
      } else {
        where.assignedTo = assignedTo;
      }
    }

    // Date range filter
    if (fromDate && toDate) {
      where.createdAt = {
        [Op.between]: [new Date(`${fromDate}T00:00:00.000Z`), new Date(`${toDate}T23:59:59.999Z`)]
      };
    } else if (fromDate) {
      where.createdAt = { [Op.gte]: new Date(`${fromDate}T00:00:00.000Z`) };
    } else if (toDate) {
      where.createdAt = { [Op.lte]: new Date(`${toDate}T23:59:59.999Z`) };
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const { count, rows } = await JobRequest.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'name', 'email', 'avatar']
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit, 10),
      offset
    });

    // Compute status counts for candidate tabs
    const statusCountsRaw = await JobRequest.findAll({
      where: req.user && req.user.organizationId ? { organizationId: req.user.organizationId } : {},
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    }).catch(() => []);

    const statusCounts = {};
    let totalCount = 0;
    statusCountsRaw.forEach(item => {
      const c = parseInt(item.count, 10);
      statusCounts[item.status] = c;
      totalCount += c;
    });

    res.json({
      success: true,
      total: count,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(count / parseInt(limit, 10)),
      statusCounts: { all: totalCount, ...statusCounts },
      data: rows
    });
  } catch (error) {
    console.error('Error fetching job requests:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ==========================================
// 3. CREATE JOB REQUEST MANUALLY
// ==========================================
router.post('/', async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      city = 'Chennai',
      preferredArea,
      licenseType = 'Commercial 3-Wheeler Auto Badge',
      experience = '2 to 5 Years',
      source = 'Direct Entry',
      sourceLink,
      status = 'new',
      notes,
      assignedTo,
      nextFollowUp
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone are required' });
    }

    const candidate = await JobRequest.create({
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : null,
      city,
      preferredArea,
      licenseType,
      experience,
      source,
      sourceLink,
      status,
      notes,
      assignedTo: assignedTo || null,
      nextFollowUp: nextFollowUp || null,
      organizationId: req.user.organizationId || null
    });

    const fullCandidate = await JobRequest.findByPk(candidate.id, {
      include: [{ model: User, as: 'assignee', attributes: ['id', 'name', 'email'] }]
    });

    res.status(201).json({
      success: true,
      message: 'Job request created successfully',
      data: fullCandidate
    });
  } catch (error) {
    console.error('Error creating job request:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ==========================================
// 4. UPDATE JOB REQUEST / STATUS
// ==========================================
router.put('/:id', async (req, res) => {
  try {
    const candidate = await JobRequest.findByPk(req.params.id);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Job request not found' });
    }

    const {
      name,
      phone,
      email,
      city,
      preferredArea,
      licenseType,
      experience,
      source,
      sourceLink,
      status,
      notes,
      assignedTo,
      nextFollowUp,
      lastContactedDate
    } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (email !== undefined) updates.email = email ? email.trim() : null;
    if (city !== undefined) updates.city = city;
    if (preferredArea !== undefined) updates.preferredArea = preferredArea;
    if (licenseType !== undefined) updates.licenseType = licenseType;
    if (experience !== undefined) updates.experience = experience;
    if (source !== undefined) updates.source = source;
    if (sourceLink !== undefined) updates.sourceLink = sourceLink;
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    if (assignedTo !== undefined) updates.assignedTo = assignedTo || null;
    if (nextFollowUp !== undefined) updates.nextFollowUp = nextFollowUp || null;
    if (lastContactedDate !== undefined) updates.lastContactedDate = lastContactedDate || null;

    const previousStatus = candidate.status;
    await candidate.update(updates);

    const updatedCandidate = await JobRequest.findByPk(candidate.id, {
      include: [{ model: User, as: 'assignee', attributes: ['id', 'name', 'email'] }]
    });

    res.json({
      success: true,
      message: 'Job request updated successfully',
      data: updatedCandidate
    });
  } catch (error) {
    console.error('Error updating job request:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ==========================================
// 5. BULK DELETE
// ==========================================
router.delete('/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No candidate IDs provided' });
    }

    const deletedCount = await JobRequest.destroy({
      where: {
        id: { [Op.in]: ids },
        ...(req.user.organizationId ? { organizationId: req.user.organizationId } : {})
      }
    });

    res.json({
      success: true,
      message: `${deletedCount} job request(s) deleted successfully`,
      deletedCount
    });
  } catch (error) {
    console.error('Error deleting job requests:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ==========================================
// 6. SINGLE DELETE
// ==========================================
router.delete('/:id', async (req, res) => {
  try {
    const candidate = await JobRequest.findByPk(req.params.id);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Job request not found' });
    }

    await candidate.destroy();
    res.json({
      success: true,
      message: 'Job request deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting job request:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ==========================================
// 7. BULK CSV / EXCEL UPLOAD
// ==========================================
router.post('/bulk-upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a CSV or Excel file' });
    }

    const ext = req.file.originalname.split('.').pop().toLowerCase();
    const rows = [];

    if (ext === 'csv') {
      const parsed = parseCSV(req.file.buffer);
      rows.push(...parsed.rows);
    } else if (['xlsx', 'xls'].includes(ext)) {
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      rows.push(...xlsx.utils.sheet_to_json(sheet));
    } else {
      return res.status(400).json({ success: false, message: 'Unsupported file format. Please upload .csv or .xlsx' });
    }

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'The uploaded file contains no rows' });
    }

    const created = [];
    const skipped = [];
    const errors = [];

    const orgId = req.user.organizationId;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const normalized = {};
      Object.keys(row).forEach(k => {
        normalized[k.trim().toLowerCase().replace(/[^a-z0-9]/g, '')] = row[k];
      });

      const name = normalized['name'] || normalized['drivername'] || normalized['fullname'] || normalized['candidate'] || row['Name'];
      const phone = normalized['phone'] || normalized['phonenumber'] || normalized['mobile'] || normalized['contact'] || row['Phone'];
      const email = normalized['email'] || normalized['mail'] || null;
      const city = normalized['city'] || normalized['location'] || 'Chennai';
      const preferredArea = normalized['preferredarea'] || normalized['area'] || normalized['zone'] || null;
      const licenseType = normalized['licensetype'] || normalized['license'] || normalized['badgetype'] || 'Commercial 3-Wheeler Auto Badge';
      const experience = normalized['experience'] || normalized['drivingexperience'] || '2 to 5 Years';
      const source = normalized['source'] || normalized['leadsource'] || 'Bulk Upload';
      const sourceLink = normalized['sourcelink'] || normalized['url'] || null;
      const status = (normalized['status'] || 'new').toLowerCase().replace(/\s+/g, '_');
      const notes = normalized['notes'] || normalized['remarks'] || null;

      if (!name || !phone) {
        skipped.push({ row: i + 1, reason: 'Missing Name or Phone number' });
        continue;
      }

      try {
        const item = await JobRequest.create({
          name: String(name).trim(),
          phone: String(phone).trim(),
          email: email ? String(email).trim() : null,
          city: String(city).trim(),
          preferredArea: preferredArea ? String(preferredArea).trim() : null,
          licenseType: String(licenseType).trim(),
          experience: String(experience).trim(),
          source: String(source).trim(),
          sourceLink: sourceLink ? String(sourceLink).trim() : null,
          status,
          notes: notes ? String(notes).trim() : null,
          organizationId: orgId
        });
        created.push(item);
      } catch (rErr) {
        errors.push({ row: i + 1, error: rErr.message });
      }
    }

    res.json({
      success: true,
      message: `Bulk upload completed: ${created.length} imported, ${skipped.length} skipped, ${errors.length} failed`,
      summary: {
        totalRows: rows.length,
        imported: created.length,
        skipped: skipped.length,
        failed: errors.length
      },
      skipped,
      errors
    });
  } catch (error) {
    console.error('Error during bulk upload:', error);
    res.status(500).json({ success: false, message: 'Server error during upload', error: error.message });
  }
});

module.exports = router;
