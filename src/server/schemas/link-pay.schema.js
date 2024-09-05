module.exports = {
  description: 'Create record with abbreviation, payment_code, and amount',
  tags: ['records'],
  summary: 'Create new record',
  headers: {
    type: 'object',
    properties: {
    },
  },
  body: {
    type: 'object',
    properties: {
      abbreviation: { type: 'string' },
      contract: { type: 'string' },
      amount: { type: 'number' }
    },
    required: ['abbreviation', 'payment_code', 'amount']
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
