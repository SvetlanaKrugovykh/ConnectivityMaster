const Telegram = require('node-telegram-bot-api')

module.exports.sendMessage = async function (body) {

  try {
    switch (body.type) {
      case 'email':
        return await sendEmail(body)
      case 'telegram':
        return await sendTelegram(body)
      default:
        return false
    }
  } catch (error) {
    console.error('Error executing sendMessage commands:', error.message)
    return false
  }
}

async function sendTelegram(body) {
  const { addresses, message } = body
  const telegram = new Telegram(process.env.TELEGRAM_BOT_TOKEN)

  addresses.forEach(address => {
    telegram.sendMessage(address, message)
  })

  return true
}
