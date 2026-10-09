const crypto = require('crypto');

const sessions = new Map();

function create(userId, ttlMs) {
  const now = Date.now();
  const duration = Number(ttlMs);

  if (!Number.isSafeInteger(duration) || duration <= 0) {
    throw new Error('Invalid session duration');
  }

  let sid;
  do {
    sid = crypto.randomBytes(32).toString('hex');
  } while (sessions.has(sid));

  const session = {
    userId,
    expiresAt: now + duration,
  };

  sessions.set(sid, session);
  return { sid, session };
}

function get(sid) {
  if (typeof sid !== 'string' || !sid) return null;

  const session = sessions.get(sid);
  if (!session) return null;

  if (session.expiresAt <= Date.now()) {
    sessions.delete(sid);
    return null;
  }

  return { ...session };
}

function destroy(sid) {
  if (typeof sid !== 'string' || !sid) return false;
  return sessions.delete(sid);
}

module.exports = { create, get, destroy };
