import {
  normalizeMicrosoftLogin,
  normalizeMicrosoftLoginAttempt,
  normalizeMicrosoftVerificationCode,
} from '@services/normalizers/authNormalizers';
import { authSessionFixture } from '@/__tests__/fixtures/contracts';
import { resolveMicrosoftLoginAvailability } from '@components/auth/useLoginProviders';

describe('Microsoft auth transport normalization', () => {
  it('shows login only for fully configured native platforms', () => {
    const configuration = {
      microsoftLoginClientId: 'client-id',
      microsoftLoginIosRedirectUri: 'msauth.ios://auth',
      microsoftLoginAndroidRedirectUri: 'msauth://android/hash',
    };
    expect(resolveMicrosoftLoginAvailability('ios', configuration)).toEqual({
      show: true,
      redirectUri: 'msauth.ios://auth',
    });
    expect(resolveMicrosoftLoginAvailability('android', configuration).show).toBe(true);
    expect(resolveMicrosoftLoginAvailability('web', configuration).show).toBe(false);
    expect(
      resolveMicrosoftLoginAvailability('ios', {
        ...configuration,
        microsoftLoginClientId: undefined,
      }).show,
    ).toBe(false);
  });
  it('normalizes attempts without exposing provider credentials', () => {
    expect(
      normalizeMicrosoftLoginAttempt({
        attemptToken: 'private-attempt',
        nonce: 'openid-nonce',
        expiresIn: 600,
      }),
    ).toEqual({ attemptToken: 'private-attempt', nonce: 'openid-nonce', expiresIn: 600 });
  });

  it('discriminates authenticated and email-verification responses', () => {
    expect(normalizeMicrosoftLogin(authSessionFixture, 200)).toEqual({
      status: 'authenticated',
      session: authSessionFixture,
    });
    expect(
      normalizeMicrosoftLogin(
        {
          status: 'email_verification_required',
          attemptToken: 'private-attempt',
          suggestedEmail: 'person@example.com',
        },
        202,
      ),
    ).toEqual({
      status: 'email_verification_required',
      attemptToken: 'private-attempt',
      suggestedEmail: 'person@example.com',
    });
  });

  it('rejects malformed challenge and code-delivery responses', () => {
    expect(() => normalizeMicrosoftLogin({ status: 'authenticated' }, 202)).toThrow();
    expect(() =>
      normalizeMicrosoftVerificationCode({ success: false, expiresIn: 900, resendAfter: 60 }),
    ).toThrow();
  });
});
