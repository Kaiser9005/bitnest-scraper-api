/**
 * ================================================================
 * CROSS-VALIDATION MODULE - Dual-Source Forensic Verification
 * ================================================================
 *
 * Valide les données BitNest en comparant 2 sources indépendantes:
 * - Source 1: Playwright (bitnest.me/intro)
 * - Source 2: Telegram MTProto (canal BitnestMonitor)
 *
 * OBJECTIFS FORENSIQUES:
 * - Détection de manipulation/censure sur une source
 * - Double confirmation pour preuve judiciaire solide
 * - Alertes si divergence significative
 * - Données moyennes plus fiables si sources concordent
 *
 * NIVEAUX DE VALIDATION:
 * - VERIFIED: Divergence < 1% (sources concordent)
 * - WARNING: Divergence 1-5% (écart modéré)
 * - CRITICAL: Divergence > 5% (investigation requise)
 */

const logger = require('../utils/logger');

/**
 * Seuils de divergence pour la validation
 */
const DIVERGENCE_THRESHOLDS = {
  VERIFIED: 1.0,  // < 1% = sources concordent parfaitement
  WARNING: 5.0    // 1-5% = écart modéré, < 5% = critique
};

/**
 * Calcule la divergence en pourcentage entre 2 valeurs
 *
 * @param {number} value1 - Première valeur
 * @param {number} value2 - Deuxième valeur
 * @returns {number} Divergence en pourcentage (0-100)
 *
 * @example
 * calculateDivergence(100, 105) // Returns: 4.76 (≈5%)
 * calculateDivergence(1000000, 1000100) // Returns: 0.01 (0.01%)
 */
function calculateDivergence(value1, value2) {
  if (!value1 || !value2 || value1 <= 0 || value2 <= 0) {
    return 100; // Valeurs invalides = divergence maximale
  }

  const maxValue = Math.max(value1, value2);
  const minValue = Math.min(value1, value2);

  const divergence = ((maxValue - minValue) / maxValue) * 100;

  return Math.round(divergence * 100) / 100; // Arrondi à 2 décimales
}

/**
 * Calcule la moyenne de 2 valeurs
 */
function average(value1, value2) {
  return Math.round((value1 + value2) / 2);
}

/**
 * Détermine le statut de validation basé sur les divergences
 *
 * @param {Object} divergences - Divergences calculées {participants_pct, revenues_pct, liquidity_pct}
 * @returns {string} 'VERIFIED' | 'WARNING' | 'CRITICAL'
 */
function determineValidationStatus(divergences) {
  const maxDivergence = Math.max(
    divergences.participants_pct,
    divergences.revenues_pct,
    divergences.liquidity_pct
  );

  if (maxDivergence < DIVERGENCE_THRESHOLDS.VERIFIED) {
    return 'VERIFIED';
  } else if (maxDivergence < DIVERGENCE_THRESHOLDS.WARNING) {
    return 'WARNING';
  } else {
    return 'CRITICAL';
  }
}

/**
 * Génère une recommandation basée sur le statut de validation
 */
function generateRecommendation(status, divergences) {
  switch (status) {
    case 'VERIFIED':
      return 'Data validated across both sources - high confidence';

    case 'WARNING':
      return `Moderate divergence detected (max ${Math.max(divergences.participants_pct, divergences.revenues_pct, divergences.liquidity_pct).toFixed(2)}%) - review recommended`;

    case 'CRITICAL':
      return `CRITICAL: Significant divergence detected (max ${Math.max(divergences.participants_pct, divergences.revenues_pct, divergences.liquidity_pct).toFixed(2)}%) - investigation required. Possible data manipulation or source error.`;

    default:
      return 'Unknown validation status';
  }
}

/**
 * Cross-valide les données de 2 sources et retourne résultat enrichi
 *
 * @param {Object} webhookData - Données de la source Playwright
 * @param {Object} telegramData - Données de la source Telegram
 * @returns {Object} Résultat avec données validées et métadonnées forensiques
 */
function crossValidate(webhookData, telegramData) {
  const startTime = Date.now();

  // Vérifier que les 2 sources ont réussi
  const hasBothSources = webhookData.success && telegramData.success;

  if (!hasBothSources) {
    logger.warn('⚠️ Cross-validation incomplete - fallback to single source');

    // Retourner la source disponible
    if (webhookData.success) {
      return {
        success: true,
        data: webhookData.data,
        validation: {
          sources_used: ['webhook'],
          webhook_data: webhookData.data,
          telegram_data: null,
          status: 'SINGLE_SOURCE',
          recommendation: 'Only webhook data available - Telegram extraction failed'
        },
        metadata: {
          validation_time_ms: Date.now() - startTime,
          single_source: true
        }
      };
    }

    if (telegramData.success) {
      return {
        success: true,
        data: telegramData.data,
        validation: {
          sources_used: ['telegram'],
          webhook_data: null,
          telegram_data: telegramData.data,
          status: 'SINGLE_SOURCE',
          recommendation: 'Only Telegram data available - Webhook extraction failed'
        },
        metadata: {
          validation_time_ms: Date.now() - startTime,
          single_source: true
        }
      };
    }

    // Aucune source disponible
    return {
      success: false,
      error: 'Both sources failed',
      validation: {
        sources_used: [],
        status: 'FAILED',
        recommendation: 'All extraction sources failed - check system status'
      },
      metadata: {
        validation_time_ms: Date.now() - startTime
      }
    };
  }

  // Les 2 sources ont réussi - cross-validation complète
  const webhook = webhookData.data;
  const telegram = telegramData.data;

  // Calcul des divergences
  const divergences = {
    participants_pct: calculateDivergence(webhook.participants, telegram.participants),
    revenues_pct: calculateDivergence(webhook.revenues, telegram.revenues),
    liquidity_pct: calculateDivergence(webhook.liquidity, telegram.liquidity)
  };

  // Déterminer statut de validation
  const status = determineValidationStatus(divergences);

  // Décider quelles données utiliser
  let finalData;

  if (status === 'VERIFIED') {
    // Divergence < 1% → Moyenne des 2 sources (plus fiable)
    finalData = {
      participants: average(webhook.participants, telegram.participants),
      revenues: average(webhook.revenues, telegram.revenues),
      liquidity: average(webhook.liquidity, telegram.liquidity),
      timestamp: new Date().toISOString(),
      source: 'dual_source_average'
    };

    logger.info('✅ Cross-validation VERIFIED - using averaged data', {
      max_divergence: Math.max(divergences.participants_pct, divergences.revenues_pct, divergences.liquidity_pct)
    });

  } else {
    // Divergence ≥ 1% → Utiliser source primaire (webhook)
    finalData = {
      ...webhook,
      source: status === 'WARNING' ? 'webhook_primary' : 'webhook_primary_critical'
    };

    const logLevel = status === 'CRITICAL' ? 'error' : 'warn';
    logger[logLevel](`${status === 'CRITICAL' ? '🚨' : '⚠️'} Cross-validation ${status} - using webhook as primary`, {
      divergences,
      status
    });
  }

  const validationTime = Date.now() - startTime;

  return {
    success: true,
    data: finalData,
    validation: {
      sources_used: ['webhook', 'telegram'],
      webhook_data: {
        participants: webhook.participants,
        revenues: webhook.revenues,
        liquidity: webhook.liquidity,
        extraction_time_ms: webhookData.metadata.extraction_time_ms
      },
      telegram_data: {
        participants: telegram.participants,
        revenues: telegram.revenues,
        liquidity: telegram.liquidity,
        extraction_time_ms: telegramData.metadata.extraction_time_ms
      },
      divergence: divergences,
      status: status,
      recommendation: generateRecommendation(status, divergences)
    },
    metadata: {
      validation_time_ms: validationTime,
      total_extraction_time_ms: webhookData.metadata.extraction_time_ms + telegramData.metadata.extraction_time_ms,
      single_source: false,
      cached: {
        webhook: webhookData.metadata.cached || false,
        telegram: telegramData.metadata.cached || false
      }
    }
  };
}

/**
 * Valide qu'un objet de données a la structure attendue
 */
function isValidDataStructure(data) {
  return (
    data &&
    typeof data.participants === 'number' &&
    typeof data.revenues === 'number' &&
    typeof data.liquidity === 'number' &&
    data.participants > 0 &&
    data.revenues > 0 &&
    data.liquidity > 0
  );
}

module.exports = {
  crossValidate,
  calculateDivergence,
  determineValidationStatus,
  isValidDataStructure,
  DIVERGENCE_THRESHOLDS
};
