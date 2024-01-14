const axios = require('axios')
const nodemailer = require('nodemailer')
require('dotenv').config()


module.exports.sendMessage = async function (body) {

  try {
    switch (body.type) {
      case 'email':
        console.log('Sending email...', body.addresses[0])
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

async function sendEmail(body) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER_SILVER,
      pass: process.env.EMAIL_PASSWORD_SILVER,
    },
  })

  let attachments = []
  if (body.attachments) {
    for (const attachment of body.attachments) {
      attachments.push({
        filename: attachment.filename,
        content: Buffer.from(attachment.content, 'base64'),
      })
    }
  }

  const mailOptions = {
    from: process.env.EMAIL_USER_SILVER,
    to: body.addresses,
    subject: body?.subject || 'Silver - mail',
    text: body.message,
    attachments,
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log(`Message to ${body.addresses[0]} sent successfully`)
    return true
  } catch (error) {
    console.error(`Error ${body.addresses[0]} sending email:`, error.message)
    return false
  }
}