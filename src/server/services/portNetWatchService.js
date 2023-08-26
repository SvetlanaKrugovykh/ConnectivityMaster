const net = require('net')
const { sendReqToDB } = require('../modules/to_local_DB.js')
const { handleStatusChange } = require('../modules/watchHandler.js')

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
    console.log(err)
  }
}



function handleServiceDeadStatus(service) {
  console.log('handleServiceDeadStatus: aliveServiceIP, deadServiceIP', aliveServiceIP.length, deadServiceIP.length)
  const foundIndexDead = deadServiceIP.findIndex(item => item.ip_address === service.ip_address)
  const loadStatus = service.status.toLowerCase()
  service.status = 'dead'

  if (foundIndexDead !== -1) {
    deadServiceIP[foundIndexDead].count++
    if (loadStatus === 'alive') handleStatusChange(service, foundIndexDead, aliveServiceIP, deadServiceIP, 'alive', 'dead', true)
  } else {
    const foundIndexAlive = aliveServiceIP.findIndex(item => item.ip_address === service.ip_address)

    if (foundIndexAlive !== -1) {
      handleStatusChange(service, foundIndexAlive, aliveServiceIP, deadServiceIP, 'alive', 'dead', true)
    } else {
      deadServiceIP.push({ service: service.ip_address, count: 1 })
      if (loadStatus === 'alive') handleStatusChange(service, foundIndexAlive, aliveServiceIP, deadServiceIP, 'alive', 'dead', true)
    }
  }
}

function handleServiceAliveStatus(service) {
  if (!service.ip_address) {
    console.log('handleServiceAliveStatus: service.ip_address is undefined', service)
    return
  }
  const foundIndexAlive = aliveServiceIP.findIndex(item => item.ip_address === service.ip_address)
  const loadStatus = service.status.toLowerCase()
  service.status = 'alive'

  if (foundIndexAlive !== -1) {
    aliveServiceIP[foundIndexAlive].count++
    if (loadStatus === 'dead') handleStatusChange(service, foundIndexAlive, aliveServiceIP, deadServiceIP, 'dead', 'alive', true)
  } else {
    const foundIndexDead = deadServiceIP.findIndex(item => item.ip_address === service.ip_address)

    if (foundIndexDead !== -1) {
      handleStatusChange(service, foundIndexDead, deadServiceIP, aliveServiceIP, 'dead', 'alive', true)
    } else {
      aliveServiceIP.push({ service: service.ip_address, count: 1 })
      if (loadStatus === 'dead') handleStatusChange(service, foundIndexDead, aliveServiceIP, deadServiceIP, 'dead', 'alive', true)
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
    console.log(err)
  }
}

module.exports = { checkServiceStatus, loadServicesList }