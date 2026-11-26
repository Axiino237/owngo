const express = require('express');
const router = express.Router();
const { ChatServer, ChatMessage, Company, User, Role, Department } = require('../models');
const { protect, adminOnly } = require('../middleware/auth');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');

// Helper to broadcast new messages via Socket.io
const emitChatMessage = (req, msg) => {
  const io = req.app.get('io');
  const activeUsers = req.app.get('activeUsers');
  if (!io) return;

  const senderName = msg.sender?.name || req.user?.name || 'Team Member';
  const isEncrypted = typeof msg.message === 'string' && msg.message.startsWith('{"encryptedPayload"');
  const preview = isEncrypted
    ? '🔒 Encrypted message'
    : (msg.message ? (msg.message.length > 50 ? msg.message.slice(0, 50) + '...' : msg.message) : 'Sent a message');

  const event = {
    type: 'new_message',
    message: msg,
    senderId: msg.senderId,
    senderName: senderName,
    receiverId: msg.receiverId,
    chatServerId: msg.chatServerId,
    companyId: msg.companyId,
    channelId: msg.receiverId ? msg.senderId : (msg.chatServerId || msg.companyId),
    channelName: msg.receiverId ? senderName : (msg.chatServerId ? 'Workspace' : 'Company Channel'),
    preview: preview,
    isEncrypted: isEncrypted
  };

  if (msg.receiverId) {
    // 1. Direct Message to targeted RECEIVER ONLY: this triggers the notification
    const receiverEvent = { ...event, isSenderCopy: false };
    io.to(`user_${msg.receiverId}`).emit('new_message', receiverEvent);
    io.to(`user_${String(msg.receiverId)}`).emit('new_message', receiverEvent);

    const receiverSockets = activeUsers?.get(msg.receiverId) || activeUsers?.get(String(msg.receiverId)) || activeUsers?.get(Number(msg.receiverId));
    if (receiverSockets) {
      receiverSockets.forEach(sid => io.to(sid).emit('new_message', receiverEvent));
    }

    // 1b. Deliver via Web Push (wakes up browser even when completely closed)
    try {
      const { sendPushToUser } = require('../utils/webPush');
      sendPushToUser(msg.receiverId, {
        title: `💬 ${senderName}`,
        body: preview,
        url: `/chat?userId=${msg.senderId}`,
        tag: `chat-${msg.senderId}-${Date.now()}`,
        data: {
          type: 'chat',
          userId: String(msg.senderId),
          senderName: senderName
        }
      }).catch(pushErr => console.warn('[Chat WebPush error]:', pushErr.message));
    } catch (e) {}

    // 2. Sender copy: updates sender's other open chat tabs, but with isSenderCopy: true so NO notifications/alerts ever trigger
    const senderCopyEvent = { ...event, isSenderCopy: true };
    io.to(`user_${msg.senderId}`).emit('new_message', senderCopyEvent);
    io.to(`user_${String(msg.senderId)}`).emit('new_message', senderCopyEvent);

    const senderSockets = activeUsers?.get(msg.senderId) || activeUsers?.get(String(msg.senderId)) || activeUsers?.get(Number(msg.senderId));
    if (senderSockets) {
      senderSockets.forEach(sid => io.to(sid).emit('new_message', senderCopyEvent));
    }
  } else if (msg.companyId) {
    // Company Channel: emit to company room
    io.to(`company_${msg.companyId}`).emit('new_message', event);
  } else if (msg.chatServerId) {
    // Global Chat: emit to organization room
    io.to(`org_${msg.organizationId}`).emit('new_message', event);
  }
};

router.use(protect);

// @desc   Get WhatsApp-style unread message counts for current user grouped by sender
// @route  GET /api/chat/unread-counts
router.get('/unread-counts', async (req, res) => {
  try {
    const unreadList = await ChatMessage.findAll({
      where: {
        receiverId: req.user.id,
        isRead: false
      },
      attributes: [
        'senderId',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['senderId'],
      raw: true
    });

    const counts = {};
    if (Array.isArray(unreadList)) {
      unreadList.forEach(item => {
        const senderId = item.senderId;
        const count = parseInt(item.count || 0, 10);
        if (senderId && count > 0) {
          counts[senderId] = count;
        }
      });
    }

    res.json({ success: true, counts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching unread counts', error: error.message });
  }
});

// @desc   Mark messages from a specific sender as read
// @route  POST /api/chat/mark-read
router.post('/mark-read', async (req, res) => {
  try {
    const { senderId } = req.body;
    if (!senderId) {
      return res.status(400).json({ success: false, message: 'senderId is required' });
    }

    await ChatMessage.update(
      { isRead: true },
      {
        where: {
          receiverId: req.user.id,
          senderId: senderId,
          isRead: false
        }
      }
    );

    res.json({ success: true, message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error marking read', error: error.message });
  }
});

// Helper to get organizationId (strictly respecting user's assigned organization)
const getOrgId = (req) => {
  return req.user.organizationId || null;
};

// @desc   Get all chat servers and unassigned companies in user's organization
// @route  GET /api/chat/servers
router.get('/servers', async (req, res) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) {
      return res.json({ success: true, servers: [], companies: [] });
    }

    // Get all chat servers in org
    const servers = await ChatServer.findAll({
      where: { organizationId: orgId },
      include: [{ model: Company, as: 'companies', attributes: ['id', 'name', 'code'] }],
      order: [['name', 'ASC']]
    });

    // Get all companies in org (to show which are unassigned / available)
    const companies = await Company.findAll({
      where: { organizationId: orgId },
      attributes: ['id', 'name', 'code', 'chatServerId'],
      order: [['name', 'ASC']]
    });

    res.json({ success: true, servers, companies });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error retrieving chat servers', error: error.message });
  }
});

// @desc   Create a chat server (Org/Super Admin only)
// @route  POST /api/chat/server
router.post('/server', adminOnly, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Server name is required' });
    }

    const orgId = await getOrgId(req);
    if (!orgId) {
      return res.status(400).json({ success: false, message: 'User does not belong to an organization' });
    }

    const server = await ChatServer.create({
      name,
      organizationId: orgId
    });

    res.status(201).json({ success: true, message: 'Chat server created successfully', server });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error creating chat server', error: error.message });
  }
});

// @desc   Update a chat server name and company links (Org/Super Admin only)
// @route  PUT /api/chat/server/:id
router.put('/server/:id', adminOnly, async (req, res) => {
  try {
    const { name, companyIds } = req.body;
    const server = await ChatServer.findByPk(req.params.id);
    if (!server) {
      return res.status(404).json({ success: false, message: 'Chat server not found' });
    }

    const orgId = await getOrgId(req);
    if (!orgId) {
      return res.status(400).json({ success: false, message: 'User does not belong to an organization' });
    }

    // Update name if provided
    if (name) {
      await server.update({ name });
    }

    // Update linked companies if provided
    if (companyIds && Array.isArray(companyIds)) {
      // First, unlink all companies previously linked to this server
      await Company.update({ chatServerId: null }, { where: { chatServerId: server.id } });

      // Link new companies
      if (companyIds.length > 0) {
        await Company.update(
          { chatServerId: server.id },
          { where: { id: { [Op.in]: companyIds }, organizationId: orgId } }
        );
      }
    }

    res.json({ success: true, message: 'Chat server updated successfully', server });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error updating chat server', error: error.message });
  }
});

// @desc   Delete a chat server (Org/Super Admin only)
// @route  DELETE /api/chat/server/:id
router.delete('/server/:id', adminOnly, async (req, res) => {
  try {
    const server = await ChatServer.findByPk(req.params.id);
    if (!server) {
      return res.status(404).json({ success: false, message: 'Chat server not found' });
    }

    // Unlink all companies from this server
    await Company.update({ chatServerId: null }, { where: { chatServerId: server.id } });

    // Delete server
    await server.destroy();

    res.json({ success: true, message: 'Chat server deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error deleting chat server', error: error.message });
  }
});

// @desc   Get unread message counts per user (DM) for WhatsApp-style badges
// @route  GET /api/chat/unread-counts
router.get('/unread-counts', async (req, res) => {
  try {
    const unreadRows = await ChatMessage.findAll({
      where: {
        receiverId: req.user.id,
        isRead: false
      },
      attributes: [
        'senderId',
        [ChatMessage.sequelize.fn('COUNT', ChatMessage.sequelize.col('id')), 'count']
      ],
      group: ['senderId'],
      raw: true
    });

    const counts = {};
    unreadRows.forEach(r => {
      counts[r.senderId] = parseInt(r.count, 10) || 0;
    });

    res.json({ success: true, counts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching unread counts', error: error.message });
  }
});

// @desc   Mark messages as read from a sender
// @route  POST /api/chat/mark-read
router.post('/mark-read', async (req, res) => {
  try {
    const { senderId } = req.body;
    if (senderId) {
      await ChatMessage.update(
        { isRead: true },
        {
          where: {
            receiverId: req.user.id,
            senderId: senderId,
            isRead: false
          }
        }
      );
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error marking messages as read', error: error.message });
  }
});

// @desc   Get message history for a channel (server, company private, or one-on-one DM)
// @route  GET /api/chat/messages
router.get('/messages', async (req, res) => {
  try {
    const { chatServerId, companyId, receiverId } = req.query;
    
    const orgId = await getOrgId(req);
    if (!orgId) {
      return res.status(400).json({ success: false, message: 'User does not belong to an organization' });
    }

    const whereClause = { organizationId: orgId };
    
    if (receiverId) {
      // Direct Message history between req.user.id and receiverId
      const currentUserId = req.user.id;
      whereClause[Op.and] = [
        {
          [Op.or]: [
            { senderId: currentUserId, receiverId: receiverId },
            { senderId: receiverId, receiverId: currentUserId }
          ]
        },
        { chatServerId: null },
        { companyId: null }
      ];

      // Auto-mark incoming messages from receiverId as read
      await ChatMessage.update(
        { isRead: true },
        {
          where: {
            receiverId: req.user.id,
            senderId: receiverId,
            isRead: false
          }
        }
      ).catch(() => {});
    } else if (chatServerId) {
      // User must have access to this server (must belong to a company assigned to this server, or be an admin)
      const server = await ChatServer.findByPk(chatServerId);
      if (!server || server.organizationId !== orgId) {
        return res.status(403).json({ success: false, message: 'Unauthorized server access' });
      }

      if (!req.user.isSuperAdmin && !['super_admin', 'org_admin'].includes(req.user.role?.level)) {
        const userCompany = await Company.findByPk(req.user.companyId);
        if (!userCompany || userCompany.chatServerId !== chatServerId) {
          return res.status(403).json({ success: false, message: 'Access denied to this chat workspace' });
        }
      }
      whereClause.chatServerId = chatServerId;
      whereClause.receiverId = null;
    } else if (companyId) {
      // User must belong to this company (or be an admin)
      if (!req.user.isSuperAdmin && !['super_admin', 'org_admin'].includes(req.user.role?.level) && req.user.companyId !== companyId) {
        return res.status(403).json({ success: false, message: 'Access denied to this company workspace' });
      }
      whereClause.companyId = companyId;
      whereClause.chatServerId = null;
      whereClause.receiverId = null;
    } else {
      return res.status(400).json({ success: false, message: 'Either chatServerId, companyId, or receiverId is required' });
    }

    const messages = await ChatMessage.findAll({
      where: whereClause,
      attributes: ['id', 'senderId', 'receiverId', 'message', 'isRead', 'chatServerId', 'companyId', 'organizationId', 'createdAt'],
      include: [
        { 
          model: User, 
          as: 'sender', 
          attributes: ['id', 'name', 'avatar']
        }
      ],
      order: [['createdAt', 'ASC']],
      limit: 150
    });

    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error retrieving messages', error: error.message });
  }
});

// @desc   Send a chat message
// @route  POST /api/chat/message
router.post('/message', async (req, res) => {
  try {
    const { message, chatServerId, companyId, receiverId } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    const orgId = await getOrgId(req);
    if (!orgId) {
      return res.status(400).json({ success: false, message: 'User does not belong to an organization' });
    }

    const data = {
      senderId: req.user.id,
      message,
      organizationId: orgId
    };

    if (receiverId) {
      data.receiverId = receiverId;
      data.chatServerId = null;
      data.companyId = null;
    } else if (chatServerId) {
      data.chatServerId = chatServerId;
      data.companyId = null;
      data.receiverId = null;
    } else if (companyId) {
      data.companyId = companyId;
      data.chatServerId = null;
      data.receiverId = null;
    } else {
      return res.status(400).json({ success: false, message: 'Target channel or receiver is required' });
    }

    const newMessage = await ChatMessage.create(data);

    // Fetch message with sender details populated for instant rendering
    const msg = await ChatMessage.findByPk(newMessage.id, {
      include: [
        { 
          model: User, 
          as: 'sender', 
          attributes: ['id', 'name', 'email', 'avatar'],
          include: [
            { model: Company, as: 'company', attributes: ['id', 'name'] },
            { model: Role, as: 'role', attributes: ['id', 'name'] },
            { model: Department, as: 'department', attributes: ['id', 'name'] }
          ]
        }
      ]
    });

    // Broadcast message via Socket.io in real-time
    emitChatMessage(req, msg);

    res.status(201).json({ success: true, message: msg });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error sending message', error: error.message });
  }
});

// @desc   Get members list that the current user is allowed to chat/DM with
// @route  GET /api/chat/members
router.get('/members', async (req, res) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) {
      return res.json({ success: true, members: [] });
    }

    let targetCompanyIds = [];

    // Admins can see all companies members in the organization
    const isAdminRole = req.user.isSuperAdmin || ['super_admin', 'org_admin'].includes(req.user.role?.level);
    if (isAdminRole) {
      const companies = await Company.findAll({ where: { organizationId: orgId } });
      targetCompanyIds = companies.map(c => c.id);
    } else {
      // Find current user's company and check its chatServerId
      const userCompany = await Company.findByPk(req.user.companyId);
      if (userCompany && userCompany.chatServerId) {
        // Linked to a workspace server: get all companies sharing this server
        const connectedCompanies = await Company.findAll({
          where: { chatServerId: userCompany.chatServerId, organizationId: orgId }
        });
        targetCompanyIds = connectedCompanies.map(c => c.id);
      } else {
        // Isolated: can only see members of their own company
        targetCompanyIds = req.user.companyId ? [req.user.companyId] : [];
      }
    }

    // Get all active users in target companies (excluding current user)
    const users = await User.findAll({
      where: { 
        companyId: { [Op.in]: targetCompanyIds }, 
        organizationId: orgId,
        isActive: true,
        id: { [Op.ne]: req.user.id } // Exclude myself from member list for cleaner DMs listing
      },
      attributes: ['id', 'name', 'email', 'avatar', 'lastActiveAt', 'publicKey'],
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name'] },
        { model: Role, as: 'role', attributes: ['id', 'name'] },
        { model: Department, as: 'department', attributes: ['id', 'name'] }
      ],
      order: [['name', 'ASC']]
    });

    const activeUsers = req.app.get('activeUsers');
    const cutoff = new Date(Date.now() - 180000); // 3 minutes ago
    const members = users.map(u => {
      const isOnline = (activeUsers && activeUsers.has(u.id)) || (u.lastActiveAt && new Date(u.lastActiveAt) > cutoff);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        avatar: u.avatar,
        companyName: u.company?.name || 'Unassigned',
        roleName: u.role?.name || 'User',
        deptName: u.department?.name || 'Unassigned',
        isOnline: !!isOnline,
        publicKey: u.publicKey
      };
    });

    res.json({ success: true, members });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching members', error: error.message });
  }
});

// @desc   Get single member details for direct chat opening (Accessible to all authenticated users)
// @route  GET /api/chat/member/:id
router.get('/member/:id', async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const orgId = getOrgId(req);
    if (!orgId) {
      return res.status(400).json({ success: false, message: 'User does not belong to an organization' });
    }

    const user = await User.findOne({
      where: { id: targetUserId, organizationId: orgId },
      attributes: ['id', 'name', 'email', 'avatar', 'publicKey', 'lastActiveAt'],
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name'] },
        { model: Role, as: 'role', attributes: ['id', 'name'] },
        { model: Department, as: 'department', attributes: ['id', 'name'] }
      ]
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const activeUsers = req.app.get('activeUsers');
    const cutoff = new Date(Date.now() - 180000);
    const isOnline = (activeUsers && activeUsers.has(user.id)) || (user.lastActiveAt && new Date(user.lastActiveAt) > cutoff);

    res.json({
      success: true,
      member: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        companyName: user.company?.name || 'Unassigned',
        roleName: user.role?.name || 'User',
        deptName: user.department?.name || 'Unassigned',
        isOnline: !!isOnline,
        publicKey: user.publicKey
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching member profile', error: error.message });
  }
});

module.exports = router;
