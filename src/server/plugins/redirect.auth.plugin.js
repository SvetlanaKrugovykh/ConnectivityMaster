const fp = require('fastify-plugin')
const ipRangeCheck = require('ip-range-check')
require('dotenv').config()

const allowedSubnets = process.env.REDIRECT_ALLOWED_SUBNETS.split(',')

const restrictIPSubnetMiddleware = (req, reply, done) => {
  const clientIP = req.ip
  if (!ipRangeCheck(clientIP, allowedSubnets)) {
    console.log(`Client IP is not allowed: ${clientIP}`)
    reply.code(403).send('Forbidden')
  } else {
    console.log(`Client IP is allowed: ${clientIP}`)
    done()
  }
}

async function redirectPlugin(fastify, _ = {}) {
  fastify.addHook('preHandler', restrictIPSubnetMiddleware)
}

module.exports = fp(redirectPlugin)