/**
 * Rate Limiting Middleware
 * Prevents API abuse - max 60 requests per hour
 */

const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 3600000, // 1 hour
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 60,
  message: {
    success: false,
    error: 'Too many requests, please try again later',
    retryAfter: '1 hour'
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path
    });

    res.status(429).json({
      success: false,
      error: 'Too many requests from this IP, please try again after an hour',
      retryAfter: 3600 // seconds
    });
  },
  skip: (req) => {
    // Skip rate limiting for health check
    return req.path === '/health';
  }
});

module.exports = limiter;
