import {
  authorizeWithMicrosoft,
  MICROSOFT_AUTHORITY,
  MicrosoftAuthorizationDependencies,
} from '@components/auth/microsoftAuthorization';

const dependencies = (
  result: { type: string; params?: Record<string, string> } = {
    type: 'success',
    params: { code: 'auth-code' },
  },
) => {
  const promptAsync = jest.fn().mockResolvedValue(result);
  const createRequest = jest
    .fn()
    .mockReturnValue({ codeVerifier: 'pkce-verifier', promptAsync });
  const fetchDiscovery = jest.fn().mockResolvedValue({ tokenEndpoint: 'https://example.test' });
  const exchangeCode = jest.fn().mockResolvedValue({ idToken: 'signed-id-token' });
  return {
    value: { createRequest, fetchDiscovery, exchangeCode } as MicrosoftAuthorizationDependencies,
    createRequest,
    fetchDiscovery,
    exchangeCode,
  };
};

describe('Microsoft native authorization', () => {
  it('uses authorization code, PKCE, state-aware AuthRequest, and the API nonce', async () => {
    const mocks = dependencies();
    await expect(
      authorizeWithMicrosoft('client-id', 'msauth://redirect', 'api-nonce', mocks.value),
    ).resolves.toBe('signed-id-token');
    expect(mocks.fetchDiscovery).toHaveBeenCalledWith(MICROSOFT_AUTHORITY);
    expect(mocks.createRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        responseType: 'code',
        usePKCE: true,
        scopes: ['openid', 'profile', 'email'],
        extraParams: { nonce: 'api-nonce' },
      }),
    );
    expect(mocks.exchangeCode).toHaveBeenCalledWith(
      expect.objectContaining({ extraParams: { code_verifier: 'pkce-verifier' } }),
      expect.anything(),
    );
  });

  it.each([
    { type: 'cancel' },
    { type: 'dismiss' },
    { type: 'error', params: { error: 'access_denied' } },
  ])('treats cancellation as a silent outcome', async (result) => {
    const mocks = dependencies(result);
    await expect(
      authorizeWithMicrosoft('client-id', 'msauth://redirect', 'api-nonce', mocks.value),
    ).resolves.toBeNull();
    expect(mocks.exchangeCode).not.toHaveBeenCalled();
  });

  it('does not exchange malformed or state-error responses', async () => {
    const missingCode = dependencies({ type: 'success', params: {} });
    await expect(
      authorizeWithMicrosoft('client-id', 'msauth://redirect', 'api-nonce', missingCode.value),
    ).rejects.toMatchObject({ code: 'invalid_response' });
    const stateError = dependencies({
      type: 'error',
      params: { error: 'state_mismatch', error_description: 'State did not match' },
    });
    await expect(
      authorizeWithMicrosoft('client-id', 'msauth://redirect', 'api-nonce', stateError.value),
    ).rejects.toMatchObject({ code: 'authorization_failed' });
    expect(stateError.exchangeCode).not.toHaveBeenCalled();
  });
});
