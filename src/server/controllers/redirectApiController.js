const HttpError = require('http-errors')
const fs = require('fs')
const redirectApiService = require('../services/redirectApiService')

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

  return {
    message: `Service continued for ${ipAddress}`
  }
}