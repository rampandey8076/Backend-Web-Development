'use strict';

const rateLimit = require('express-rate-limit');

const WINDOW_MS = 15 * 60 * 1000;

const authLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,

  handler: (req, res) => {
    const resetTime = req.rateLimit && req.rateLimit.resetTime;

    const retryAfter = resetTime instanceof Date
      ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
      : Math.ceil(WINDOW_MS / 1000);

    res.set('Retry-After', String(retryAfter));

    return res.status(429).json({
      error: 'Too many requests, please try again later.',
    });
  },
});

// Production scaling note:
// The default in-memory store keeps counters separately in each Node.js
// process. Behind a load balancer, requests distributed across multiple
// instances can therefore receive a separate quota on each instance.
// For a multi-instance deployment, rate-limit-redis can replace the default
// store with a RedisStore connected to shared Redis counters. All instances
// then enforce the same limit instead of maintaining independent counters.

module.exports = authLimiter;
