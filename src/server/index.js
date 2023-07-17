const Fastify = require('fastify')
const authPlugin = require('./plugins/auth.plugin')

const app = Fastify({
  trustProxy: true
})

app.register(authPlugin)
app.register(require('./routes/abonents.js'))


module.exports = app
