require('dotenv').config()
const { runCommand } = require('../utils/commandsOS')

// Environment configuration
const LOCAL_NETWATCHING_ENABLED = process.env.LOCAL_NETWATCHING_ENABLED === 'true'

// Legacy compatibility functions
async function netWatchPingerProbe(ipAddresses) {
  if (!LOCAL_NETWATCHING_ENABLED) {
    console.log('[PingService] Local network watching is disabled')
    return
  }

  console.log('[PingService] Running ping probe for', ipAddresses.length, 'hosts')

  for (const ipObj of ipAddresses) {
    const ipAddress = ipObj.ip_address || ipObj
    try {
      const result = await runCommand('ping', ['-c', '1', ipAddress])
      if (result.stdout.includes('1 received')) {
        console.log('[PingService] Host', ipAddress, 'is alive')
      } else {
        console.log('[PingService] Host', ipAddress, 'is dead')
      }
    } catch (err) {
      console.log('[PingService] Host', ipAddress, 'is dead - error:', err.message)
    }
  }
}

async function netWatchPingerWithDelay(ipAddresses) {
  if (!LOCAL_NETWATCHING_ENABLED) {
    console.log('[PingService] Local network watching is disabled')
    return
  }

  console.log('[PingService] Running enhanced ping for', ipAddresses.length, 'hosts')

  for (const ipAddress of ipAddresses) {
    let lostPings = 0
    const pingCount = 10

    for (let i = 0; i < pingCount; i++) {
      try {
        const result = await runCommand('ping', ['-c', '1', ipAddress])
        if (!result.stdout.includes('1 received')) {
          lostPings++
        }
      } catch (err) {
        lostPings++
      }
    }

    const lossPercent = Math.round((lostPings / pingCount) * 100)
    console.log('[PingService] Host', ipAddress, 'packet loss:', lossPercent + '%')
  }
}

module.exports = {
  netWatchPingerProbe,
  netWatchPingerWithDelay
}
