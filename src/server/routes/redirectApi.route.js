const redirectApiController = require('../controllers/redirectApiController')
//const redirectGuard = require('../guards/is-authorized.guard')
//const abonentSwitchOffSchema = require('../schemas/abonent-switch-off.schema')ipAddress

module.exports = (fastify, _opts, done) => {
  fastify.route({
    method: 'POST',
    url: '/get-invoice/',
    handler: redirectApiController.getInvoice,
    preHandler: [
    ],
  })

  fastify.route({
    method: 'POST',
    url: '/service-go-on/',
    handler: redirectApiController.abonentServiceContinue,
    preHandler: [
    ],
  })

  done()
}
