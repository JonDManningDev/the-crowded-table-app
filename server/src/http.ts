export const errorResponse = {
  type: 'object',
  required: ['code', 'requestId'],
  properties: { code: { type: 'string' }, requestId: { type: 'string' } },
} as const
