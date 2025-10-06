const util = require('util')
const exec = util.promisify(require('child_process').exec)
require('dotenv').config()

async function runCommand(command, args = [], value = '') {
  let fullCommand = command

  const timeout = Number(process.env.COMMAND_TIMEOUT) || 20000

  if (args.length > 0) {
    fullCommand += ` ${args.join(' ')}`
  }

  try {
    const { stdout, stderr } = await exec(fullCommand, { timeout, maxBuffer: 1024 * 1024 })

    if (command.includes('pfctl')) {
      console.log(`${new Date()}: ${command} out: ${stdout}`)
    }

    if (command === 'snmpwalk' || command === 'snmpget') {
      if (fullCommand.includes('1.3.6.1.2.1.31.1.1.1.6') || fullCommand.includes('1.3.6.1.2.1.31.1.1.1.10')) {
        return stdout.split(' ').pop().trim()
      }

      if (value && value.length > 0) {
        if (stdout.includes(value)) {
          return 'Status OK'
        } else {
          return 'Status PROBLEM'
        }
      }

      return stdout.trim()
    } else {
      if (stdout.length > 0) console.log(`${new Date()}: ${command} out: ${stdout}`)
      if (stderr.length > 0) console.error(`${new Date()}: ${command} err: ${stderr}`)
      return { stdout, stderr }
    }
  } catch (error) {
    if (error.killed && error.signal === 'SIGTERM') {
      throw new Error(`Command timed out after ${timeout}ms: ${fullCommand}`)
    }
    throw new Error(`Error of command execution: ${error.message}`)
  }
}

module.exports = { runCommand }