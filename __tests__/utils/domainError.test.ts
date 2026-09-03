import { toDomainError } from '@utils/domainError';

describe('toDomainError', () => {
  it('exposes a nested canonical API code to feature controllers', () => {
    const error = {
      response: {
        status: 409,
        data: {
          error: {
            version: '1',
            code: 'IMPORT_IN_PROGRESS',
            message: 'Server is busy. Please try again.',
            statusCode: 409,
            timestamp: '2026-08-31T00:00:00.000Z',
            path: '/gmail/import',
            method: 'POST',
            requestId: '11111111-1111-4111-8111-111111111111',
          },
        },
      },
    };

    expect(toDomainError(error)).toMatchObject({
      code: 'IMPORT_IN_PROGRESS',
      kind: 'server',
    });
  });
});
