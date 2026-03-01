const fp = require('fastify-plugin')
require('dotenv').config()
const authService = require('../services/authService')

const allowedIPAddresses = process.env.API_ALLOWED_IPS.split(',')

const extractTokenFromHeader = (authorizationHeader) => {
  if (!authorizationHeader || typeof authorizationHeader !== 'string') {
    return null
  }

  const trimmedHeader = authorizationHeader.trim()
  if (!trimmedHeader) {
    return null
  }

  if (/^Bearer\s+/i.test(trimmedHeader)) {
    return trimmedHeader.replace(/^Bearer\s+/i, '').trim()
  }

  return trimmedHeader
}

const restrictIPMiddleware = (req, reply, done) => {
  const clientIP = req.ip
  const monitoringServerIP = process.env.MONITORING_SERVER_IP;
  // if (!allowedIPAddresses.includes(clientIP)) {
  if (clientIP !== monitoringServerIP) {
    console.log(`${new Date()}: Forbidden IP: ${clientIP}`)
  }
  // reply.code(403).send('Forbidden')
  // } else {
  if (clientIP !== monitoringServerIP) {
    console.log(`${new Date()}:Client IP is allowed: ${clientIP}`)
  }
  done()
  // }
}

async function authPlugin(fastify, _ = {}) {
  fastify.decorateRequest('auth', null)

  fastify.addHook('onRequest', restrictIPMiddleware)

  fastify.addHook('onRequest', async (request, _) => {
    const { authorization } = request.headers

    request.auth = {
      token: null,
      clientId: null
    }

    if (authorization) {
      try {
        const token = extractTokenFromHeader(authorization)
        const decoded = token ? await authService.checkAccessToken(token) : null

        if (decoded?.clientId) {
          request.auth = {
            token,
            clientId: decoded.clientId
          }
        }
      } catch (e) {
        console.log(e)
      }
    }
  })
}

module.exports = fp(authPlugin)
