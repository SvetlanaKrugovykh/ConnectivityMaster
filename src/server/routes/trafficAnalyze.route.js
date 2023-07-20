const trafficAnalyzeController = require('../controllers/trafficAnalyzeController')
const isAuthorizedGuard = require('../guards/is-authorized.guard')
const trafficAnalyzeSchema = require('../schemas/traffic-analyze.schema')

module.exports = (fastify, _opts, done) => {
  fastify.route({
    method: 'POST',
    url: '/trafficAnalyze/log-saving/',
    handler: trafficAnalyzeController.logSaving,
    // preHandler: [
    //   isAuthorizedGuard
    // ],
    schema: trafficAnalyzeSchema
  })

  fastify.route({
    method: 'POST',
    url: '/trafficAnalyze/get-logs/',
    handler: trafficAnalyzeController.getLogs,
    // preHandler: [
    //   isAuthorizedGuard
    // ],
    schema: trafficAnalyzeSchema
  })

  fastify.route({
    method: 'POST',
    url: '/trafficAnalyze/rem-collection/',
    handler: trafficAnalyzeController.removeCollection,
    // preHandler: [
    //   isAuthorizedGuard
    // ],
    schema: trafficAnalyzeSchema
  })

  done()
}

