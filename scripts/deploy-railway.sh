#!/bin/bash

###############################################################################
# RAILWAY DEPLOYMENT AUTOMATION SCRIPT
# BitNest Scraper API - Dual-Source Forensic Automation
###############################################################################
#
# Ce script automatise le déploiement complet sur Railway:
# - Vérification prérequis (Railway CLI, Git)
# - Configuration variables d'environnement
# - Déploiement Docker
# - Vérification santé de l'API
#
# Usage: ./scripts/deploy-railway.sh
#
###############################################################################

set -e  # Exit on error

# Couleurs pour output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonctions helper
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Banner
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  🚂 RAILWAY DEPLOYMENT - BitNest Scraper API                  ║"
echo "║  Dual-Source Forensic Automation with Telegram Integration    ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

###############################################################################
# 1. VÉRIFICATION PRÉREQUIS
###############################################################################

log_info "Vérification des prérequis..."

# Vérifier Railway CLI
if ! command -v railway &> /dev/null; then
    log_error "Railway CLI not found"
    echo ""
    echo "Installation Railway CLI:"
    echo "npm install -g @railway/cli"
    echo ""
    exit 1
fi
log_success "Railway CLI installé"

# Vérifier Git
if ! command -v git &> /dev/null; then
    log_error "Git not found"
    exit 1
fi
log_success "Git installé"

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js not found"
    exit 1
fi
NODE_VERSION=$(node --version)
log_success "Node.js $NODE_VERSION installé"

###############################################################################
# 2. VÉRIFICATION REPOSITORY GIT
###############################################################################

log_info "Vérification repository Git..."

# Vérifier qu'on est dans le bon dossier
if [ ! -f "package.json" ]; then
    log_error "package.json not found - run from project root"
    exit 1
fi

# Vérifier qu'on est sur la branche main
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
    log_warning "Vous n'êtes pas sur la branche main (branche actuelle: $CURRENT_BRANCH)"
    read -p "Continuer quand même? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Déploiement annulé"
        exit 0
    fi
fi

# Vérifier qu'il n'y a pas de changements non commit
if [[ -n $(git status --porcelain) ]]; then
    log_warning "Changements non commit détectés"
    read -p "Commit et push avant déploiement? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        log_info "Committing changes..."
        git add .
        git commit -m "🚀 Pre-deployment commit: $(date +'%Y-%m-%d %H:%M')"
        git push origin main
        log_success "Changes committed and pushed"
    fi
fi

log_success "Repository Git prêt"

###############################################################################
# 3. AUTHENTIFICATION RAILWAY
###############################################################################

log_info "Vérification authentification Railway..."

# Vérifier si déjà authentifié
if ! railway whoami &> /dev/null; then
    log_warning "Non authentifié sur Railway"
    log_info "Ouverture navigateur pour authentification..."
    railway login
fi

RAILWAY_USER=$(railway whoami)
log_success "Authentifié en tant que: $RAILWAY_USER"

###############################################################################
# 4. CONFIGURATION PROJET RAILWAY
###############################################################################

log_info "Configuration projet Railway..."

# Vérifier si projet Railway existe déjà
if railway status &> /dev/null; then
    log_info "Projet Railway existant détecté"
    railway status
else
    log_info "Création nouveau projet Railway..."

    # Créer projet Railway lié au repo GitHub
    railway init

    log_success "Projet Railway créé"
fi

###############################################################################
# 5. CONFIGURATION VARIABLES D'ENVIRONNEMENT
###############################################################################

log_info "Configuration variables d'environnement..."

# Vérifier si .env existe
if [ ! -f ".env" ]; then
    log_warning ".env file not found"
    log_info "Copiez .env.example vers .env et configurez vos valeurs"
    cp .env.example .env
    log_info "Fichier .env créé depuis .env.example"
    echo ""
    echo "⚠️  IMPORTANT: Configurez les variables suivantes dans .env:"
    echo "   - BITNEST_API_KEY (générez une clé sécurisée)"
    echo "   - TELEGRAM_SESSION_STRING (copiez depuis telegram-mcp-server/.env)"
    echo ""
    read -p "Appuyez sur ENTER après avoir configuré .env..."
fi

# Lire variables depuis .env et configurer sur Railway
log_info "Définition des variables sur Railway..."

# Variables requises
declare -a REQUIRED_VARS=(
    "PORT"
    "NODE_ENV"
    "LOG_LEVEL"
    "BITNEST_API_KEY"
    "TELEGRAM_API_ID"
    "TELEGRAM_API_HASH"
    "TELEGRAM_SESSION_STRING"
)

# Charger .env
export $(grep -v '^#' .env | xargs)

# Définir chaque variable sur Railway
for VAR in "${REQUIRED_VARS[@]}"; do
    VALUE="${!VAR}"

    if [ -z "$VALUE" ]; then
        log_warning "Variable $VAR not set in .env"
        continue
    fi

    # Masquer les secrets sensibles dans les logs
    if [[ "$VAR" == *"KEY"* ]] || [[ "$VAR" == *"HASH"* ]] || [[ "$VAR" == *"SESSION"* ]]; then
        DISPLAY_VALUE="${VALUE:0:10}..."
    else
        DISPLAY_VALUE="$VALUE"
    fi

    log_info "Setting $VAR=$DISPLAY_VALUE"
    railway variables set "$VAR=$VALUE" > /dev/null 2>&1
done

# Variables optionnelles avec valeurs par défaut
railway variables set "RATE_LIMIT_WINDOW_MS=${RATE_LIMIT_WINDOW_MS:-3600000}" > /dev/null 2>&1
railway variables set "RATE_LIMIT_MAX_REQUESTS=${RATE_LIMIT_MAX_REQUESTS:-60}" > /dev/null 2>&1
railway variables set "CACHE_TTL_MS=${CACHE_TTL_MS:-300000}" > /dev/null 2>&1
railway variables set "PLAYWRIGHT_TIMEOUT_MS=${PLAYWRIGHT_TIMEOUT_MS:-30000}" > /dev/null 2>&1
railway variables set "PLAYWRIGHT_WAIT_MS=${PLAYWRIGHT_WAIT_MS:-5000}" > /dev/null 2>&1
railway variables set "MAX_RETRIES=${MAX_RETRIES:-3}" > /dev/null 2>&1
railway variables set "RETRY_DELAY_MS=${RETRY_DELAY_MS:-2000}" > /dev/null 2>&1
railway variables set "TELEGRAM_BITNEST_CHANNEL=${TELEGRAM_BITNEST_CHANNEL:-BitnestMonitor}" > /dev/null 2>&1

log_success "Variables d'environnement configurées"

###############################################################################
# 6. DÉPLOIEMENT
###############################################################################

log_info "Déploiement en cours..."

# Déployer depuis Dockerfile
railway up --detach

log_success "Déploiement lancé"

# Attendre que le déploiement soit actif
log_info "Attente de la disponibilité du service..."
sleep 10

###############################################################################
# 7. CONFIGURATION DOMAINE
###############################################################################

log_info "Configuration domaine Railway..."

# Générer domaine si pas déjà configuré
DOMAIN=$(railway domain 2>&1)

if [[ "$DOMAIN" == *"No domain"* ]] || [[ "$DOMAIN" == *"error"* ]]; then
    log_info "Génération nouveau domaine..."
    railway domain
    sleep 5
    DOMAIN=$(railway domain 2>&1)
fi

# Extraire l'URL du domaine
API_URL=$(echo "$DOMAIN" | grep -oE 'https://[^ ]+' | head -1)

if [ -z "$API_URL" ]; then
    log_warning "Impossible d'obtenir l'URL du domaine automatiquement"
    log_info "Obtenez l'URL via: railway domain"
else
    log_success "Service déployé sur: $API_URL"
fi

###############################################################################
# 8. VÉRIFICATION SANTÉ API
###############################################################################

if [ -n "$API_URL" ]; then
    log_info "Vérification santé de l'API..."

    # Attendre 15 secondes pour le démarrage complet
    sleep 15

    # Test health endpoint
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health" || echo "000")

    if [ "$HTTP_CODE" == "200" ]; then
        log_success "API santé vérifiée (HTTP $HTTP_CODE)"

        # Afficher réponse health
        echo ""
        echo "Health check response:"
        curl -s "$API_URL/health" | jq '.' 2>/dev/null || curl -s "$API_URL/health"
    else
        log_warning "Health check failed (HTTP $HTTP_CODE)"
        log_info "Le service peut encore être en cours de démarrage"
        log_info "Vérifiez les logs: railway logs"
    fi
fi

###############################################################################
# 9. RÉSUMÉ ET PROCHAINES ÉTAPES
###############################################################################

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  ✅ DÉPLOIEMENT TERMINÉ                                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

if [ -n "$API_URL" ]; then
    echo "🌐 API URL: $API_URL"
    echo ""
    echo "📋 Endpoints disponibles:"
    echo "   GET $API_URL/health"
    echo "   GET $API_URL/api/scrape-bitnest  (requiert API key)"
    echo "   GET $API_URL/api/scrape-telegram (requiert API key)"
    echo "   GET $API_URL/api/scrape-dual     (requiert API key)"
    echo ""
fi

echo "🔑 API Key: $(echo $BITNEST_API_KEY | cut -c1-20)..."
echo ""
echo "📊 Prochaines étapes:"
echo "   1. Configurez Google Apps Script Properties:"
echo "      BITNEST_WEBHOOK_URL=$API_URL/api/scrape-dual"
echo "      BITNEST_API_KEY=<votre-clé-api>"
echo ""
echo "   2. Testez l'endpoint dual-source:"
echo "      curl -H \"Authorization: Bearer \$BITNEST_API_KEY\" \\"
echo "        \"$API_URL/api/scrape-dual\""
echo ""
echo "   3. Surveillez les logs:"
echo "      railway logs --tail"
echo ""
echo "   4. Monitoring:"
echo "      railway status"
echo ""

log_success "Déploiement Railway complet !"
echo ""
