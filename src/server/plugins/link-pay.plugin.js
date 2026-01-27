const fp = require('fastify-plugin')
require('dotenv').config()

const allowedIPAddresses = process.env.LINK_PAY_ALLOWED_IPS.split(',')

const restrictIPMiddleware = (req, reply, done) => {
  const clientIP = req.ip
  const monitoringServerIP = process.env.MONITORING_SERVER_IP;
  if (!allowedIPAddresses.includes(clientIP)) {
    if (clientIP !== monitoringServerIP) {
      console.log(`${new Date()}: Forbidden IP: ${clientIP}`)
    }
    reply.code(403).send('Forbidden')
  } else {
    if (clientIP !== monitoringServerIP) {
      console.log(`${new Date()}:Client IP is allowed: ${clientIP}`)
    }
    done()
  }
}

async function ipPlugin(fastify, _ = {}) {
  fastify.decorateRequest('auth', null)

  fastify.addHook('onRequest', restrictIPMiddleware)

}

module.exports = fp(ipPlugin)