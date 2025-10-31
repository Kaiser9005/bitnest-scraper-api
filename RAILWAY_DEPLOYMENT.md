# 🚂 RAILWAY DEPLOYMENT - Mode Non-Interactif

**Déploiement automatisé BitNest Scraper API avec authentification par token**

---

## 🎯 Prérequis

### 1. Railway CLI Installé
```bash
npm install -g @railway/cli
```

### 2. Tokens Railway Requis

Vous avez besoin de **2 informations** depuis votre compte Railway:

#### **A. RAILWAY_TOKEN** (Authentification)

1. Ouvrez: https://railway.app/account/tokens
2. Cliquez "Create New Token"
3. Nommez le token (ex: "BitNest Scraper API")
4. **TYPE**: Sélectionnez **"Account Token"** (accès complet)
5. Copiez le token généré (format: `XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`)

#### **B. RAILWAY_PROJECT_ID** (Projet cible)

**Option 1 - Projet existant:**
1. Ouvrez votre projet sur: https://railway.app
2. L'ID est dans l'URL: `railway.app/project/[PROJECT_ID]`
3. Copiez cet ID

**Option 2 - Nouveau projet:**
1. Créez projet via web: https://railway.app/new
2. Cliquez "Empty Project"
3. Notez l'ID du projet créé

---

## 🚀 Déploiement Étape par Étape

### Étape 1: Configuration Environnement Local

Créez un fichier `.env` depuis le template:

```bash
cp .env.example .env
```

Éditez `.env` avec vos vraies valeurs:

```bash
# ===== RAILWAY CONFIGURATION (REQUIS pour déploiement automatique) =====
RAILWAY_TOKEN=votre-token-railway-ici
RAILWAY_PROJECT_ID=votre-project-id-ici

# ===== API CONFIGURATION =====
PORT=8080
NODE_ENV=production
LOG_LEVEL=warn

# ===== BITNEST API KEY (générer une clé sécurisée) =====
BITNEST_API_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# ===== TELEGRAM CONFIGURATION (Dual-Source Validation) =====
TELEGRAM_API_ID=27770103
TELEGRAM_API_HASH=98d3cb6185cfed3f106520d44291b4bb
TELEGRAM_SESSION_STRING=votre-session-telegram
TELEGRAM_BITNEST_CHANNEL=BitnestMonitor

# ===== CACHE & RATE LIMITING (MODE ÉCONOMIQUE - Budget $5) =====
CACHE_TTL_MS=1800000           # 30 minutes (était: 300000 = 5 min)
RATE_LIMIT_WINDOW_MS=3600000   # 1 heure
RATE_LIMIT_MAX_REQUESTS=30     # 30 requêtes/heure (était: 60)

# ===== PLAYWRIGHT CONFIGURATION (Optimisé) =====
PLAYWRIGHT_TIMEOUT_MS=20000    # 20s timeout (était: 30s)
PLAYWRIGHT_WAIT_MS=3000        # 3s wait (était: 5s)

# ===== RETRY CONFIGURATION (Réduit pour économie) =====
MAX_RETRIES=2                  # 2 tentatives (était: 3)
RETRY_DELAY_MS=1500           # 1.5s délai (était: 2s)
```

### Étape 2: Générer BITNEST_API_KEY

```bash
# Générer une clé API sécurisée
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Copiez le résultat dans .env
```

### Étape 3: Exporter Variables d'Environnement

```bash
# Charger toutes les variables depuis .env
export $(grep -v '^#' .env | xargs)

# Vérifier que les variables critiques sont définies
echo "RAILWAY_TOKEN: ${RAILWAY_TOKEN:0:20}..."
echo "RAILWAY_PROJECT_ID: $RAILWAY_PROJECT_ID"
```

### Étape 4: Lancer le Déploiement Automatique

```bash
# Exécuter le script de déploiement
./scripts/deploy-railway.sh
```

Le script va automatiquement:
- ✅ Vérifier les prérequis (Railway CLI, Git, Node.js)
- ✅ S'authentifier avec RAILWAY_TOKEN
- ✅ Lier le projet avec RAILWAY_PROJECT_ID
- ✅ Configurer toutes les variables d'environnement
- ✅ Déployer via Dockerfile
- ✅ Générer un domaine Railway
- ✅ Tester le health check

---

## 📊 Configuration MODE ÉCONOMIQUE

Le script configure automatiquement le **MODE ÉCONOMIQUE** pour rester sous budget $5/mois:

### Variables Optimisées

| Variable | Valeur Défaut | Mode Économique | Impact |
|----------|--------------|-----------------|--------|
| CACHE_TTL_MS | 300000 (5 min) | **1800000 (30 min)** | -80% requêtes |
| RATE_LIMIT_MAX_REQUESTS | 60/h | **30/h** | -50% requêtes |
| LOG_LEVEL | info | **warn** | -30% I/O |
| MAX_RETRIES | 3 | **2** | -33% échecs |
| PLAYWRIGHT_TIMEOUT_MS | 30000 | **20000** | -33% temps |

### Résultat Attendu

- **Coût estimé**: $2-3/mois (largement sous budget $5)
- **Extractions**: 240/mois (toutes les 3 heures depuis Apps Script)
- **Performance**: <2s par extraction Telegram
- **Marge sécurité**: 40-60% crédit restant

---

## 🔍 Vérification Post-Déploiement

### 1. Health Check API

```bash
# L'URL sera affichée à la fin du script
curl https://votre-app.railway.app/health
```

**Réponse attendue:**
```json
{
  "status": "healthy",
  "uptime_seconds": 42,
  "cache_valid": false,
  "timestamp": "2025-10-31T..."
}
```

### 2. Test Extraction Telegram

```bash
# Remplacer YOUR_API_KEY par votre BITNEST_API_KEY
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://votre-app.railway.app/api/scrape-telegram
```

**Réponse attendue:**
```json
{
  "success": true,
  "data": {
    "participants": 1234567,
    "participants_growth": 5.2,
    "revenues": 987654321,
    "revenues_growth": 12.3,
    "liquidity": 456789,
    "liquidity_growth": -2.1
  },
  "metadata": {
    "extraction_time_ms": 1523,
    "source": "telegram_mtproto",
    "channel": "BitnestMonitor"
  }
}
```

### 3. Monitoring Railway

```bash
# Voir les logs en temps réel
RAILWAY_TOKEN=$RAILWAY_TOKEN railway logs

# Vérifier le statut du projet
RAILWAY_TOKEN=$RAILWAY_TOKEN railway status

# Lister les variables configurées
RAILWAY_TOKEN=$RAILWAY_TOKEN railway variables
```

---

## 📋 Configuration Google Apps Script

Une fois le déploiement réussi, configurez Apps Script:

### 1. Ouvrir le Sheet BitNest

https://docs.google.com/spreadsheets/d/1xM5oZjYSUySVRqQZtivLeR6UzumFaXBtK9kVNiff_yM/edit

### 2. Extensions → Apps Script

Ouvrez `BitnestAutomation.gs`

### 3. Paramètres du projet → Propriétés du script

Ajoutez:

```
BITNEST_WEBHOOK_URL = https://votre-app.railway.app/api/scrape-telegram
BITNEST_API_KEY = votre-cle-api-generee
```

### 4. Configurer Trigger (IMPORTANT - Budget $5)

Pour rester sous budget, **changez la fréquence à toutes les 3 heures**:

1. Apps Script → Déclencheurs
2. Cliquez sur le trigger existant "updateBitnestData"
3. **Modifier**:
   - Type de source de temps basée sur le temps: **Minuteur personnalisé**
   - Sélectionner un intervalle de temps: **Toutes les 3 heures**
4. Enregistrer

**Réduction:** 730 → 240 extractions/mois = **-67% de requêtes** 🎯

### 5. Test Manuel

```javascript
// Dans Apps Script, exécuter:
updateBitnestData()
```

Vérifiez les logs:
- ✅ "Dual-source extraction successful"
- ✅ Source: "⚡ Telegram (SINGLE_SOURCE)"

---

## 🔧 Troubleshooting

### Erreur: "RAILWAY_TOKEN invalide"

```bash
# Vérifier que le token est exporté
echo $RAILWAY_TOKEN

# Si vide, réexporter
export RAILWAY_TOKEN=votre-token-ici
```

### Erreur: "RAILWAY_PROJECT_ID non défini"

```bash
# Vérifier PROJECT_ID
echo $RAILWAY_PROJECT_ID

# Obtenir l'ID depuis l'URL Railway
# railway.app/project/[COPIEZ_CET_ID]
export RAILWAY_PROJECT_ID=votre-project-id
```

### Erreur: "Telegram session invalid"

Le TELEGRAM_SESSION_STRING depuis telegram-mcp-server/.env doit être copié intégralement:

```bash
# Vérifier dans .env que le session string est complet (très long)
grep TELEGRAM_SESSION .env | wc -c
# Doit afficher > 300 caractères
```

### Health Check Failed

```bash
# Voir les logs pour diagnostiquer
RAILWAY_TOKEN=$RAILWAY_TOKEN railway logs --tail

# Vérifier que toutes les variables sont définies
RAILWAY_TOKEN=$RAILWAY_TOKEN railway variables
```

---

## 💰 Monitoring Budget Railway

### Dashboard Railway

1. https://railway.app
2. Votre projet → **Usage**
3. Surveiller: **Hours Used** et **Credits Remaining**

### Alertes Budget

- **$3 utilisés** → Passer à extraction toutes les 4 heures
- **$4 utilisés** → Passer à extraction toutes les 6 heures
- **$4.50 utilisés** → Désactiver automation temporairement

### Ajuster Fréquence Apps Script

Si dépassement budget détecté:

```javascript
// Apps Script → Déclencheurs
// Modifier fréquence:
// - 3 heures → 4 heures (180 extractions/mois = $1.50-2)
// - 3 heures → 6 heures (120 extractions/mois = $1-1.50)
```

---

## 🎉 Résultat Final Attendu

### ✅ Infrastructure Déployée

- **Railway API**: https://votre-app.railway.app
- **3 Endpoints**:
  - `/health` - Health check
  - `/api/scrape-telegram` - Telegram MTProto extraction
  - `/api/scrape-dual` - Dual-source avec validation croisée

### ✅ Automation Forensique

- **Fréquence**: Toutes les 3 heures (8/jour)
- **Source**: Telegram MTProto (BitnestMonitor)
- **Budget**: $2-3/mois (40-60% marge)
- **Performance**: <2s extraction Telegram

### ✅ Google Sheet Mis à Jour

- **Source**: "⚡ Telegram (SINGLE_SOURCE)"
- **Indicateurs**: Participants, Revenus, Liquidité
- **Metadata**: Timestamp, source, temps extraction

---

## 📚 Ressources

- **Railway Docs**: https://docs.railway.com
- **Railway CLI**: https://docs.railway.com/develop/cli
- **Cost Optimization**: COST_OPTIMIZATION.md
- **Quick Start**: QUICK_START.md

---

**Dernière mise à jour**: 31 Octobre 2025
**Version**: 3.0 - Non-Interactive Deployment avec Budget Optimization
