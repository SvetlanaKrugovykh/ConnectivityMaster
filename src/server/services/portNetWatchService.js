const net = require('net')
const { sendReqToDB } = require('../modules/to_local_DB.js')
const { handleStatusChange } = require('../modules/watchHandler.js')

const Status = {
  ALIVE: 'alive',
  DEAD: 'dead'
}

const aliveServiceIP = []
const deadServiceIP = []

function checkServiceStatus(service) {
  const client = new net.Socket()
  const formattedDate = new Date().toISOString().replace('T', ' ').slice(0, 19)

  try {
    client.connect(Number(service.Port), service.ip_address.trim(), () => {
      handleServiceAliveStatus(service)
      client.end()
    })

    client.on('error', () => {
      console.log(`${formattedDate} Service at ${service.ip_address.trim()}:${service.Port} is not alive`)
      handleServiceDeadStatus(service)
    })
  } catch (err) {
    console.error('Error in checkServiceStatus:', err)
  }
}

function handleServiceDeadStatus(service) {
  console.log('handleServiceDeadStatus: aliveServiceIP, deadServiceIP', aliveServiceIP.length, deadServiceIP.length)
  const foundIndexDead = deadServiceIP.findIndex(item => item.service === service.ip_address)
  const loadStatus = service.status.toLowerCase()
  service.status = Status.DEAD

  if (foundIndexDead !== -1) {
    deadServiceIP[foundIndexDead].count++
    if (loadStatus === Status.ALIVE) {
      handleStatusChange({ ip_address: service, foundIndex: foundIndexDead, removeFromList: aliveServiceIP, addToList: deadServiceIP, fromStatus: Status.ALIVE, toStatus: Status.DEAD, service: true })
    }
  } else {
    const foundIndexAlive = aliveServiceIP.findIndex(item => item.service === service.ip_address)

    if (foundIndexAlive !== -1) {
      handleStatusChange({ ip_address: service, foundIndex: foundIndexAlive, removeFromList: aliveServiceIP, addToList: deadServiceIP, fromStatus: Status.ALIVE, toStatus: Status.DEAD, service: true })
    } else {
      deadServiceIP.push({ service: service.ip_address, count: 1 })
      if (loadStatus === Status.ALIVE) {
        handleStatusChange({ ip_address: service, foundIndex: foundIndexAlive, removeFromList: aliveServiceIP, addToList: deadServiceIP, fromStatus: Status.ALIVE, toStatus: Status.DEAD, service: true })
      }
    }
  }
}

function handleServiceAliveStatus(service) {
  if (!service.ip_address) {
    console.log('handleServiceAliveStatus: service.ip_address is undefined', service)
    return
  }
  const foundIndexAlive = aliveServiceIP.findIndex(item => item.service === service.ip_address)
  const loadStatus = service.status.toLowerCase()
  service.status = Status.ALIVE

  if (foundIndexAlive !== -1) {
    aliveServiceIP[foundIndexAlive].count++
    if (loadStatus === Status.DEAD) {
      handleStatusChange({ ip_address: service, foundIndex: foundIndexAlive, removeFromList: aliveServiceIP, addToList: deadServiceIP, fromStatus: Status.DEAD, toStatus: Status.ALIVE, service: true })
    }
  } else {
    const foundIndexDead = deadServiceIP.findIndex(item => item.service === service.ip_address)

    if (foundIndexDead !== -1) {
      handleStatusChange({ ip_address: service, foundIndex: foundIndexDead, removeFromList: deadServiceIP, addToList: aliveServiceIP, fromStatus: Status.DEAD, toStatus: Status.ALIVE, service: true })
    } else {
      aliveServiceIP.push({ service: service.ip_address, count: 1 })
      if (loadStatus === Status.DEAD) {
        handleStatusChange({ ip_address: service, foundIndex: foundIndexDead, removeFromList: aliveServiceIP, addToList: deadServiceIP, fromStatus: Status.DEAD, toStatus: Status.ALIVE, service: true })
      }
    }
  }
}

async function loadServicesList() {
  try {
    const data = await sendReqToDB('__GetServicesForWatching__', '', '')
    const parsedData = JSON.parse(data)
    const servicesList = parsedData.ResponseArray
    return servicesList
  } catch (err) {
    console.error('Error in loadServicesList:', err)
  }
}

module.exports = { checkServiceStatus, loadServicesList }
