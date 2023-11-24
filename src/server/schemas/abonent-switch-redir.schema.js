module.exports = {
  description: 'Switch redir abonent by ips',
  tags: ['abonents'],
  summary: 'Switch redir abonent by ips',
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
      ipAddresses: { type: 'array' },
      vlanId: { type: 'string' }
    },
    required: ['ipAddresses', 'vlanId']
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
