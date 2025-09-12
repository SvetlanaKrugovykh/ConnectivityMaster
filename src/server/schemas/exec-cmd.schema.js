module.exports = {
  description: 'execute command on server',
  tags: ['exec'],
  summary: 'Execute command on server',
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
      abonentId: { type: 'string' },
      ipAddress: { type: 'string' },
      vlanId: { type: 'string' }
    },
    required: ['cmdText']
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
