const axios = require('axios')
const nodemailer = require('nodemailer')
require('dotenv').config()


module.exports.sendEMAIL = async function (body) {

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

async function sendTelegram(body) {
  const { addresses, message, attachments } = body
  const apiToken = process.env.TELEGRAM_BOT_TOKEN_SILVER

  for (const address of addresses) {
    try {
      if (attachments && attachments.length > 0) {
        for (const attachment of attachments) {
          const formData = new FormData()
          formData.append('chat_id', address)
          formData.append('caption', message)
          const buffer = Buffer.from(attachment.content, 'base64')
          if (!buffer) throw new Error('Failed to create buffer from base64 string')
          formData.append('document', new Blob([buffer]), attachment.filename)
          await axios.post(`https://api.telegram.org/bot${apiToken}/sendDocument`, formData, {
            headers: {
              'Content-Type': `multipart/form-data boundary=${formData._boundary}`,
            },
          })
        }
      } else {
        await axios.post(`https://api.telegram.org/bot${apiToken}/sendMessage`, {
          chat_id: address,
          text: message,
        })
      }
      console.log('Message sent successfully')
      return true
    } catch (error) {
      console.error('Error sending Telegram message:', error.message)
      return false
    }
  }
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
    text: body.message,
    attachments,
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
  const { addresses, message, attachments } = body
  const apiToken = process.env.SIGNAL_BOT_TOKEN

  for (const address of addresses) {
    try {
      if (attachments && attachments.length > 0) {
        for (const attachment of attachments) {
          const formData = new FormData()
          formData.append('chat_id', address)
          formData.append('caption', message)
          const buffer = Buffer.from(attachment.content, 'base64')
          if (!buffer) throw new Error('Failed to create buffer from base64 string')
          formData.append('document', new Blob([buffer]), attachment.filename)
          await axios.post(`https://api.signal.org/bot${apiToken}/sendDocument`, formData, {
            headers: {
              'Content-Type': `multipart/form-data boundary=${formData._boundary}`,
            },
          })
        }
      } else {
        await axios.post(`https://api.signal.org/bot${apiToken}/sendMessage`, {
          chat_id: address,
          text: message,
        })
      }
      console.log('Message sent successfully')
      return true
    } catch (error) {
      console.error('Error sending Signal message:', error.message)
      return false
    }
  }
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
