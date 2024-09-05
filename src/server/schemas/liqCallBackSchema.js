module.exports = {
  description: 'LiqPay Callback Endpoint',
  tags: ['callback'],
  summary: 'Handle LiqPay callback with payment details and signature',
  body: {
    type: 'object',
    properties: {
      data: { type: 'string' },
      signature: { type: 'string' }
    },
    required: ['data', 'signature']
  },
  response: {
    200: {
      description: 'Successful response',
      type: 'object',
      properties: {
        success: { type: 'boolean' }
      }
    },
    400: {
      description: 'Bad Request',
      type: 'object',
      properties: {
        statusCode: { type: 'integer' },
        error: { type: 'string' },
        message: { type: 'string' }
      }
    },
    500: {
      description: 'Internal Server Error',
      type: 'object',
      properties: {
        statusCode: { type: 'integer' },
        error: { type: 'string' },
        message: { type: 'string' }
      }
    }
  },
  consumes: ['application/x-www-form-urlencoded']
}
