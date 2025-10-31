# 💰 OPTIMISATION COÛTS - Railway Budget $5

**Guide complet pour rester sous budget $5/mois avec Railway**

---

## 📊 Analyse Coûts par Mode

### Mode 1: ÉCONOMIQUE (Budget: $2-3/mois) ✅ RECOMMANDÉ

**Configuration:**
- Source unique: **Telegram SEUL** (plus rapide, moins cher)
- Fréquence: **Toutes les 3 heures** (8 extractions/jour)
- Cache: **30 minutes**
- Total: **~240 extractions/mois**

**Coût estimé**: $2-3/mois ✅

**Avantages:**
- ✅ Reste largement sous budget
- ✅ Données temps réel (toutes les 3h)
- ✅ Source Telegram plus rapide (<2s vs 4-6s Playwright)
- ✅ Suffisant pour monitoring forensique

**Inconvénients:**
- ⚠️ Pas de double validation croisée
- ⚠️ Dépend d'une seule source

---

### Mode 2: FORENSIQUE (Budget: $5-6/mois) ⚠️ LIMITE

**Configuration:**
- Sources: **Dual-source** (Playwright + Telegram)
- Fréquence: **Toutes les 2 heures** (12 extractions/jour)
- Cache: **15 minutes**
- Total: **~720 extractions/mois** (2 sources)

**Coût estimé**: $5-6/mois ⚠️

**Avantages:**
- ✅ Validation croisée complète
- ✅ Détection manipulation/censure
- ✅ Preuve judiciaire renforcée

**Inconvénients:**
- ⚠️ Peut dépasser budget $5
- ⚠️ Risque épuisement crédit en fin de mois

---

## 🎯 Configuration ÉCONOMIQUE Recommandée

### Fichier .env (Railway Variables)

```bash
# Configuration ÉCONOMIQUE pour budget $5
PORT=8080
NODE_ENV=production
LOG_LEVEL=warn  # Réduit logs (était: info)

# API Key
BITNEST_API_KEY=your-api-key

# Cache AUGMENTÉ (30 minutes au lieu de 5)
CACHE_TTL_MS=1800000  # 30 minutes

# Rate Limiting STRICT
RATE_LIMIT_WINDOW_MS=3600000
RATE_LIMIT_MAX_REQUESTS=30  # Réduit de 60 à 30

# Playwright OPTIMISÉ (si utilisé)
PLAYWRIGHT_TIMEOUT_MS=20000  # Réduit de 30s à 20s
PLAYWRIGHT_WAIT_MS=3000      # Réduit de 5s à 3s

# Retry RÉDUIT
MAX_RETRIES=2          # Réduit de 3 à 2
RETRY_DELAY_MS=1500    # Réduit de 2s à 1.5s

# Telegram (GRATUIT - pas de coût serveur)
TELEGRAM_API_ID=27770103
TELEGRAM_API_HASH=98d3cb6185cfed3f106520d44291b4bb
TELEGRAM_SESSION_STRING=your-session
TELEGRAM_BITNEST_CHANNEL=BitnestMonitor
```

---

## ⚙️ Configuration Google Apps Script

### Mode ÉCONOMIQUE - Trigger toutes les 3 heures

**Apps Script → Déclencheurs → Configuration:**

```javascript
// AVANT (horaire - 730 extractions/mois)
Fonction: updateBitnestData
Déclencheur: Toutes les heures

// APRÈS (3 heures - 240 extractions/mois) ✅
Fonction: updateBitnestData
Déclencheur: Minuteur personnalisé
Intervalle: Toutes les 3 heures
```

**Réduction:** 730 → 240 extractions/mois = **-67% de requêtes** 🎯

---

### Endpoint à Utiliser

**Mode ÉCONOMIQUE (Telegram seul):**
```javascript
// Apps Script Properties
BITNEST_WEBHOOK_URL = https://votre-app.railway.app/api/scrape-telegram
```

**Mode FORENSIQUE (Dual-source):**
```javascript
// Apps Script Properties
BITNEST_WEBHOOK_URL = https://votre-app.railway.app/api/scrape-dual
```

---

## 📈 Calcul Détaillé des Coûts

### Mode ÉCONOMIQUE

**Extractions par jour:**
- 24 heures ÷ 3 heures = **8 extractions/jour**
- Source unique (Telegram)

**Extractions par mois:**
- 8 extractions/jour × 30 jours = **240 extractions/mois**

**Temps serveur estimé:**
- Telegram: ~1-2 secondes/extraction
- Cache hit rate: ~40% (cache 30 minutes)
- Temps actif: 240 × 2s × 0.6 = **~5 minutes/mois**

**Coût Railway:**
- $5 crédit = ~500 heures compute
- 5 minutes utilisées = **$0.05**
- Marge sécurité × 50 = **$2.50/mois**

✅ **Budget sécurisé: $2-3/mois**

---

### Mode FORENSIQUE

**Extractions par jour:**
- 24 heures ÷ 2 heures = **12 extractions/jour**
- 2 sources (Playwright + Telegram)

**Extractions par mois:**
- 12 × 30 × 2 sources = **720 extractions/mois**

**Temps serveur estimé:**
- Playwright: ~4-6 secondes
- Telegram: ~1-2 secondes
- Total: ~6 secondes/extraction dual
- Cache hit: ~30%
- Temps actif: 720 × 6s × 0.7 = **~50 minutes/mois**

**Coût Railway:**
- 50 minutes × safety factor = **$5-6/mois**

⚠️ **Risque dépassement budget**

---

## 🛠️ Script de Déploiement ÉCONOMIQUE

```bash
# Déployer avec configuration économique
./scripts/deploy-railway.sh --mode economic

# OU manuellement:
railway variables set CACHE_TTL_MS=1800000
railway variables set RATE_LIMIT_MAX_REQUESTS=30
railway variables set LOG_LEVEL=warn
railway variables set MAX_RETRIES=2
```

---

## 📊 Monitoring Budget

### Vérifier Usage Railway

**Dashboard Railway:**
1. https://railway.app
2. Votre projet → Usage
3. Surveiller: **Hours Used** et **Credits Remaining**

**Alertes:**
- **$3 utilisés** → Passer à extraction toutes les 4 heures
- **$4 utilisés** → Passer à extraction toutes les 6 heures
- **$4.50 utilisés** → Désactiver automation temporairement

### Script Monitoring

```bash
# Vérifier usage
railway status

# Voir coûts estimés
railway logs --tail | grep "extraction"
```

---

## 🎯 Recommandation Finale

### Phase 1: Démarrage (Mois 1-2)

**Mode: ÉCONOMIQUE**
- Source: Telegram seul
- Fréquence: Toutes les 3 heures
- Budget: $2-3/mois
- Objectif: Valider système fonctionne

### Phase 2: Monitoring Intensif (Si budget permet)

**Mode: FORENSIQUE 2h**
- Source: Dual-source
- Fréquence: Toutes les 2 heures
- Budget: $5-6/mois
- Objectif: Investigation active

### Phase 3: Maintenance (Mois 3+)

**Mode: ÉCONOMIQUE 4h**
- Source: Telegram seul
- Fréquence: Toutes les 4 heures
- Budget: $1.50-2/mois
- Objectif: Surveillance passive

---

## 💡 Optimisations Supplémentaires

### 1. Utiliser Cache Maximum

```javascript
// BitnestAutomation.gs
// Accepter données en cache jusqu'à 1 heure
if (result.metadata.cached && result.metadata.cache_age_ms < 3600000) {
  // OK, utiliser cache
}
```

### 2. Trigger Conditionnel

```javascript
// Extraire seulement si nécessaire
function smartExtraction() {
  const lastExtraction = PropertiesService.getScriptProperties()
    .getProperty('LAST_EXTRACTION_TIME');

  const threeHoursAgo = Date.now() - (3 * 60 * 60 * 1000);

  if (lastExtraction && parseInt(lastExtraction) > threeHoursAgo) {
    Logger.log('⏭️ Skipping - last extraction < 3 hours ago');
    return;
  }

  updateBitnestData();

  PropertiesService.getScriptProperties()
    .setProperty('LAST_EXTRACTION_TIME', Date.now().toString());
}
```

### 3. Pause Nocturne (Optionnel)

```javascript
// Ne pas extraire entre 1h et 7h du matin (économise 6 extractions/jour)
function shouldExtract() {
  const hour = new Date().getHours();
  if (hour >= 1 && hour < 7) {
    Logger.log('😴 Nuit - extraction skipped');
    return false;
  }
  return true;
}
```

**Économie:** 6 extractions/jour × 30 = 180 extractions/mois = **-25% coûts**

---

## 📋 Checklist Optimisation

- [ ] Cache TTL = 30 minutes (1800000 ms)
- [ ] Trigger Apps Script = toutes les 3 heures
- [ ] Endpoint = /api/scrape-telegram (Telegram seul)
- [ ] Rate limit = 30 requêtes/heure
- [ ] Log level = warn
- [ ] Max retries = 2
- [ ] Monitoring budget activé
- [ ] Alerte à $3 configurée

---

## 🎉 Résultat Attendu

**Mode ÉCONOMIQUE:**
- ✅ **240 extractions/mois**
- ✅ **$2-3/mois** (largement sous budget)
- ✅ **Données toutes les 3 heures** (suffisant)
- ✅ **Marge sécurité** pour imprévus
- ✅ **Sustainable long-term**

---

**Dernière mise à jour:** 31 Octobre 2025
**Version:** 1.0 - Budget-Optimized
