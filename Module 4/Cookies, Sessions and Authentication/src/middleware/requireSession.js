const sessionStore = require('../session/sessionStore');
const userRepository = require('../db/userRepository');

function unauthorized(res) {
  return res.status(401).json({
    error: {
      code: 'UNAUTHENTICATED',
      message: 'Authentication required',
    },
  });
}

module.exports = async function requireSession(req, res, next) {
  try {
    const sid = req.signedCookies && req.signedCookies.sid;

    // cookie-parser returns false for an invalid signature.
    if (typeof sid !== 'string' || !sid) {
      return unauthorized(res);
    }

    const session = sessionStore.get(sid);
    if (!session) return unauthorized(res);

    const user = await userRepository.findSafeUserById(session.userId);

    // A deleted user must not retain an active session.
    if (!user) {
      sessionStore.destroy(sid);
      return unauthorized(res);
    }

    req.user = user;
    req.sessionId = sid;
    next();
  } catch {
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
};
