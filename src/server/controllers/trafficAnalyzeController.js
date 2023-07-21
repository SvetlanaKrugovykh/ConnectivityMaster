const HttpError = require('http-errors')
const trafficAnalyzesService = require('../services/trafficAnalyzeService')

module.exports.logSaving = async function (_request, _reply) {
  const message = await trafficAnalyzesService.logSaving()

  if (!message) {
    throw new HttpError[500]('Command execution failed')
  }

  return {
    message
  }
}

module.exports.getLogs = async function (request, _reply) {
  const { subnet, srcIpAddress, dstIpAddress, startDate, endDate } = request.body
  const data = await trafficAnalyzesService.getLogs(subnet, srcIpAddress, dstIpAddress, startDate, endDate)

  if (!data) {
    throw new HttpError[501]('Command execution failed')
  }

  return {
    data
  }
}

module.exports.removeCollection = async function (request, _reply) {
  const { rootCollectionId, docsCollectionId } = request.body
  if (process.env.ACCEPT_REMOVE_COLLECTION === 'false') throw new HttpError[403]('Forbidden')
  const message = await trafficAnalyzesService.removeCollection(rootCollectionId, docsCollectionId)

  if (!message) {
    throw new HttpError[501]('Command execution failed')
  }

  return {
    message
  }
}

module.exports.macSaving = async function (_request, _reply) {
  const message = await trafficAnalyzesService.macSaving()

  if (!message) {
    throw new HttpError[500]('Command execution failed')
  }

  return {
    message
  }
}