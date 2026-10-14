function requireRole(...allowedRoles) {
  return (req, res, next) => {
    // Authentication must run before this middleware.
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication is required.'
        }
      });
    }

    // Trust only the role attached by verified authentication.
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to perform this action.'
        }
      });
    }

    next();
  };
}

module.exports = requireRole;
