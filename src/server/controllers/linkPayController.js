const HttpError = require('http-errors')
const paymentService = require('../services/paymentService')
const { sendReqToDB } = require('../modules/to_local_DB')

module.exports.getLinkPay = async function (request, _reply) {
  const ipAddress = request.ip
  const { abbreviation, contract, amount } = request.body
  const message = await paymentService.formPaymentLink(ipAddress, abbreviation, contract, amount)

  if (!message) {
    throw new HttpError[501]('Command execution failed')
  }
  try {
    await sendReqToDB('__SaveSiteMsg__', `${ipAddress}#getLinkPay`, '')
  }
  catch (err) {
    console.log('PROBLEM of __SaveSiteMsg__', `${ipAddress}#getLinkPay#`, '')
  }
  return {
    message: message
  }
}