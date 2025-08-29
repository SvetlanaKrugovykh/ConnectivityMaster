const dotenv = require('dotenv')
const { sendToChat } = require('../modules/to_local_DB')

dotenv.config()

async function sendTgMessage(message) {
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
  const telegramChatId = process.env.TELEGRAM_CHAT_ID
  if (!telegramBotToken || !telegramChatId) {
    console.warn('[telegramService] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set; skipping send')
    return false
  }
  const apiUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`

  try {
    const response = await sendToChat(apiUrl, telegramBotToken, telegramChatId, message)
    if (!response) {
      console.warn('[telegramService] sendToChat returned falsy')
      return false
    }
    return true
  } catch (error) {
    console.error('[telegramService] Error sending Telegram message:', error)
    return false
  }
}

module.exports = { sendTgMessage }

