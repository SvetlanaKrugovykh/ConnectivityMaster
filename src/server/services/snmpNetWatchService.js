const snmp = require('snmp-native')
const { sendReqToDB } = require('../modules/to_local_DB.js')
const { handleStatusChange } = require('../modules/watchHandler.js')

const alivesnmpObjectIP = []
const deadsnmpObjectIP = []


async function checksnmpObjectStatus(snmpObject) {
  const formattedDate = new Date().toISOString().replace('T', ' ').slice(0, 19)
  try {
    const response = await snmpGet(snmpObject)
    if (response.incudes('Status OK')) {
      handleSnmpObjectAliveStatus(snmpObject, response)
    } else {
      console.log(`${formattedDate} ip:${snmpObject.ip_address} ${snmpObject.description} response: ${response} oid:${snmpObject.oid}`)
      handleSnmpObjectDeadStatus(snmpObject, response)
    }

  } catch (err) {
    console.log(err)
  }
}

function handleSnmpObjectDeadStatus(snmpObject, response) {
  console.log('handlesnmpObjectDeadStatus: alivesnmpObjectIP, deadsnmpObjectIP', alivesnmpObjectIP.length, deadsnmpObjectIP.length)
  const foundIndexDead = deadsnmpObjectIP.findIndex(item => item.ip_address === snmpObject.ip_address)
  const loadStatus = snmpObject.status.toLowerCase()
  snmpObject.status = 'dead'

  if (foundIndexDead !== -1) {
    deadsnmpObjectIP[foundIndexDead].count++
    if (loadStatus === 'alive') handleStatusChange(snmpObject, foundIndexDead, alivesnmpObjectIP, deadsnmpObjectIP, 'alive', 'dead', true, response)
  } else {
    const foundIndexAlive = alivesnmpObjectIP.findIndex(item => item.ip_address === snmpObject.ip_address)

    if (foundIndexAlive !== -1) {
      handleStatusChange(snmpObject, foundIndexAlive, alivesnmpObjectIP, deadsnmpObjectIP, 'alive', 'dead', true, response)
    } else {
      deadsnmpObjectIP.push({ snmpObject: snmpObject.ip_address, count: 1 })
      if (loadStatus === 'alive') handleStatusChange(snmpObject, foundIndexAlive, alivesnmpObjectIP, deadsnmpObjectIP, 'alive', 'dead', true, response)
    }
  }
}

function handleSnmpObjectAliveStatus(snmpObject, response) {
  if (!snmpObject.ip_address) {
    console.log('handlesnmpObjectAliveStatus: snmpObject.ip_address is undefined', snmpObject)
    return
  }
  const foundIndexAlive = alivesnmpObjectIP.findIndex(item => item.ip_address === snmpObject.ip_address)
  const loadStatus = snmpObject.status.toLowerCase()
  snmpObject.status = 'alive'

  if (foundIndexAlive !== -1) {
    alivesnmpObjectIP[foundIndexAlive].count++
    if (loadStatus === 'dead') handleStatusChange(snmpObject, foundIndexAlive, alivesnmpObjectIP, deadsnmpObjectIP, 'dead', 'alive', true, response)
  } else {
    const foundIndexDead = deadsnmpObjectIP.findIndex(item => item.ip_address === snmpObject.ip_address)

    if (foundIndexDead !== -1) {
      handleStatusChange(snmpObject, foundIndexDead, alivesnmpObjectIP, alivesnmpObjectIP, 'dead', 'alive', true, response)
    } else {
      alivenmpObjectIP.push({ nmpObject: snmpObject.ip_address, count: 1 })
      if (loadStatus === 'dead') handleStatusChange(snmpObject, foundIndexDead, alivesnmpObjectIP, deadsnmpObjectIP, 'dead', 'alive', true, response)
    }
  }
}

async function snmpGet(snmpObject, community = 'public') {
  const session = new snmp.Session({ host: snmpObject.ip_address, community: community, timeout: 5000 })

  try {
    const varbinds = await new Promise((resolve, reject) => {
      session.get({ oid: snmpObject.oid }, (error, varbinds) => {
        session.close()
        if (error) {
          reject(error)
        } else {
          resolve(varbinds)
        }
      })
    })
    if (varbinds.length > 0) {
      return snmpAnswersAnalizer(snmpObject, varbinds)
    } else {
      throw new Error('No response received')
    }
  } catch (error) {
    console.error('Error:', error)
    throw error
  }
}

function snmpAnswersAnalizer(snmpObject, varbinds) {
  try {
    if (varbinds[0].type === 2 && snmpObject.value !== '') {
      if (varbinds[0].value === Number(snmpObject.value)) {
        return 'Status OK'
      }
    }

    if (varbinds[0].type >= 2 && (snmpObject.min !== '' || snmpObject.max !== '')) {
      if (varbinds[0].value >= Number(snmpObject.min) && varbinds[0].value <= Number(snmpObject.max)) {
        return `value ${varbinds[0].value} Status OK`
      } else {
        return `value ${varbinds[0].value} Status PROBLEM`
      }
    }
    return varbinds[0].value
  } catch (error) {
    console.error('Error:', error)
    throw error
  }
}

async function loadSnmpObjectsList() {
  try {
    const data = await sendReqToDB('__GetSnmpObjectsForWatching__', '', '')
    const parsedData = JSON.parse(data)
    const snmpObjectsList = parsedData.ResponseArray
    return snmpObjectsList
  } catch (err) {
    console.log(err)
  }
}

module.exports = { checksnmpObjectStatus, loadSnmpObjectsList }