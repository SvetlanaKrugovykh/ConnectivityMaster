const HttpError = require('http-errors')
const fs = require('fs')
const redirectApiService = require('../services/redirectApiService')

module.exports.getInvoice = async function (request, reply) {
  try {
    const ipAddress = request.ip
    const fullFileName = await redirectApiService.getInvoice(ipAddress)
    const fullFileName_ = fullFileName.toString().replace(/\\\\/g, '\\')

    if (fullFileName_ === null) {
      throw new HttpError[501]('Command execution failed')
    }
    reply.header('Content-Type', 'application/pdf')
    const fileData = await fs.readFileSync(fullFileName_)
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
    message: `Abonent switched on ${addTag}`
  }
}