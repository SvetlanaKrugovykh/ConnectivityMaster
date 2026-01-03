const HttpError = require('http-errors')
const execCmdService = require('../services/execCmdService')

module.exports.execCmd = async function (request, _reply) {
  const { cmdText, value } = request.body
  
  try {
    const message = await execCmdService.execCommand_(cmdText, value)
    
    if (!message) {
      throw new HttpError[501]('Command returned empty result')
    }

    return {
      result: message
    }
  } catch (error) {
    console.error(`[execCmd] Error: ${error.message}`)
    throw new HttpError[501](error.message || 'Command execution failed')
  }
}