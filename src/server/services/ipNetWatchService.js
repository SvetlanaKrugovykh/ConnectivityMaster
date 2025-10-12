require('dotenv').config()
const { runCommand } = require('../utils/commandsOS')
const { sendTgMessage } = require('./telegramService')

// Environment configuration
const LOCAL_NETWATCHING_ENABLED = process.env.LOCAL_NETWATCHING_ENABLED === 'true'
const LOCAL_PING_IP_LIST = process.env.LOCAL_PING_IP_LIST?.split(',').map(ip => ip.trim()).filter(ip => ip) || []
const LOCAL_PING_WITH_DELAY_IP_LIST = process.env.LOCAL_PING_WITH_DELAY_IP_LIST?.split(',').map(ip => ip.trim()).filter(ip => ip) || []
const PING_INTERVAL = parseInt(process.env.LOCAL_PING_INTERVAL) || 30000
const PING_SOURCE_IP = process.env.PING_SOURCE_IP
const USE_PING_SOURCE_IP = process.env.USE_PING_SOURCE_IP === 'true'
const PING_COUNT_FOR_DELAY = parseInt(process.env.PING_COUNT_FOR_DELAY) || 50
const PACKET_LOSS_THRESHOLD = parseFloat(process.env.PACKET_LOSS_THRESHOLD) || 0.2
const TELEGRAM_SEND_DELAY = 2000

// Status tracking
let deadHosts = new Set()
let aliveHosts = new Set()
let hostStatusMap = new Map()
let failureCountMap = new Map()
let lastTelegramSendTime = 0
const FAILURE_THRESHOLD = 2

const Status = {
  ALIVE: 'alive',
  DEAD: 'dead'
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Simple ping probe for basic monitoring
async function pingProbe(ipAddresses) {
  try {
    if (!LOCAL_NETWATCHING_ENABLED) return

    if (!ipAddresses || ipAddresses.length === 0) return

    const pingPromises = ipAddresses.map(async ipAddress => {
      const command = 'ping'
      const args = ['-c', '1', '-W', '3', ipAddress]

      try {
        const result = await runCommand(command, args)
        const stdout = result.stdout

        if (stdout.includes('1 received')) {
          await handleHostAlive(ipAddress, 'basic')
        } else {
          await handleHostDead(ipAddress, 'ping timeout', 'basic')
        }
      } catch (err) {
        await handleHostDead(ipAddress, 'ping timeout', 'basic')
      }
    })

    await Promise.all(pingPromises)
  } catch (err) {
    console.error('[PingService] Ping probe error:', err?.message || 'Unknown error')
  }
}

// Enhanced ping with packet loss monitoring
async function pingProbeWithDelay(ipAddresses) {
  try {
    if (!LOCAL_NETWATCHING_ENABLED) return

    if (!ipAddresses || ipAddresses.length === 0) return

    const probePromises = ipAddresses.map(async ipAddress => {
      let completedPings = 0
      let lostPings = 0
      let rttSum = 0

      for (let i = 0; i < PING_COUNT_FOR_DELAY; i++) {
        const command = 'ping'
        const args = USE_PING_SOURCE_IP && PING_SOURCE_IP
          ? ['-c', '1', '-I', PING_SOURCE_IP, ipAddress]
          : ['-c', '1', ipAddress]

        try {
          const result = await runCommand(command, args)
          const stdout = result.stdout
          const match = stdout.match(/time=([0-9.]+) ms/)

          if (stdout.includes('1 received')) {
            rttSum += match ? parseFloat(match[1]) : 0
          } else {
            lostPings++
          }
        } catch (err) {
          lostPings++
        }
        completedPings++
      }

      const lossPercentage = lostPings / PING_COUNT_FOR_DELAY

      if (lossPercentage > PACKET_LOSS_THRESHOLD) {
        await handlePacketLoss(ipAddress, lossPercentage)
      } else {
        const avgRTT = rttSum / (completedPings - lostPings)
        await handleNormalResponse(ipAddress, avgRTT, lossPercentage)
      }
    })

    await Promise.all(probePromises)
  } catch (err) {
    console.error('[PingService] Delay probe error:', err?.message || 'Unknown error')
  }
}

// Handle host status changes
async function handleHostAlive(ipAddress, monitorType = 'basic') {
  const key = ipAddress + '_' + monitorType
  const previousStatus = hostStatusMap.get(key)

  // Reset failure counter on successful ping
  failureCountMap.set(key, 0)

  if (previousStatus === Status.DEAD || !hostStatusMap.has(key)) {
    deadHosts.delete(key)
    aliveHosts.add(key)
    hostStatusMap.set(key, Status.ALIVE)

    if (previousStatus === Status.DEAD) {
      console.log('[PingService] Host ' + ipAddress + ' recovered')
      await sendTelegramNotification('Host ' + ipAddress + ' is now alive')
    }
  }
}

async function handleHostDead(ipAddress, reason = 'ping timeout', monitorType = 'basic') {
  const key = ipAddress + '_' + monitorType
  const previousStatus = hostStatusMap.get(key)

  // Increment failure counter
  const currentFailures = failureCountMap.get(key) || 0
  const newFailures = currentFailures + 1
  failureCountMap.set(key, newFailures)

  // Only mark as dead and send notification after threshold failures
  if (newFailures >= FAILURE_THRESHOLD) {
    if (previousStatus !== Status.DEAD) {
      aliveHosts.delete(key)
      deadHosts.add(key)
      hostStatusMap.set(key, Status.DEAD)

      console.log('[PingService] Host ' + ipAddress + ' is down (' + reason + ')')

      let message = 'Host ' + ipAddress + ' is now dead'
      if (reason.includes('packet loss')) {
        message = 'Warning: Host ' + ipAddress + ' has high packet loss'
      }
      await sendTelegramNotification(message)
    }
  } else {
    console.log('[PingService] Host ' + ipAddress + ' failed ' + newFailures + '/' + FAILURE_THRESHOLD + ' (' + reason + ')')
  }
}

async function handlePacketLoss(ipAddress, lossPercentage) {
  const lossPercent = Math.round(lossPercentage * 100)
  await handleHostDead(ipAddress, 'packet loss ' + lossPercent + '%', 'delay')
}

async function handleNormalResponse(ipAddress, avgRTT, lossPercentage) {
  // Only log RTT if significantly high
  if (avgRTT > 100) {
    const rtt = Math.round(avgRTT)
    console.log('[PingService] ' + ipAddress + ' high RTT: ' + rtt + 'ms')
  }
  await handleHostAlive(ipAddress, 'delay')
}

// Send Telegram notifications with rate limiting
async function sendTelegramNotification(message) {
  const now = Date.now()
  const waitTime = lastTelegramSendTime + TELEGRAM_SEND_DELAY - now

  if (waitTime > 0) {
    await sleep(waitTime)
  }

  try {
    let modifiedText = message.replace(/alive/g, '✅')
    modifiedText = modifiedText.replace(/dead/g, '❌')
    modifiedText = modifiedText.replace(/Warning/g, '⚠️')
    modifiedText = modifiedText.replace(/Info/g, 'ℹ️')

    modifiedText = '🚨🚨🚨 L9 ' + modifiedText

    await sendTgMessage(modifiedText)
    lastTelegramSendTime = Date.now()
  } catch (error) {
    console.error('[PingService] Telegram send failed:', error?.message || 'Unknown error')
  }
}

// Start continuous monitoring
async function startNetworkMonitoring() {
  if (!LOCAL_NETWATCHING_ENABLED) {
    console.log('[PingService] Network monitoring is disabled via LOCAL_NETWATCHING_ENABLED')
    return
  }

  console.log('[PingService] Starting network monitoring service')
  console.log('[PingService] Basic ping IPs: ' + LOCAL_PING_IP_LIST.length + ' hosts')
  console.log('[PingService] Delay ping IPs: ' + LOCAL_PING_WITH_DELAY_IP_LIST.length + ' hosts')
  console.log('[PingService] Ping interval: ' + PING_INTERVAL + 'ms')

  const monitoringLoop = async () => {
    try {
      // Basic ping monitoring
      if (LOCAL_PING_IP_LIST.length > 0) {
        await pingProbe(LOCAL_PING_IP_LIST)
      }

      // Enhanced ping monitoring with delay analysis
      if (LOCAL_PING_WITH_DELAY_IP_LIST.length > 0) {
        await pingProbeWithDelay(LOCAL_PING_WITH_DELAY_IP_LIST)
      }

      setTimeout(monitoringLoop, PING_INTERVAL)
    } catch (err) {
      console.error('[PingService] Monitoring error:', err?.message || 'Unknown error')
      setTimeout(monitoringLoop, PING_INTERVAL)
    }
  }

  monitoringLoop()
}

// Get current host status
function getHostStatus() {
  return {
    alive: Array.from(aliveHosts),
    dead: Array.from(deadHosts),
    total: hostStatusMap.size
  }
}

// Legacy compatibility functions
async function netWatchPingerProbe(ipAddresses) {
  const ipList = ipAddresses.map(ip => ip.ip_address || ip)
  await pingProbe(ipList)
}

async function netWatchPingerWithDelay(ipAddresses) {
  const ipList = ipAddresses.map(ip => ip.ip_address || ip)
  await pingProbeWithDelay(ipList)
}


module.exports = {
  pingProbe,
  pingProbeWithDelay,
  startNetworkMonitoring,
  getHostStatus,
  netWatchPingerProbe,
  netWatchPingerWithDelay
}