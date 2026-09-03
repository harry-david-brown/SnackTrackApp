export type ApiClientErrorKind = 'network' | 'validation' | 'server' | 'unknown';

interface ApiClientErrorOptions {
  readonly code: string;
  readonly message: string;
  readonly kind: ApiClientErrorKind;
  readonly retryable: boolean;
  readonly statusCode?: number;
  readonly details?: unknown;
  readonly cause?: unknown;
}

export class ApiClientError extends Error {
  readonly code: string;
  readonly kind: ApiClientErrorKind;
  readonly retryable: boolean;
  readonly statusCode?: number;
  readonly details?: unknown;
  readonly cause?: unknown;

  constructor(options: ApiClientErrorOptions) {
    super(options.message);
    this.name = 'ApiClientError';
    this.code = options.code;
    this.kind = options.kind;
    this.retryable = options.retryable;
    this.statusCode = options.statusCode;
    this.details = options.details;
    this.cause = options.cause;
  }
}

type UnknownRecord = Record<string, unknown>;

interface ParsedErrorEnvelopeV1 {
  readonly code: string;
  readonly message: string;
  readonly statusCode: number;
  readonly details?: unknown;
}

const record = (value: unknown): UnknownRecord | null => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as UnknownRecord
    : null
);

const genericMessage = (statusCode?: number): string => {
  if (statusCode === 401) return 'Authentication required. Please log in again.';
  if (statusCode === 403) return 'You do not have permission to perform this action.';
  if (statusCode === 404) return 'The requested resource was not found.';
  if (statusCode === 429) return 'Server is busy. Please wait a moment and try again.';
  if (statusCode !== undefined && statusCode >= 500) {
    return 'Service temporarily unavailable. Please try again in a few minutes.';
  }
  return 'Invalid request. Please check your input and try again.';
};

const kindForStatus = (statusCode?: number): ApiClientErrorKind => {
  if (statusCode === undefined) return 'unknown';
  return statusCode >= 500 || statusCode === 429 || statusCode === 409
    ? 'server'
    : 'validation';
};

const retryable = (statusCode: number | undefined, code: string): boolean => (
  statusCode === 429
  || (statusCode !== undefined && statusCode >= 500)
  || code === 'IMPORT_IN_PROGRESS'
  || code === 'TRACKING_NOT_AVAILABLE'
  || code === 'EXPORT_ALREADY_PROCESSING'
  || code === 'GMAIL_VALIDATION_UNAVAILABLE'
);

const parseResponseData = (value: unknown): UnknownRecord | null => {
  if (typeof value !== 'string') return record(value);
  try {
    return record(JSON.parse(value));
  } catch {
    return null;
  }
};

const parseErrorEnvelopeV1 = (
  value: unknown,
  responseStatus?: number,
): ParsedErrorEnvelopeV1 | null => {
  const envelope = record(value);
  if (
    envelope?.version !== '1'
    || typeof envelope.code !== 'string'
    || envelope.code.trim().length === 0
    || typeof envelope.message !== 'string'
    || envelope.message.trim().length === 0
    || typeof envelope.statusCode !== 'number'
    || !Number.isInteger(envelope.statusCode)
    || envelope.statusCode < 400
    || envelope.statusCode > 599
    || (responseStatus !== undefined && envelope.statusCode !== responseStatus)
    || typeof envelope.timestamp !== 'string'
    || Number.isNaN(Date.parse(envelope.timestamp))
    || typeof envelope.path !== 'string'
    || !envelope.path.startsWith('/')
    || typeof envelope.method !== 'string'
    || envelope.method.trim().length === 0
    || typeof envelope.requestId !== 'string'
    || envelope.requestId.trim().length === 0
  ) {
    return null;
  }
  return {
    code: envelope.code,
    message: envelope.message,
    statusCode: envelope.statusCode,
    ...(envelope.details !== undefined ? { details: envelope.details } : {}),
  };
};

/** Converts Axios and envelope failures into the only error shape exposed by the API client. */
export const toApiClientError = (input: unknown): ApiClientError => {
  if (input instanceof ApiClientError) return input;

  const root = record(input);
  const rootCode = typeof root?.code === 'string' ? root.code : undefined;
  if (rootCode === 'ECONNABORTED') {
    return new ApiClientError({
      code: 'REQUEST_TIMEOUT',
      message: 'Request timed out. Please try again.',
      kind: 'network',
      retryable: true,
      cause: input,
    });
  }
  if (rootCode === 'NETWORK_ERROR' || root?.message === 'Network Error' || !root?.response) {
    return new ApiClientError({
      code: rootCode ?? 'NETWORK_ERROR',
      message: root?.message === 'Network Error'
        ? 'Unable to connect to the server. Please check your internet connection.'
        : 'An unexpected error occurred. Please try again.',
      kind: root?.message === 'Network Error' || rootCode === 'NETWORK_ERROR' ? 'network' : 'unknown',
      retryable: root?.message === 'Network Error' || rootCode === 'NETWORK_ERROR',
      cause: input,
    });
  }

  const response = record(root.response);
  const statusCode = typeof response?.status === 'number' ? response.status : undefined;
  const data = parseResponseData(response?.data);
  const envelope = parseErrorEnvelopeV1(data?.error, statusCode);
  const code = envelope?.code ?? `HTTP_${statusCode ?? 'ERROR'}`;
  const message = envelope?.message ?? genericMessage(statusCode);

  return new ApiClientError({
    code,
    message,
    kind: kindForStatus(statusCode),
    retryable: retryable(statusCode, code),
    statusCode,
    details: envelope?.details,
    cause: input,
  });
};

export const sessionExpiredError = (cause?: unknown): ApiClientError => new ApiClientError({
  code: 'SESSION_EXPIRED',
  message: 'Your session has expired. Please log in again.',
  kind: 'validation',
  retryable: false,
  statusCode: 401,
  cause,
});
