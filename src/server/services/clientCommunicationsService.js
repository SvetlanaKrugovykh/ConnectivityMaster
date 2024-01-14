const axios = require('axios')
require('dotenv').config()


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

  const apiToken = process.env.TELEGRAM_BOT_TOKEN_SILVER

  for (const address of addresses) {
    try {
      await axios.post(`https://api.telegram.org/bot${apiToken}/sendMessage`, {
        chat_id: address,
        text: message,
      })
      console.log('Message sent successfully')
    } catch (error) {
      console.error('Error sending Telegram message:', error.message)
    }
  }
}