const HttpError = require('http-errors')

module.exports = function (request, _reply, done) {
  if (!request.auth.userId) {
    //throw new HttpError.Unauthorized('Authorization required')
    //TODO: rewrite this for this project
  }

  done()
}
