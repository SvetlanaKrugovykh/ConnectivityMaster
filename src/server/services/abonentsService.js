const { runCommand } = require('../utils/commandsOS')

module.exports.switchOff = async function (abonentId, ipAddress, vlanId) {
  if (process.env.PLATFORM !== 'freebsd') {
    return true
  }

  try {
    const deleteCommand = await runCommand('/sbin/ipfw', ['delete', abonentId])
    if (deleteCommand.stdout) {
      console.log(`${new Date()}: Deleted rule ${abonentId} -> ${ipAddress} successfully.`)
    }

    const addCommand = await runCommand('/sbin/ipfw', ['add', abonentId, 'deny', 'ip', 'from', `${ipAddress}/32`, 'to', 'any', 'via', `vlan${vlanId}`, 'in'])
    if (addCommand.stdout) {
      console.log(`${new Date()}: Added rule ${abonentId} -> ${ipAddress} successfully.`)
    }

    return true
  } catch (error) {
    console.error('Error executing commands:', error.message)
    return false
  }
}


module.exports.switchOn = async function (abonentId, ipAddress) {
  if (process.env.PLATFORM !== 'freebsd') {
    return true
  }
  try {
    const deleteCommand = await runCommand('/sbin/ipfw', ['delete', abonentId])

    if (deleteCommand.stdout) {
      console.log(`${new Date()}: Added rule ${abonentId} -> ${ipAddress} successfully.`)
    }
    return true
  } catch (error) {
    console.error(`${new Date()}: Error executing commands:-> ${ipAddress} `, error.message)
    return false
  }
}


module.exports.fwdOff = async function (abonentId, ipAddress, vlanId) {
  if (process.env.PLATFORM !== 'freebsd') {
    return true
  }
  const FWD_IP = process.env.FWD_IP
  try {
    const deleteCommand = await runCommand('/sbin/ipfw', ['delete', abonentId])
    if (deleteCommand.stdout) {
      console.log(`${new Date()}: Deleted rule ${abonentId} -> ${ipAddress} successfully.`)
    }

    const addCommand = await runCommand('/sbin/ipfw', ['add', abonentId, 'fwd', `${FWD_IP}`, 'from', `${ipAddress}/32`, 'to', 'any', 'via', `vlan${vlanId}`, 'in'])
    if (addCommand.stdout) {
      console.log(`${new Date()}: Added rule ${abonentId} -> ${ipAddress} successfully.`)
    }

    return true
  } catch (error) {
    console.error('Error executing commands:', error.message)
    return false
  }
}

module.exports.fwdOn = async function (abonentId, ipAddress) {
  if (process.env.PLATFORM !== 'freebsd') {
    return true
  }
  try {
    const deleteCommand = await runCommand('/sbin/ipfw', ['delete', abonentId])

    if (deleteCommand.stdout) {
      console.log(`${new Date()}: Added rule ${abonentId} -> ${ipAddress} successfully.`)
    }
    return true
  } catch (error) {
    console.error(`${new Date()}: Error executing commands:-> ${ipAddress} `, error.message)
    return false
  }
}