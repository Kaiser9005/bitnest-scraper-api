/**
 * Script helper pour obtenir le Chat ID d'un groupe Telegram
 *
 * Usage:
 * 1. Créer un bot via @BotFather
 * 2. Ajouter le bot à votre groupe
 * 3. Envoyer un message dans le groupe
 * 4. Lancer ce script: node scripts/get-chat-id.js
 */

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN not found in .env');
  console.error('\nSteps:');
  console.error('1. Talk to @BotFather on Telegram');
  console.error('2. Create a bot with /newbot');
  console.error('3. Copy the BOT_TOKEN');
  console.error('4. Add TELEGRAM_BOT_TOKEN=your_token to .env');
  process.exit(1);
}

async function getChatId() {
  console.log('🤖 Initializing Telegram Bot...\n');

  const bot = new TelegramBot(BOT_TOKEN, { polling: false });

  try {
    // Get bot info
    const me = await bot.getMe();
    console.log('✅ Bot connected:');
    console.log(`   Username: @${me.username}`);
    console.log(`   ID: ${me.id}\n`);

    // Get recent updates
    console.log('📨 Fetching recent messages...\n');
    const updates = await bot.getUpdates({ limit: 10 });

    if (updates.length === 0) {
      console.log('⚠️ No messages found!');
      console.log('\nNext steps:');
      console.log('1. Add @' + me.username + ' to your Telegram group');
      console.log('2. Make the bot an ADMIN of the group');
      console.log('3. Send a test message in the group');
      console.log('4. Run this script again\n');
      process.exit(0);
    }

    // Display all chats found
    console.log('📋 Found chats:\n');
    const chats = new Map();

    updates.forEach(update => {
      const msg = update.message || update.channel_post;
      if (msg && msg.chat) {
        const chatKey = `${msg.chat.id}`;
        if (!chats.has(chatKey)) {
          chats.set(chatKey, {
            id: msg.chat.id,
            type: msg.chat.type,
            title: msg.chat.title || `${msg.chat.first_name || ''} ${msg.chat.last_name || ''}`.trim(),
            username: msg.chat.username
          });
        }
      }
    });

    chats.forEach((chat, index) => {
      console.log(`Chat ${index + 1}:`);
      console.log(`   ID: ${chat.id}`);
      console.log(`   Type: ${chat.type}`);
      console.log(`   Title: ${chat.title}`);
      if (chat.username) console.log(`   Username: @${chat.username}`);
      console.log('');
    });

    console.log('💡 Next step:');
    console.log('Add this to your .env file:');
    console.log('');

    // If only one chat, suggest it
    if (chats.size === 1) {
      const chat = Array.from(chats.values())[0];
      console.log(`TELEGRAM_CHAT_ID=${chat.id}`);
    } else {
      console.log('TELEGRAM_CHAT_ID=<choose one of the IDs above>');
    }
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

getChatId();
