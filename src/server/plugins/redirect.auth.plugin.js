const fp = require('fastify-plugin')
const ipRangeCheck = require('ip-range-check')
require('dotenv').config()

const allowedSubnets = process.env.REDIRECT_ALLOWED_SUBNETS.split(',')

const restrictIPSubnetMiddleware = (req, reply, done) => {
  const clientIP = req.ip
  const CROSSOVER_IP = process.env.CROSSOVER_IP

  if (clientIP === CROSSOVER_IP) {
    const { body, url } = req
    const bodySnippet = body ? JSON.stringify(body).substring(0, 35) : 'No request body'
    const urlSnippet = url ? url.substring(0, 35) : 'No URL'

    console.log(`${new Date()}: Client IP matches CROSSOVER_IP: ${clientIP}`)
    console.log(`First 35 characters of req.body: ${bodySnippet}`)
    console.log(`First 35 characters of req.url: ${urlSnippet}`)
  }

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