/**
 * ================================================================
 * TELEGRAM AUTHENTICATION SETUP SCRIPT
 * ================================================================
 *
 * Script d'authentification interactive one-time pour Telegram.
 *
 * Ce script génère une SESSION STRING permanente qui permet
 * à l'API d'accéder au canal BitnestMonitor sans intervention manuelle.
 *
 * WORKFLOW:
 * 1. User fournit API ID et API Hash (depuis https://my.telegram.org)
 * 2. User entre son numéro de téléphone
 * 3. Telegram envoie code de vérification par SMS/App
 * 4. User entre le code
 * 5. Script génère SESSION STRING à stocker dans .env
 *
 * ⚠️ IMPORTANT: Le session string est sensible - ne jamais le commit
 */

require('dotenv').config();
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const input = require('input');
const fs = require('fs');
const path = require('path');

console.log(`
╔════════════════════════════════════════════════════════════════╗
║  🔐 TELEGRAM AUTHENTICATION SETUP - BitNest Scraper API       ║
╚════════════════════════════════════════════════════════════════╝

Ce script va générer une SESSION STRING permanente pour accéder
au canal Telegram BitnestMonitor sans intervention manuelle.

📋 PRÉREQUIS:
1. Compte Telegram actif
2. API credentials de https://my.telegram.org
   - API ID (nombre entier)
   - API Hash (chaîne hexadécimale)

⚠️  Le session string généré est SENSIBLE - ne jamais le partager!

`);

/**
 * Valide que l'API ID est un nombre valide
 */
function validateApiId(apiId) {
  const parsed = parseInt(apiId, 10);
  return !isNaN(parsed) && parsed > 0;
}

/**
 * Valide que l'API Hash a le bon format
 */
function validateApiHash(apiHash) {
  return /^[a-f0-9]{32}$/i.test(apiHash);
}

/**
 * Valide le format du numéro de téléphone
 */
function validatePhoneNumber(phone) {
  // Format attendu: +33612345678 ou 33612345678
  return /^\+?\d{10,15}$/.test(phone);
}

/**
 * Workflow d'authentification interactive
 */
async function authenticateAndGenerateSession() {
  let apiId, apiHash, phoneNumber;

  // Étape 1: API ID
  while (true) {
    apiId = await input.text('📱 Enter your Telegram API ID: ');

    if (validateApiId(apiId)) {
      apiId = parseInt(apiId, 10);
      break;
    }

    console.log('❌ Invalid API ID. Must be a positive integer.\n');
  }

  // Étape 2: API Hash
  while (true) {
    apiHash = await input.text('🔑 Enter your Telegram API Hash: ');

    if (validateApiHash(apiHash)) {
      break;
    }

    console.log('❌ Invalid API Hash. Must be 32 hexadecimal characters.\n');
  }

  // Étape 3: Numéro de téléphone
  console.log('\n📞 Enter your phone number (with country code, e.g., +33612345678)');
  while (true) {
    phoneNumber = await input.text('Phone number: ');

    if (validatePhoneNumber(phoneNumber)) {
      // Ajouter + si manquant
      if (!phoneNumber.startsWith('+')) {
        phoneNumber = '+' + phoneNumber;
      }
      break;
    }

    console.log('❌ Invalid phone number format.\n');
  }

  console.log('\n🔄 Connecting to Telegram...\n');

  // Créer client Telegram avec session vide
  const session = new StringSession('');
  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5
  });

  await client.start({
    phoneNumber: async () => phoneNumber,
    password: async () => {
      // Si 2FA activé, demander mot de passe
      console.log('\n🔐 Two-factor authentication detected');
      return await input.text('Enter your 2FA password: ', { replace: '*' });
    },
    phoneCode: async () => {
      console.log('\n📬 Telegram has sent you a verification code via SMS/App');
      return await input.text('Enter the code: ');
    },
    onError: (err) => {
      console.error('❌ Authentication error:', err.message);
      throw err;
    }
  });

  console.log('\n✅ Authentication successful!\n');

  // Générer session string
  const sessionString = client.session.save();

  console.log('🎉 SESSION STRING generated successfully!\n');
  console.log('═'.repeat(70));
  console.log('📋 Copy this session string to your .env file:\n');
  console.log(`TELEGRAM_SESSION=${sessionString}`);
  console.log('═'.repeat(70));

  // Proposer de sauvegarder automatiquement dans .env
  const autoSave = await input.confirm('\n💾 Do you want to save these credentials to .env file? ');

  if (autoSave) {
    const envPath = path.join(__dirname, '..', '.env');
    let envContent = '';

    // Lire .env existant si présent
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Ajouter ou mettre à jour les variables Telegram
    const telegramVars = `
# ===== TELEGRAM CONFIGURATION (Generated ${new Date().toISOString()}) =====
TELEGRAM_API_ID=${apiId}
TELEGRAM_API_HASH=${apiHash}
TELEGRAM_SESSION=${sessionString}
TELEGRAM_BITNEST_CHANNEL=BitnestMonitor
`;

    // Supprimer anciennes variables Telegram si présentes
    envContent = envContent.replace(/# ===== TELEGRAM CONFIGURATION.*?(?=\n# =====|\n[A-Z]|$)/s, '');

    // Ajouter nouvelles variables
    envContent = envContent.trim() + '\n' + telegramVars;

    fs.writeFileSync(envPath, envContent, 'utf8');

    console.log('\n✅ Credentials saved to .env file');
    console.log('⚠️  Remember to add .env to .gitignore!');
  }

  // Test de connexion au canal BitnestMonitor
  console.log('\n🔍 Testing connection to BitnestMonitor channel...\n');

  try {
    const channel = await client.getEntity('BitnestMonitor');
    console.log('✅ Successfully connected to @BitnestMonitor channel');
    console.log(`   Channel ID: ${channel.id}`);
    console.log(`   Title: ${channel.title || 'N/A'}`);

    // Récupérer un message de test
    const messages = await client.getMessages(channel, { limit: 1 });

    if (messages.length > 0) {
      console.log(`   Latest message: ${messages[0].date?.toISOString()}`);
    }

  } catch (error) {
    console.log('⚠️  Could not access @BitnestMonitor channel');
    console.log('   Make sure the channel username is correct');
    console.log('   Or update TELEGRAM_BITNEST_CHANNEL in .env');
  }

  await client.disconnect();

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║  ✅ SETUP COMPLETE!                                            ║
╚════════════════════════════════════════════════════════════════╝

Next steps:
1. Verify .env file contains TELEGRAM_SESSION
2. Run: npm run test:telegram
3. If successful, deploy to Railway with these env variables

⚠️  SECURITY:
- Never commit .env file
- Never share session string
- Railway deployment: set env variables in dashboard
`);
}

/**
 * Point d'entrée principal
 */
(async () => {
  try {
    await authenticateAndGenerateSession();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error('\nPlease try again. If the error persists:');
    console.error('1. Verify API credentials at https://my.telegram.org');
    console.error('2. Check your phone number format');
    console.error('3. Ensure you have stable internet connection');
    process.exit(1);
  }
})();
