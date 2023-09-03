const { spawn } = require('child_process')

function command_OS(command, args) {
  const child = spawn(command, args)

  child.stdout.on('data', (data) => {
    if (command !== 'snmpwalk') {
      console.log(`${new Date()}: stdout: ${data}`)
    }
  })

  child.stderr.on('data', (data) => {
    console.error(`${new Date()}: stderr: ${data}`)
  })

  child.on('close', (code) => {
    if (command !== 'snmpwalk') {
      console.log(`${new Date()}: child process exited with code ${code}`)
    }
  })

  return child
}

module.exports = { command_OS }