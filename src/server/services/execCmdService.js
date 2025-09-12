module.exports.execCommand_ = async function (cmdText) {
  try {
    const addCommand = await runCommand(cmdText)
    if (addCommand.stdout) {
      // console.log(`${new Date()}: Added rule ${abonentId} -> ${ipAddress} successfully.`)
    }

    return true  //???
  } catch (error) {
    console.error('Error executing commands:', error.message)
    return false
  }
}