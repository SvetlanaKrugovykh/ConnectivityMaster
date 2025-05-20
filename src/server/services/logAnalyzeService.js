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
    const logRegex = /^(\w{3} \d{2} \d{2}:\d{2}:\d{2}) (.+)$/
    const groups = {}

    suspiciousEntries.forEach(line => {
      const match = line.match(logRegex)
      if (!match) return
      const time = match[1]
      const rest = match[2]
      if (!groups[rest]) {
        groups[rest] = { times: [], count: 0 }
      }
      groups[rest].times.push(time)
      groups[rest].count += 1
    })

    let message = '❗️❗️❗️Suspicious ARP activity detected:❗️❗️❗️\n'
    Object.entries(groups).forEach(([rest, { times, count }]) => {
      times.sort((a, b) => new Date(`2024 ${a}`) - new Date(`2024 ${b}`))
      message += `\n${rest}\n  ↳ ${count} times, from ${times[0]} to ${times[times.length - 1]}`
    })

    return message
  } catch (err) {
    console.error('Error in formatArpSuspiciousMessage:', err)
    return '❗️❗️❗️Suspicious ARP activity detected, but failed to format details.'
  }
}

