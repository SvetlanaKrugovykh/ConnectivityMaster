const Fastify = require('fastify')
const cors = require('@fastify/cors')
const https = require('https')
const authPlugin = require('./plugins/app.auth.plugin')
const redirectPlugin = require('./plugins/redirect.auth.plugin')
const linkPayPlugin = require('./plugins/link-pay.plugin')
const httpProxy = require('@fastify/http-proxy')
const { netWatchStarter, mrtgWatchStarter, logAnaliseStarter } = require('./services/netWatchService')
const fs = require('fs')
const path = require('path')

const credentials = {
  key: fs.readFileSync(path.resolve(__dirname, '../../path/to/key.pem')),
  cert: fs.readFileSync(path.resolve(__dirname, '../../path/to/certificate.pem'))
}

const credentials_gate = {
  key: fs.readFileSync(path.resolve(__dirname, '../../path/to/key_gate.pem')),
  cert: fs.readFileSync(path.resolve(__dirname, '../../path/to/certificate_gate.pem'))
}

const app = Fastify({
  trustProxy: true
})

const redirectServer = Fastify({
  trustProxy: true,
  https: credentials_gate
})

const getUrls = Fastify({
  trustProxy: true,
})

const redirectApiServer = Fastify({
  trustProxy: true,
  https: credentials_gate,
})

const app_gate = Fastify({
  trustProxy: true,
  https: credentials_gate
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

redirectApiServer.register(cors, {
  origin: '*',
  methods: ['GET']
})
redirectApiServer.register(redirectPlugin)
redirectApiServer.register(require('./routes/redirectApi.route'), { prefix: '/redirect-api' })

getUrls.register(linkPayPlugin)
getUrls.register(require('./routes/linkPay.route'), { prefix: '/get-urls' })

if (process.env.NETWATCHING_ENABLED === 'true') {
  netWatchStarter()
}

if (process.env.MRTG_WATCHING_ENABLED === 'true') {
  mrtgWatchStarter()
}

logAnaliseStarter()

app_gate.register(cors, {
  origin: '*', // Adjust as needed
  methods: ['GET', 'POST', 'OPTIONS'], // Include OPTIONS if needed
})
app_gate.register(authPlugin)
app_gate.register(require('@fastify/formbody'))
app_gate.register(require('./routes/callback.route'), { prefix: '/api/liqpay/callback' })


module.exports = { app, getUrls, app_gate, redirectServer, redirectApiServer, credentials, credentials_gate }
