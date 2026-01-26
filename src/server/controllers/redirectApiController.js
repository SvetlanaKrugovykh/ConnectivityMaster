const HttpError = require('http-errors')
const fs = require('fs')
const redirectApiService = require('../services/redirectApiService')
const { sendReqToDB } = require('../modules/to_local_DB')
const { userInfo } = require('os')

module.exports.getInvoice = async function (request, reply) {
  try {
    let ipAddress = request.ip
    console.log('Request from ipAddress: ', ipAddress)
    if (process.env.REDIRECT_API_TEST_MODE === 'true') ipAddress = process.env.REDIRECT_API_TEST_IP
    const fullFileName = await redirectApiService.getInvoice(ipAddress)

    if (fullFileName === null) {
      throw new HttpError[501](`Problem with invoice generation for ${ipAddress}`)
    }

    let fullFileName_ = fullFileName.toString()
    if (fullFileName_ !== null) {
      fullFileName_ = fullFileName_.replace(/\\\\/g, '\\')
    }
    try {
      await sendReqToDB('__SaveSiteMsg__', `${fullFileName_}#getInvoice`, '')
    }
    catch (err) {
      console.log('PROBLEM of __SaveSiteMsg__', `${fullFileName_}#getInvoice#`, '')
    }
    reply.header('Content-Type', 'application/pdf')
    reply.header('Access-Control-Allow-Origin', '*')
    reply.header('Access-Control-Allow-Methods', 'GET')
    reply.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
    const fileData = fs.readFileSync(fullFileName_)
    reply.send(fileData)
  } catch (err) {
    console.log(err)
  }
}

module.exports.abonentServiceContinue = async function (request, _reply) {
  const ipAddress = request.ip
  const message = await redirectApiService.execServiceContinued(ipAddress)

  if (!message) {
    throw new HttpError[501]('Command execution failed')
  }
  try {
    await sendReqToDB('__SaveSiteMsg__', `${ipAddress}#ServiceContinue`, '')
  }
  catch (err) {
    console.log('PROBLEM of __SaveSiteMsg__', `${ipAddress}#ServiceContinue#`, '')
  }
  return {
    message: `Service continued for ${ipAddress}`
  }
}

module.exports.abonentGetPayLink = async function (request, reply) {
  const ipAddress = request.ip
  const amount = parseFloat(request.query.amount)

  if (isNaN(amount) || amount <= 0) {
    throw new HttpError[501](`Problem with get amount for ${ipAddress}`)
  }

  const commissionRate = 0.015;
  const totalAmount = (Math.ceil((amount / (1 - commissionRate)) * 100) / 100).toFixed(2)

  const payment_data = await redirectApiService.execGetPayLink(ipAddress, totalAmount)

  if (!payment_data) {
    throw new HttpError[501]('Command execution failed')
  }
  try {
    await sendReqToDB('__SaveSiteMsg__', `${ipAddress}#GetPayLink`, '')
  }
  catch (err) {
    console.log('PROBLEM of __SaveSiteMsg__', `${ipAddress}#GetPayLink#`, '')
  }
  const message = {
    ipAddress,
    user_info: payment_data.user_info,
    linkURI: payment_data.linkURI,
  }
  return reply.send(message)
}

module.exports.getMessages = async function (request, reply) {
  try {
    const messengerType = request.params.messenger.toLowerCase()
    
    // Extract device headers
    const deviceInfo = {
      deviceId: request.headers['x-device-id'] || '',
      deviceModel: request.headers['x-device-model'] || '',
      deviceBrand: request.headers['x-device-brand'] || '',
      androidVersion: request.headers['x-android-version'] || '',
      clientName: request.headers['x-client-name'] || ''
    }
    
    // Log device info for debugging
    console.log(`[${new Date().toISOString()}] ${messengerType.toUpperCase()} request from device:`, deviceInfo)
    
    // Get messages from 1C database
    const response = await sendReqToDB('__GetMessages__', {}, '')
    
    if (!response) {
      throw new HttpError[501]('Failed to get messages from database')
    }

    let messagesData
    try {
      messagesData = JSON.parse(response)
    } catch (err) {
      console.log('Error parsing messages response:', err)
      throw new HttpError[500]('Invalid response from database')
    }

    if (!messagesData.ResponseArray || !Array.isArray(messagesData.ResponseArray)) {
      return reply.send({ tasks: [] })
    }

    // Filter by messenger type and transform data
    const tasks = messagesData.ResponseArray
      .filter(item => item.messenger && item.messenger.toLowerCase() === messengerType)
      .map(item => {
        const taskData = {
          id: `${messengerType}_${item.id}`,
          phone: transformPhone(item.phone)
        }
        
        // For SMS use 'text', for others use 'message'
        if (messengerType === 'sms') {
          taskData.text = item.message
        } else {
          taskData.message = item.message
        }
        
        return taskData
      })

    return reply.send({ tasks })
  } catch (err) {
    console.log('Error in getMessages:', err)
    throw new HttpError[500]('Internal server error')
  }
}

function transformPhone(phone) {
  if (!phone) return ''
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')
  
  // If starts with 0 and has 10 digits, replace 0 with +380
  if (digits.length === 10 && digits[0] === '0') {
    return `+38${digits}`
  }
  
  // If already has country code, add + if missing
  if (digits.length === 12 && digits.startsWith('380')) {
    return `+${digits}`
  }
  
  // Return as is with + prefix if not empty
  return digits ? `+${digits}` : ''
}

module.exports.completeQueueTask = async function (request, reply) {
  try {
    // Extract device headers
    const deviceInfo = {
      deviceId: request.headers['x-device-id'] || '',
      deviceModel: request.headers['x-device-model'] || '',
      deviceBrand: request.headers['x-device-brand'] || '',
      androidVersion: request.headers['x-android-version'] || '',
      clientName: request.headers['x-client-name'] || ''
    }

    // Log incoming request
    console.log(`[${new Date().toISOString()}] POST /queue/complete from device:`, deviceInfo)

    // Check required header
    if (!deviceInfo.deviceId) {
      return reply.code(400).send({
        error: 'Missing required header: X-Device-ID'
      })
    }

    const { id, phone, success } = request.body

    // Validate required fields
    if (!id) {
      return reply.code(400).send({
        error: 'Missing required field: id'
      })
    }

    if (!phone) {
      return reply.code(400).send({
        error: 'Missing required field: phone'
      })
    }

    if (typeof success !== 'boolean') {
      return reply.code(400).send({
        error: 'Missing or invalid field: success (must be boolean)'
      })
    }

    // Prepare status for 1C
    const status = success ? 'OK' : 'FAILED'
    const dataFor1C = `${phone}#status=${status}`

    // Log device info and task completion
    console.log(`[${new Date().toISOString()}] Task completion from device:`, {
      taskId: id,
      phone,
      success,
      deviceInfo
    })

    // Send confirmation to 1C database
    const response = await sendReqToDB('__SaveMsgConfirmation__', dataFor1C, '')

    if (!response) {
      console.log('Warning: No response from __SaveMsgConfirmation__')
    }

    return reply.send({ status: 'ok' })
  } catch (err) {
    console.log('Error in completeQueueTask:', err)
    return reply.code(500).send({
      error: 'Internal server error'
    })
  }
}
