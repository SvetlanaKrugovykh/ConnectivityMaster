const { spawn } = require('child_process')
const { get } = require('http')

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
  const abonentIdТForRules = getAbonentIdТForRules(abonentId)
  try {
    const deleteCommand = ipfw(['delete', abonentIdТForRules])
    deleteCommand.on('close', (code) => {
      if (code === 0) {
        console.log(`${new Date()}: Deleted rule ${abonentId} -> ${abonentIdТForRules} successfully.`)
      }
    })

    const addCommand = ipfw(['add', abonentIdТForRules, 'deny', 'ip', 'from', `${ipAddress}/32`, 'to', 'any', 'via', `vlan${vlanId}`, 'in'])
    addCommand.on('close', (code) => {
      if (code === 0) {
        console.log(`${new Date()}: Added rule ${abonentId} -> ${abonentIdТForRules} successfully.`)
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
  const abonentIdТForRules = getAbonentIdТForRules(abonentId)
  try {
    const deleteCommand = ipfw(['delete', abonentIdТForRules])

    await new Promise((resolve, reject) => {
      deleteCommand.on('exit', (code) => {
        if (code === 0) {
          console.log(`${new Date()}: Deleted rule ${abonentId} ->  {abonentIdТForRules} successfully.`)
          resolve()
        } else {
          const errorMessage = `Error deleting rule ${abonentId} -> ${abonentIdТForRules}, exit code: ${code}`
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

function getAbonentIdТForRules(abonentId) {
  const nAbonentId = Number(abonentId)
  console.log(`${new Date()}: nAbonentId: ${nAbonentId}`)
  let bgnr = ''
  if (nAbonentId < 1000) {
    bgnr = '01'
  } else if (nAbonentId >= 1000 && nAbonentId < 2000) {
    bgnr = '02'
  } else if (nAbonentId >= 2000 && nAbonentId < 3000) {
    bgnr = '03'
  } else if (nAbonentId >= 3000 && nAbonentId < 4000) {
    bgnr = '04'
  }
  console.log(`${new Date()}: bgnr: ${bgnr}`)
  return `${bgnr}${abonentId}`
}
//await abonentsService.switchOff('9999', '192.168.199.199', '199')  //temprorary for testing
//await abonentsService.switchOn('9999')  //temprorary for testing