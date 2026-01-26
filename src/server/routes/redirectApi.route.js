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

  // Messenger routes - GET /{channel}/queue/get
  fastify.route({
    method: 'GET',
    url: '/sms/queue/get',
    handler: (request, reply) => {
      request.params.messenger = 'sms'
      return redirectApiController.getMessages(request, reply)
    },
    preHandler: [],
  })

  fastify.route({
    method: 'GET',
    url: '/viber/queue/get',
    handler: (request, reply) => {
      request.params.messenger = 'viber'
      return redirectApiController.getMessages(request, reply)
    },
    preHandler: [],
  })

  fastify.route({
    method: 'GET',
    url: '/whatsapp/queue/get',
    handler: (request, reply) => {
      request.params.messenger = 'whatsapp'
      return redirectApiController.getMessages(request, reply)
    },
    preHandler: [],
  })

  fastify.route({
    method: 'GET',
    url: '/signal/queue/get',
    handler: (request, reply) => {
      request.params.messenger = 'signal'
      return redirectApiController.getMessages(request, reply)
    },
    preHandler: [],
  })

  fastify.route({
    method: 'GET',
    url: '/telegram/queue/get',
    handler: (request, reply) => {
      request.params.messenger = 'telegram'
      return redirectApiController.getMessages(request, reply)
    },
    preHandler: [],
  })

  // Queue completion endpoints - POST /{channel}/queue/complete
  fastify.route({
    method: 'POST',
    url: '/sms/queue/complete',
    handler: redirectApiController.completeQueueTask,
    preHandler: [],
  })

  fastify.route({
    method: 'POST',
    url: '/viber/queue/complete',
    handler: redirectApiController.completeQueueTask,
    preHandler: [],
  })

  fastify.route({
    method: 'POST',
    url: '/whatsapp/queue/complete',
    handler: redirectApiController.completeQueueTask,
    preHandler: [],
  })

  fastify.route({
    method: 'POST',
    url: '/signal/queue/complete',
    handler: redirectApiController.completeQueueTask,
    preHandler: [],
  })

  fastify.route({
    method: 'POST',
    url: '/telegram/queue/complete',
    handler: redirectApiController.completeQueueTask,
    preHandler: [],
  })

  done()
}
