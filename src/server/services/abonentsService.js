const util = require('util')
const fs = require('fs')
const readFile = util.promisify(fs.readFile)
const writeFile = util.promisify(fs.writeFile)
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

module.exports.switchRedir = async function (ipAddresses, vlanId) {
  if (process.env.PLATFORM !== 'freebsd') {
    return true
  }

  try {
    const filePath = `/home/admin/deny_ip/vlan${vlanId}_deny_hosts`
    const content = ipAddresses.map(ip => ip + '\n').join('')
    await writeFile(filePath, content)
    console.log(`${new Date()}: Redir file for vlan=${vlanId} wrote successfully.`)

    const addCommand = await runCommand('/sbin/pfctl -nf /etc/pf.rules')
    if (addCommand.stdout) {
      console.log(`${new Date()}: pf rules uploaded for vlan=${vlanId} successfully.`)
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


module.exports.switchRedirGetOff = async function (ipAddress) {
  if (process.env.PLATFORM !== 'freebsd') {
    return true
  }

  try {
    const parts = ipAddress.split('.')
    const vlanId = parts.length === 4 ? parts[2] : null

    if (!vlanId) {
      console.error('Invalid ipAddress format. Could not extract vlanId.')
      return false
    }

    const filePath = `/home/admin/deny_ip/vlan${vlanId}_deny_hosts`

    const fileContent = await readFile(filePath, 'utf8')
    const updatedContent = fileContent
      .split('\n')
      .filter(line => line.trim() !== ipAddress)
      .join('\n')

    await writeFile(filePath, updatedContent)

    console.log(`${new Date()}: Removed ${ipAddress} for vlan=${vlanId} successfully.`)

    const addCommand = await runCommand(`/sbin/pfctl -nf /etc/pf.rules`)
    if (addCommand.stdout) {
      console.log(`${new Date()}: pf rules uploaded for vlan=${vlanId} successfully.`)
    }

    return true
  } catch (error) {
    console.error('Error executing commands:', error.message)
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