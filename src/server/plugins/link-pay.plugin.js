const fp = require('fastify-plugin')
require('dotenv').config()

const allowedIPAddresses = process.env.LINK_PAY_ALLOWED_IPS.split(',')

const restrictIPMiddleware = (req, reply, done) => {
  const clientIP = req.ip
  if (!allowedIPAddresses.includes(clientIP)) {
    console.log(`${new Date()}: Forbidden IP: ${clientIP}`)
    reply.code(403).send('Forbidden')
  } else {
    done()
  }
}

async function ipPlugin(fastify, _ = {}) {
  fastify.decorateRequest('auth', null)

  fastify.addHook('onRequest', restrictIPMiddleware)

}

module.exports = fp(ipPlugin)