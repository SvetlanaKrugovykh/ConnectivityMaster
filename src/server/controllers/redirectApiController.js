const HttpError = require('http-errors')
const fs = require('fs')
const redirectApiService = require('../services/redirectApiService')
const { sendReqToDB } = require('../modules/to_local_DB')

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
  const linkURI = await redirectApiService.execGetPayLink(ipAddress)

  if (!message) {
    throw new HttpError[501]('Command execution failed')
  }
  try {
    await sendReqToDB('__SaveSiteMsg__', `${ipAddress}#GetPayLink`, '')
  }
  catch (err) {
    console.log('PROBLEM of __SaveSiteMsg__', `${ipAddress}#GetPayLink#`, '')
  }
  return {
    message: linkURI
  }
}