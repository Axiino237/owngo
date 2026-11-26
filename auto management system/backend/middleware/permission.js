const { Permission } = require('../models');

const checkPermission = (module, screen, action = 'canView') => {
  return async (req, res, next) => {
    try {
      // Safety guard: prevent locking out the permissions configuration screens themselves
      const isPermManager = module === 'permissions' && ['permissions-list', 'permission-edit'].includes(screen);
      if (req.user && req.user.isSuperAdmin && isPermManager) {
        return next();
      }

      // Executive bypass: Super Admin, Company Admin, or Director roles always have full access
      const isExec = req.user?.isSuperAdmin || 
                     req.user?.role?.level === 'super_admin' || 
                     req.user?.role?.level === 'company_admin' ||
                     req.user?.role?.code === 'SUPER_ADMIN' ||
                     req.user?.role?.code === 'DIRECTOR' ||
                     req.user?.role?.name?.toLowerCase().includes('director');
      if (isExec) {
        return next();
      }

      if (!req.user.roleId)
        return res.status(403).json({ success: false, message: 'No role assigned' });

      const permission = await Permission.findOne({
        where: { roleId: req.user.roleId, module, screen }
      });

      if (!permission) {
        return res.status(403).json({
          success: false,
          message: `Access denied: You don't have ${action} permission on ${module}/${screen}`
        });
      }

      if (!permission[action]) {
        return res.status(403).json({
          success: false,
          message: `Access denied: You don't have ${action} permission on ${module}/${screen}`
        });
      }

      req.permission = permission;
      next();
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Permission check failed', error: error.message });
    }
  };
};

module.exports = { checkPermission };
