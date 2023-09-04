//#region  status handlers
const { sendReqToDB, sendToChat } = require('./to_local_DB.js')

const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
const telegramChatId = process.env.TELEGRAM_CHAT_ID

function handleStatusChange(args) {
  const {
    ip_address,
    removeFromList,
    addToList,
    fromStatus,
    toStatus,
    service = false,
    response = ''
  } = args
  const a1 = (item.ip_address === ip_address.ip_address && item.oid === ip_address.oid)
  const a2 = (item.ip_address === ip_address.ip_address && item.Port === ip_address.Port)
  const a3 = (item.ip_address === ip_address.ip_address)
  const a4 = (item.ip_address === ip_address.ip_address && item.oid === ip_address.oid) || (item.ip_address === ip_address.ip_address && item.Port === ip_address.Port) || (item.ip_address === ip_address.ip_address)

  console.log(`!!!!!${new Date().toISOString()}:handleStatusChange: removeFromList, addToList, ${removeFromList.length}, ${addToList.length} service = ${service}`)
  console.log(`!!!!!${new Date().toISOString()}:handleStatusChange: a1, a2, a3, a4, ${ip_address.oid} ${ip_address.value}${a1}, ${a2}, ${a3}, ${a4}`)

  const foundIndex = removeFromList.findIndex(item =>
    (item.ip_address === ip_address.ip_address && item.oid === ip_address.oid) ||
    (item.ip_address === ip_address.ip_address && item.Port === ip_address.Port) ||
    (item.ip_address === ip_address.ip_address)
  )
  if (foundIndex !== -1) {
    removeFromList.splice(foundIndex, 1)
  }

  const existingIndex = addToList.findIndex(item =>
    (item.ip_address === ip_address.ip_address && item.oid === ip_address.oid) ||
    (item.ip_address === ip_address.ip_address && item.Port === ip_address.Port) ||
    (item.ip_address === ip_address.ip_address)
  )

  console.log(`${new Date().toISOString()}:handleStatusChange: removeFromList, addToList, ${removeFromList.length}, ${addToList.length} service = ${service}`)

  if (existingIndex !== -1) {
    addToList[existingIndex].count++
    ip_address.status = toStatus
    return
  } else {
    addToList.push({
      ip_address: ip_address?.ip_address,
      Port: ip_address?.Port || '',
      oid: ip_address?.oid || '',
      count: 1,
    })
    ip_address.status = toStatus
  }

  let resource = ''
  let msg = ''
  if (service === true) { resource = `Service Port:${ip_address.Port}` } else { resource = 'Host' }
  if (response === '') {
    msg = `${resource} ${ip_address.ip_address} (${ip_address.description}) ⇆ from ${fromStatus} to ${toStatus}`
    sendReqToDB('__SaveStatusChangeToDb__', `${ip_address.ip_address}#${fromStatus}#${toStatus}#${service}#`, '')
  } else {
    msg = `${resource} ${ip_address.ip_address} (${ip_address.description}) ⇆ from ${fromStatus} to ${toStatus}\n${response}`
    sendReqToDB('__SaveStatusChangeToDb__', `${ip_address.ip_address}#${fromStatus}#${toStatus}#${service}#${ip_address.oid}#${response}#`, '')
  }
  msg = msg.replace("Port:undefined", "snmp")
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