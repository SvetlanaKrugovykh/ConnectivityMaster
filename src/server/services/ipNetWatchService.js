const ping = require('ping')
const { sendReqToDB } = require('../modules/to_local_DB.js')
const { handleStatusChange } = require('../modules/watchHandler.js')

const Status = {
  ALIVE: 'alive',
  DEAD: 'dead'
}

const aliveIP = []
const deadIP = []

async function netWatchPingerProbe(ip_address) {
  try {
    const formattedDate = new Date().toISOString().replace('T', ' ').slice(0, 19)
    ping.sys.probe(ip_address.ip_address, async function (isAlive) {
      if (isAlive) {
        handleAliveStatus(ip_address)
      } else {
        console.log(`${formattedDate} Host at ${ip_address.ip_address} is  not alive`)
        handleDeadStatus(ip_address)
      }
    })
  } catch (err) {
    console.log(err)
  }
}

function handleDeadStatus(ip_address) {
  const foundIndexDead = deadIP.findIndex(item => item.ip_address === ip_address.ip_address)
  const loadStatus = ip_address.status.toLowerCase()
  ip_address.status = Status.DEAD

  if (foundIndexDead !== -1) {
    deadIP[foundIndexDead].count++
    if (loadStatus === Status.ALIVE) {
      handleStatusChange({ ip_address, foundIndex: foundIndexDead, removeFromList: aliveIP, addToList: deadIP, fromStatus: Status.ALIVE, toStatus: Status.DEAD })
    }
  } else {
    const foundIndexAlive = aliveIP.findIndex(item => item.ip_address === ip_address.ip_address)

    if (foundIndexAlive !== -1) {
      handleStatusChange({ ip_address, foundIndex: foundIndexAlive, removeFromList: aliveIP, addToList: deadIP, fromStatus: Status.ALIVE, toStatus: Status.DEAD })
    } else {
      deadIP.push({ ip_address: ip_address.ip_address, count: 1 })
      if (loadStatus === Status.ALIVE) {
        handleStatusChange({ ip_address, foundIndex: foundIndexAlive, removeFromList: aliveIP, addToList: deadIP, fromStatus: Status.ALIVE, toStatus: Status.DEAD })
      }
    }
  }
}

function handleAliveStatus(ip_address) {
  const foundIndexAlive = aliveIP.findIndex(item => item.ip_address === ip_address.ip_address)
  const loadStatus = ip_address.status.toLowerCase()
  ip_address.status = Status.ALIVE

  if (foundIndexAlive !== -1) {
    aliveIP[foundIndexAlive].count++
    if (loadStatus === Status.DEAD) {
      handleStatusChange({ ip_address, foundIndex: foundIndexAlive, removeFromList: aliveIP, addToList: deadIP, fromStatus: Status.DEAD, toStatus: Status.ALIVE })
    }
  } else {
    const foundIndexDead = deadIP.findIndex(item => item.ip_address === ip_address.ip_address)

    if (foundIndexDead !== -1) {
      handleStatusChange({ ip_address, foundIndex: foundIndexDead, removeFromList: deadIP, addToList: aliveIP, fromStatus: Status.DEAD, toStatus: Status.ALIVE })
    } else {
      aliveIP.push({ ip_address: ip_address.ip_address, count: 1 })
      if (loadStatus === Status.DEAD) {
        handleStatusChange({ ip_address, foundIndex: foundIndexDead, removeFromList: aliveIP, addToList: deadIP, fromStatus: Status.DEAD, toStatus: Status.ALIVE })
      }
    }
  }
}



async function loadipList() {
  try {
    const data = await sendReqToDB('__GetIpAddressesForWatching__', '', '')
    const parsedData = JSON.parse(data)
    const ipList = parsedData.ResponseArray
    return ipList
  } catch (err) {
    console.log(err)
  }
}

module.exports = { netWatchPingerProbe, loadipList }