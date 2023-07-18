const { spawn } = require('child_process')

function ipfw(args) {
  const child = spawn('/sbin/ipfw', args)

  child.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`)
  })

  child.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`)
  })

  child.on('close', (code) => {
    console.log(`child process exited with code ${code}`)
  })

  return child
}

module.exports.switchOff = async function (abonentId, ipAddress, vlanId) {
  if (process.env.PLATFORM !== 'freebsd') {
    return true
  }

  try {
    const deleteCommand = ipfw(['delete', abonentId])
    deleteCommand.on('close', (code) => {
      if (code === 0) {
        console.log(`Deleted rule ${abonentId} successfully.`)
      }
    })

    const addCommand = ipfw(['add', abonentId, 'deny', 'ip', 'from', `${ipAddress}/32`, 'to', 'any', 'via', `vlan${vlanId}`, 'in'])
    addCommand.on('close', (code) => {
      if (code === 0) {
        console.log(`Added rule ${abonentId} successfully.`)
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

  try {
    const deleteCommand = ipfw(['delete', abonentId])
    deleteCommand.on('close', (code) => {
      if (code === 0) {
        console.log(`Deleted rule ${abonentId} successfully.`)
      }
    })
    return true
  } catch (error) {
    console.error('Error executing commands:', error)
    return false
  }
}

//await abonentsService.switchOff('9999', '192.168.199.199', '199')  //temprorary for testing
//await abonentsService.switchOn('9999')  //temprorary for testing