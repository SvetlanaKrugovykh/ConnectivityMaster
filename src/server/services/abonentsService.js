const { spawn } = require('child_process')

function ipfw(args) {
  const child = spawn('/sbin/ipfw', args)

  child.stdout.on('data', (data) => {
    console.log(`${new Date()}: stdout: ${data}`)
  })

  child.stderr.on('data', (data) => {
    console.error(`${new Date()}: stderr: ${data}`)
  })

  child.on('close', (code) => {
    console.log(`${new Date()}: child process exited with code ${code}`)
  })

  return child
}

module.exports.switchOff = async function (abonentId, ipAddress, vlanId) {
  if (process.env.PLATFORM !== 'freebsd') {
    return true
  }
  abonentId = String(abonentId)

  try {
    const deleteCommand = ipfw(['delete', abonentId])
    deleteCommand.on('close', (code) => {
      if (code === 0) {
        console.log(`${new Date()}: Deleted rule ${abonentId} successfully.`)
      }
    })

    const addCommand = ipfw(['add', abonentId, 'deny', 'ip', 'from', `${ipAddress}/32`, 'to', 'any', 'via', `vlan${vlanId}`, 'in'])
    addCommand.on('close', (code) => {
      if (code === 0) {
        console.log(`${new Date()}: Added rule ${abonentId} successfully.`)
      }
    })

    return true
  } catch (error) {
    console.error('Error executing commands:', error)
    return false
  }
}

module.exports.switchOn = async function (abonentId) {
  if (process.env.PLATFORM !== 'freebsd') {
    return true
  }

  abonentId = String(abonentId)

  try {
    const deleteCommand = ipfw(['delete', abonentId])

    await new Promise((resolve, reject) => {
      deleteCommand.on('exit', (code) => {
        if (code === 0) {
          console.log(`${new Date()}: Deleted rule ${abonentId} successfully.`)
          resolve()
        } else {
          const errorMessage = `Error deleting rule ${abonentId}, exit code: ${code}`
          console.error(`${new Date()}: ${errorMessage}`)
          reject(new Error(errorMessage))
        }
      })

      deleteCommand.on('error', (error) => {
        console.error(`${new Date()}: Error executing delete command:`, error)
        reject(error)
      })
    })

    return true
  } catch (error) {
    console.error(`${new Date()}: Error executing commands:`, error)
    return false
  }
}


//await abonentsService.switchOff('9999', '192.168.199.199', '199')  //temprorary for testing
//await abonentsService.switchOn('9999')  //temprorary for testing