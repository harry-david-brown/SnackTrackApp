import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { getConfig } from '@config/env';
import type { EnvConfig } from '@config/env';
import { featureFlags } from '@config/featureFlags';
import { useUser } from '@contexts/UserContext';
import { getErrorMessage } from '@utils/errorUtils';
import { showAlert } from '@utils/platformAlert';
import { authApi } from '@services/authApi';
import { describeAppleSignInError } from './appleAuthErrors';
import {
  checkNativeGoogleSignIn,
  getGoogleSignin,
  getGoogleStatusCodes,
  isNativeGoogleSignInAvailable,
} from './nativeGoogleSignIn';
import { authorizeWithMicrosoft } from './microsoftAuthorization';

export interface MicrosoftEmailChallenge {
  attemptToken: string;
  suggestedEmail?: string;
}

export const resolveMicrosoftLoginAvailability = (
  platform: string,
  configuration: Pick<
    EnvConfig,
    | 'microsoftLoginClientId'
    | 'microsoftLoginIosRedirectUri'
    | 'microsoftLoginAndroidRedirectUri'
  >,
): { show: boolean; redirectUri?: string } => {
  const redirectUri =
    platform === 'ios'
      ? configuration.microsoftLoginIosRedirectUri
      : platform === 'android'
        ? configuration.microsoftLoginAndroidRedirectUri
        : undefined;
  return {
    show: Boolean(configuration.microsoftLoginClientId && redirectUri),
    redirectUri,
  };
};

const providerErrorCode = (error: unknown): string | null => {
  if (typeof error !== 'object' || error === null) return null;
  const code = (error as Record<string, unknown>).code;
  return typeof code === 'string' ? code : null;
};

export function useLoginProviders(onSuccess?: () => void) {
  const {
    loginWithGoogle,
    loginWithApple,
    loginWithMicrosoft,
    confirmMicrosoftLoginEmail,
    state,
    clearError,
  } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);
  const [microsoftChallenge, setMicrosoftChallenge] =
    useState<MicrosoftEmailChallenge | null>(null);
  const config = getConfig();
  const showGoogle = featureFlags.showGoogleAuth;
  const showApple = featureFlags.showAppleAuth;
  const microsoftAvailability = resolveMicrosoftLoginAvailability(Platform.OS, config);
  const microsoftRedirectUri = microsoftAvailability.redirectUri;
  const showMicrosoft =
    featureFlags.showMicrosoftAuth &&
    microsoftAvailability.show;

  useEffect(() => {
    checkNativeGoogleSignIn();
    if (Platform.OS === 'ios' && showApple) {
      void AppleAuthentication.isAvailableAsync().then(setIsAppleAvailable);
    }
  }, [showApple]);

  const googleConfig: { clientId: string; iosClientId?: string; androidClientId?: string } = {
    clientId: config.googleServerClientId || '',
  };
  if (Platform.OS === 'ios') googleConfig.iosClientId = config.gmailIosClientId || config.googleServerClientId;
  else if (config.gmailIosClientId) googleConfig.iosClientId = config.gmailIosClientId;
  if (config.gmailAndroidClientId) googleConfig.androidClientId = config.gmailAndroidClientId;
  const [, response, promptAsync] = Google.useIdTokenAuthRequest(googleConfig);

  const finishGoogleLogin = useCallback(async (idToken: string) => {
    try {
      if (state.user) return;
      if (!idToken) throw new Error('ID Token is empty');
      await loginWithGoogle(idToken);
      onSuccess?.();
    } catch (error: unknown) {
      clearError();
      showAlert('Login Failed', getErrorMessage(error) || 'Failed to verify Google token');
    } finally {
      setIsLoading(false);
    }
  }, [clearError, loginWithGoogle, onSuccess, state.user]);

  useEffect(() => {
    if (isNativeGoogleSignInAvailable()) return;
    if (response?.type === 'success') {
      const idToken = response.authentication?.idToken || response.params?.id_token;
      if (idToken) void finishGoogleLogin(idToken);
      else {
        setIsLoading(false);
        showAlert('Login Failed', 'No ID Token received from Google');
      }
    } else if (response?.type === 'error') {
      setIsLoading(false);
      showAlert('Login Failed', 'Google sign-in failed');
    } else if (response?.type === 'dismiss') setIsLoading(false);
  }, [finishGoogleLogin, response]);

  const loginWithGoogleProvider = useCallback(async () => {
    clearError();
    setIsLoading(true);
    try {
      if (!isNativeGoogleSignInAvailable()) await promptAsync();
      else {
        const nativeGoogle = getGoogleSignin();
        await nativeGoogle.hasPlayServices();
        const result = await nativeGoogle.signIn();
        if (!result.data?.idToken) throw new Error('No ID token obtained from Google');
        await finishGoogleLogin(result.data.idToken);
      }
    } catch (error: unknown) {
      setIsLoading(false);
      const codes = getGoogleStatusCodes();
      const code = providerErrorCode(error);
      if (codes && (code === codes.SIGN_IN_CANCELLED || code === codes.IN_PROGRESS)) return;
      if (codes && code === codes.PLAY_SERVICES_NOT_AVAILABLE) {
        showAlert('Error', 'Google Play Services not available');
        return;
      }
      showAlert('Login Failed', getErrorMessage(error) || 'Failed to sign in with Google');
    }
  }, [clearError, finishGoogleLogin, promptAsync]);

  const loginWithAppleProvider = useCallback(async () => {
    clearError();
    setIsLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error('No identity token obtained from Apple. Please try again.');
      if (credential.identityToken.split('.').length !== 3) throw new Error('Invalid token format received from Apple. Please try again.');
      const user = credential.email ? {
        email: credential.email,
        name: credential.fullName ? {
          firstName: credential.fullName.givenName || undefined,
          lastName: credential.fullName.familyName || undefined,
        } : undefined,
      } : undefined;
      await loginWithApple(credential.identityToken, user);
      onSuccess?.();
    } catch (error: unknown) {
      const outcome = describeAppleSignInError(error, state.error);
      if (outcome.kind === 'silent') return;
      if (outcome.clearContextError) clearError();
      showAlert(outcome.title, outcome.message);
    } finally {
      setIsLoading(false);
    }
  }, [clearError, loginWithApple, onSuccess, state.error]);

  const loginWithMicrosoftProvider = useCallback(async () => {
    clearError();
    setIsLoading(true);
    try {
      const attempt = await authApi.microsoftLoginAttempt();
      const identityToken = await authorizeWithMicrosoft(
        config.microsoftLoginClientId || '',
        microsoftRedirectUri || '',
        attempt.nonce,
      );
      if (!identityToken) return;
      const result = await loginWithMicrosoft(identityToken, attempt.attemptToken);
      if (result.status === 'email_verification_required') {
        setMicrosoftChallenge({
          attemptToken: result.attemptToken,
          suggestedEmail: result.suggestedEmail,
        });
        return;
      }
      onSuccess?.();
    } catch (error: unknown) {
      clearError();
      showAlert(
        'Login Failed',
        getErrorMessage(error) || 'Failed to sign in with Microsoft',
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    clearError,
    config.microsoftLoginClientId,
    loginWithMicrosoft,
    microsoftRedirectUri,
    onSuccess,
  ]);

  const sendMicrosoftVerificationEmail = useCallback(
    async (email: string) => {
      if (!microsoftChallenge) throw new Error('Microsoft sign-in has expired.');
      return authApi.sendMicrosoftVerificationEmail(microsoftChallenge.attemptToken, email);
    },
    [microsoftChallenge],
  );

  const confirmMicrosoftVerificationEmail = useCallback(
    async (email: string, code: string) => {
      if (!microsoftChallenge) throw new Error('Microsoft sign-in has expired.');
      await confirmMicrosoftLoginEmail(microsoftChallenge.attemptToken, email, code);
      setMicrosoftChallenge(null);
      onSuccess?.();
    },
    [confirmMicrosoftLoginEmail, microsoftChallenge, onSuccess],
  );

  const cancelMicrosoftVerification = useCallback(() => {
    setMicrosoftChallenge(null);
    clearError();
  }, [clearError]);

  return {
    isLoading: isLoading || state.isLoading,
    showGoogle,
    showApple,
    showMicrosoft,
    isAppleAvailable,
    hasOauthOptions: showGoogle || showMicrosoft || (showApple && isAppleAvailable),
    loginWithGoogle: loginWithGoogleProvider,
    loginWithApple: loginWithAppleProvider,
    loginWithMicrosoft: loginWithMicrosoftProvider,
    microsoftChallenge,
    sendMicrosoftVerificationEmail,
    confirmMicrosoftVerificationEmail,
    cancelMicrosoftVerification,
  };
}
