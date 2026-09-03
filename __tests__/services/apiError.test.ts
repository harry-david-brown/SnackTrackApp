import { ApiClientError, sessionExpiredError, toApiClientError } from '@services/api/apiError';
import { errorEnvelopeFixture } from '@/__tests__/fixtures/contracts';

describe('API client error boundary', () => {
  it('validates and exposes the canonical version-one envelope', () => {
    const conflictEnvelope = {
      ...errorEnvelopeFixture,
      error: {
        ...errorEnvelopeFixture.error,
        code: 'IMPORT_IN_PROGRESS',
        message: 'A receipt import is already running.',
        statusCode: 409,
        path: '/gmail/import',
      },
    };
    const error = toApiClientError({
      response: {
        status: 409,
        data: conflictEnvelope,
      },
    });

    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({
      code: 'IMPORT_IN_PROGRESS',
      statusCode: 409,
      kind: 'server',
      retryable: true,
    });
  });

  it('does not trust a malformed object that merely contains a nested code', () => {
    const error = toApiClientError({
      response: {
        status: 409,
        data: { error: { code: 'GMAIL_RECONNECT_REQUIRED', message: 'Reconnect' } },
      },
    });

    expect(error.code).toBe('HTTP_409');
    expect(error.message).toContain('Invalid request');
  });

  it('keeps temporary provider validation distinct from reconnect-required', () => {
    const unavailable = toApiClientError({
      response: {
        status: 503,
        data: {
          error: {
            version: '1',
            code: 'GMAIL_VALIDATION_UNAVAILABLE',
            message: 'Gmail could not be reached.',
            statusCode: 503,
            timestamp: '2026-08-31T00:00:00.000Z',
            path: '/gmail/status',
            method: 'GET',
            requestId: '22222222-2222-4222-8222-222222222222',
          },
        },
      },
    });
    const reconnect = toApiClientError({
      response: {
        status: 409,
        data: {
          error: {
            version: '1',
            code: 'GMAIL_RECONNECT_REQUIRED',
            message: 'Reconnect Gmail.',
            statusCode: 409,
            timestamp: '2026-08-31T00:00:00.000Z',
            path: '/gmail/import',
            method: 'POST',
            requestId: '33333333-3333-4333-8333-333333333333',
          },
        },
      },
    });

    expect(unavailable.retryable).toBe(true);
    expect(reconnect.retryable).toBe(false);
  });

  it('rejects an envelope whose status disagrees with the HTTP response', () => {
    const error = toApiClientError({
      response: {
        status: 500,
        data: {
          error: {
            version: '1',
            code: 'VALIDATION_ERROR',
            message: 'Do not trust this payload.',
            statusCode: 400,
            timestamp: '2026-08-31T00:00:00.000Z',
            path: '/receipts',
            method: 'GET',
            requestId: '44444444-4444-4444-8444-444444444444',
          },
        },
      },
    });

    expect(error.code).toBe('HTTP_500');
    expect(error.message).toContain('temporarily unavailable');
  });

  it('uses an explicit terminal session error only after refresh exhaustion', () => {
    expect(sessionExpiredError()).toMatchObject({
      code: 'SESSION_EXPIRED',
      statusCode: 401,
      retryable: false,
    });
  });
});
