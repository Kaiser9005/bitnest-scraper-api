# 🚀 QUICK START - Déploiement Railway en 3 Étapes

**Démarrage rapide pour déployer l'API BitNest dual-source sur Railway**

---

## 📖 Guides de Déploiement

**Déploiement Non-Interactif** (recommandé pour automation):
- **Guide complet**: [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)
- Utilise RAILWAY_TOKEN pour CI/CD
- Optimisé pour budget $5/mois
- Configuration MODE ÉCONOMIQUE automatique

**Déploiement Rapide** (ce guide):
- Installation et setup en 3 étapes
- Approche simplifiée
- Parfait pour premier déploiement

---

## ⚡ Option 1: Script Automatique Non-Interactif (Recommandé)

### Prérequis

1. **Créer Railway API Token**: https://railway.app/account/tokens
2. **Créer Railway Project**: https://railway.app/new (noter le PROJECT_ID)

### Déploiement

```bash
cd bitnest-scraper-api

# Installer Railway CLI si pas déjà fait
npm install -g @railway/cli

# Copier et configurer .env
cp .env.example .env
# Éditez .env avec vos RAILWAY_TOKEN et RAILWAY_PROJECT_ID

# Exporter variables d'environnement
export $(grep -v '^#' .env | xargs)

# Exécuter script de déploiement automatique
./scripts/deploy-railway.sh
```

Le script va automatiquement:
- ✅ Vérifier les prérequis (Railway CLI, Git, Node.js)
- ✅ S'authentifier via RAILWAY_TOKEN
- ✅ Lier au projet via RAILWAY_PROJECT_ID
- ✅ Configurer variables MODE ÉCONOMIQUE (budget $5)
- ✅ Déployer application Docker
- ✅ Générer domaine Railway
- ✅ Tester health check
- ✅ Afficher URL API + instructions Apps Script

**Guide détaillé**: Voir [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) pour instructions complètes

---

## 🔧 Option 2: Déploiement Manuel

### Étape 1: Installer Railway CLI

```bash
npm install -g @railway/cli
```

### Étape 2: Authentifier

```bash
railway login
# → Ouvre navigateur pour authentification GitHub
```

### Étape 3: Créer Projet

```bash
cd bitnest-scraper-api

railway init
# Sélectionner: "Create new project"
# Nom: "bitnest-scraper-api"
```

### Étape 4: Configurer Variables

```bash
# Copier credentials Telegram existants
TELEGRAM_API_ID=27770103
TELEGRAM_API_HASH=98d3cb6185cfed3f106520d44291b4bb
TELEGRAM_SESSION=1BJWap1wBu7eImZdUSdmByMKl5vfE0bYtvZYW9qwqPFEFAL7QHZebt4xDR52ljCQZG3nfLadjGbX_UcaxlIN5YW-_A6RCqfebcqCuNemnTfLbeI2Fp7geIVIPz9vfWY77S1HLsFTFhKJLb7gBKupiDUzoM_sQbIBjheFAuya6-R75bM2I04ZDRMJBegJBmDyNuuK48vdZ4stNE5vAIOdGxiw9XpGuhv18fObmP1gPN707rao8gg3ZqJpKTfIHZ2s9qIWjcSihDG1w7Ya1xiGUkbLC6W8yE-VKRHPwGw99f3zY008B19iyONr_0FoqCQdY2fzPIWofGcOEWnR9OhKoylMylIQIYSA=

# Générer API key
railway variables set BITNEST_API_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Configurer Telegram (credentials déjà disponibles)
railway variables set TELEGRAM_API_ID=$TELEGRAM_API_ID
railway variables set TELEGRAM_API_HASH=$TELEGRAM_API_HASH
railway variables set TELEGRAM_SESSION_STRING=$TELEGRAM_SESSION
railway variables set TELEGRAM_BITNEST_CHANNEL=BitnestMonitor

# Variables optionnelles (valeurs par défaut)
railway variables set PORT=8080
railway variables set NODE_ENV=production
railway variables set LOG_LEVEL=info
```

### Étape 5: Déployer

```bash
railway up --detach
```

### Étape 6: Obtenir URL

```bash
railway domain
# Output: https://bitnest-scraper-production.up.railway.app
```

### Étape 7: Tester

```bash
# Health check
curl https://votre-app.railway.app/health

# Test dual-source (remplacer YOUR_API_KEY)
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://votre-app.railway.app/api/scrape-dual
```

---

## 📊 Configuration Google Apps Script

Une fois l'API déployée, configurez Apps Script :

### 1. Ouvrir Google Sheet BitNest
https://docs.google.com/spreadsheets/d/1xM5oZjYSUySVRqQZtivLeR6UzumFaXBtK9kVNiff_yM/edit

### 2. Extensions > Apps Script

### 3. Paramètres du projet > Propriétés du script

Ajouter :

```
BITNEST_WEBHOOK_URL = https://votre-app.railway.app/api/scrape-dual
BITNEST_API_KEY = votre-cle-generee-railway
```

### 4. Tester

Dans Apps Script, exécuter la fonction :
```javascript
updateBitnestData()
```

Vérifier les logs :
- Doit afficher : "✅ Dual-source extraction successful"
- Status : "VERIFIED" ou "WARNING" ou "CRITICAL"

---

## 🔍 Monitoring

### Voir les logs

```bash
railway logs --tail
```

### Vérifier status

```bash
railway status
```

### Variables configurées

```bash
railway variables
```

---

## ⚠️ Troubleshooting

### Erreur: "TELEGRAM_SESSION_STRING invalid"

```bash
# Vérifier que le session string est complet (pas tronqué)
railway variables | grep TELEGRAM_SESSION

# Si tronqué, le redéfinir
railway variables set TELEGRAM_SESSION_STRING="<session-string-complet>"
```

### Erreur: "Channel @BitnestMonitor not found"

```bash
# Vérifier nom du canal
railway variables set TELEGRAM_BITNEST_CHANNEL=BitnestMonitor

# OU tester avec ID du canal si différent
```

### Health check failed

```bash
# Voir les logs pour diagnostiquer
railway logs --tail

# Redéployer si nécessaire
railway up --detach
```

---

## 💰 Coûts

- **Plan Gratuit**: $5 crédit/mois (~500 heures)
- **Plan Hobby**: $5/mois (recommandé pour production)

---

## 🎉 Résultat Attendu

Après déploiement réussi, vous aurez :

✅ **3 endpoints fonctionnels**:
- `/health` - Health check
- `/api/scrape-bitnest` - Extraction Playwright uniquement
- `/api/scrape-telegram` - Extraction Telegram uniquement
- `/api/scrape-dual` - Dual-source avec validation croisée

✅ **Automation forensique complète**:
- Extraction toutes les heures depuis Google Apps Script
- Double confirmation (Playwright + Telegram)
- Alertes automatiques si divergence > 5%
- Données moyennes si divergence < 1%

✅ **Dashboard Google Sheet mis à jour**:
- Source: "✅ Dual-Source (VERIFIED) (Δ 0.05%)"
- Indicateurs validés en temps réel
- Metadata forensique enrichie

---

**Dernière mise à jour**: 30 Octobre 2025
**Version**: 2.0.0 - Dual-Source Production-Ready
