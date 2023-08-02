const fp = require('fastify-plugin')
const ipRangeCheck = require('ip-range-check')
require('dotenv').config()

const allowedSubnets = process.env.REDIRECT_ALLOWED_SUBNETS.split(',')

const restrictIPSubnetMiddleware = (req, reply, done) => {
  const clientIP = req.ip
  if (!ipRangeCheck(clientIP, allowedSubnets)) {
    console.log(`${new Date()}: Client IP is Forbidden: ${clientIP}`)
    reply.code(403).send('Forbidden')
  } else {
    console.log(`${new Date()}:Client IP is allowed: ${clientIP}`)
    done()
  }
}

async function redirectPlugin(fastify, _ = {}) {
  fastify.addHook('preHandler', restrictIPSubnetMiddleware)
}

module.exports = fp(redirectPlugin)