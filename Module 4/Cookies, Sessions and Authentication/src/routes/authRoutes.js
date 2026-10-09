const express = require('express');
const bcrypt = require('bcryptjs');
const sessionStore = require('../session/sessionStore');
const userRepository = require('../db/userRepository');
const requireSession = require('../middleware/requireSession');

const router = express.Router();

const configuredTtl = Number(process.env.SESSION_TTL_MS || 3600000);
const SESSION_TTL_MS =
  Number.isSafeInteger(configuredTtl) && configuredTtl > 0
    ? configuredTtl
    : 3600000;

const COOKIE_NAME = 'sid';

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure:
    process.env.NODE_ENV === 'production' ||
    process.env.COOKIE_SECURE === 'true',
  path: '/',
  maxAge: SESSION_TTL_MS,
};

function sendUnauthorized(res) {
  return res.status(401).json({
    error: {
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password',
    },
  });
}

function isValidEmail(email) {
  return (
    typeof email === 'string' &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

function safeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

router.post('/login', async (req, res) => {
  try {
    const email =
      typeof req.body?.email === 'string'
        ? req.body.email.trim().toLowerCase()
        : '';

    const password =
      typeof req.body?.password === 'string'
        ? req.body.password
        : '';

    if (!isValidEmail(email) || password.length === 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'A valid email and password are required',
        },
      });
    }

    const user = await userRepository.findUserByEmail(email);

    // Keep unknown-user and incorrect-password responses identical.
    if (!user) return sendUnauthorized(res);

    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatches) return sendUnauthorized(res);

    const { sid } = sessionStore.create(user.id, SESSION_TTL_MS);

    res.cookie(COOKIE_NAME, sid, {
      ...cookieOptions,
      signed: true,
    });

    return res.status(200).json({
      user: safeUser(user),
    });
  } catch {
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
});

router.get('/me', requireSession, (req, res) => {
  return res.status(200).json({
    user: req.user,
  });
});

router.post('/logout', (req, res) => {
  try {
    const sid = req.signedCookies && req.signedCookies.sid;

    if (typeof sid === 'string' && sid) {
      sessionStore.destroy(sid);
    }

    res.clearCookie(COOKIE_NAME, {
      httpOnly: cookieOptions.httpOnly,
      sameSite: cookieOptions.sameSite,
      secure: cookieOptions.secure,
      path: cookieOptions.path,
      signed: true,
    });

    return res.status(204).end();
  } catch {
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
});

module.exports = router;
