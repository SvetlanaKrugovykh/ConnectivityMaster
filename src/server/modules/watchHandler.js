//#region  status handlers
const { sendReqToDB, sendToChat } = require('./to_local_DB.js')

const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
const telegramChatId = process.env.TELEGRAM_CHAT_ID

function handleStatusChange(ip_address, foundIndex, removeFromList, addToList, fromStatus, toStatus, service = false, response = '') {
  const [removedIP] = removeFromList.splice(foundIndex, 1)
  const existingIndex = addToList.findIndex(item => item.ip_address === removedIP.ip_address)

  console.log(`${new Date().toISOString()}:handleStatusChange: removeFromList, addToList, ${removeFromList.length}, ${addToList.length} service = ${service}`)

  if (existingIndex !== -1) {
    addToList[existingIndex].count = 1
  } else {
    addToList.push({ ip_address: removedIP.ip_address, count: 1 })
  }

  let resource = ''
  let msg = ''
  if (service) { resource = `Service Port:${ip_address.Port}` } else { resource = 'Host' }
  if (response === '') {
    msg = `${resource} ${ip_address.ip_address} (${ip_address.description}) ⇆ from ${fromStatus} to ${toStatus}`
    sendReqToDB('__SaveStatusChangeToDb__', `${ip_address.ip_address}#${fromStatus}#${toStatus}#${service}#`, '')
  } else {
    msg = `${resource} ${ip_address.ip_address} (${ip_address.description}) ⇆ from ${fromStatus} to ${toStatus}/n${response}`
    sendReqToDB('__SaveStatusChangeToDb__', `${ip_address.ip_address}#${fromStatus}#${toStatus}#${service}#${ip_address.oid}#${response}#`, '')
  }
  sendTelegramMessage(msg)
}
//#endregion


//#region  send message to telegram
async function sendTelegramMessage(message) {
  const apiUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`

  try {
    let modifiedText = message.replace("alive", "✅")
    modifiedText = modifiedText.replace("dead", "❌")
    const response = await sendToChat(apiUrl, telegramBotToken, telegramChatId, modifiedText)
    if (!response) {
      console.log('Error sending Telegram message.')
    }
  } catch (error) {
    console.error('Error sending Telegram message:', error)
  }
}
//#endregion

module.exports = { handleStatusChange }