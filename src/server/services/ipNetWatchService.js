require('dotenv').config()
const { runCommand } = require('../utils/commandsOS')
const { sendTelegramMessage } = require('./telegramService')

// Environment configuration
const LOCAL_NETWATCHING_ENABLED = process.env.LOCAL_NETWATCHING_ENABLED === 'true'
const LOCAL_PING_IP_LIST = process.env.LOCAL_PING_IP_LIST?.split(',').map(ip => ip.trim()).filter(ip => ip) || []
const LOCAL_PING_WITH_DELAY_IP_LIST = process.env.LOCAL_PING_WITH_DELAY_IP_LIST?.split(',').map(ip => ip.trim()).filter(ip => ip) || []
const PING_INTERVAL = parseInt(process.env.LOCAL_PING_INTERVAL) || 30000
const PING_SOURCE_IP = process.env.PING_SOURCE_IP || '91.220.106.2'
const PING_COUNT_FOR_DELAY = parseInt(process.env.PING_COUNT_FOR_DELAY) || 50
const PACKET_LOSS_THRESHOLD = parseFloat(process.env.PACKET_LOSS_THRESHOLD) || 0.2
const TELEGRAM_SEND_DELAY = 2000

// Status tracking
let deadHosts = new Set()
let aliveHosts = new Set()
let hostStatusMap = new Map()
let lastTelegramSendTime = 0

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
    if (!LOCAL_NETWATCHING_ENABLED) {
      console.log('[PingService] Local network watching is disabled')
      return
    }

    if (!ipAddresses || ipAddresses.length === 0) {
      console.log('[PingService] No IP addresses provided for ping probe')
      return
    }

    console.log('[PingService] Starting ping probe for ' + ipAddresses.length + ' hosts')

    const pingPromises = ipAddresses.map(async ipAddress => {
      const command = 'ping'
      const args = ['-c', '1', '-W', '3', ipAddress]
      
      try {
        const result = await runCommand(command, args)
        const stdout = result.stdout
        
        if (stdout.includes('1 received')) {
          handleHostAlive(ipAddress)
        } else {
          handleHostDead(ipAddress)
        }
      } catch (err) {
        handleHostDead(ipAddress)
      }
    })

    await Promise.all(pingPromises)
  } catch (err) {
    console.error('[PingService] Error in ping probe:', err)
  }
}

// Enhanced ping with packet loss monitoring
async function pingProbeWithDelay(ipAddresses) {
  try {
    if (!LOCAL_NETWATCHING_ENABLED) {
      console.log('[PingService] Local network watching is disabled')
      return
    }

    if (!ipAddresses || ipAddresses.length === 0) {
      console.log('[PingService] No IP addresses provided for delay ping probe')
      return
    }

    console.log('[PingService] Starting delay ping probe for ' + ipAddresses.length + ' hosts')

    const probePromises = ipAddresses.map(async ipAddress => {
      let completedPings = 0
      let lostPings = 0
      let rttSum = 0

      for (let i = 0; i < PING_COUNT_FOR_DELAY; i++) {
        const command = 'ping'
        const args = ['-c', '1', '-I', PING_SOURCE_IP, ipAddress]
        
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
        handlePacketLoss(ipAddress, lossPercentage)
      } else {
        const avgRTT = rttSum / (completedPings - lostPings)
        handleNormalResponse(ipAddress, avgRTT, lossPercentage)
      }
    })

    await Promise.all(probePromises)
  } catch (err) {
    console.error('[PingService] Error in delay ping probe:', err)
  }
}

// Handle host status changes
function handleHostAlive(ipAddress) {
  const previousStatus = hostStatusMap.get(ipAddress)
  
  if (previousStatus === Status.DEAD || !hostStatusMap.has(ipAddress)) {
    deadHosts.delete(ipAddress)
    aliveHosts.add(ipAddress)
    hostStatusMap.set(ipAddress, Status.ALIVE)
    
    if (previousStatus === Status.DEAD) {
      sendTelegramNotification('Host ' + ipAddress + ' is now alive')
    }
  }
}

function handleHostDead(ipAddress) {
  const previousStatus = hostStatusMap.get(ipAddress)
  
  if (previousStatus === Status.ALIVE || !hostStatusMap.has(ipAddress)) {
    aliveHosts.delete(ipAddress)
    deadHosts.add(ipAddress)
    hostStatusMap.set(ipAddress, Status.DEAD)
    
    if (previousStatus === Status.ALIVE) {
      sendTelegramNotification('Host ' + ipAddress + ' is now dead')
    }
  }
}

function handlePacketLoss(ipAddress, lossPercentage) {
  const lossPercent = Math.round(lossPercentage * 100)
  console.log('[PingService] High packet loss for ' + ipAddress + ': ' + lossPercent + '%')
  sendTelegramNotification('Warning: Host ' + ipAddress + ' has ' + lossPercent + '% packet loss')
}

function handleNormalResponse(ipAddress, avgRTT, lossPercentage) {
  if (avgRTT > 0) {
    const rtt = Math.round(avgRTT)
    const loss = Math.round(lossPercentage * 100)
    console.log('[PingService] ' + ipAddress + ' - RTT: ' + rtt + 'ms, Loss: ' + loss + '%')
  }
  handleHostAlive(ipAddress)
}

// Send Telegram notifications with rate limiting
async function sendTelegramNotification(message) {
  const now = Date.now()
  const waitTime = lastTelegramSendTime + TELEGRAM_SEND_DELAY - now
  
  if (waitTime > 0) {
    console.log('[PingService] Waiting ' + waitTime + 'ms before sending Telegram message')
    await sleep(waitTime)
  }
  
  try {
    let modifiedText = message.replace(/alive/g, '✅')
    modifiedText = modifiedText.replace(/dead/g, '❌')
    modifiedText = modifiedText.replace(/Warning/g, '⚠️')
    modifiedText = modifiedText.replace(/Info/g, 'ℹ️')
    
    console.log('[PingService] Sending Telegram message:', modifiedText)
    await sendTelegramMessage(modifiedText)
    lastTelegramSendTime = Date.now()
  } catch (error) {
    console.error('[PingService] Error sending Telegram message:', error?.message || error)
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
      console.error('[PingService] Error in monitoring loop:', err)
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
  console.log('[PingService] Legacy function called - redirecting to pingProbe')
  const ipList = ipAddresses.map(ip => ip.ip_address || ip)
  await pingProbe(ipList)
}

async function netWatchPingerWithDelay(ipAddresses) {
  console.log('[PingService] Legacy function called - redirecting to pingProbeWithDelay')
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