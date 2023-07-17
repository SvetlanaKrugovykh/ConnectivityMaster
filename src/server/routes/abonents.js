const abonentsController = require('../controllers/abonentsController')
const isAuthorizedGuard = require('../guards/is-authorized.guard')
const abonentSwitchOffSchema = require('../schemas/abonent-switch-off.schema')

module.exports = (fastify, _opts, done) => {
  fastify.route({
    method: 'POST',
    url: '/abonents/switch-off/',
    handler: abonentsController.abonentSwitchOff,
    // preHandler: [
    //   isAuthorizedGuard
    // ],
    schema: abonentSwitchOffSchema
  })

  done()
}
