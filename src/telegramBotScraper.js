/**
 * ================================================================
 * TELEGRAM BOT SCRAPER - Bot API Implementation
 * ================================================================
 *
 * Solution SIMPLE et STABLE pour extraction automatique des indicateurs
 * BitNest depuis le canal Telegram BitnestMonitor via Bot API.
 *
 * Utilise `node-telegram-bot-api` (Telegram Bot API officielle) pour:
 * - Lire messages d'un groupe/canal sans session management
 * - Extraction stable avec erreurs HTTP standard
 * - Authentication permanente via BOT_TOKEN (jamais d'expiration)
 *
 * Setup requis:
 * 1. Créer bot via @BotFather
 * 2. Créer groupe privé
 * 3. Ajouter bot comme admin du groupe
 * 4. Forwarder messages BitnestMonitor vers le groupe
 * 5. Configurer TELEGRAM_BOT_TOKEN et TELEGRAM_CHAT_ID
 */

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const logger = require('./utils/logger');

/**
 * Configuration Telegram Bot depuis variables d'environnement
 */
const TELEGRAM_BOT_CONFIG = {
  botToken: process.env.TELEGRAM_BOT_TOKEN,
  chatId: process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_BITNEST_CHANNEL
};

/**
 * Patterns regex pour extraction des indicateurs
 * Format réel BitnestMonitor (vérifié 31 Oct 2025 via MCP Telegram):
 * 💧 Liquidez: 22,137,315.46 USDT
 * 💧 Liquidez: 6,185,201.04 USDC
 * 🔢 Total: 28,322,516.50
 */
const INDICATOR_PATTERNS = {
  liquidityUSDT: /💧\s*Liquidez:\s*([\d,\.]+)\s*USDT/i,
  liquidityUSDC: /💧\s*Liquidez:\s*([\d,\.]+)\s*USDC/i,
  total: /🔢\s*Total:\s*([\d,\.]+)/i
};

/**
 * Parse un nombre avec séparateurs de milliers et décimales
 * Exemples: "22,137,315.46" → 22137315.46, "6,185,201.04" → 6185201.04
 */
function parseNumber(str) {
  if (!str) return null;
  // Remove thousand separators (commas), keep decimal point
  const cleaned = str.replace(/,/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Parse les indicateurs BitNest depuis le texte d'un message
 *
 * @param {string} text - Texte du message Telegram
 * @returns {Object} Indicateurs extraits ou null si invalide
 */
function parseIndicators(text) {
  if (!text || typeof text !== 'string') {
    return null;
  }

  // Extract liquidity components from BitnestMonitor format
  const liquidityUSDTMatch = text.match(INDICATOR_PATTERNS.liquidityUSDT);
  const liquidityUSDCMatch = text.match(INDICATOR_PATTERNS.liquidityUSDC);
  const totalMatch = text.match(INDICATOR_PATTERNS.total);

  // Total is the primary indicator we need
  if (!totalMatch) {
    return null;
  }

  const liquidityUSDT = liquidityUSDTMatch ? parseNumber(liquidityUSDTMatch[1]) : null;
  const liquidityUSDC = liquidityUSDCMatch ? parseNumber(liquidityUSDCMatch[1]) : null;
  const total = parseNumber(totalMatch[1]);

  // Validation: total must be a positive number
  if (!total || total <= 0) {
    return null;
  }

  return {
    liquidity: total,
    liquidity_usdt: liquidityUSDT,
    liquidity_usdc: liquidityUSDC,
    // Note: participants and revenues not available in current BitnestMonitor format
    // Messages only show contribution amounts and liquidity totals
    participants: null,
    revenues: null,
    timestamp: new Date().toISOString(),
    source: 'telegram_bot'
  };
}

/**
 * TelegramBotScraper - Client Bot API pour extraction canal BitnestMonitor
 */
class TelegramBotScraper {
  constructor() {
    this.bot = null;
    this.chatId = TELEGRAM_BOT_CONFIG.chatId;
  }

  /**
   * Initialise le client Bot API
   * Utilise polling: false car on va faire des requêtes manuelles
   */
  async connect() {
    if (this.bot) {
      logger.info('🤖 Telegram Bot already initialized');
      return;
    }

    try {
      if (!TELEGRAM_BOT_CONFIG.botToken) {
        throw new Error('TELEGRAM_BOT_TOKEN is required');
      }

      if (!this.chatId) {
        throw new Error('TELEGRAM_CHAT_ID or TELEGRAM_BITNEST_CHANNEL is required');
      }

      // Initialize bot with polling disabled (we'll use getUpdates manually)
      this.bot = new TelegramBot(TELEGRAM_BOT_CONFIG.botToken, {
        polling: false
      });

      // Test bot connection
      const me = await this.bot.getMe();

      logger.info('✅ Telegram Bot connected successfully', {
        bot_username: me.username,
        bot_id: me.id
      });
    } catch (error) {
      const errorMessage = error?.message || String(error) || 'Unknown error';

      logger.error('❌ Failed to connect Telegram Bot', {
        error: errorMessage,
        stack: error?.stack
      });
      throw new Error(`Bot connection failed: ${errorMessage}`);
    }
  }

  /**
   * Récupère les derniers messages du groupe/canal
   *
   * @param {number} limit - Nombre de messages à récupérer (default: 20)
   * @returns {Array} Liste des messages
   */
  async getMessages(limit = 20) {
    await this.connect();

    try {
      // Get updates (recent messages) from the chat
      const updates = await this.bot.getUpdates({
        limit: limit,
        timeout: 10,
        allowed_updates: ['message', 'channel_post']
      });

      // Filter messages from our target chat
      const messages = updates
        .map(update => update.message || update.channel_post)
        .filter(msg => msg && msg.chat && String(msg.chat.id) === String(this.chatId))
        .reverse(); // Most recent first

      logger.info(`📬 Retrieved ${messages.length} messages from chat ${this.chatId}`);

      return messages;
    } catch (error) {
      const errorMessage = error?.message || String(error) || 'Unknown error';

      logger.error('❌ Failed to get messages', {
        error: errorMessage,
        chat_id: this.chatId
      });
      throw new Error(`Failed to get messages: ${errorMessage}`);
    }
  }

  /**
   * Extrait les indicateurs BitNest les plus récents depuis le groupe
   *
   * @returns {Object} Résultat avec success, data, metadata
   */
  async extractLatestIndicators() {
    const startTime = Date.now();

    try {
      await this.connect();
      const messages = await this.getMessages(20);

      // Chercher le message le plus récent avec des indicateurs valides
      for (const msg of messages) {
        if (!msg.text) continue;

        const indicators = parseIndicators(msg.text);

        if (indicators) {
          const extractionTime = Date.now() - startTime;

          logger.info('✅ Telegram Bot extraction successful', {
            liquidity: indicators.liquidity,
            extraction_time_ms: extractionTime,
            message_date: msg.date ? new Date(msg.date * 1000).toISOString() : null
          });

          return {
            success: true,
            data: {
              ...indicators,
              message_date: msg.date ? new Date(msg.date * 1000).toISOString() : null
            },
            metadata: {
              extraction_time_ms: extractionTime,
              source: 'telegram_bot_api',
              chat_id: this.chatId,
              message_id: msg.message_id
            }
          };
        }
      }

      // Aucun message avec indicateurs valides trouvé
      logger.warn('⚠️ No valid indicators found in recent messages');

      return {
        success: false,
        error: 'No valid indicators found in recent messages',
        metadata: {
          extraction_time_ms: Date.now() - startTime,
          messages_checked: messages.length
        }
      };

    } catch (error) {
      const extractionTime = Date.now() - startTime;
      const errorMessage = error?.message || String(error) || 'Unknown error occurred';

      logger.error('❌ Telegram Bot extraction failed', {
        error: errorMessage,
        error_type: typeof error,
        extraction_time_ms: extractionTime
      });

      return {
        success: false,
        error: errorMessage,
        metadata: {
          extraction_time_ms: extractionTime
        }
      };
    }
  }

  /**
   * Stop the bot (cleanup)
   */
  async disconnect() {
    if (this.bot) {
      try {
        await this.bot.stopPolling();
        this.bot = null;
        logger.info('🤖 Telegram Bot disconnected');
      } catch (error) {
        // Bot API doesn't need explicit disconnect when polling is false
        this.bot = null;
      }
    }
  }
}

/**
 * Instance singleton du scraper
 */
let scraperInstance = null;

function getInstance() {
  if (!scraperInstance) {
    scraperInstance = new TelegramBotScraper();
  }
  return scraperInstance;
}

/**
 * Fonction principale d'extraction (wrapper simple)
 */
async function extractBitnestDataFromTelegram() {
  const scraper = getInstance();
  return await scraper.extractLatestIndicators();
}

// Export pour utilisation dans l'API
module.exports = {
  TelegramBotScraper,
  getInstance,
  extractBitnestDataFromTelegram,
  parseIndicators
};

/**
 * Test autonome si exécuté directement
 */
if (require.main === module) {
  (async () => {
    console.log('🧪 Testing Telegram Bot scraper...\n');

    // Vérifier configuration
    if (!TELEGRAM_BOT_CONFIG.botToken) {
      console.error('❌ Missing TELEGRAM_BOT_TOKEN');
      console.error('Please set TELEGRAM_BOT_TOKEN in .env');
      process.exit(1);
    }

    if (!TELEGRAM_BOT_CONFIG.chatId) {
      console.error('❌ Missing TELEGRAM_CHAT_ID');
      console.error('Please set TELEGRAM_CHAT_ID in .env');
      process.exit(1);
    }

    const scraper = getInstance();

    try {
      const result = await extractBitnestDataFromTelegram();

      console.log('\n📊 Result:');
      console.log(JSON.stringify(result, null, 2));

      if (result.success) {
        console.log('\n✅ Test successful!');
        console.log(`Liquidity: ${result.data.liquidity?.toLocaleString() || 'N/A'} USDT`);
        console.log(`Extraction time: ${result.metadata.extraction_time_ms}ms`);
      } else {
        console.log('\n⚠️ Test completed with errors');
        console.log(`Error: ${result.error}`);
      }

    } catch (error) {
      console.error('\n❌ Test failed:', error?.message || String(error) || 'Unknown error');
      process.exit(1);
    } finally {
      await scraper.disconnect();
      process.exit(0);
    }
  })();
}
