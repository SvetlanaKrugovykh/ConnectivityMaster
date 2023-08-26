const ping = require('ping')
const { sendReqToDB } = require('../modules/to_local_DB.js')
const { handleStatusChange } = require('../modules/watchHandler.js')

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
  ip_address.status = 'dead'

  if (foundIndexDead !== -1) {
    deadIP[foundIndexDead].count++
    if (loadStatus === 'alive') handleStatusChange(ip_address, foundIndexDead, aliveIP, deadIP, 'alive', 'dead')
  } else {
    const foundIndexAlive = aliveIP.findIndex(item => item.ip_address === ip_address.ip_address)

    if (foundIndexAlive !== -1) {
      handleStatusChange(ip_address, foundIndexAlive, aliveIP, deadIP, 'alive', 'dead')
    } else {
      deadIP.push({ ip_address: ip_address.ip_address, count: 1 })
      if (loadStatus === 'alive') handleStatusChange(ip_address, foundIndexAlive, aliveIP, deadIP, 'alive', 'dead')
    }
  }
}


function handleAliveStatus(ip_address) {
  const foundIndexAlive = aliveIP.findIndex(item => item.ip_address === ip_address.ip_address)
  const loadStatus = ip_address.status.toLowerCase()
  ip_address.status = 'alive'

  if (foundIndexAlive !== -1) {
    aliveIP[foundIndexAlive].count++
    if (loadStatus === 'dead') handleStatusChange(ip_address, foundIndexAlive, aliveIP, deadIP, 'dead', 'alive')
  } else {
    const foundIndexDead = deadIP.findIndex(item => item.ip_address === ip_address.ip_address)

    if (foundIndexDead !== -1) {
      handleStatusChange(ip_address, foundIndexDead, deadIP, aliveIP, 'dead', 'alive')
    } else {
      aliveIP.push({ ip_address: ip_address.ip_address, count: 1 })
      if (loadStatus === 'dead') handleStatusChange(ip_address, foundIndexDead, aliveIP, deadIP, 'dead', 'alive')
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