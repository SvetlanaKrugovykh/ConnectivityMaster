const HttpError = require('http-errors')
const execCmdService = require('../services/execCmdService')

module.exports.execCmd = async function (request, _reply) {
  const { cmdText } = request.body
  const message = await execCmdService.execCommand_(cmdText)

  if (!message) {
    throw new HttpError[501]('Command execution failed')
  }

  return {
    message: `Abonent forwarded on ${addTag}`
  }
}