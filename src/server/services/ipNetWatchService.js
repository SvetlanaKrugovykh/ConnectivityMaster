require('dotenv').config()require('dotenv').config()

const { runCommand } = require('../utils/commandsOS')const { sendReqToDB } = require('../modules/to_local_DB.js')

const { sendTelegramMessage } = require('./telegramService')

const Status = {

  // Environment configuration  ALIVE: 'alive',

  const LOCAL_NETWATCHING_ENABLED = process.env.LOCAL_NETWATCHING_ENABLED === 'true'  DEAD: 'dead'

const LOCAL_PING_IP_LIST = process.env.LOCAL_PING_IP_LIST?.split(',').map(ip => ip.trim()).filter(ip => ip) || []
}

const LOCAL_PING_WITH_DELAY_IP_LIST = process.env.LOCAL_PING_WITH_DELAY_IP_LIST?.split(',').map(ip => ip.trim()).filter(ip => ip) || []

const PING_INTERVAL = parseInt(process.env.LOCAL_PING_INTERVAL) || 30000const aliveIP = []

const PING_SOURCE_IP = process.env.PING_SOURCE_IP || '91.220.106.2'const deadIP = []

const PING_COUNT_FOR_DELAY = parseInt(process.env.PING_COUNT_FOR_DELAY) || 50

const PACKET_LOSS_THRESHOLD = parseFloat(process.env.PACKET_LOSS_THRESHOLD) || 0.2const { runCommand } = require('../utils/runCommand')

const TELEGRAM_SEND_DELAY = 2000

function transformPingResult(stdout, ip_address, sourceIp) {

  // Status tracking  const formattedDate = new Date().toISOString().replace('T', ' ').slice(0, 19)

  let deadHosts = new Set()  let isAlive = stdout.includes('1 received')

  let aliveHosts = new Set()  if (isAlive) {

    let hostStatusMap = new Map()    return `${formattedDate} Host at ${ip_address.ip_address} is alive (source IP: ${sourceIp})`

    let lastTelegramSendTime = 0
  } else {

    return `${formattedDate} Host at ${ip_address.ip_address} is not alive (source IP: ${sourceIp})`

    const Status = {}

    ALIVE: 'alive',}

  DEAD: 'dead'

} function netWatchPingerProbe(ip_address) {

  try {

    function sleep(ms) {
      let failedAttempts = 0

      return new Promise(resolve => setTimeout(resolve, ms))    const sourceIp = process.env.PING_SOURCE_IP || '91.220.106.2'

    }

    const probeHost = function () {

      // Simple ping probe for basic monitoring      return new Promise((resolve, reject) => {

      async function pingProbe(ipAddresses) {
        const command = 'ping'

        try {
          const args = ['-c', '1', '-I', sourceIp, ip_address.ip_address]

          if (!LOCAL_NETWATCHING_ENABLED) {
            runCommand(command, args)

            console.log('[PingService] Local network watching is disabled').then(result => {

              return let resultMsg = transformPingResult(result.stdout, ip_address, sourceIp)

            }            if (result.stdout.includes('1 received')) {

              handleAliveStatus(ip_address)

              if (!ipAddresses || ipAddresses.length === 0) {
                resolve()

                console.log('[PingService] No IP addresses provided for ping probe')
              } else {

                return failedAttempts++

              } if (failedAttempts >= 3) {

                handleDeadStatus(ip_address)

                console.log(`[PingService] Starting ping probe for ${ipAddresses.length} hosts`)                resolve()

              } else {

                const pingPromises = ipAddresses.map(async ipAddress => {
                  setTimeout(() => {

                    const command = 'ping'                  probeHost().then(resolve).catch(reject)

                    const args = ['-c', '1', '-W', '3', ipAddress]
                  }, 5000)

                }

      try { }

        const result = await runCommand(command, args)
              })

              const stdout = result.stdout.catch(err => {

                console.error(err)

                if (stdout.includes('1 received')) {
                  reject(err)

                  handleHostAlive(ipAddress)
                })

            } else { })

            handleHostDead(ipAddress)
          }

        }

      } catch (err) {
        probeHost().catch(err => {

          handleHostDead(ipAddress)      console.error(err)

        }    })

    })
  } catch (err) {

    console.log(err)

    await Promise.all(pingPromises)
  }

} catch (err) { }

console.error('[PingService] Error in ping probe:', err)

  }async function netWatchPingerWithDelay(ipAddresses) {

} try {

  const failedAttempts = {}

  // Enhanced ping with packet loss monitoring    const lossThreshold = 0.2  // 20% packet loss threshold

  async function pingProbeWithDelay(ipAddresses) {
    const pingCount = 50

    try {
      const sourceIp = process.env.PING_SOURCE_IP || '91.220.106.2'

      if (!LOCAL_NETWATCHING_ENABLED) {

        console.log('[PingService] Local network watching is disabled')    ipAddresses.forEach(ip => {

          return failedAttempts[ip] = {

          }        totalPings: 0,

            lostPings: 0,

    if (!ipAddresses || ipAddresses.length === 0) {
            rttSum: 0

            console.log('[PingService] No IP addresses provided for delay ping probe')
          }

          return
        })

      }

      const probeHostWithDelay = async function (ip_address) {

        console.log(`[PingService] Starting delay ping probe for ${ipAddresses.length} hosts`)      let completedPings = 0

        let lostPings = 0

        const probePromises = ipAddresses.map(async ipAddress => {
          let rttSum = 0

          let completedPings = 0

          let lostPings = 0      for (let i = 0; i < pingCount; i++) {

            let rttSum = 0        const command = 'ping'

            const args = ['-c', '1', '-I', sourceIp, ip_address]

            for (let i = 0; i < PING_COUNT_FOR_DELAY; i++) {
              try {

                const command = 'ping'          const result = await runCommand(command, args)

                const args = ['-c', '1', '-I', PING_SOURCE_IP, ipAddress]          const stdout = result.stdout

                const match = stdout.match(/time=([0-9.]+) ms/)

                try {
                  if (stdout.includes('1 received')) {

                    const result = await runCommand(command, args)            rttSum += match ?parseFloat(match[1]) : 0

                    const stdout = result.stdout
                  } else {

                    const match = stdout.match(/time=([0-9.]+) ms/)            lostPings++

                    }

                  if (stdout.includes('1 received')) { } catch (err) {

                    rttSum += match ? parseFloat(match[1]) : 0          lostPings++

                  } else { }

                  lostPings++        completedPings++

                }      }

        } catch (err) {

              lostPings++      failedAttempts[ip_address].totalPings = completedPings

            } failedAttempts[ip_address].lostPings = lostPings

            completedPings++      failedAttempts[ip_address].rttSum = rttSum

          }

          const lossPercentage = lostPings / pingCount

          const lossPercentage = lostPings / PING_COUNT_FOR_DELAY      if (lossPercentage > lossThreshold) {

            handlePacketLoss(ip_address, lossPercentage)

            if (lossPercentage > PACKET_LOSS_THRESHOLD) { } else {

              handlePacketLoss(ipAddress, lossPercentage)        handleNormalDelay(ip_address, rttSum / (completedPings - lostPings))

            } else { }

            const avgRTT = rttSum / (completedPings - lostPings)
          }

          handleNormalResponse(ipAddress, avgRTT, lossPercentage)

        }    const promises = ipAddresses.map(ip => probeHostWithDelay(ip))

      }) await Promise.all(promises)

    } catch (err) {

      await Promise.all(probePromises)    console.log(err)

    } catch (err) { }

    console.error('[PingService] Error in delay ping probe:', err)
  }

}

}function handleNormalDelay(ip_address, avgRTT) {

  // sendTelegramMessage(`Info: Host ${ip_address} has average RTT of ${Math.round(avgRTT)}ms with acceptable packet loss.`)

  // Handle host status changes}

  function handleHostAlive(ipAddress) {

    const previousStatus = hostStatusMap.get(ipAddress)



    if (previousStatus === Status.DEAD || !hostStatusMap.has(ipAddress)) {
      async function handleDeadStatus(ip_address) {

        deadHosts.delete(ipAddress)  try {

          aliveHosts.add(ipAddress)    const foundIndexDead = deadIP.findIndex(item => item.ip_address === ip_address.ip_address)

          hostStatusMap.set(ipAddress, Status.ALIVE)    const loadStatus = ip_address.status.toLowerCase()

          if (loadStatus === Status.ALIVE) {

            if (previousStatus === Status.DEAD) {
              await handleStatusChange({ ip_address, removeFromList: aliveIP, addToList: deadIP, fromStatus: Status.ALIVE, toStatus: Status.DEAD })

              sendTelegramNotification(`Host ${ipAddress} is now alive`)
            } else {

            } if (foundIndexDead === -1) {

            } deadIP.push({ ip_address: ip_address.ip_address, count: 1 })

          }
        } else {

          deadIP[foundIndexDead].count++

          function handleHostDead(ipAddress) { }

          const previousStatus = hostStatusMap.get(ipAddress)      ip_address.status = Status.DEAD

        }

        if (previousStatus === Status.ALIVE || !hostStatusMap.has(ipAddress)) { } catch (err) {

          aliveHosts.delete(ipAddress)    console.error('Error in handleDeadStatus:', err)

          deadHosts.add(ipAddress)
        }

        hostStatusMap.set(ipAddress, Status.DEAD)
      }



      if (previousStatus === Status.ALIVE) {
        async function handleAliveStatus(ip_address) {

          sendTelegramNotification(`Host ${ipAddress} is now dead`)  try {

          }    const foundIndexAlive = aliveIP.findIndex(item => item.ip_address === ip_address.ip_address)

        } const loadStatus = ip_address.status.toLowerCase()

      } if (loadStatus === Status.DEAD) {

        await handleStatusChange({ ip_address, removeFromList: deadIP, addToList: aliveIP, fromStatus: Status.DEAD, toStatus: Status.ALIVE })

        function handlePacketLoss(ipAddress, lossPercentage) { } else {

          const lossPercent = Math.round(lossPercentage * 100)      if (foundIndexAlive === -1) {

            console.log(`[PingService] High packet loss for ${ipAddress}: ${lossPercent}%`)        aliveIP.push({ ip_address: ip_address.ip_address, count: 1 })

            sendTelegramNotification(`Warning: Host ${ipAddress} has ${lossPercent}% packet loss`)
          } else {

          } aliveIP[foundIndexAlive].count++

        }

        function handleNormalResponse(ipAddress, avgRTT, lossPercentage) {
          ip_address.status = Status.ALIVE

          if (avgRTT > 0) { }

          console.log(`[PingService] ${ipAddress} - RTT: ${Math.round(avgRTT)}ms, Loss: ${Math.round(lossPercentage * 100)}%`)
        } catch (err) {

        } console.error('Error in handleDeadStatus:', err)

        handleHostAlive(ipAddress)
      }

    }
  }



  // Send Telegram notifications with rate limitingasync function loadipList() {

  async function sendTelegramNotification(message) {
    try {

      const now = Date.now()    const data = await sendReqToDB('__GetIpAddressesForWatching__', '', '')

      const waitTime = lastTelegramSendTime + TELEGRAM_SEND_DELAY - now    if (!data) return []

      const parsedData = JSON.parse(data)

      if (waitTime > 0) {
        if (!parsedData.ResponseArray) return []

        console.log(`[PingService] Waiting ${waitTime}ms before sending Telegram message`)    return parsedData.ResponseArray;

        await sleep(waitTime)
      } catch (err) {

      } console.log(err)

      return []

      try { }

    let modifiedText = message.replace(/alive/g, '✅')
    }

    modifiedText = modifiedText.replace(/dead/g, '❌')

    modifiedText = modifiedText.replace(/Warning/g, '⚠️')async function sendTelegramMessage(message) {

      modifiedText = modifiedText.replace(/Info/g, 'ℹ️')  const apiUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`

      const now = Date.now()

      console.log('[PingService] Sending Telegram message:', modifiedText)  const waitTime = lastTelegramSendTime + TELEGRAM_SEND_DELAY - now

      await sendTelegramMessage(modifiedText)  if (waitTime > 0) {

        lastTelegramSendTime = Date.now()    console.log(`[TELEGRAM] Waiting ${waitTime}ms before sending message`)

      } catch (error) {
        await sleep(waitTime)

        console.error('[PingService] Error sending Telegram message:', error?.message || error)
      }

    } try {

    }    let modifiedText = message.replace("alive", "✅")

    modifiedText = modifiedText.replace("dead", "❌")

    // Start continuous monitoring    modifiedText = modifiedText.replace("Warning", "⚠️")

    async function startNetworkMonitoring() {
      modifiedText = modifiedText.replace("Info", "ℹ️")

      if (!LOCAL_NETWATCHING_ENABLED) {
        console.log('[TELEGRAM] Sending message:', modifiedText)

        console.log('[PingService] Network monitoring is disabled via LOCAL_NETWATCHING_ENABLED')    await sendTelegramMessageToExceptionWoda(message)

        return    const response = await sendToChat(apiUrl, telegramBotToken, telegramChatId, modifiedText)

      } lastTelegramSendTime = Date.now()

      if (!response) {

        console.log('[PingService] Starting network monitoring service')      console.log('[TELEGRAM] Error sending Telegram message.')

        console.log(`[PingService] Basic ping IPs: ${LOCAL_PING_IP_LIST.length} hosts`)
      } else {

        console.log(`[PingService] Delay ping IPs: ${LOCAL_PING_WITH_DELAY_IP_LIST.length} hosts`)      console.log('[TELEGRAM] Message sent successfully')

        console.log(`[PingService] Ping interval: ${PING_INTERVAL}ms`)
      }

    } catch (error) {

      const monitoringLoop = async () => {
        console.error('[TELEGRAM] Error sending Telegram message:', error?.message || error)

        try { }

      // Basic ping monitoring}

      if (LOCAL_PING_IP_LIST.length > 0) {

          await pingProbe(LOCAL_PING_IP_LIST)async function handleStatusChange(args) {

          } const {

            ip_address,

            // Enhanced ping monitoring with delay analysis    removeFromList,

            if (LOCAL_PING_WITH_DELAY_IP_LIST.length > 0) {
              addToList,

              await pingProbeWithDelay(LOCAL_PING_WITH_DELAY_IP_LIST)    fromStatus,

      } toStatus,

            service = false,

            setTimeout(monitoringLoop, PING_INTERVAL)    response = ''

        } catch (err) { } = args

        console.error('[PingService] Error in monitoring loop:', err)

        setTimeout(monitoringLoop, PING_INTERVAL)  const foundIndex = removeFromList.findIndex(item => {

        }    const isMatchingIp = item.ip_address === ip_address.ip_address

      }    const isMatchingOid = ip_address.oid && item.oid === ip_address.oid.toString()

      const isMatchingPort = ip_address.Port && item.Port === ip_address.Port.toString()

      monitoringLoop()

    } return (isMatchingIp && (isMatchingOid || isMatchingPort)) || (!ip_address.oid && !ip_address.Port && isMatchingIp)

  })

  // Get current host status

  function getHostStatus() {
    if (foundIndex !== -1) {

      return {
        removeFromList.splice(foundIndex, 1)

    alive: Array.from(aliveHosts),
      }

      dead: Array.from(deadHosts),

        total: hostStatusMap.size  const existingIndex = addToList.findIndex(item => {

        }    const isMatchingIp = item.ip_address === ip_address.ip_address;

    } const isMatchingOid = ip_address.oid && item.oid === ip_address.oid.toString();

    const isMatchingPort = ip_address.Port && item.Port === ip_address.Port?.toString();

    // Legacy compatibility functions    const result = (isMatchingIp && (isMatchingOid || isMatchingPort)) || (!ip_address.oid && !ip_address.Port && isMatchingIp)

    async function netWatchPingerProbe(ipAddresses) {
      if (!result) {

        console.log('[PingService] Legacy function called - redirecting to pingProbe')      console.log('[DEBUG handleStatusChange] Not matched:', {

          const ipList = ipAddresses.map(ip => ip.ip_address || ip)        item_ip: item.ip_address,

          await pingProbe(ipList)        arg_ip: ip_address.ip_address,

        }        item_oid: item.oid,

          arg_oid: ip_address.oid,

          async function netWatchPingerWithDelay(ipAddresses) {
            item_port: item.Port,

              console.log('[PingService] Legacy function called - redirecting to pingProbeWithDelay')        arg_port: ip_address.Port

            const ipList = ipAddresses.map(ip => ip.ip_address || ip)
          })

        await pingProbeWithDelay(ipList)
      }

    } return result

  });

  module.exports = { if(existingIndex === -1) {

    pingProbe, console.log('[DEBUG handleStatusChange] No match found in addToList for:', {

      pingProbeWithDelay, ip_address: ip_address.ip_address,

      startNetworkMonitoring, oid: ip_address.oid,

      getHostStatus, Port: ip_address.Port

  // Legacy exports for compatibility    })

  netWatchPingerProbe, if(addToList.length > 0) {

  netWatchPingerWithDelay      console.log('[DEBUG handleStatusChange] addToList contents:', addToList)

    }
  }
}


console.log(`${new Date().toISOString()}:handleStatusChange: removeFromList, addToList, ${removeFromList.length}, ${addToList.length} service = ${service}`)

if (existingIndex !== -1) {
  addToList[existingIndex].count++
  const prevValue = addToList[existingIndex].lastValue
  const newValue = ip_address.value  // Revert back to original
  function cleanVal(val) {
    return (val ?? '').toString()
      .replace(/value/gi, '')
      .replace(/Status OK/gi, '')
      .replace(/Status PROBLEM/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
  }
  const prevValueStr = cleanVal(prevValue);
  const newValueStr = cleanVal(newValue);
  const prevNum = parseFloat(prevValueStr);
  const newNum = parseFloat(newValueStr);
  const bothNumbers = !isNaN(prevNum) && !isNaN(newNum);

  if (
    (bothNumbers && prevNum !== newNum) ||
    (!bothNumbers && prevValueStr && newValueStr && prevValueStr !== newValueStr)
  ) {
    if (!prevValueStr || !newValueStr) {
      console.log('[DEBUG handleStatusChange] SKIP: one of values is empty after clean')
      return
    }
    console.log('[DEBUG handleStatusChange] SENDING: value changed, writing to DB and sending message');
    let resource = '';
    if (service === true) {
    } else {
      resource = 'Host';
    }
    let msg = `${resource} ${ip_address.ip_address} (${ip_address.description}) ⇆ from ${fromStatus} to ${toStatus}\n${response}`;

    addToList[existingIndex].lastValue = newValue;
  }
  ip_address.status = toStatus
  return
} else {
  addToList.push({
    ip_address: ip_address?.ip_address,
    Port: ip_address?.Port || '',
    oid: ip_address?.oid || '',
    count: 1,
    lastValue: ip_address.value  // Revert back to original
  })
  ip_address.status = toStatus
}

let resource = ''
let msg = ''
if (service === true) {

} else {
  resource = 'Host'
}

if (response === '') {
  msg = `${resource} ${ip_address.ip_address} (${ip_address.description}) ⇆ from ${fromStatus} to ${toStatus}`
} else {
  msg = `${resource} ${ip_address.ip_address} (${ip_address.description}) ⇆ from ${fromStatus} to ${toStatus}\n${response}`
}
msg = msg.replace("Port:undefined", "snmp")
sendTelegramMessage(msg)
}

module.exports = { netWatchPingerProbe, netWatchPingerWithDelay, loadipList }