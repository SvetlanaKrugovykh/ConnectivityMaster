const snmp = require('snmp-native')
const { sendReqToDB } = require('../modules/to_local_DB.js')
const { handleStatusChange } = require('../modules/watchHandler.js')

const alivesnmpObjectIP = []
const deadsnmpObjectIP = []


async function checksnmpObjectStatus(snmpObject) {
  const formattedDate = new Date().toISOString().replace('T', ' ').slice(0, 19)
  try {
    const response = await snmpGet(snmpObject)
    if (response) {
      handleSnmpObjectAliveStatus(snmpObject)
    } else {
      console.log(`${formattedDate} SNMP Object at ${snmpObject.ip_address}:${snmpObject.oid} is not alive`)
      handleSnmpObjectDeadStatus(snmpObject)
    }

  } catch (err) {
    console.log(err)
  }
}

function handleSnmpObjectDeadStatus(snmpObject) {
  console.log('handlesnmpObjectDeadStatus: alivesnmpObjectIP, deadsnmpObjectIP', alivesnmpObjectIP.length, deadsnmpObjectIP.length)
  const foundIndexDead = deadsnmpObjectIP.findIndex(item => item.ip_address === snmpObject.ip_address)
  const loadStatus = snmpObject.status.toLowerCase()
  snmpObject.status = 'dead'

  if (foundIndexDead !== -1) {
    deadsnmpObjectIP[foundIndexDead].count++
    if (loadStatus === 'alive') handleStatusChange(snmpObject, foundIndexDead, alivesnmpObjectIP, deadsnmpObjectIP, 'alive', 'dead', true)
  } else {
    const foundIndexAlive = alivesnmpObjectIP.findIndex(item => item.ip_address === snmpObject.ip_address)

    if (foundIndexAlive !== -1) {
      handleStatusChange(nmpObject, foundIndexAlive, alivesnmpObjectIP, deadsnmpObjectIP, 'alive', 'dead', true)
    } else {
      deadsnmpObjectIP.push({ snmpObject: snmpObject.ip_address, count: 1 })
      if (loadStatus === 'alive') handleStatusChange(snmpObject, foundIndexAlive, alivesnmpObjectIP, deadsnmpObjectIP, 'alive', 'dead', true)
    }
  }
}

function handleSnmpObjectAliveStatus(snmpObject) {
  if (!snmpObject.ip_address) {
    console.log('handlesnmpObjectAliveStatus: snmpObject.ip_address is undefined', snmpObject)
    return
  }
  const foundIndexAlive = alivesnmpObjectIP.findIndex(item => item.ip_address === snmpObject.ip_address)
  const loadStatus = snmpObject.status.toLowerCase()
  snmpObject.status = 'alive'

  if (foundIndexAlive !== -1) {
    alivesnmpObjectIP[foundIndexAlive].count++
    if (loadStatus === 'dead') handleStatusChange(snmpObject, foundIndexAlive, alivesnmpObjectIP, deadsnmpObjectIP, 'dead', 'alive', true)
  } else {
    const foundIndexDead = deadsnmpObjectIP.findIndex(item => item.ip_address === snmpObject.ip_address)

    if (foundIndexDead !== -1) {
      handleStatusChange(nmpObject, foundIndexDead, deadnmpObjectIP, alivenmpObjectIP, 'dead', 'alive', true)
    } else {
      alivenmpObjectIP.push({ nmpObject: nmpObject.ip_address, count: 1 })
      if (loadStatus === 'dead') handleStatusChange(snmpObject, foundIndexDead, alivesnmpObjectIP, deadsnmpObjectIP, 'dead', 'alive', true)
    }
  }
}

async function snmpGet(snmpObject, community = 'public') {
  const session = new snmp.Session({ host: snmpObject.ip_address, community: community, timeout: 50 })

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
      return varbinds[0].value
    } else {
      throw new Error('No response received')
    }
  } catch (error) {
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