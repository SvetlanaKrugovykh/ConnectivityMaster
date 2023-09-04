//#region  status handlers
const { sendReqToDB, sendToChat } = require('./to_local_DB.js')

const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
const telegramChatId = process.env.TELEGRAM_CHAT_ID

async function handleStatusChange(args) {
  const {
    ip_address,
    removeFromList,
    addToList,
    fromStatus,
    toStatus,
    service = false,
    response = ''
  } = args

  const foundIndex = removeFromList.findIndex(item =>
  (item.ip_address === ip_address.ip_address &&
    (ip_address.oid.toString().length > 0 ? item.oid === ip_address.oid : true) &&
    (ip_address.Port.toString().length > 0 ? item.Port === ip_address.Port : true)
  )
  )

  if (foundIndex !== -1) {
    removeFromList.splice(foundIndex, 1);
  }

  const existingIndex = addToList.findIndex(item =>
  (item.ip_address === ip_address.ip_address &&
    (ip_address.oid.toString().length > 0 ? item.oid === ip_address.oid : true) &&
    (ip_address.Port.toString().length > 0 ? item.Port === ip_address.Port : true)
  )
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
  if (service === true) {
    if (ip_address.Port === undefined) {
      resource = `Snmp oid:${ip_address.oid}<=>${ip_address.value}`
    } else {
      resource = `Service Port:${ip_address.Port}`
    }
  } else {
    resource = 'Host'
  }

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