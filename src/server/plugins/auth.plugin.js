const fp = require('fastify-plugin')

async function authPlugin(fastify, _ = {}) {
  fastify.decorateRequest('auth', null)

  fastify.addHook('onRequest', async (request, _) => {
    const { authorization } = request.headers

    request.auth = {
      token: null,
      userId: null
    }

    if (authorization) {
      try {
        request.auth = {
          token: authorization
        }
      } catch (e) {
        console.log(e)
      }
    }
  })
}

module.exports = fp(authPlugin)
