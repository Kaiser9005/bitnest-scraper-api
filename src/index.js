/**
 * BitNest Scraper API - Express Server
 *
 * Webhook API for extracting BitNest indicators
 * Used by Google Apps Script for hourly automation
 */

require('dotenv').config();

const express = require('express');
const logger = require('./utils/logger');
const cache = require('./utils/cache');
const authenticateApiKey = require('./middleware/auth');
const rateLimiter = require('./middleware/rateLimiter');
const { extractWithRetry } = require('./scraper');
const { extractBitnestDataFromTelegram } = require('./telegramScraper');
const { crossValidate } = require('./validators/crossValidator');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(rateLimiter);

// Request logging
app.use((req, res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip
  });
  next();
});

/**
 * GET /health
 * Health check endpoint for Railway/Render
 */
app.get('/health', (req, res) => {
  const uptime = process.uptime();
  const cacheAge = cache.getAge();

  res.json({
    status: 'healthy',
    uptime_seconds: Math.floor(uptime),
    cache_valid: cache.isValid(),
    cache_age_ms: cacheAge,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/scrape-bitnest
 * Main extraction endpoint - requires API key authentication
 */
app.get('/api/scrape-bitnest', authenticateApiKey, async (req, res) => {
  try {
    logger.info('Scraping request received');

    // Check cache first
    const cachedData = cache.get();
    if (cachedData) {
      logger.info('Returning cached data', {
        cacheAgeMs: cache.getAge()
      });

      return res.json({
        success: true,
        data: cachedData.data,
        metadata: {
          ...cachedData.metadata,
          cached: true,
          cache_age_ms: cache.getAge()
        }
      });
    }

    // Cache miss - extract from website
    logger.info('Cache miss - extracting from website');

    const result = await extractWithRetry(
      parseInt(process.env.MAX_RETRIES) || 3
    );

    // Cache successful extractions
    if (result.success) {
      cache.set(result);

      logger.info('Extraction successful - data cached', {
        extractionTimeMs: result.metadata.extraction_time_ms
      });
    } else {
      logger.warn('Extraction failed - returning fallback data', {
        error: result.error
      });
    }

    res.json(result);

  } catch (error) {
    logger.error('Unexpected error in scrape endpoint', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/scrape-telegram
 * Telegram extraction endpoint - requires API key authentication
 * Extracts data from BitnestMonitor Telegram channel
 */
app.get('/api/scrape-telegram', authenticateApiKey, async (req, res) => {
  try {
    logger.info('Telegram scraping request received');

    const result = await extractBitnestDataFromTelegram();

    if (result.success) {
      logger.info('Telegram extraction successful', {
        extractionTimeMs: result.metadata.extraction_time_ms
      });
    } else {
      logger.warn('Telegram extraction failed', {
        error: result.error
      });
    }

    res.json(result);

  } catch (error) {
    logger.error('Unexpected error in Telegram scrape endpoint', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/scrape-dual
 * Dual-source extraction with cross-validation
 * Calls both Playwright and Telegram, validates results
 */
app.get('/api/scrape-dual', authenticateApiKey, async (req, res) => {
  try {
    logger.info('Dual-source scraping request received');

    const startTime = Date.now();

    // Execute both extractions in parallel
    const [webhookResult, telegramResult] = await Promise.allSettled([
      extractWithRetry(parseInt(process.env.MAX_RETRIES) || 3),
      extractBitnestDataFromTelegram()
    ]);

    // Convert Promise.allSettled results to standard format
    const webhook = webhookResult.status === 'fulfilled'
      ? webhookResult.value
      : { success: false, error: webhookResult.reason?.message || 'Webhook extraction failed' };

    const telegram = telegramResult.status === 'fulfilled'
      ? telegramResult.value
      : { success: false, error: telegramResult.reason?.message || 'Telegram extraction failed' };

    // Cross-validate the results
    const validatedResult = crossValidate(webhook, telegram);

    // Add total execution time
    validatedResult.metadata.total_request_time_ms = Date.now() - startTime;

    logger.info('Dual-source extraction completed', {
      validation_status: validatedResult.validation.status,
      sources_used: validatedResult.validation.sources_used,
      total_time_ms: validatedResult.metadata.total_request_time_ms
    });

    res.json(validatedResult);

  } catch (error) {
    logger.error('Unexpected error in dual-source scrape endpoint', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

/**
 * Global error handler
 */
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

/**
 * Start server
 */
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 BitNest Scraper API started`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    cacheTtlMs: cache.ttl
  });

  // Log configuration
  logger.info('Configuration loaded', {
    port: PORT,
    cacheTtl: cache.ttl,
    rateLimitWindow: process.env.RATE_LIMIT_WINDOW_MS || 3600000,
    rateLimitMax: process.env.RATE_LIMIT_MAX_REQUESTS || 60,
    playwrightTimeout: process.env.PLAYWRIGHT_TIMEOUT_MS || 30000,
    maxRetries: process.env.MAX_RETRIES || 3
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});
