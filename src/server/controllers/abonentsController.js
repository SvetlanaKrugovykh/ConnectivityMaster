const HttpError = require('http-errors')
const abonentsService = require('../services/abonentsService')
const addTag = process.env.PLATFORM !== 'freebsd' ? '( Test mode )' : ''

module.exports.abonentSwitchOff = async function (request, _reply) {
  const { abonentId, ipAddress, vlanId } = request.body
  const message = await abonentsService.switchOff(abonentId, ipAddress, vlanId)

  if (!message) {
    throw new HttpError[501]('Command execution failed')
  }

  return {
    message: `Abonent switched off ${addTag}`
  }
}

module.exports.abonentSwitchOn = async function (request, _reply) {
  const abonentId = request.body
  const message = await abonentsService.switchOn(abonentId)

  if (!message) {
    throw new HttpError[501]('Command execution failed')
  }

  return {
    message: `Abonent switched on ${addTag}`
  }
}