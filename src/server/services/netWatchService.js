const ping = require('ping')
const net = require('net')
const snmp = require('snmp-native')
const { sendReqToDB, sendToChat } = require('../modules/to_local_DB.js')

const aliveIP = []
const deadIP = []
const aliveServiceIP = []
const deadServiceIP = []

const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
const telegramChatId = process.env.TELEGRAM_CHAT_ID

async function netWatchStarter() {
  const pingPoolingInterval = parseInt(process.env.PING_POOLING_INTERVAL) * 1000
  const servicesPoolingInterval = parseInt(process.env.SERVICES_POOLING_INTERVAL) * 1000
  const ipList = await loadipList()
  const servicesList = await loadServicesList()

  setInterval(() => {
    try {
      ipList.forEach(ip_address => {
        netWatchPingerProbe(ip_address)
      })
    } catch (err) {
      console.log(err)
    }
  }, pingPoolingInterval)

  setInterval(() => {
    try {
      servicesList.forEach(service => {
        checkServiceStatus(service)
      })
    } catch (err) {
      console.log(err)
    }
  }, servicesPoolingInterval)
}

//#region snmp
async function snmpGet(ip_address, oid) {
  const session = new snmp.Session({ host: ip_address.ip_addres, community: 'public' })
  const response = await session.get({ oid: oid })
  session.close()
  return response
}
//#endregion


//region  checkers
async function netWatchPingerProbe(ip_address) {
  try {
    const formattedDate = new Date().toISOString().replace('T', ' ').slice(0, 19)
    ping.sys.probe(ip_address.ip_address, async function (isAlive) {
      if (isAlive) {
        console.log(`${formattedDate} Host at ${ip_address.ip_address} is  alive`)
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


function checkServiceStatus(service) {
  const client = new net.Socket()
  const formattedDate = new Date().toISOString().replace('T', ' ').slice(0, 19)
  try {
    client.connect(Number(service.Port), service.ip_address.trim(), () => {
      console.log(`${formattedDate} Service at ${service.ip_address.trim()}:${service.Port} is alive`)
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
//#endregion

//#region  status handlers
function handleStatusChange(ip_address, foundIndex, removeFromList, addToList, fromStatus, toStatus, service = false) {
  const [removedIP] = removeFromList.splice(foundIndex, 1)
  addToList.push({ ip_address: removedIP.ip_address, count: 1 })

  const msg = `Host ${ip_address.ip_address} (${ip_address.ip_description}) changed status from ${fromStatus} to ${toStatus}`
  console.log(msg)
  sendReqToDB('__SaveStatusChangeToDb__', `${ip_address}#${fromStatus}#${toStatus}#${service}`, '')
  sendTelegramMessage(msg)
}

function handleDeadStatus(ip_address) {
  const foundIndexDead = deadIP.findIndex(item => item.ip_address === ip_address.ip_address)
  const loadStatus = ip_address.status.toLowerCase()
  ip_address.status = 'dead'

  if (foundIndexDead !== -1) {
    deadIP[foundIndexDead].count++
    if (loadStatus === 'alive') handleStatusChange(ip_address, foundIndexAlive, aliveIP, deadIP, 'alive', 'dead')
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

function handleServiceDeadStatus(service) {
  const foundIndexDead = deadServiceIP.findIndex(item => item.ip_address === service.ip_address)

  if (foundIndexDead !== -1) {
    deadServiceIP[foundIndexDead].count++
  } else {
    const foundIndexAlive = aliveServiceIP.findIndex(item => item.ip_address === service.ip_address)

    if (foundIndexAlive !== -1) {
      handleStatusChange(service, foundIndexAlive, aliveServiceIP, deadServiceIP, 'alive', 'dead', true)
    } else {
      deadServiceIP.push({ service: service.ip_address, count: 1 })
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
      if (loadStatus === 'dead') handleStatusChange(ip_address, foundIndexAlive, aliveIP, deadIP, 'dead', 'alive')
    }
  }

}

function handleServiceAliveStatus(service) {
  const foundIndexAlive = aliveServiceIP.findIndex(item => item.ip_address === service.ip_address)

  if (foundIndexAlive !== -1) {
    aliveServiceIP[foundIndexAlive].count++
  } else {
    const foundIndexDead = deadServiceIP.findIndex(item => item.ip_address === service.ip_address)

    if (foundIndexDead !== -1) {
      handleStatusChange(service, foundIndexDead, deadServiceIP, aliveServiceIP, 'dead', 'alive', true)
    } else {
      aliveServiceIP.push({ service: service.ip_address, count: 1 })
    }
  }
}

//#endregion

//#region  send message to telegram
async function sendTelegramMessage(message) {
  const apiUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`

  try {
    const response = await sendToChat(apiUrl, telegramBotToken, telegramChatId, message)
    if (response) {
      console.log('message sent to chatia:', response)
    } else {
      console.log('Error sending Telegram message.')
    }
  } catch (error) {
    console.error('Error sending Telegram message:', error)
  }
}
//#endregion

//#region  get data from DB
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
//#endregion

module.exports = { netWatchStarter }
