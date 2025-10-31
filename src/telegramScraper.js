/**
 * ================================================================
 * TELEGRAM BITNEST SCRAPER - MTProto Client
 * ================================================================
 *
 * Solution PÉRENNE pour extraction automatique des indicateurs
 * BitNest depuis le canal Telegram BitnestMonitor.
 *
 * Utilise le package `telegram` (MTProto) pour:
 * - Lire messages d'un canal public sans être membre
 * - Extraction temps réel (<2s vs 4-6s Playwright)
 * - Authentification permanente via session string
 *
 * @see https://gram.js.org/introduction/quick-start
 */

require('dotenv').config();
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { logger } = require('./utils/logger');

/**
 * Configuration Telegram depuis variables d'environnement
 */
const TELEGRAM_CONFIG = {
  apiId: parseInt(process.env.TELEGRAM_API_ID),
  apiHash: process.env.TELEGRAM_API_HASH,
  sessionString: process.env.TELEGRAM_SESSION || '',
  channelUsername: process.env.TELEGRAM_BITNEST_CHANNEL || 'BitnestMonitor'
};

/**
 * Patterns regex pour extraction des indicateurs
 * Même logique que scraper.js pour cohérence
 */
const INDICATOR_PATTERNS = {
  participants: /Participants?[\s:]+(\d{1,3}(?:[,\s]\d{3})*)/i,
  revenues: /(?:Revenues?|Participant income)[\s:]+(\d{1,3}(?:[,\s]\d{3})*)[\s]*(?:USDT)?/i,
  liquidity: /Liquidity[\s:]+(\d{1,3}(?:[,\s]\d{3})*)[\s]*(?:USDT)?/i
};

/**
 * Parse un nombre avec séparateurs de milliers
 * Exemples: "2,110,192" → 2110192, "752 040 501" → 752040501
 */
function parseNumber(str) {
  if (!str) return null;
  const cleaned = str.replace(/[,\s]/g, '');
  const num = parseInt(cleaned, 10);
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

  const participantsMatch = text.match(INDICATOR_PATTERNS.participants);
  const revenuesMatch = text.match(INDICATOR_PATTERNS.revenues);
  const liquidityMatch = text.match(INDICATOR_PATTERNS.liquidity);

  if (!participantsMatch || !revenuesMatch || !liquidityMatch) {
    return null;
  }

  const participants = parseNumber(participantsMatch[1]);
  const revenues = parseNumber(revenuesMatch[1]);
  const liquidity = parseNumber(liquidityMatch[1]);

  // Validation: tous les indicateurs doivent être des nombres positifs
  if (!participants || !revenues || !liquidity) {
    return null;
  }

  if (participants <= 0 || revenues <= 0 || liquidity <= 0) {
    return null;
  }

  return {
    participants,
    revenues,
    liquidity,
    timestamp: new Date().toISOString(),
    source: 'telegram'
  };
}

/**
 * TelegramBitnestScraper - Client MTProto pour extraction canal BitnestMonitor
 */
class TelegramBitnestScraper {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.channelEntity = null;
  }

  /**
   * Initialise et connecte le client Telegram
   * Utilise la session string stockée dans l'environnement
   */
  async connect() {
    if (this.isConnected && this.client) {
      logger.info('📱 Telegram client already connected');
      return;
    }

    try {
      const session = new StringSession(TELEGRAM_CONFIG.sessionString);

      this.client = new TelegramClient(
        session,
        TELEGRAM_CONFIG.apiId,
        TELEGRAM_CONFIG.apiHash,
        {
          connectionRetries: 5,
          useWSS: false
        }
      );

      await this.client.connect();
      this.isConnected = true;

      logger.info('✅ Telegram client connected successfully');
    } catch (error) {
      logger.error('❌ Failed to connect Telegram client', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Récupère l'entité du canal BitnestMonitor
   * Utilise le cache si déjà récupéré
   */
  async getChannelEntity() {
    if (this.channelEntity) {
      return this.channelEntity;
    }

    try {
      const username = TELEGRAM_CONFIG.channelUsername;

      logger.info(`🔍 Searching for channel: @${username}`);

      this.channelEntity = await this.client.getEntity(username);

      logger.info('✅ Channel entity found', {
        channel: username,
        id: this.channelEntity.id
      });

      return this.channelEntity;
    } catch (error) {
      logger.error('❌ Failed to get channel entity', {
        channel: TELEGRAM_CONFIG.channelUsername,
        error: error.message
      });
      throw new Error(`Channel @${TELEGRAM_CONFIG.channelUsername} not found or not accessible`);
    }
  }

  /**
   * Récupère les derniers messages du canal BitnestMonitor
   *
   * @param {number} limit - Nombre de messages à récupérer (default: 20)
   * @returns {Array} Liste des messages
   */
  async getMessages(limit = 20) {
    await this.connect();
    const channel = await this.getChannelEntity();

    try {
      const messages = await this.client.getMessages(channel, {
        limit: limit,
        reverse: false // Plus récents en premier
      });

      logger.info(`📬 Retrieved ${messages.length} messages from @${TELEGRAM_CONFIG.channelUsername}`);

      return messages;
    } catch (error) {
      logger.error('❌ Failed to get messages', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Extrait les indicateurs BitNest les plus récents depuis le canal
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
        if (!msg.message) continue;

        const indicators = parseIndicators(msg.message);

        if (indicators) {
          const extractionTime = Date.now() - startTime;

          logger.info('✅ Telegram extraction successful', {
            participants: indicators.participants,
            extraction_time_ms: extractionTime,
            message_date: msg.date
          });

          return {
            success: true,
            data: {
              ...indicators,
              message_date: msg.date?.toISOString()
            },
            metadata: {
              extraction_time_ms: extractionTime,
              source: 'telegram_mtproto',
              channel: TELEGRAM_CONFIG.channelUsername,
              message_id: msg.id
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

      logger.error('❌ Telegram extraction failed', {
        error: error.message,
        extraction_time_ms: extractionTime
      });

      return {
        success: false,
        error: error.message,
        metadata: {
          extraction_time_ms: extractionTime
        }
      };
    }
  }

  /**
   * Déconnecte le client Telegram proprement
   */
  async disconnect() {
    if (this.client && this.isConnected) {
      try {
        await this.client.disconnect();
        this.isConnected = false;
        logger.info('📱 Telegram client disconnected');
      } catch (error) {
        logger.error('❌ Error disconnecting Telegram client', {
          error: error.message
        });
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
    scraperInstance = new TelegramBitnestScraper();
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
  TelegramBitnestScraper,
  getInstance,
  extractBitnestDataFromTelegram,
  parseIndicators
};

/**
 * Test autonome si exécuté directement
 */
if (require.main === module) {
  (async () => {
    console.log('🧪 Testing Telegram BitnestMonitor scraper...\n');

    // Vérifier configuration
    if (!TELEGRAM_CONFIG.apiId || !TELEGRAM_CONFIG.apiHash) {
      console.error('❌ Missing Telegram API credentials');
      console.error('Please set TELEGRAM_API_ID and TELEGRAM_API_HASH in .env');
      process.exit(1);
    }

    if (!TELEGRAM_CONFIG.sessionString) {
      console.error('❌ Missing Telegram session string');
      console.error('Run: npm run setup:telegram to authenticate');
      process.exit(1);
    }

    const scraper = getInstance();

    try {
      const result = await extractBitnestDataFromTelegram();

      console.log('\n📊 Result:');
      console.log(JSON.stringify(result, null, 2));

      if (result.success) {
        console.log('\n✅ Test successful!');
        console.log(`Participants: ${result.data.participants.toLocaleString()}`);
        console.log(`Revenues: ${result.data.revenues.toLocaleString()} USDT`);
        console.log(`Liquidity: ${result.data.liquidity.toLocaleString()} USDT`);
        console.log(`Extraction time: ${result.metadata.extraction_time_ms}ms`);
      } else {
        console.log('\n⚠️ Test completed with errors');
        console.log(`Error: ${result.error}`);
      }

    } catch (error) {
      console.error('\n❌ Test failed:', error.message);
      process.exit(1);
    } finally {
      await scraper.disconnect();
      process.exit(0);
    }
  })();
}
