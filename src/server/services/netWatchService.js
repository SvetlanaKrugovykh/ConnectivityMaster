const ping = require('ping')
const net = require('net')
const snmp = require('snmp-native')
const fetch = require('node-fetch')
const sendReqToDB = require('../modules/to_local_DB.js')

const aliveIP = {}
const deadIP = {}
let start = true

const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
const chatId = NOTIFICATION_TELEGRAM_GROUP_ID

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
      if (start) start = false
    } catch (err) {
      console.log(err)
    }
  }, servicesPoolingInterval)
}

//#region snmp
async function snmpGet(ip_address, oid) {
  const session = new snmp.Session({ host: ip_address, community: 'public' })
  const response = await session.get({ oid: oid })
  session.close()
  return response
}
//#endregion


//region  checkers
async function netWatchPingerProbe(ip_address) {
  try {
    ping.sys.probe(ip_address, async function (isAlive) {
      if (isAlive) {
        handleAliveStatus(ip_address)
      } else {
        handleDeadStatus(ip_address)
      }
    })
  } catch (err) {
    console.log(err)
  }
}


function checkServiceStatus(service) {
  const client = new net.Socket()

  client.connect(service.port, service.ip_address, () => {
    console.log(`Service at ${service.ip_address}:${service.port} is alive`)
    client.end()
  })

  client.on('error', () => {
    console.log(`Service at ${service.ip_address}:${service.port} is not alive`)
  })
}
//#endregion

//#region  status handlers
function handleStatusChange(ip_address, foundIndex, removeFromList, addToList, fromStatus, toStatus) {
  const [removedIP] = removeFromList.splice(foundIndex, 1)
  addToList.push({ ip_address: removedIP.ip_address, count: 1 })

  const msg = `Host ${ip_address} changed status from ${fromStatus} to ${toStatus}`
  console.log(msg)
  if (start) return
  sendReqToDB('__SaveStatusChangeToDb__', `${ip_address}#${fromStatus}#${toStatus}`, '')
  sendTelegramMessage(msg)
}

function handleDeadStatus(ip_address) {
  const foundIndexDead = deadIP.findIndex(item => item.ip_address === ip_address)

  if (foundIndexDead !== -1) {
    deadIP[foundIndexDead].count++
  } else {
    const foundIndexAlive = aliveIP.findIndex(item => item.ip_address === ip_address)

    if (foundIndexAlive !== -1) {
      handleStatusChange(ip_address, foundIndexAlive, aliveIP, deadIP, 'alive', 'dead')
    } else {
      deadIP.push({ ip_address, count: 1 })
    }
  }
}

function handleAliveStatus(ip_address) {
  const foundIndexAlive = aliveIP.findIndex(item => item.ip_address === ip_address)

  if (foundIndexAlive !== -1) {
    aliveIP[foundIndexAlive].count++
  } else {
    const foundIndexDead = deadIP.findIndex(item => item.ip_address === ip_address)

    if (foundIndexDead !== -1) {
      handleStatusChange(ip_address, foundIndexDead, deadIP, aliveIP, 'dead', 'alive')
    } else {
      aliveIP.push({ ip_address, count: 1 })
    }
  }
}

//#endregion

//#region  send message to telegram
async function sendTelegramMessage(message) {
  const apiUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message
      })
    })
    const responseData = await response.json()
    if (responseData.ok) {
      console.log('Telegram message sent successfully:', responseData.result.text)
    } else {
      console.error('Telegram message sending failed:', responseData.description)
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
