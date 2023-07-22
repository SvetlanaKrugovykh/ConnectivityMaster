const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const fs = require('fs')

const serviceAccount = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'))
const secretKey = crypto.createHash('sha256').update(serviceAccount.private_key).digest('hex')

module.exports.createAccessToken = async function (payload) {
  if (process.env.ACCEPT_CREATING_ACCESS_TOKENS === 'true') {
    return jwt.sign(payload, secretKey, { expiresIn: '1h' })
  } else {
    throw new Error('Access token creation is disabled')
  }
}

module.exports.checkAccessToken = async function (token) {
  try {
    return jwt.verify(token, secretKey)
  } catch (err) {
    return null // Token verification failed
  }
}


