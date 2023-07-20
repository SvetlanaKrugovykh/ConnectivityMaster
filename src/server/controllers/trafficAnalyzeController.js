const HttpError = require('http-errors')
const trafficAnalyzesService = require('../services/trafficAnalyzeService')

module.exports.logSaving = async function (_request, _reply) {
  const message = await trafficAnalyzesService.logSaving()

  if (!message) {
    throw new HttpError[500]('Command execution failed')
  }

  return {
    message: `trafficAnalyze savwed successfully`
  }
}

module.exports.GetLogs = async function (request, _reply) {
  const { destinationAddress, startDate, endDate } = request.body
  const data = await trafficAnalyzesService.getLogs(destinationAddress, startDate, endDate)

  if (!message) {
    throw new HttpError[501]('Command execution failed')
  }

  return {
    data
  }
}