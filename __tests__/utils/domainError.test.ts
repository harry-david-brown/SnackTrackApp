import { toDomainError } from '@utils/domainError';

describe('toDomainError', () => {
  it('exposes a nested canonical API code to feature controllers', () => {
    const error = {
      response: {
        status: 409,
        data: {
          error: {
            code: 'IMPORT_IN_PROGRESS',
            message: 'Server is busy. Please try again.',
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
