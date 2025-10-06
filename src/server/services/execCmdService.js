const { runCommand } = require('../utils/commandsOS')

module.exports.execCommand_ = async function (cmdText, value) {
  try {
    const addCommand = await runCommand(cmdText, [], value)
    if (addCommand.stdout) {
      return addCommand.stdout.trim()
    }
  } catch (error) {
    console.error('Error executing commands:', error.message)
    return false
  }
}