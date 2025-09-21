const HttpError = require('http-errors')
const crypto = require('crypto')
const dbRequests = require('../db-api/requests')
const getLiqpayKeys = require('../globalBuffer').getLiqpayKeys
const { sendToChat } = require('../modules/to_local_DB')
const { sendPaymentData } = require('../modules/redirectPaymentData')
const { getGateURL } = require('../modules/to_local_DB')

module.exports.getCallback = function (abbreviation) {
  return async function (request, reply) {
    try {
      console.log(`Received callback for ${abbreviation}`)
      const { data, signature } = request.body
      const liqpayKeys = getLiqpayKeys(abbreviation)
      if (!liqpayKeys) {
        console.log(`No LiqPay keys found for abbreviation: ${abbreviation}`)
        return reply.status(400).send('No LiqPay keys found')
      }
      const { publicKey, privateKey } = liqpayKeys
      console.log(`LiqPay Public Key: ${publicKey}`)

      const calculatedSignature = crypto.createHash('sha1')
        .update(privateKey + data + privateKey)
        .digest('base64')

      if (signature !== calculatedSignature) {
        console.log('Invalid signature')
        return reply.status(400).send('Invalid signature')
      }

      const paymentData = JSON.parse(Buffer.from(data, 'base64').toString('utf8'))
      console.log('Decoded payment data:', paymentData)

      if (paymentData?.description.includes('Płatność za usługę')) {
        console.log('Description contains "Płatność za usługę". Sending data to external service...')
        try {
          const response = await sendPaymentData(paymentData)
          if (response.status !== 200) {
            console.error('Error: External service returned non-200 status:', response.status)
          } else {
            console.log('Payment data successfully sent to external service')
          }
        } catch (error) {
          console.error('Error sending payment data to external service:', error.message)
        }
        return reply.status(200).send('OK')
      }

      const payment = await dbRequests.updatePayment(paymentData)
      console.log('Payment updated:', payment)

      reply.status(200).send('OK')

    } catch (error) {
      console.error('Error in callback processing:', error.message)
      reply.status(500).send('Internal Server Error')
    }
  }
}

module.exports.GetIP = async function (request, reply) {
  const ipAddress = request.ip
  console.log('Request GetIP from ipAddress: ', ipAddress)
  return reply.send(ipAddress)
}

module.exports.GetGate = async function (request, reply) {
  const ipAddress = request.ip
  console.log('Request GetGate from ipAddress: ', ipAddress)
  const response = await getGateURL(ipAddress)
  if (!response) {
    console.error('Error fetching gate URL')
    return reply.status(500).send('Error fetching gate URL')
  }


  const parsedResponse = JSON.parse(response)
  const gateURL = parsedResponse?.ResponseArray?.[0]
  return reply.send(gateURL)
}

module.exports.sendMsg = async function (request, reply) {
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
  const telegramChatId = process.env.TELEGRAM_CHAT_ID
  const apiUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`

  const { name, email, message } = request.query
  console.log('Request sendMsg with msg: ', message)


  try {
    const Text = `New message from the website:\nName: ${name}\nEmail: ${email}\nMessage: ${message}`
    const response = await sendToChat(apiUrl, telegramBotToken, telegramChatId, Text)
    if (!response) {
      console.log('Error sending Telegram message.')
    }
  } catch (error) {
    console.error('Error sending Telegram message:', error)
  }

  return reply.send(message)
}