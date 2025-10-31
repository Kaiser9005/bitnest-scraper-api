# 🚀 Guide de Déploiement Railway - BitNest Scraper API

**Guide complet pour déployer l'API webhook sur Railway**

## 📋 Prérequis

Avant de commencer, assurez-vous d'avoir :

- [ ] Compte GitHub avec le repository du projet
- [ ] Compte Railway ([railway.app](https://railway.app)) - gratuit pour commencer
- [ ] Git installé localement
- [ ] Node.js 18+ installé (pour tests locaux)

## 🏗️ Étape 1 : Préparation du Projet

### 1.1 Vérifier les Fichiers Requis

```bash
cd /path/to/bitnest-scraper-api

# Vérifier que tous les fichiers nécessaires existent
ls -la
# Vous devez voir :
# - src/ (dossier avec index.js, scraper.js, etc.)
# - package.json
# - Dockerfile
# - railway.toml
# - .env.example
# - README.md
```

### 1.2 Initialiser Git Repository (si pas déjà fait)

```bash
# Initialiser git
git init

# Ajouter tous les fichiers
git add .

# Premier commit
git commit -m "🚀 Initial commit - BitNest Scraper API"

# Créer repository sur GitHub (via interface web)
# Puis lier le repository local
git remote add origin https://github.com/VOTRE_USERNAME/bitnest-scraper-api.git
git branch -M main
git push -u origin main
```

## 🚂 Étape 2 : Configuration Railway

### 2.1 Créer Compte Railway

1. Aller sur [railway.app](https://railway.app)
2. Cliquer sur "Start a New Project"
3. Se connecter avec GitHub (recommandé) ou email

### 2.2 Créer Nouveau Projet Railway

**Option A : Via Interface Web (Recommandé)**

1. Dashboard Railway → "New Project"
2. Sélectionner "Deploy from GitHub repo"
3. Autoriser Railway à accéder à vos repos GitHub
4. Sélectionner le repository `bitnest-scraper-api`
5. Railway détecte automatiquement le Dockerfile
6. Cliquer sur "Deploy Now"

**Option B : Via Railway CLI**

```bash
# Installer Railway CLI
npm install -g @railway/cli

# Se connecter
railway login
# → Ouvre navigateur pour authentification

# Initialiser projet dans le dossier actuel
railway init
# → Sélectionner "Create new project"
# → Nom du projet : "bitnest-scraper-api"

# Déployer
railway up
# → Railway build le Dockerfile et déploie
```

### 2.3 Configuration Variables d'Environnement

Une fois le projet créé sur Railway :

1. **Via Interface Web** :
   - Dashboard → Votre projet → "Variables"
   - Cliquer sur "New Variable"
   - Ajouter chaque variable :

```
PORT=8080
NODE_ENV=production
LOG_LEVEL=info
BITNEST_API_KEY=votre-cle-secrete-generee-ici
RATE_LIMIT_WINDOW_MS=3600000
RATE_LIMIT_MAX_REQUESTS=60
CACHE_TTL_MS=300000
PLAYWRIGHT_TIMEOUT_MS=30000
PLAYWRIGHT_WAIT_MS=5000
MAX_RETRIES=3
RETRY_DELAY_MS=2000
```

2. **Via Railway CLI** :

```bash
# Générer une clé API sécurisée
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copier la clé générée

# Définir les variables
railway variables set BITNEST_API_KEY=votre-cle-api-generee
railway variables set NODE_ENV=production
railway variables set LOG_LEVEL=info
# ... etc pour chaque variable
```

**⚠️ IMPORTANT : Sauvegardez votre BITNEST_API_KEY** - vous en aurez besoin pour configurer Google Apps Script.

### 2.4 Obtenir l'URL de Déploiement

**Via Interface Web** :
1. Dashboard → Votre projet → "Settings"
2. Section "Domains"
3. Cliquer sur "Generate Domain"
4. Railway génère une URL : `https://votre-app.railway.app`

**Via Railway CLI** :
```bash
railway domain
# Output : https://votre-app.railway.app
```

**Copier cette URL** - vous en aurez besoin pour Google Apps Script.

## 🧪 Étape 3 : Tests de Validation

### 3.1 Test Health Check

```bash
# Remplacer par votre URL Railway
RAILWAY_URL="https://votre-app.railway.app"

# Test health endpoint
curl "$RAILWAY_URL/health"

# Réponse attendue :
# {
#   "status": "healthy",
#   "uptime_seconds": 123,
#   "cache_valid": false,
#   "cache_age_ms": null,
#   "timestamp": "2025-10-30T23:45:00.000Z"
# }
```

### 3.2 Test API Endpoint avec Authentication

```bash
# Remplacer par votre API key
API_KEY="votre-cle-api-railway"

# Test extraction endpoint
curl -H "Authorization: Bearer $API_KEY" \
  "$RAILWAY_URL/api/scrape-bitnest"

# Réponse attendue :
# {
#   "success": true,
#   "data": {
#     "participants": 2110192,
#     "revenues": 752040501,
#     "liquidity": 30463309,
#     "timestamp": "2025-10-30T23:45:00.000Z"
#   },
#   "metadata": {
#     "extraction_time_ms": 4523,
#     "browser": "chromium",
#     "version": "1.0.0",
#     "cached": false
#   }
# }
```

### 3.3 Test Erreurs d'Authentification

```bash
# Test sans API key (doit échouer)
curl "$RAILWAY_URL/api/scrape-bitnest"
# Réponse : {"error": "Missing or invalid Authorization header"}

# Test avec mauvaise API key (doit échouer)
curl -H "Authorization: Bearer wrong-key" \
  "$RAILWAY_URL/api/scrape-bitnest"
# Réponse : {"error": "Invalid API key"}
```

## 📊 Étape 4 : Configuration Google Apps Script

### 4.1 Configurer Script Properties

1. Ouvrir votre Google Sheet BitNest
2. Extensions → Apps Script
3. Dans l'éditeur Apps Script :
   - Cliquer sur "Paramètres du projet" (icône engrenage)
   - Section "Propriétés du script"
   - Ajouter les propriétés :

```
Clé : BITNEST_WEBHOOK_URL
Valeur : https://votre-app.railway.app/api/scrape-bitnest

Clé : BITNEST_API_KEY
Valeur : votre-cle-api-railway
```

**⚠️ IMPORTANT** : Utilisez la même clé API que celle configurée dans Railway.

### 4.2 Vérifier le Code Apps Script

Le fichier `BitnestAutomation.gs` doit déjà contenir la fonction `extractWebsiteData()` mise à jour. Vérifiez que le code contient :

```javascript
function extractWebsiteData() {
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    const WEBHOOK_URL = scriptProperties.getProperty('BITNEST_WEBHOOK_URL') ||
      'https://bitnest-scraper.railway.app/api/scrape-bitnest';
    const API_KEY = scriptProperties.getProperty('BITNEST_API_KEY');

    if (!API_KEY) {
      Logger.log('⚠️ BITNEST_API_KEY non configurée - utilisation du fallback');
      return extractWebsiteDataFallback();
    }

    const response = UrlFetchApp.fetch(WEBHOOK_URL, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + API_KEY,
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true,
      timeout: 45
    });

    // ... reste du code
  } catch (error) {
    Logger.log('❌ Erreur webhook : ' + error.message);
    return extractWebsiteDataFallback();
  }
}
```

### 4.3 Test Manuel Apps Script

1. Dans l'éditeur Apps Script
2. Sélectionner la fonction `updateBitnestData`
3. Cliquer sur "Exécuter"
4. Vérifier les logs (Affichage → Journaux) :
   - Doit afficher : "✅ Webhook API : données extraites avec succès"
   - Pas de messages d'erreur

5. Retourner à la Google Sheet
6. Vérifier l'onglet "Dashboard" :
   - Ligne "Source Données" doit indiquer : "🌐 Site Web (Webhook)"
   - Indicateurs mis à jour avec valeurs réelles
   - Timestamp actuel

## 🔄 Étape 5 : Configuration Trigger Automatique

### 5.1 Activer Trigger Horaire

1. Apps Script → "Déclencheurs" (icône horloge)
2. Cliquer sur "+ Ajouter un déclencheur"
3. Configuration :
   - Fonction à exécuter : `updateBitnestData`
   - Source de l'événement : "Déclencheur temporel"
   - Type de déclencheur temporel : "Minuteur horaire"
   - Intervalle : "Toutes les heures"
4. Enregistrer

### 5.2 Surveiller les Exécutions

1. Apps Script → "Exécutions" (icône liste)
2. Vérifier que les exécutions automatiques fonctionnent
3. En cas d'erreur, vérifier les logs

## 📈 Étape 6 : Monitoring et Maintenance

### 6.1 Surveiller les Logs Railway

**Via Interface Web** :
1. Dashboard Railway → Votre projet
2. Onglet "Deployments"
3. Cliquer sur le déploiement actif
4. Section "Logs" en temps réel

**Via Railway CLI** :
```bash
# Logs en temps réel
railway logs --tail

# Logs filtrés par niveau
railway logs --tail | grep ERROR
railway logs --tail | grep "Extraction successful"
```

### 6.2 Métriques à Surveiller

Logs à surveiller dans Railway :

```json
// Extraction réussie
{
  "level": "info",
  "message": "✅ Extraction successful",
  "participants": 2110192,
  "extraction_time_ms": 4523
}

// Erreur extraction
{
  "level": "error",
  "message": "❌ Extraction failed after 3 retries",
  "error": "Navigation timeout"
}

// Cache utilisé
{
  "level": "info",
  "message": "📦 Serving cached data",
  "cache_age_ms": 120000
}
```

### 6.3 Health Check Monitoring

Configurer un monitoring externe (optionnel mais recommandé) :

**Option 1 : UptimeRobot** (gratuit)
1. [uptimerobot.com](https://uptimerobot.com)
2. Nouveau monitor
3. Type : HTTP(S)
4. URL : `https://votre-app.railway.app/health`
5. Intervalle : 5 minutes
6. Alerte email si down

**Option 2 : Cron Job Simple**
```bash
# Créer script check-health.sh
#!/bin/bash
HEALTH_URL="https://votre-app.railway.app/health"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $STATUS -ne 200 ]; then
  echo "⚠️ Health check failed: HTTP $STATUS"
  # Envoyer alerte (email, Slack, etc.)
fi

# Crontab : check toutes les 10 minutes
*/10 * * * * /path/to/check-health.sh
```

## 🔧 Troubleshooting

### Problème 1 : Déploiement échoue sur Railway

**Symptômes** : Build fails, container ne démarre pas

**Solutions** :
```bash
# Vérifier les logs de build
railway logs --deployment

# Vérifier Dockerfile
cat Dockerfile
# → Doit commencer par FROM node:18-slim

# Vérifier package.json
cat package.json
# → "playwright" doit être dans dependencies

# Rebuild manuel
railway up --detach
```

### Problème 2 : API retourne 401 Unauthorized

**Symptômes** : `{"error": "Invalid API key"}`

**Solutions** :
1. Vérifier que l'API key est identique dans :
   - Railway variables (`railway variables`)
   - Apps Script Properties (Script Properties)

2. Régénérer l'API key :
```bash
# Nouvelle clé
NEW_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo $NEW_KEY

# Mettre à jour Railway
railway variables set BITNEST_API_KEY=$NEW_KEY

# Mettre à jour Apps Script Properties (via interface web)
```

### Problème 3 : Extraction retourne des zéros

**Symptômes** : `{"participants": 0, "revenues": 0, "liquidity": 0}`

**Solutions** :
```bash
# Augmenter timeout Playwright
railway variables set PLAYWRIGHT_TIMEOUT_MS=60000
railway variables set PLAYWRIGHT_WAIT_MS=10000

# Vérifier logs Railway
railway logs --tail | grep "Extraction"

# Test local pour debug
cd bitnest-scraper-api
npm install
npm run test
# → Doit afficher données réelles
```

### Problème 4 : Rate Limit dépassé

**Symptômes** : `{"error": "Too many requests"}`

**Solutions** :
```bash
# Vérifier cache fonctionne
curl "$RAILWAY_URL/health"
# → cache_valid doit être true après 1ère extraction

# Augmenter limite si nécessaire
railway variables set RATE_LIMIT_MAX_REQUESTS=120
railway variables set CACHE_TTL_MS=600000  # 10 minutes
```

### Problème 5 : Apps Script timeout

**Symptômes** : "Execution exceeded time limit"

**Solutions** :

1. Vérifier timeout Apps Script :
```javascript
// Dans extractWebsiteData()
const response = UrlFetchApp.fetch(WEBHOOK_URL, {
  timeout: 45  // Augmenter si nécessaire
});
```

2. Optimiser Railway :
```bash
# Reduce Playwright timeout
railway variables set PLAYWRIGHT_TIMEOUT_MS=20000
```

## 💰 Coûts Railway

### Plan Gratuit ($0/mois)
- **Limites** : $5 de crédit gratuit/mois
- **Suffisant pour** : ~500 heures d'exécution
- **Automation horaire** : 730 heures/mois max
- **⚠️ Attention** : Crédit épuisé = service s'arrête

### Plan Hobby ($5/mois)
- **Inclus** : 500 heures d'exécution
- **Dépassement** : $0.000231/GB-hour
- **Estimation** : $5-7/mois pour usage forensique BitNest
- **Recommandé** : Oui pour production

### Optimisation Coûts

1. **Activer cache efficacement** :
```bash
# Cache 10 minutes au lieu de 5
railway variables set CACHE_TTL_MS=600000
```

2. **Monitoring usage** :
   - Dashboard Railway → Usage
   - Vérifier heures d'exécution
   - Ajuster trigger Apps Script si nécessaire

## 📚 Ressources Supplémentaires

### Documentation Railway
- [Railway Docs](https://docs.railway.app/)
- [Playwright Deployment](https://playwright.dev/docs/docker)
- [Express Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)

### Support
- **Railway Community** : [Discord](https://discord.gg/railway)
- **Logs Railway** : `railway logs --tail`
- **Health Check** : `https://votre-app.railway.app/health`

## ✅ Checklist de Déploiement

Avant de considérer le déploiement comme terminé :

- [ ] ✅ Railway projet créé et déployé
- [ ] ✅ Toutes variables d'environnement configurées
- [ ] ✅ URL Railway obtenue et testée
- [ ] ✅ Health check retourne 200 OK
- [ ] ✅ API endpoint retourne données réelles (pas zéros)
- [ ] ✅ Authentication fonctionne (401 si pas d'API key)
- [ ] ✅ Rate limiting testé
- [ ] ✅ Cache fonctionne (2ème call plus rapide)
- [ ] ✅ Apps Script Properties configurées
- [ ] ✅ Apps Script test manuel réussi
- [ ] ✅ Trigger horaire activé
- [ ] ✅ Première exécution automatique réussie
- [ ] ✅ Monitoring configuré (UptimeRobot ou équivalent)
- [ ] ✅ Logs Railway vérifiés (pas d'erreurs)
- [ ] ✅ Dashboard Google Sheet mis à jour automatiquement

## 🎉 Félicitations !

Votre API webhook BitNest est maintenant déployée et opérationnelle !

L'automation forensique fonctionne de manière complètement autonome :
- ✅ Extraction automatique toutes les heures
- ✅ Données réelles en temps réel (plus de cache manuel)
- ✅ Système résilient avec fallback 3 niveaux
- ✅ Monitoring et alertes configurés

---

**Dernière mise à jour** : 30 Octobre 2025
**Version** : 1.0.0
**Support** : Vérifier `railway logs` en cas de problème
