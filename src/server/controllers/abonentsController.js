const HttpError = require('http-errors')
const abonentsService = require('../services/abonentsService')

module.exports.abonentSwitchOff = async function (request, _reply) {
  const { abonentId } = request.params

  const abonent = await abonentsService.switchOff(abonentId)

  if (!abonent) {
    throw new HttpError.NotFound('Abonent not found')
  }

  await abonentsService.switchOff(abonentId)

  return {
    message: 'Abonent switched off'
  }
}