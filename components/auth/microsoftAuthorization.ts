import * as AuthSession from 'expo-auth-session';

export const MICROSOFT_AUTHORITY = 'https://login.microsoftonline.com/common/v2.0';

type AuthorizationResult =
  | { type: 'cancel' | 'dismiss' | 'opened' | 'locked' }
  | { type: 'success' | 'error'; params: Record<string, string> };

interface MicrosoftRequest {
  codeVerifier?: string;
  promptAsync(discovery: unknown): Promise<AuthorizationResult>;
}

export interface MicrosoftAuthorizationDependencies {
  createRequest(config: {
    clientId: string;
    redirectUri: string;
    responseType: 'code';
    scopes: string[];
    usePKCE: true;
    prompt: 'select_account';
    extraParams: { nonce: string };
  }): MicrosoftRequest;
  fetchDiscovery(authority: string): Promise<unknown>;
  exchangeCode(
    config: {
      clientId: string;
      code: string;
      redirectUri: string;
      extraParams: { code_verifier: string };
    },
    discovery: unknown,
  ): Promise<{ idToken?: string | null }>;
}

const defaultDependencies: MicrosoftAuthorizationDependencies = {
  createRequest: (configuration) =>
    new AuthSession.AuthRequest({
      ...configuration,
      responseType: AuthSession.ResponseType.Code,
      prompt: AuthSession.Prompt.SelectAccount,
    }) as MicrosoftRequest,
  fetchDiscovery: (authority) => AuthSession.fetchDiscoveryAsync(authority),
  exchangeCode: (configuration, discovery) =>
    AuthSession.exchangeCodeAsync(configuration, discovery as AuthSession.DiscoveryDocument),
};

export class MicrosoftAuthorizationError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'MicrosoftAuthorizationError';
  }
}

/** Runs Microsoft's native public-client code flow. Expo owns PKCE and state validation. */
export async function authorizeWithMicrosoft(
  clientId: string,
  redirectUri: string,
  nonce: string,
  dependencies: MicrosoftAuthorizationDependencies = defaultDependencies,
): Promise<string | null> {
  if (!clientId || !redirectUri || !nonce) {
    throw new MicrosoftAuthorizationError(
      'configuration',
      'Microsoft sign-in is not configured.',
    );
  }
  const discovery = await dependencies.fetchDiscovery(MICROSOFT_AUTHORITY);
  const request = dependencies.createRequest({
    clientId,
    redirectUri,
    responseType: 'code',
    scopes: ['openid', 'profile', 'email'],
    usePKCE: true,
    prompt: 'select_account',
    extraParams: { nonce },
  });
  const result = await request.promptAsync(discovery);
  if (result.type === 'cancel' || result.type === 'dismiss') return null;
  if (result.type === 'error' && result.params.error === 'access_denied') return null;
  if (result.type !== 'success') {
    const detail = result.type === 'error' ? result.params.error_description : undefined;
    throw new MicrosoftAuthorizationError(
      'authorization_failed',
      detail || 'Microsoft sign-in did not complete.',
    );
  }
  const code = result.params.code;
  if (!code || !request.codeVerifier) {
    throw new MicrosoftAuthorizationError(
      'invalid_response',
      'Microsoft did not return a usable authorization code.',
    );
  }
  const tokens = await dependencies.exchangeCode(
    {
      clientId,
      code,
      redirectUri,
      extraParams: { code_verifier: request.codeVerifier },
    },
    discovery,
  );
  if (!tokens.idToken) {
    throw new MicrosoftAuthorizationError(
      'missing_id_token',
      'Microsoft did not return an identity token.',
    );
  }
  return tokens.idToken;
}
