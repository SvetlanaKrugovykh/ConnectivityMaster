const Fastify = require('fastify')
const fastifyCors = require('@fastify/cors')
const fastifyHelmet = require('@fastify/helmet')

const authPlugin = require('./plugins/auth.plugin')

const app = Fastify({
  trustProxy: true
})

app.register(fastifyHelmet, { global: true })

app.register(fastifyCors, {
  origin: '*',
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Accept',
    'Content-Type',
    'Authorization'
  ],
  methods: ['GET', 'PUT', 'OPTIONS', 'POST', 'DELETE']
})

app.register(authPlugin)
app.register(require('./routes/abonents.js'))


module.exports = app
