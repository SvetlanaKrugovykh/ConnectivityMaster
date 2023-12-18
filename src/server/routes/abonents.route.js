const abonentsController = require('../controllers/abonentsController')
const isAuthorizedGuard = require('../guards/is-authorized.guard')
const abonentSwitchOffSchema = require('../schemas/abonent-switch-off.schema')
const abonentSwitchRedirSchema = require('../schemas/abonent-switch-redir.schema')
const abonentSwitchRedirClientOnSchema = require('../schemas/abonent-switch-redir-client-on.schema')
const abonentArpSchema = require('../schemas/abonent-arp.schema')
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
    schema: abonentSwitchRedirClientOnSchema
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

  done()
}

