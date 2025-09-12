const { runCommand } = require('../utils/commandsOS')

module.exports.execCommand_ = async function (cmdText, value) {
  try {
    const addCommand = await runCommand(cmdText, [], value)
    if (addCommand.stdout) {
      // console.log(`${new Date()}: Added rule ${abonentId} -> ${ipAddress} successfully.`)
    }

    return true  //???
  } catch (error) {
    console.error('Error executing commands:', error.message)
    return false
  }
}