const callbackController = require('../controllers/callbackController')
const isLiqAuthorizedGuard = require('../guards/is-lic-authorized.guard')
const liqCallBackSchema = require('../schemas/liqCallBackSchema')

module.exports = (fastify, _opts, done) => {

  fastify.route({
    method: 'POST',
    url: '/kf/',
    handler: callbackController.getCallback('kf'),
    preHandler: [
      isLiqAuthorizedGuard
    ],
    schema: liqCallBackSchema
  })

  fastify.route({
    method: 'POST',
    url: '/lev/',
    handler: callbackController.getCallback('lev'),
    preHandler: [
      isLiqAuthorizedGuard
    ],
    schema: liqCallBackSchema
  })

  fastify.route({
    method: 'POST',
    url: '/pf/',
    handler: callbackController.getCallback('pf'),
    preHandler: [
      isLiqAuthorizedGuard
    ],
    schema: liqCallBackSchema
  })

  fastify.route({
    method: 'POST',
    url: '/si/',
    handler: callbackController.getCallback('si'),
    preHandler: [
      isLiqAuthorizedGuard
    ],
    schema: liqCallBackSchema
  })

  done()
}