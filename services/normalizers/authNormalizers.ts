import type {
  CompletePasswordResetResponse,
  DeleteAccountResponse,
  LoginResponse,
  LogoutResponse,
  RefreshTokenResponse,
  RegisterResponse,
  RequestPasswordResetResponse,
  SendVerificationEmailResponse,
  VerifyEmailCodeResponse,
  VerifyPasswordResetCodeResponse,
} from '../../types/api';

type UnknownRecord = Record<string, unknown>;
const invalid = (field: string): never => { throw new Error(`Invalid authentication response: ${field}`); };
const record = (value: unknown, field: string): UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? value as UnknownRecord : invalid(field);
const string = (value: unknown, field: string): string => typeof value === 'string' ? value : invalid(field);
const boolean = (value: unknown, field: string): boolean => typeof value === 'boolean' ? value : invalid(field);
const number = (value: unknown, field: string): number => typeof value === 'number' && Number.isFinite(value) ? value : invalid(field);

export function normalizeAuthSession(value: unknown): LoginResponse | RegisterResponse {
  const data = record(value, 'session');
  const user = record(data.user, 'session.user');
  const emailVerified = user.emailVerified;
  return {
    userId: string(data.userId, 'session.userId'),
    email: string(data.email, 'session.email'),
    accessToken: string(data.accessToken, 'session.accessToken'),
    refreshToken: string(data.refreshToken, 'session.refreshToken'),
    user: {
      id: string(user.id, 'session.user.id'),
      email: string(user.email, 'session.user.email'),
      createdAt: string(user.createdAt, 'session.user.createdAt'),
      emailVerified: emailVerified === undefined ? undefined : boolean(emailVerified, 'session.user.emailVerified'),
    },
  };
}

export function normalizeRefresh(value: unknown): RefreshTokenResponse {
  const data = record(value, 'refresh');
  return { accessToken: string(data.accessToken, 'refresh.accessToken'), refreshToken: string(data.refreshToken, 'refresh.refreshToken') };
}

export function normalizeSuccessMessage(value: unknown): LogoutResponse | DeleteAccountResponse | CompletePasswordResetResponse | VerifyEmailCodeResponse {
  const data = record(value, 'result');
  return { success: boolean(data.success, 'result.success'), message: string(data.message, 'result.message') };
}

export function normalizePasswordResetRequest(value: unknown): RequestPasswordResetResponse {
  const data = record(value, 'passwordResetRequest');
  return {
    success: boolean(data.success, 'passwordResetRequest.success'),
    message: string(data.message, 'passwordResetRequest.message'),
    expiresIn: number(data.expiresIn, 'passwordResetRequest.expiresIn'),
    attemptLimit: data.attemptLimit === undefined ? undefined : number(data.attemptLimit, 'passwordResetRequest.attemptLimit'),
  };
}

export function normalizePasswordResetVerification(value: unknown): VerifyPasswordResetCodeResponse {
  const data = record(value, 'passwordResetVerification');
  return {
    success: boolean(data.success, 'passwordResetVerification.success'),
    message: string(data.message, 'passwordResetVerification.message'),
    expiresIn: number(data.expiresIn, 'passwordResetVerification.expiresIn'),
  };
}

export function normalizeVerificationEmail(value: unknown): SendVerificationEmailResponse {
  const data = record(value, 'verificationEmail');
  return {
    success: boolean(data.success, 'verificationEmail.success'),
    expiresIn: number(data.expiresIn, 'verificationEmail.expiresIn'),
    message: data.message === undefined ? undefined : string(data.message, 'verificationEmail.message'),
  };
}
