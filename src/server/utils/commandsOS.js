const util = require('util')
const exec = util.promisify(require('child_process').exec)
require('dotenv').config()

async function runCommand(command, args = [], value = '') {
  let fullCommand = command
  let timeout = Number(process.env.COMMAND_TIMEOUT) || 20000

  // Shorter timeout for ping commands
  if (command === 'ping') {
    timeout = Number(process.env.PING_TIMEOUT) || 5000
  }

  if (command === 'snmpwalk' || command === 'snmpget') {
    let localArgs = [...args]
    let isSnmpSingleOid = false
    let snmpTimeoutSec = Math.floor(timeout / 1000) || 5

    const oidArgs = args.filter(a => /^\.?\d+(\.\d+)+$/.test(a))
    if (oidArgs.length === 1 && value && value.length > 0) {
      isSnmpSingleOid = true
    }

    if (command === 'snmpwalk' && isSnmpSingleOid) {
      command = 'snmpget'
      localArgs = args.filter(a => a !== '-OXsq')
      if (!localArgs.includes('-Oqv')) localArgs.unshift('-Oqv')
      if (!localArgs.includes('-On')) localArgs.unshift('-On')
    }

    if (!localArgs.includes('-t')) {
      localArgs.unshift(snmpTimeoutSec.toString())
      localArgs.unshift('-t')
    }

    fullCommand = command
    if (localArgs.length > 0) {
      fullCommand += ` ${localArgs.join(' ')}`
    }
  } else {
    if (args.length > 0) {
      fullCommand += ` ${args.join(' ')}`
    }
  }

  try {
    const { stdout, stderr } = await exec(fullCommand, {
      timeout,
      maxBuffer: 1024 * 1024,
      killSignal: 'SIGTERM'
    })

    if (command.includes('pfctl')) {
      console.log(`${new Date()}: ${command} out: ${stdout}`)
    }

    if ((command === 'snmpwalk' || command === 'snmpget') && stderr) {
      if (stderr.toLowerCase().includes('timeout')) {
        throw new Error(`SNMP timeout: ${stderr.split('\n')[0]}`)
      } else if (stderr.trim()) {
        console.error(`${new Date()}: SNMP warning: ${stderr.split('\n')[0]}`)
      }
    }

    if (command === 'snmpwalk' || command === 'snmpget') {
      if (fullCommand.includes('1.3.6.1.2.1.31.1.1.1.6') || fullCommand.includes('1.3.6.1.2.1.31.1.1.1.10')) {
        return stdout.split(' ').pop().trim()
      }

      if (value && value.length > 0) {
        const operStatusMap = {
          up: '1',
          down: '2',
          testing: '3',
          unknown: '4',
          dormant: '5',
          notPresent: '6',
          lowerLayerDown: '7'
        }

        const tokens = stdout.trim().split(/\s+/)
        const lastToken = tokens[tokens.length - 1] || ''
        let normalized = lastToken

        if (operStatusMap[normalized] !== undefined) {
          normalized = operStatusMap[normalized]
        }

        const expectedNumeric = /^\d+$/.test(value)
        const normalizedNumeric = /^\d+$/.test(normalized)

        if (expectedNumeric && normalizedNumeric) {
          return normalized === value ? 'Status OK' : `Status PROBLEM (got=${normalized} expected=${value})`
        } else {
          return stdout.includes(value) ? 'Status OK' : 'Status PROBLEM'
        }
      }

      return stdout.trim()
    } else {
      // Don't log ping output to avoid spam
      if (command !== 'ping') {
        if (stdout.length > 0) console.log(`${new Date()}: ${command} out: ${stdout}`)
        if (stderr.length > 0) console.error(`${new Date()}: ${command} err: ${stderr}`)
      }
      return { stdout, stderr }
    }
  } catch (error) {
    if (error.killed && error.signal === 'SIGTERM') {
      const timeoutSec = Math.floor(timeout / 1000)
      throw new Error(`Command timed out after ${timeoutSec}s: ${fullCommand}`)
    }

    if ((command === 'snmpwalk' || command === 'snmpget') &&
      error.message && error.message.toLowerCase().includes('timeout')) {
      throw new Error(`SNMP timeout: ${error.message}`)
    }

    throw new Error(`Error of command execution: ${error.message}`)
  }
}

module.exports = { runCommand }