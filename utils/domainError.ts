import { parseApiError } from './errorUtils';

export interface DomainError {
  code: string | null;
  message: string;
  retryable: boolean;
  kind: 'network' | 'validation' | 'server' | 'unknown';
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
}

/** Converts transport/provider failures to the safe shape consumed by features. */
export function toDomainError(error: unknown): DomainError {
  const parsed = parseApiError(error);
  const root = asRecord(error);
  const response = asRecord(root?.response);
  const data = asRecord(response?.data);
  const code = typeof data?.code === 'string'
    ? data.code
    : typeof root?.code === 'string' ? root.code : null;
  return {
    code,
    message: parsed.message,
    retryable: parsed.isRetryable,
    kind: parsed.type,
  };
}
