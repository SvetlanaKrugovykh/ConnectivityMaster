const redirectApiController = require('../controllers/redirectApiController')

module.exports = (fastify, _opts, done) => {
  fastify.route({
    method: 'GET',
    url: '/get-invoice/',
    handler: redirectApiController.getInvoice,
    preHandler: [
    ],
  })

  fastify.route({
    method: 'GET',
    url: '/service-go-on/',
    handler: redirectApiController.abonentServiceContinue,
    preHandler: [],
  })

  fastify.route({
    method: 'GET',
    url: '/get-pay-link/',
    handler: redirectApiController.abonentGetPayLink,
    preHandler: [],
  })

  fastify.route({
    method: 'GET',
    url: '/get-ip/',
    handler: redirectApiController.GetIP,
    preHandler: [],
  })

  done()
}
