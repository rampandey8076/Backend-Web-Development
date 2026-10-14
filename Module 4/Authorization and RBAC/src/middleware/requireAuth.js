const jwt = require('jsonwebtoken');

const ACCESS_SECRET =
  process.env.ACCESS_SECRET || 'kalvium-rbac-test-secret';

function requireAuth(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'A valid access token is required.'
      }
    });
  }

  const token = authorization.slice(7);

  try {
    const payload = jwt.verify(token, ACCESS_SECRET);

    if (
      typeof payload.sub !== 'string' ||
      typeof payload.role !== 'string'
    ) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'The access token is invalid.'
        }
      });
    }

    req.user = {
      id: payload.sub,
      role: payload.role
    };

    next();
  } catch {
    return res.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'The access token is invalid or expired.'
      }
    });
  }
}

module.exports = requireAuth;
