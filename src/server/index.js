const Fastify = require('fastify')
const authPlugin = require('./plugins/app.auth.plugin')
const redirectPlugin = require('./plugins/redirect.auth.plugin')
const httpProxy = require('@fastify/http-proxy')
const { netWatchStarter } = require('./services/netWatchService')

const app = Fastify({
  trustProxy: true
})

const redirectServer = Fastify({
  trustProxy: true
})

const redirectApiServer = Fastify({
  trustProxy: true,
})

redirectServer.register(httpProxy, {
  upstream: process.env.UPSTREAM_URL,
  prefix: '/',
  http2: false
})

redirectServer.all('/redirect', async (request, reply) => {
  try {
    const proxyResponse = await redirectServer.proxy(request.raw)
    reply.send(proxyResponse)
  } catch (error) {
    console.error(error)
  }
})


app.register(authPlugin)
app.register(require('./routes/auth.route'), { prefix: '/api' })
app.register(require('./routes/abonents.route'), { prefix: '/api' })
app.register(require('./routes/trafficAnalyze.route'), { prefix: '/api' })

redirectServer.register(redirectPlugin)

redirectApiServer.register(redirectPlugin)
redirectApiServer.register(require('./routes/redirectApi.route'), { prefix: '/redirect-api' })

if (process.env.NETWATCHING_ENABLED === 'true') {
  netWatchStarter()
}

module.exports = { app, redirectServer, redirectApiServer }
