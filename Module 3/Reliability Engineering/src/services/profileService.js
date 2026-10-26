const DEFAULT_AVATAR = {
  url: 'https://cdn.aurora-profiles.dev/avatars/default.png',
  initials: '?',
  source: 'fallback',
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryable(error) {
  if (!error) return false;

  if (error.name === 'AbortError') return true;

  const status = Number(error.status ?? error.statusCode);

  if (Number.isFinite(status) && status > 0) {
    return status === 429 || status >= 500;
  }

  const networkCodes = new Set([
    'ECONNRESET',
    'ECONNREFUSED',
    'ECONNABORTED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'EAI_AGAIN',
    'EPIPE',
    'ERR_NETWORK',
    'ERR_INTERNET_DISCONNECTED',
  ]);

  if (networkCodes.has(error.code)) return true;

  // Fetch commonly reports network failures as TypeError.
  if (error.name === 'TypeError') return true;

  // Errors without an HTTP status are treated as network failures.
  return !Number.isFinite(status);
}

async function withTimeout(operation, timeoutMs) {
  const controller = new AbortController();
  let timer;

  const timeoutError = new Error('Operation timed out');
  timeoutError.name = 'AbortError';

  const timeoutPromise = new Promise((resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(timeoutError);
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      Promise.resolve().then(() => operation(controller.signal)),
      timeoutPromise,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function withRetry(operation, options = {}) {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 25;

  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new RangeError('maxAttempts must be a positive integer');
  }

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const finalAttempt = attempt === maxAttempts - 1;

      if (finalAttempt || !isRetryable(error)) {
        throw error;
      }

      await sleep(baseDelayMs * (2 ** attempt));
    }
  }
}

async function getProfileWithAvatar(authorId, avatarClient, options = {}) {
  const timeoutMs = options.timeoutMs ?? 200;
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 25;

  try {
    const avatar = await withRetry(
      () => withTimeout(
        signal => avatarClient.getAvatar(authorId, { signal }),
        timeoutMs
      ),
      { maxAttempts, baseDelayMs }
    );

    return {
      authorId,
      avatar,
      degraded: false,
    };
  } catch (error) {
    return {
      authorId,
      avatar: DEFAULT_AVATAR,
      degraded: true,
    };
  }
}

module.exports = {
  DEFAULT_AVATAR,
  sleep,
  isRetryable,
  withTimeout,
  withRetry,
  getProfileWithAvatar,
};
