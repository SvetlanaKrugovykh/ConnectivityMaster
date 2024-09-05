// linkPay.route.js
const linkPayController = require('../controllers/linkPayController')
const isPayAuthorizedGuard = require('../guards/is-pay-authorized.guard')
const liqPaySchema = require('../schemas/link-pay.schema')

module.exports = (fastify, _opts, done) => {

  fastify.route({
    method: 'POST',
    url: '/get-pay-link/',
    handler: linkPayController.getLinkPay,
    preHandler: [
      // isPayAuthorizedGuard
    ],
    // schema: liqPaySchema
  })
  done()
}