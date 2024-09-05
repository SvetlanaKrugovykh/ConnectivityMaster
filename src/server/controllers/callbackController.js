const HttpError = require('http-errors')
const crypto = require('crypto')
const dbRequests = require('../db-api/requests')
const getLiqpayKeys = require('../globalBuffer').getLiqpayKeys

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

      const payment = await dbRequests.updatePayment(paymentData)
      console.log('Payment updated:', payment)

      reply.status(200).send('OK')

    } catch (error) {
      console.error('Error in callback processing:', error.message)
      reply.status(500).send('Internal Server Error')
    }
  }
}
