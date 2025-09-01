const axios = require('axios')
const nodemailer = require('nodemailer')
const FormData = require('form-data')
require('dotenv').config()

const CAPTION_MAX = 1024
const MSG_MAX = 4096
const LOG_TRIM = 200

module.exports.sendMessage = async function (body) {

  try {
    switch (body.type) {
      case 'email':
        return await sendEmail(body)
      case 'sms':
        return await sendSMS(body)
      case 'telegram':
        return await sendTelegram(body)
      case 'facebookMessenger':
        return await sendFacebookMessenger(body)
      case 'whatsApp':
        return await sendWhatsApp(body)
      case 'linkedIn':
        return await sendLinkedIn(body)
      case 'viber':
        return await sendViber(body)
      case 'signal':
        return await sendSignal(body)
      default:
        return false
    }
  } catch (error) {
    console.error('Error executing sendEMAIL commands:', error.message)
    return false
  }
}


function isHtml(text) {
  if (!text || typeof text !== 'string') return false
  return /<\/?[a-z][\s\S]*>/i.test(text)
}

async function sendTelegram(body) {
  const { addresses = [], message = '', attachments = [] } = body || {}
  const apiToken = process.env.TELEGRAM_BOT_TOKEN_SILVER
  if (!apiToken) {
    console.error('[telegram] bot token not set')
    return false
  }

  const html = isHtml(message)
  for (const address of addresses) {
    if (!address) continue
    try {
      const useCaption = typeof message === 'string' && message.length > 0 && message.length <= CAPTION_MAX

      if (attachments && attachments.length > 0) {
        for (const attachment of attachments) {
          const form = new FormData()
          form.append('chat_id', address)
          if (useCaption) {
            form.append('caption', message)
            if (html) form.append('parse_mode', 'HTML')
          }

          const content = attachment && attachment.content ? attachment.content : ''
          const buffer = Buffer.from(content, 'base64')
          if (!buffer || buffer.length === 0) {
            console.log(`[telegram] skip empty attachment for ${address} ${attachment && attachment.filename ? attachment.filename : ''}`)
            continue
          }
          form.append('document', buffer, { filename: attachment.filename || 'file.bin' })

          const resp = await axios.post(`https://api.telegram.org/bot${apiToken}/sendDocument`, form, {
            headers: form.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity
          })

          if (!resp || !resp.data || resp.data.ok !== true) {
            const desc = resp && resp.data && resp.data.description ? resp.data.description : 'unknown'
            console.log(`[telegram] sendDocument failed: ${String(desc).slice(0, LOG_TRIM)}`)
            return false
          }
        }

        if (!useCaption && message && message.length > 0) {
          const text = String(message).slice(0, MSG_MAX)
          const payload = { chat_id: address, text }
          if (html) payload.parse_mode = 'HTML'
          const resp = await axios.post(`https://api.telegram.org/bot${apiToken}/sendMessage`, payload)
          if (!resp || !resp.data || resp.data.ok !== true) {
            const desc = resp && resp.data && resp.data.description ? resp.data.description : 'unknown'
            console.log(`[telegram] sendMessage (post-doc) failed: ${String(desc).slice(0, LOG_TRIM)}`)
            return false
          }
        }
      } else {
        const text = (message && message.length > 0) ? String(message).slice(0, MSG_MAX) : ' '
        const payload = { chat_id: address, text }
        if (html) payload.parse_mode = 'HTML'
        const resp = await axios.post(`https://api.telegram.org/bot${apiToken}/sendMessage`, payload)
        if (!resp || !resp.data || resp.data.ok !== true) {
          const desc = resp && resp.data && resp.data.description ? resp.data.description : 'unknown'
          console.log(`[telegram] sendMessage failed: ${String(desc).slice(0, LOG_TRIM)}`)
          return false
        }
      }

      console.log(`[telegram] sent to ${address}`)
    } catch (err) {
      const short = err && err.response && err.response.data && err.response.data.description
        ? err.response.data.description
        : (err && err.message ? err.message : 'unknown error')
      console.error(`[telegram] Error sending to ${address}: ${String(short).slice(0, LOG_TRIM)}`)
      return false
    }
  }

  return true
}


async function sendEmail(body) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER_SILVER,
      pass: process.env.EMAIL_PASSWORD_SILVER,
    },
  })

  let attachments = []
  if (body.attachments) {
    for (const attachment of body.attachments) {
      attachments.push({
        filename: attachment.filename,
        content: Buffer.from(attachment.content, 'base64'),
      })
    }
  }

  const mailOptions = {
    from: process.env.EMAIL_USER_SILVER,
    to: body.addresses,
    subject: body?.subject || 'Silver - mail',
    attachments,
  }

  if (body.message.includes('</')) {
    mailOptions.html = body.message
  } else {
    mailOptions.text = body.message
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log(`Message to ${body.addresses[0]} sent successfully`)
    return true
  } catch (error) {
    console.error(`Error ${body.addresses[0]} sending email:`, error.message)
    return false
  }
}

async function sendFacebookMessenger(body) {
  const { recipientId, message } = body
  const pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN

  try {
    await axios.post(
      `https://graph.facebook.com/v13.0/me/messages?access_token=${pageAccessToken}`,
      {
        recipient: {
          id: recipientId,
        },
        message: {
          text: message,
        },
      }
    )
    console.log('Message sent successfully to Facebook Messenger')
    return true
  } catch (error) {
    console.error('Error sending Facebook Messenger message:', error.message)
    return false
  }
}

async function sendWhatsApp(body) {
  const { phoneNumber, message } = body
  const apiKey = process.env.WHATSAPP_API_KEY

  try {
    await axios.post(
      'https://api.whatsapp.com/send?phone=' + phoneNumber + '&text=' + encodeURIComponent(message),
      null,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    )
    console.log('Message sent successfully to WhatsApp')
    return true
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.message)
    return false
  }
}

async function sendLinkedIn(body) {
  const { profileId, message } = body
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN

  try {
    await axios.post(
      `https://api.linkedin.com/v2/personalShare?oauth2_access_token=${accessToken}`,
      {
        owner: `urn:li:person:${profileId}`,
        text: {
          text: message,
        },
      }
    )
    console.log('Message sent successfully to LinkedIn')
    return true
  } catch (error) {
    console.error('Error sending LinkedIn message:', error.message)
    return false
  }
}

async function sendViber(body) {
  const { receiverId, message } = body
  const apiKey = process.env.VIBER_API_KEY

  try {
    await axios.post(
      'https://chatapi.viber.com/pa/send_message',
      {
        receiver: receiverId,
        min_api_version: 7,
        type: 'text',
        text: message,
      },
      {
        headers: {
          'X-Viber-Auth-Token': apiKey,
          'Content-Type': 'application/json',
        },
      }
    )
    console.log('Message sent successfully to Viber')
    return true
  } catch (error) {
    console.error('Error sending Viber message:', error.message)
    return false
  }
}

async function sendSignal(body) {
  const { addresses = [], message = '', attachments = [] } = body || {}
  const apiToken = process.env.SIGNAL_BOT_TOKEN
  if (!apiToken) {
    console.error('[signal] bot token not set')
    return false
  }

  for (const address of addresses) {
    if (!address) continue
    try {
      const useCaption = typeof message === 'string' && message.length > 0 && message.length <= CAPTION_MAX

      if (attachments && attachments.length > 0) {
        for (const attachment of attachments) {
          const form = new FormData()
          form.append('chat_id', address)
          if (useCaption) form.append('caption', message)

          const content = attachment && attachment.content ? attachment.content : ''
          const buffer = Buffer.from(content, 'base64')
          if (!buffer || buffer.length === 0) {
            console.log(`[signal] skip empty attachment for ${address} ${attachment && attachment.filename ? attachment.filename : ''}`)
            continue
          }
          form.append('document', buffer, { filename: attachment.filename || 'file.bin' })

          const resp = await axios.post(`https://api.signal.org/bot${apiToken}/sendDocument`, form, {
            headers: form.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity
          })

          if (!resp || !resp.data || resp.data.ok !== true) {
            const desc = resp && resp.data && resp.data.description ? resp.data.description : 'unknown'
            console.log(`[signal] sendDocument failed: ${String(desc).slice(0, LOG_TRIM)}`)
            return false
          }
        }

        if (!useCaption && message && message.length > 0) {
          const text = String(message).slice(0, MSG_MAX)
          const resp = await axios.post(`https://api.signal.org/bot${apiToken}/sendMessage`, {
            chat_id: address,
            text
          })
          if (!resp || !resp.data || resp.data.ok !== true) {
            const desc = resp && resp.data && resp.data.description ? resp.data.description : 'unknown'
            console.log(`[signal] sendMessage (post-doc) failed: ${String(desc).slice(0, LOG_TRIM)}`)
            return false
          }
        }
      } else {
        const text = (message && message.length > 0) ? String(message).slice(0, MSG_MAX) : ' '
        const resp = await axios.post(`https://api.signal.org/bot${apiToken}/sendMessage`, {
          chat_id: address,
          text
        })
        if (!resp || !resp.data || resp.data.ok !== true) {
          const desc = resp && resp.data && resp.data.description ? resp.data.description : 'unknown'
          console.log(`[signal] sendMessage failed: ${String(desc).slice(0, LOG_TRIM)}`)
          return false
        }
      }

      console.log(`[signal] sent to ${address}`)
    } catch (err) {
      const short = err && err.response && err.response.data && err.response.data.description
        ? err.response.data.description
        : (err && err.message ? err.message : 'unknown error')
      console.error(`[signal] Error sending to ${address}: ${String(short).slice(0, LOG_TRIM)}`)
      return false
    }
  }

  return true
}

async function sendSMS(body) {
  const { phoneNumber, message } = body;
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

  try {
    await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        To: phoneNumber,
        From: twilioPhoneNumber,
        Body: message,
      },
      {
        auth: {
          username: accountSid,
          password: authToken,
        },
      }
    );
    console.log('SMS sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending SMS:', error.message);
    return false;
  }
}
