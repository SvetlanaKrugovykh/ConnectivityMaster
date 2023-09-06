const util = require('util')
const exec = util.promisify(require('child_process').exec)

async function runCommand(command, args, value = '') {
  const fullCommand = `${command} ${args.join(' ')}`

  try {
    const { stdout, stderr } = await exec(fullCommand)
    if (command === 'snmpwalk') {
      if (stdout.includes(value)) {
        return 'Status OK'
      } else {
        return 'Status PROBLEM'
      }
    } else {
      if (stdout.length > 0) console.log(`${new Date()}: ${command} out: ${stdout}`)
      if (stderr.length > 0) console.error(`${new Date()}: ${command} err: ${stderr}`)
      return { stdout, stderr }
    }
  } catch (error) {
    throw new Error(`Error of command execution: ${error.message}`)
  }
}

module.exports = { runCommand }
