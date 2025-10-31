/**
 * API Key Authentication Middleware
 * Validates Bearer token from Authorization header
 */

const logger = require('../utils/logger');

/**
 * Authenticate API key from Authorization header
 */
function authenticateApiKey(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    logger.warn('Request missing Authorization header', {
      ip: req.ip,
      path: req.path
    });

    return res.status(401).json({
      success: false,
      error: 'Missing Authorization header'
    });
  }

  if (!authHeader.startsWith('Bearer ')) {
    logger.warn('Invalid Authorization header format', {
      ip: req.ip,
      path: req.path
    });

    return res.status(401).json({
      success: false,
      error: 'Authorization header must use Bearer scheme'
    });
  }

  const providedKey = authHeader.substring(7); // Remove 'Bearer '
  const expectedKey = process.env.BITNEST_API_KEY;

  if (!expectedKey) {
    logger.error('BITNEST_API_KEY not configured');

    return res.status(500).json({
      success: false,
      error: 'Server configuration error'
    });
  }

  if (providedKey !== expectedKey) {
    logger.warn('Invalid API key', {
      ip: req.ip,
      path: req.path
    });

    return res.status(403).json({
      success: false,
      error: 'Invalid API key'
    });
  }

  // Authentication successful
  logger.info('Request authenticated', {
    ip: req.ip,
    path: req.path
  });

  next();
}

module.exports = authenticateApiKey;
