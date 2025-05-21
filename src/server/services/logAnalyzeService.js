const fs = require('fs')
const dotenv = require('dotenv')
const { sendToChat } = require('../modules/to_local_DB')

dotenv.config()

module.exports.checkLogsFile = async function () {
  try {
    const ArpAttackPoolingInterval = parseInt(process.env.ARP_ATTACK_POOLING_INTERVAL) * 1000 * 60
    const logFilePath = process.env.FREEBSD_LOG_FILE_PATH.replace(/\\/g, '/')

    if (!fs.existsSync(logFilePath)) {
      console.error(`Log file does not exist: ${logFilePath}`);
      return
    }

    const logFileContent = fs.readFileSync(logFilePath, 'utf8')
    const logLines = logFileContent.split('\n')

    const currentTime = new Date()
    const suspiciousEntries = []
    const timeThreshold = new Date(currentTime.getTime() - ArpAttackPoolingInterval)

    logLines.forEach(line => {
      const match = line.match(/(\w{3} \d{2} \d{2}:\d{2}:\d{2}) (\S+) kernel: arp: (\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}) moved from (\S+) to (\S+) on (\S+)/)
      if (match) {
        const logTime = new Date(`${match[1]} ${currentTime.getFullYear()}`)
        if (logTime >= timeThreshold) {
          suspiciousEntries.push(line)
        }
      }
    })

    if (suspiciousEntries.length > 2) {
      const message = formatArpSuspiciousMessage(suspiciousEntries)
      await sendTgMessage(message)
    }
  } catch (err) {
    console.error('Error reading log file:', err)
  }
}


async function sendTgMessage(message) {
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
  const telegramChatId = process.env.TELEGRAM_CHAT_ID
  const apiUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`

  try {
    const response = await sendToChat(apiUrl, telegramBotToken, telegramChatId, message)
    if (!response) {
      console.log('Error sending Telegram message.')
    }
  } catch (error) {
    console.error('Error sending Telegram message:', error)
  }
}

function formatArpSuspiciousMessage(suspiciousEntries) {
  try {
    const arpRegex = /^(\w{3} \d{2} \d{2}:\d{2}:\d{2}) (\S+) kernel: arp: (\d{1,3}(?:\.\d{1,3}){3}) moved from (\S+) to (\S+) on (\S+)/
    const groups = {}
    const currentYear = new Date().getFullYear()

    suspiciousEntries.forEach(line => {
      const match = line.match(arpRegex)
      if (!match) return
      const timeStr = match[1]
      const ip = match[3]
      const macFrom = match[4]
      const macTo = match[5]
      const vlan = match[6]
      const groupKey = `${ip} moved from ${macFrom} to ${macTo} on ${vlan}`
      const fullTimeStr = `${timeStr} ${currentYear}`
      const timeObj = new Date(fullTimeStr)

      if (!groups[groupKey]) {
        groups[groupKey] = { times: [], timeStrs: [], count: 0 }
      }
      groups[groupKey].times.push(timeObj)
      groups[groupKey].timeStrs.push(timeStr)
      groups[groupKey].count += 1
    })

    let message = '❗️❗️❗️Suspicious ARP activity detected:❗️❗️❗️\n'
    Object.entries(groups).forEach(([key, { times, timeStrs, count }]) => {
      const sorted = times
        .map((t, i) => ({ t, s: timeStrs[i] }))
        .sort((a, b) => a.t - b.t)
      message += `\n${key}\n  ↳ ${count} times, from ${sorted[0].s} to ${sorted[sorted.length - 1].s}`
    })

    return message
  } catch (err) {
    console.error('Error in formatArpSuspiciousMessage:', err)
    return '❗️❗️❗️Suspicious ARP activity detected, but failed to format details.'
  }
}

