const { runCommand } = require('../utils/commandsOS')

module.exports.switchOff = async function (abonentId, ipAddress, vlanId) {
  if (process.env.PLATFORM !== 'freebsd') {
    return true
  }

  const abonentIdТForRules = getAbonentIdТForRules(abonentId)

  try {
    const deleteCommand = await runCommand('/sbin/ipfw', ['delete', abonentIdТForRules])
    if (deleteCommand.stdout) {
      console.log(`${new Date()}: Deleted rule ${abonentId} -> ${abonentIdТForRules} successfully.`)
    }

    const addCommand = await runCommand('/sbin/ipfw', ['add', abonentIdТForRules, 'deny', 'ip', 'from', `${ipAddress}/32`, 'to', 'any', 'via', `vlan${vlanId}`, 'in'])
    if (addCommand.stdout) {
      console.log(`${new Date()}: Added rule ${abonentId} -> ${abonentIdТForRules} successfully.`)
    }

    return true
  } catch (error) {
    console.error('Error executing commands:', error.message)
    return false
  }
}


module.exports.switchOn = async function (abonentId) {
  if (process.env.PLATFORM !== 'freebsd') {
    return true
  }
  const abonentIdТForRules = getAbonentIdТForRules(abonentId)

  try {
    const deleteCommand = await runCommand('/sbin/ipfw', ['delete', abonentIdТForRules])

    if (deleteCommand.stdout) {
      console.log(`${new Date()}: Added rule ${abonentId} -> ${abonentIdТForRules} successfully.`)
    }
    return true
  } catch (error) {
    console.error(`${new Date()}: Error executing commands:`, error.message)
    return false
  }
}


function getAbonentIdТForRules(abonentId) {
  const nAbonentId = Number(abonentId)
  console.log(`${new Date()}: nAbonentId: ${nAbonentId}`)
  let bgnr = ''
  if (nAbonentId < 1000) {
    bgnr = '1'
  } else if (nAbonentId >= 1000 && nAbonentId < 2000) {
    bgnr = '2'
  } else if (nAbonentId >= 2000 && nAbonentId < 3000) {
    bgnr = '3'
  } else if (nAbonentId >= 3000 && nAbonentId < 4000) {
    bgnr = '4'
  }
  console.log(`${new Date()}: ${bgnr}${abonentId.substr(-3)}`)
  return `${bgnr}${abonentId.substr(-3)}`
}
//await abonentsService.switchOff('9999', '192.168.199.199', '199')  //temprorary for testing
//await abonentsService.switchOn('9999')  //temprorary for testing