const abonentsController = require('../controllers/abonentsController')
const mrtgController = require('../controllers/mrtgController')
const isAuthorizedGuard = require('../guards/is-authorized.guard')
const abonentSwitchOffSchema = require('../schemas/abonent-switch-off.schema')
const abonentSwitchRedirSchema = require('../schemas/abonent-switch-redir.schema')
const abonentArpSchema = require('../schemas/abonent-arp.schema')
const abonentRedirClientOnSchema = require('../schemas/abonent-redir-client-on.schema')
const abonentSendMessageSchema = require('../schemas/abonent-send-message.schema')

module.exports = (fastify, _opts, done) => {
  fastify.route({
    method: 'POST',
    url: '/abonents/switch-off/',
    handler: abonentsController.abonentSwitchOff,
    preHandler: [
      isAuthorizedGuard
    ],
    schema: abonentSwitchOffSchema
  })

  fastify.route({
    method: 'POST',
    url: '/abonents/mrtg-report/',
    handler: mrtgController.getMrtg,
    preHandler: [
      isAuthorizedGuard
    ],
    schema: abonentSwitchOffSchema
  })

  fastify.route({
    method: 'POST',
    url: '/abonents/switch-redir/',
    handler: abonentsController.abonentSwitchRedir,
    preHandler: [
      isAuthorizedGuard
    ],
    schema: abonentSwitchRedirSchema
  })

  fastify.route({
    method: 'POST',
    url: '/abonents/switch-redir-redir-client-on/',
    handler: abonentsController.abonentSwitchRedirectedOn,
    preHandler: [
      isAuthorizedGuard
    ],
    schema: abonentRedirClientOnSchema
  })

  fastify.route({
    method: 'POST',
    url: '/abonents/switch-on/',
    handler: abonentsController.abonentSwitchOn,
    preHandler: [
      isAuthorizedGuard
    ],
    schema: abonentSwitchOffSchema
  })

  fastify.route({
    method: 'POST',
    url: '/abonents/fwd-off/',
    handler: abonentsController.abonentFwdOff,
    preHandler: [
      isAuthorizedGuard
    ],
    schema: abonentSwitchOffSchema
  })

  fastify.route({
    method: 'POST',
    url: '/abonents/fwd-on/',
    handler: abonentsController.abonentFwdOn,
    preHandler: [
      isAuthorizedGuard
    ],
    schema: abonentSwitchOffSchema
  })

  fastify.route({
    method: 'POST',
    url: '/abonents/get-arp-mac/',
    handler: abonentsController.getArpMac,
    preHandler: [
      isAuthorizedGuard
    ],
    schema: abonentArpSchema
  })

  fastify.route({
    method: 'POST',
    url: '/abonents/send-message/',
    handler: abonentsController.abonentSendMessage,
    preHandler: [
      isAuthorizedGuard
    ],
    schema: abonentSendMessageSchema
  })

  done()
}

