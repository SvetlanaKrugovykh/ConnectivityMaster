require('dotenv').config()
const { app, getUrls, app_gate, redirectServer, redirectApiServer, credentials, credentials_gate } = require('./index')
const HOST = process.env.HOST || '127.0.0.1'
const API_GATE_PORT = Number(process.env.API_GATE_PORT) || 8083
const API_GATE_HOST = process.env.API_GATE_HOST || '127.0.0.1'

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
})
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
})

const updateTables = require('./db/tablesUpdate').updateTables

if (process.env.ENABLE_TRAFFIC_TABLES === 'true') {
  try {
    updateTables()
  } catch (err) {
    console.log(err)
  }
}
console.log('HOST from .env:', process.env.HOST)
console.log('[server.js] ENABLE_ABONENTS:', process.env.ENABLE_ABONENTS)
console.log('[server.js] ENABLE_APP_GATE:', process.env.ENABLE_APP_GATE)
console.log('[server.js] ENABLE_GET_URLS:', process.env.ENABLE_GET_URLS)
console.log('[server.js] ENABLE_REDIRECT_API:', process.env.ENABLE_REDIRECT_API)
console.log('[server.js] ENABLE_TRAFFIC_TABLES:', process.env.ENABLE_TRAFFIC_TABLES)

if (process.env.ENABLE_ABONENTS === 'true') {
  (async () => {
    try {
      console.log('[server.js] Waiting for app.ready()...')
      await app.ready()
      console.log('[server.js] Starting app.listen...')
      const address = await app.listen({ port: process.env.PORT || 8080, host: HOST })
      console.log(`[APP] Service listening on ${address} | ${new Date()}`)
    } catch (err) {
      console.error('[server.js] Server start error:', err)
      process.exit(1)
    }
  })()
}

if (process.env.ENABLE_APP_GATE === 'true') {
  app_gate.listen({ port: API_GATE_PORT || 8004, host: API_GATE_HOST }, (err, address) => {
    if (err) {
      app.log.error(err)
      process.exit(1)
    }
    console.log(`[App-Gate] Service listening on ${address} | ${new Date()}`)
  })
}

if (process.env.ENABLE_GET_URLS === 'true') {
  getUrls.listen({ port: process.env.PORT_FOR_GET_URLS || 8084, host: HOST }, (err, address) => {
    if (err) {
      app.log.error(err)
      process.exit(1)
    }
    console.log(`[Get-Urls] Service listening on ${address} | ${new Date()}`)
  })
}

if (process.env.ENABLE_REDIRECT_API === 'true') {
  redirectApiServer.listen(
    {
      port: process.env.PORT_FOR_REDIRECT_API || 8082,
      host: HOST,
      https: credentials_gate
    },
    (err, address) => {
      if (err) {
        redirectApiServer.log.error(err)
        console.error(err)
      }
      console.log(`[Redirect API] Service listening on ${address} | ${new Date()}`)
    })


  redirectServer.listen({
    port: process.env.PORT_FOR_REDIRECT || 8081, host: HOST,
    https: credentials_gate
  }, (err, address) => {
    if (err) {
      redirectServer.log.error(err)
      console.error(err)
    }
    console.log(`${new Date()}:[Redirect] Service listening on ${address}`)
  })
}