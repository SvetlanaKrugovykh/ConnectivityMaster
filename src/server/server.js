require('dotenv').config()
const { app, app_gate, redirectServer, redirectApiServer, credentials } = require('./index')
const HOST = process.env.HOST || '127.0.0.1'
const API_GATE_PORT = process.env.API_GATE_PORT || 8083
const API_GATE_HOST = process.env.API_GATE_HOST || '127.0.0.1'

app.listen({ port: process.env.PORT || 8080, host: HOST }, (err, address) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }

  console.log(`${new Date()}:[API] Service listening on ${address}`)
})

redirectServer.listen({ port: process.env.PORT_FOR_REDIRECT || 8081, host: HOST }, (err, address) => {
  if (err) {
    redirectServer.log.error(err)
    console.error(err)
  }
  console.log(`${new Date()}:[Redirect] Service listening on ${address}`)
})

redirectApiServer.listen(
  {
    port: process.env.PORT_FOR_REDIRECT_API || 8082,
    host: HOST,
    https: credentials
  },
  (err, address) => {
    if (err) {
      redirectApiServer.log.error(err)
      console.error(err)
    }
    console.log(`${new Date()}:[Redirect API] Service listening on ${address}`)
  })

app_gate.listen({ port: API_GATE_PORT, host: API_GATE_HOST }, (err, address) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
  console.log(`server app_api started on ${address}`)
})