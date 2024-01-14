module.exports = {
  description: 'abonent-send-message.schema',
  tags: ['abonents'],
  summary: 'send-message',
  headers: {
    type: 'object',
    properties: {
      Authorization: { type: 'string' }
    },
    required: ['Authorization']
  },
  body: {
    type: 'object',
    properties: {
      addresses: { type: 'array' },
      message: { type: 'string' },
      type: { type: 'string' }
    },
    required: ['addresses', 'message', 'type']
  },
  response: {
    201: {
      description: 'Successful response',
      type: 'object',
      properties: {
        success: { type: 'boolean' }
      }
    },
    500: {
      description: 'Internal server error',
      type: 'object',
      properties: {
        statusCode: { type: 'integer' },
        error: { type: 'string' },
        message: { type: 'string' }
      }
    }
  }
}
