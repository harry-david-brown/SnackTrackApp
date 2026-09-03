import {
  authFailureMessage,
  isTerminalSessionError,
  verificationCodeFailure,
  verificationCodeMessage,
} from '@features/auth/contracts';

const error = (code: string, retryable = false) => ({
  code,
  message: 'server message',
  retryable,
  kind: retryable ? 'network' as const : 'validation' as const,
});

describe('authentication recovery contracts', () => {
  it('maps stable credential codes without inspecting server prose', () => {
    expect(authFailureMessage(error('ACCOUNT_ALREADY_EXISTS'), 'register')).toContain('already exists');
    expect(authFailureMessage(error('INVALID_CREDENTIALS'), 'login')).toContain('Invalid email or password');
    expect(authFailureMessage(error('PROVIDER_AUTH_FAILED'), 'provider')).toContain('could not be completed');
  });

  it('distinguishes terminal session failures from temporary transport failures', () => {
    expect(isTerminalSessionError('REFRESH_TOKEN_REVOKED')).toBe(true);
    expect(isTerminalSessionError('REFRESH_TOKEN_EXPIRED')).toBe(true);
    expect(isTerminalSessionError('NETWORK_ERROR')).toBe(false);
    expect(isTerminalSessionError(null)).toBe(false);
  });

  it('maps verification codes to explicit invalid, expired, and retryable states', () => {
    expect(verificationCodeFailure(error('VERIFICATION_CODE_INVALID'))).toBe('invalid');
    expect(verificationCodeFailure(error('VERIFICATION_CODE_NOT_PENDING'))).toBe('expired');
    expect(verificationCodeFailure(error('DATABASE_UNAVAILABLE', true))).toBe('retryable');
    expect(verificationCodeMessage('expired', 'reset')).toContain('Request a new code');
  });
});
