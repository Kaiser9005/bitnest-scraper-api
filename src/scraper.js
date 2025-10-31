/**
 * BitNest Scraper - Playwright extraction logic
 *
 * Extracts real-time indicators from bitnest.me/intro
 * Uses Playwright Chromium to execute JavaScript and extract data
 */

// IMPORTANT: Set Playwright browsers path BEFORE importing Playwright
// This ensures browsers are found in /app/.cache (accessible to scraper user)
process.env.PLAYWRIGHT_BROWSERS_PATH = '/app/.cache/ms-playwright';

// DEBUG: Log browser path configuration
console.log('🔍 PLAYWRIGHT_BROWSERS_PATH:', process.env.PLAYWRIGHT_BROWSERS_PATH);
console.log('🔍 Current user HOME:', process.env.HOME);
console.log('🔍 Process user:', process.env.USER);

const { chromium } = require('playwright');
const logger = require('./utils/logger');

// Cached fallback data (last known good values)
const CACHED_FALLBACK_DATA = {
  participants: 2110192,
  revenues: 752040501,
  liquidity: 30463309,
  timestamp: '2025-10-30T21:20:00Z',
  note: 'Cached data from last successful extraction'
};

/**
 * Extract BitNest indicators using Playwright
 * @returns {Promise<Object>} Extracted data or error with fallback
 */
async function extractBitnestData() {
  const startTime = Date.now();
  let browser = null;

  try {
    logger.info('Starting BitNest extraction');

    // Launch browser
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });

    // Create context with realistic browser profile
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    // Navigate with network idle wait
    await page.goto('https://bitnest.me/intro', {
      waitUntil: 'networkidle',
      timeout: parseInt(process.env.PLAYWRIGHT_TIMEOUT_MS) || 30000
    });

    // Wait for JavaScript to load data
    await page.waitForTimeout(parseInt(process.env.PLAYWRIGHT_WAIT_MS) || 5000);

    // Extract full page text
    const bodyText = await page.textContent('body');

    logger.info('Page content extracted', {
      textLength: bodyText.length
    });

    // Parse indicators with regex (same patterns as Python script)
    const participantsMatch = bodyText.match(/Participants[\s\n]+(\d{1,3}(?:,\d{3})*)/i);
    const revenuesMatch = bodyText.match(/Participant income[\s\n]+(\d{1,3}(?:,\d{3})*)[\s\n]+USDT/i);
    const liquidityMatch = bodyText.match(/Liquidity[\s\n]+(\d{1,3}(?:,\d{3})*)[\s\n]+USDT/i);

    // Parse and validate
    const participants = participantsMatch
      ? parseInt(participantsMatch[1].replace(/,/g, ''))
      : null;
    const revenues = revenuesMatch
      ? parseInt(revenuesMatch[1].replace(/,/g, ''))
      : null;
    const liquidity = liquidityMatch
      ? parseInt(liquidityMatch[1].replace(/,/g, ''))
      : null;

    // Validation - all fields must be present
    if (!participants || !revenues || !liquidity) {
      throw new Error(`Incomplete data extraction: participants=${participants}, revenues=${revenues}, liquidity=${liquidity}`);
    }

    // Sanity check - values should be reasonable
    if (participants < 1000000 || revenues < 100000000) {
      throw new Error(`Suspicious values detected: participants=${participants}, revenues=${revenues}`);
    }

    const extractionTime = Date.now() - startTime;

    logger.info('Extraction successful', {
      participants,
      revenues,
      liquidity,
      extractionTimeMs: extractionTime
    });

    return {
      success: true,
      data: {
        participants,
        revenues,
        liquidity,
        timestamp: new Date().toISOString()
      },
      metadata: {
        extraction_time_ms: extractionTime,
        browser: 'chromium',
        version: '1.0.0'
      }
    };

  } catch (error) {
    const extractionTime = Date.now() - startTime;

    logger.error('Extraction failed', {
      error: error.message,
      extractionTimeMs: extractionTime
    });

    return {
      success: false,
      error: error.message,
      fallback_data: CACHED_FALLBACK_DATA
    };

  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Extract with automatic retry logic
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Promise<Object>} Extraction result
 */
async function extractWithRetry(maxRetries = 3) {
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`Extraction attempt ${attempt}/${maxRetries}`);

      const result = await extractBitnestData();

      if (result.success) {
        return result;
      }

      // Extraction returned fallback data
      lastError = new Error(result.error);

      if (attempt < maxRetries) {
        const delay = parseInt(process.env.RETRY_DELAY_MS) || 2000;
        const backoffDelay = delay * attempt;

        logger.warn(`Attempt ${attempt} failed, retrying in ${backoffDelay}ms`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }

    } catch (error) {
      lastError = error;

      logger.error(`Attempt ${attempt} exception`, {
        error: error.message
      });

      if (attempt < maxRetries) {
        const delay = parseInt(process.env.RETRY_DELAY_MS) || 2000;
        const backoffDelay = delay * attempt;
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
  }

  // All retries failed
  logger.error('All retry attempts exhausted', {
    maxRetries,
    lastError: lastError?.message
  });

  return {
    success: false,
    error: lastError?.message || 'All retry attempts failed',
    fallback_data: CACHED_FALLBACK_DATA
  };
}

// Export functions
module.exports = {
  extractBitnestData,
  extractWithRetry
};

// Allow running as standalone script for testing
if (require.main === module) {
  (async () => {
    console.log('🧪 Testing BitNest scraper...\n');

    const result = await extractWithRetry(3);

    console.log('\n📊 Result:');
    console.log(JSON.stringify(result, null, 2));

    process.exit(result.success ? 0 : 1);
  })();
}
