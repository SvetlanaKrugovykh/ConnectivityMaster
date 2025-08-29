const dotenv = require('dotenv')
const { sendToChat } = require('../modules/to_local_DB')

dotenv.config()

const CHUNK_SIZE = 3900
const CHUNK_DELAY_MS = 250

function splitMessage(text, size = CHUNK_SIZE) {
  const chunks = []
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size))
  }
  return chunks
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function sendTgMessage(message) {
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
  const telegramChatId = process.env.TELEGRAM_CHAT_ID
  if (!telegramBotToken || !telegramChatId) {
    console.log('[telegramService] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set; skipping send')
    return false
  }
  const apiUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`

  const chunks = typeof message === 'string' ? splitMessage(message) : splitMessage(String(message))
  let anySent = false

  for (let i = 0; i < chunks.length; i++) {
    try {
      const chunk = chunks[i]
      const response = await sendToChat(apiUrl, telegramBotToken, telegramChatId, chunk)
      if (!response) {
        console.log(`[telegramService] chunk ${i + 1}/${chunks.length} failed (no response)`)
      } else {
        anySent = true
      }
    } catch (err) {
      console.log(`[telegramService] chunk ${i + 1}/${chunks.length} send error: ${err.message}`)
    }

    if (i < chunks.length - 1) {
      await sleep(CHUNK_DELAY_MS)
    }
  }

  if (!anySent) {
    console.log('[telegramService] all chunks failed to send')
    return false
  }

  return true
}

module.exports = { sendTgMessage }