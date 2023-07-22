const fp = require('fastify-plugin')
require('dotenv').config()

const allowedIPAddresses = process.env.API_ALLOWED_IPS.split(',')

const restrictIPMiddleware = (req, reply, done) => {
  const clientIP = req.ip
  if (!allowedIPAddresses.includes(clientIP)) {
    reply.code(403).send('Forbidden')
  } else {
    done()
  }
}

async function authPlugin(fastify, _ = {}) {
  fastify.decorateRequest('auth', null)

  fastify.addHook('onRequest', restrictIPMiddleware)

  fastify.addHook('onRequest', async (request, _) => {
    const { authorization } = request.headers

    request.auth = {
      token: null,
      userId: null
    }

    if (authorization) {
      try {
        request.auth = {
          token: authorization
        }
      } catch (e) {
        console.log(e)
      }
    }
  })
}

module.exports = fp(authPlugin)
