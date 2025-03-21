const HttpError = require('http-errors')
const { generateMrtgReport } = require('../reports/mrtg_report')

module.exports.getMrtg = async function (request, _reply) {
  const chatID = request.body.chatID

  const message = await generateMrtgReport(chatID)

  if (!message) {
    throw new HttpError[501]('Command execution failed')
  }

  return {
    message
  }
}