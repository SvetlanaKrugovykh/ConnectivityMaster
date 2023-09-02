const ping = require('ping')
const { sendReqToDB } = require('../modules/to_local_DB.js')
const { handleStatusChange } = require('../modules/watchHandler.js')

const Status = {
  ALIVE: 'alive',
  DEAD: 'dead'
}

const aliveIP = []
const deadIP = []

function netWatchPingerProbe(ip_address) {
  try {
    const formattedDate = new Date().toISOString().replace('T', ' ').slice(0, 19)
    let failedAttempts = 0

    const probeHost = function () {
      return new Promise((resolve, reject) => {
        ping.sys.probe(ip_address.ip_address, function (isAlive) {
          if (isAlive) {
            handleAliveStatus(ip_address)
            resolve()
          } else {
            console.log(`${formattedDate} Host at ${ip_address.ip_address} is not alive`)
            failedAttempts++
            if (failedAttempts >= 3) {
              handleDeadStatus(ip_address)
              resolve()
            } else {
              setTimeout(() => {
                probeHost().then(resolve).catch(reject)
              }, 5000)
            }
          }
        })
      })
    }

    probeHost().catch((err) => {
      console.error(err)
    })
  } catch (err) {
    console.log(err)
  }
}




function handleDeadStatus(ip_address) {
  try {
    const foundIndexDead = deadIP.findIndex(item => item.ip_address === ip_address.ip_address)
    const loadStatus = ip_address.status.toLowerCase()
    if (loadStatus === Status.ALIVE) {
      handleStatusChange({ ip_address, removeFromList: aliveIP, addToList: deadIP, fromStatus: Status.ALIVE, toStatus: Status.DEAD })
    } else {
      if (foundIndexDead === -1) {
        deadIP.push({ ip_address: ip_address.ip_address, count: 1 })
      } else {
        deadIP[foundIndexDead].count++
      }
      ip_address.status = Status.DEAD
    }
  } catch (err) {
    console.error('Error in handleDeadStatus:', err)
  }
}

function handleAliveStatus(ip_address) {
  try {
    const foundIndexAlive = aliveIP.findIndex(item => item.ip_address === ip_address.ip_address)
    const loadStatus = ip_address.status.toLowerCase()
    if (loadStatus === Status.DEAD) {
      handleStatusChange({ ip_address, removeFromList: deadIP, addToList: aliveIP, fromStatus: Status.DEAD, toStatus: Status.ALIVE })
    } else {
      if (foundIndexAlive === -1) {
        aliveIP.push({ ip_address: ip_address.ip_address, count: 1 })
      } else {
        aliveIP[foundIndexAlive].count++
      }
      ip_address.status = Status.ALIVE
    }
  } catch (err) {
    console.error('Error in handleDeadStatus:', err)
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