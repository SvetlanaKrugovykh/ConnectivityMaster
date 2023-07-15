const HttpError = require('http-errors')

module.exports = function (request, _reply, done) {
  if (!request.auth.userId || !request.auth.shopId) {
    throw new HttpError.Unauthorized('Authorization required')
  }

  done()
}
