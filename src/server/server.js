require('dotenv').config()
const { app, redirectServer, redirectApiServer } = require('./index')
const HOST = process.env.HOST || '127.0.0.1'

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

redirectApiServer.listen({ port: process.env.PORT_FOR_REDIRECT_API || 8082, host: HOST }, (err, address) => {
  if (err) {
    redirectApiServer.log.error(err)
    console.error(err)
  }
  console.log(`${new Date()}:[Redirect API] Service listening on ${address}`)
})
