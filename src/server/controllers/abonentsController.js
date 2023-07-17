const HttpError = require('http-errors')
const abonentsService = require('../services/abonentsService')

module.exports.abonentSwitchOff = async function (request, _reply) {
  const { abonentId, ipAddress, vlanId } = request.body

  const message = await abonentsService.switchOff(abonentId, ipAddress, vlanId)

  if (!message) {
    throw new HttpError[501]('Command execution failed')
  }

  return {
    message: 'Abonent switched off'
  }
}