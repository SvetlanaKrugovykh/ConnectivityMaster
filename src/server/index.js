const Fastify = require('fastify')
const authPlugin = require('./plugins/auth.plugin')
const httpProxy = require('@fastify/http-proxy')

const app = Fastify({
  trustProxy: true
})

const redirectServer = Fastify({
  trustProxy: true
})

redirectServer.register(httpProxy, {
  upstream: process.env.UPSTREAM_URL,
  prefix: '/',
  http2: false
})

redirectServer.all('/', async (request, reply) => {
  try {
    const proxyResponse = await redirectServer.proxy(request.raw)
    reply.send(proxyResponse)
  } catch (error) {
    console.error(error)
  }
})

app.register(authPlugin)
app.register(require('./routes/abonents.js'))


module.exports = { app, redirectServer }
