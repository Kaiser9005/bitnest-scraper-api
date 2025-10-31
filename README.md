# 🚀 BitNest Scraper API

**Webhook API pour extraction automatique des indicateurs BitNest avec Playwright**

Ce service expose une API REST sécurisée qui extrait en temps réel les indicateurs du site bitnest.me/intro pour l'automatisation forensique.

## 📋 Vue d'Ensemble

### Problème résolu
Le site bitnest.me/intro utilise JavaScript pour afficher dynamiquement ses indicateurs. Google Apps Script (`UrlFetchApp`) ne peut pas exécuter JavaScript, rendant impossible l'extraction automatique.

### Solution
Un service webhook externe avec Playwright qui:
- ✅ Exécute JavaScript dans un vrai navigateur (Chromium)
- ✅ Extrait les vraies données en temps réel
- ✅ Expose une API REST sécurisée par clé API
- ✅ Inclut cache, retry logic, et rate limiting
- ✅ Déployable sur Railway/Render

## 🏗️ Architecture

```
[Google Apps Script - Trigger horaire]
    ↓ HTTPS GET + API Key
[Railway - Express API]
    ↓ Playwright Chromium
[bitnest.me/intro - JavaScript s'exécute]
    ↓ Parse indicateurs
[JSON Response: {participants, revenues, liquidity}]
```

## 🚀 Déploiement Rapide

### Prérequis
- Node.js 18+
- Compte Railway ou Render
- API Key (générée par Google Apps Script)

### Installation locale

```bash
# Clone ou copie le projet
cd bitnest-scraper-api

# Install dependencies
npm install

# Créer .env depuis .env.example
cp .env.example .env

# Configurer BITNEST_API_KEY dans .env
nano .env

# Tester extraction
npm run test

# Démarrer serveur
npm start
```

### Déploiement Railway (Recommandé)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up

# Set API key (généré par Apps Script)
railway variables set BITNEST_API_KEY=your-api-key-here

# Get deployment URL
railway domain
```

### Déploiement Render (Alternative)

1. Connecter GitHub repo
2. Create New Web Service
3. Configure:
   - Environment: Docker
   - Health Check Path: `/health`
4. Set environment variables (voir .env.example)
5. Deploy

## 📡 API Endpoints

### GET /health
Health check pour monitoring Railway/Render

**Response**:
```json
{
  "status": "healthy",
  "uptime_seconds": 3600,
  "cache_valid": true,
  "cache_age_ms": 120000,
  "timestamp": "2025-10-30T23:45:00.000Z"
}
```

### GET /api/scrape-bitnest
Extraction des indicateurs BitNest (authentification requise)

**Headers**:
```
Authorization: Bearer your-api-key-here
```

**Response Success** (200):
```json
{
  "success": true,
  "data": {
    "participants": 2110192,
    "revenues": 752040501,
    "liquidity": 30463309,
    "timestamp": "2025-10-30T23:45:00.000Z"
  },
  "metadata": {
    "extraction_time_ms": 4523,
    "browser": "chromium",
    "version": "1.0.0",
    "cached": false
  }
}
```

**Response Error** (500):
```json
{
  "success": false,
  "error": "Navigation timeout",
  "fallback_data": {
    "participants": 2110192,
    "revenues": 752040501,
    "liquidity": 30463309,
    "timestamp": "2025-10-30T21:20:00Z",
    "note": "Cached data from last successful extraction"
  }
}
```

## 🔒 Sécurité

### API Key Authentication
- Toutes les requêtes nécessitent un Bearer token
- Même clé API configurée dans Railway ET Google Apps Script
- Génération recommandée: UUID v4 ou crypto.randomBytes(32)

### Rate Limiting
- Maximum: 60 requêtes par heure par IP
- Window: 1 heure glissante
- Réponse 429 si dépassement

### Cache Strategy
- TTL: 5 minutes par défaut
- Évite de surcharger bitnest.me/intro
- Réduction coûts Playwright (moins d'exécutions)

## ⚙️ Configuration

Variables d'environnement (fichier `.env`):

```env
# Server
PORT=8080
NODE_ENV=production
LOG_LEVEL=info

# Security (REQUIRED)
BITNEST_API_KEY=your-secret-key-here

# Rate Limiting
RATE_LIMIT_WINDOW_MS=3600000      # 1 hour
RATE_LIMIT_MAX_REQUESTS=60

# Cache
CACHE_TTL_MS=300000               # 5 minutes

# Playwright
PLAYWRIGHT_TIMEOUT_MS=30000       # 30 seconds
PLAYWRIGHT_WAIT_MS=5000           # 5 seconds

# Retry
MAX_RETRIES=3
RETRY_DELAY_MS=2000               # Exponential backoff
```

## 🧪 Tests

### Test extraction Playwright
```bash
npm run test
```

Expected output:
```
🧪 Testing BitNest scraper...

📊 Result:
{
  "success": true,
  "data": {
    "participants": 2110192,
    "revenues": 752040501,
    "liquidity": 30463309,
    "timestamp": "2025-10-30T23:45:00.000Z"
  }
}
```

### Test API locale
```bash
# Start server
npm start

# Test health
curl http://localhost:8080/health

# Test extraction (with API key)
curl -H "Authorization: Bearer your-key" \
  http://localhost:8080/api/scrape-bitnest
```

### Test production Railway
```bash
# Get Railway URL
WEBHOOK_URL=$(railway domain)

# Test
curl -H "Authorization: Bearer your-key" \
  https://$WEBHOOK_URL/api/scrape-bitnest
```

## 📊 Monitoring

### Logs Railway
```bash
railway logs
```

Logs structurés JSON incluent:
- Requêtes reçues (IP, path, timestamp)
- Authentification (succès/échec)
- Extraction (temps, résultat)
- Erreurs (détails, stack trace)

### Métriques à surveiller
- **Taux de réussite**: >95% target
- **Temps d'extraction**: <5s average
- **Uptime**: >99.5% target
- **Rate limit violations**: <1% requests

## 🔧 Troubleshooting

### Extraction returning zeros
- Vérifier que Playwright browsers sont installés
- Augmenter PLAYWRIGHT_WAIT_MS (site peut être lent)
- Check logs pour erreurs navigation

### 401 Unauthorized
- Vérifier API key dans Authorization header
- Format: `Bearer your-key-here`
- Même clé dans Railway ET Apps Script

### 429 Too Many Requests
- Rate limit dépassé (60/hour)
- Vérifier automation horaire pas trop fréquente
- Cache devrait réduire requêtes réelles

### Timeout errors
- Augmenter PLAYWRIGHT_TIMEOUT_MS
- Vérifier connexion internet Railway
- Site bitnest.me peut être down

## 💰 Coûts

**Railway**: ~$5/mois
- 500 heures d'exécution incluses
- Automation horaire = 730h/mois max
- Largement suffisant

**Render Free Tier**: $0/mois
- ⚠️ Spin down après 15 min inactivité
- Cold start 30-60s (problématique pour automation)
- Non recommandé pour production

## 📝 License

MIT License - Forensic automation for BitNest investigation

## 🤝 Support

Logs Railway pour debugging:
```bash
railway logs --tail
```

Health check monitoring:
```bash
watch -n 30 'curl -s https://your-app.railway.app/health | jq'
```
