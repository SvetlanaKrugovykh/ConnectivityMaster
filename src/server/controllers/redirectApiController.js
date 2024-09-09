const HttpError = require('http-errors')
const fs = require('fs')
const redirectApiService = require('../services/redirectApiService')
const { sendReqToDB } = require('../modules/to_local_DB')
const { userInfo } = require('os')

module.exports.getInvoice = async function (request, reply) {
  try {
    let ipAddress = request.ip
    console.log('Request from ipAddress: ', ipAddress)
    if (process.env.REDIRECT_API_TEST_MODE === 'true') ipAddress = process.env.REDIRECT_API_TEST_IP
    const fullFileName = await redirectApiService.getInvoice(ipAddress)

    if (fullFileName === null) {
      throw new HttpError[501](`Problem with invoice generation for ${ipAddress}`)
    }

    let fullFileName_ = fullFileName.toString()
    if (fullFileName_ !== null) {
      fullFileName_ = fullFileName_.replace(/\\\\/g, '\\')
    }
    try {
      await sendReqToDB('__SaveSiteMsg__', `${fullFileName_}#getInvoice`, '')
    }
    catch (err) {
      console.log('PROBLEM of __SaveSiteMsg__', `${fullFileName_}#getInvoice#`, '')
    }
    reply.header('Content-Type', 'application/pdf')
    reply.header('Access-Control-Allow-Origin', '*')
    reply.header('Access-Control-Allow-Methods', 'GET')
    reply.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
    const fileData = fs.readFileSync(fullFileName_)
    reply.send(fileData)
  } catch (err) {
    console.log(err)
  }
}

module.exports.abonentServiceContinue = async function (request, _reply) {
  const ipAddress = request.ip
  const message = await redirectApiService.execServiceContinued(ipAddress)

  if (!message) {
    throw new HttpError[501]('Command execution failed')
  }
  try {
    await sendReqToDB('__SaveSiteMsg__', `${ipAddress}#ServiceContinue`, '')
  }
  catch (err) {
    console.log('PROBLEM of __SaveSiteMsg__', `${ipAddress}#ServiceContinue#`, '')
  }
  return {
    message: `Service continued for ${ipAddress}`
  }
}

module.exports.abonentGetPayLink = async function (request, reply) {
  const ipAddress = request.ip
  const amount = parseFloat(request.query.amount)

  if (isNaN(amount) || amount <= 0) {
    throw new HttpError[501](`Problem with get amount for ${ipAddress}`)
  }

  const commissionRate = 0.015;
  const totalAmount = (Math.ceil((amount / (1 - commissionRate)) * 100) / 100).toFixed(2)

  const payment_data = await redirectApiService.execGetPayLink(ipAddress, totalAmount)

  if (!payment_data) {
    throw new HttpError[501]('Command execution failed')
  }
  try {
    await sendReqToDB('__SaveSiteMsg__', `${ipAddress}#GetPayLink`, '')
  }
  catch (err) {
    console.log('PROBLEM of __SaveSiteMsg__', `${ipAddress}#GetPayLink#`, '')
  }
  const message = {
    ipAddress,
    user_info: payment_data.user_info,
    linkURI: payment_data.linkURI,
  }
  return reply.send(message)
}
