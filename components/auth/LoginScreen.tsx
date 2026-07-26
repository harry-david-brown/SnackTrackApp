import { Colors } from '@/constants/theme';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  LayoutAnimation,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../../contexts/UserContext';
import PasswordResetModal from './PasswordResetModal';
import { showAlert } from '../../utils/alerts';
import { MascotPlaceholder } from '../mascot/MascotPlaceholder';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import { getConfig } from '../../config/env';
import { featureFlags } from '../../config/featureFlags';
import { getErrorMessage } from '../../utils/errorUtils';
import {
  checkNativeGoogleSignIn,
  isNativeGoogleSignInAvailable,
  getGoogleSignin,
  getGoogleStatusCodes,
} from './nativeGoogleSignIn';
import { validateEmail, validatePassword } from './authValidation';
import { decodeAppleTokenClaims, describeAppleSignInError } from './appleAuthErrors';
import { styles } from './loginStyles';

// Initialize WebBrowser for auth
WebBrowser.maybeCompleteAuthSession();

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [isAppleSignInAvailable, setIsAppleSignInAvailable] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [authMethod, setAuthMethod] = useState<'oauth' | 'email'>('oauth');
  const [displayedAuthMethod, setDisplayedAuthMethod] = useState<'oauth' | 'email'>('oauth');
  const authPanelOverlayOpacity = useState(() => new Animated.Value(0))[0];
  const { register, login, loginWithGoogle, loginWithApple, state, clearError } = useUser();
  
  // Get config inside component to ensure it's loaded
  const config = getConfig();
  const showGoogleAuth = featureFlags.showGoogleAuth;
  const showAppleAuth = featureFlags.showAppleAuth;
  
  // Check native module availability lazily (only when needed)
  useEffect(() => {
    checkNativeGoogleSignIn();
    
    // Check if Apple Sign In is available (iOS 13+)
    if (Platform.OS === 'ios' && showAppleAuth) {
      AppleAuthentication.isAvailableAsync().then(setIsAppleSignInAvailable);
    }
  }, [showAppleAuth]);

  // Expo Auth Session for Web
  // Conditionally construct config - use web client ID as fallback for iOS if iosClientId is missing
  const googleAuthConfig: {
    clientId: string;
    iosClientId?: string;
    androidClientId?: string;
  } = {
    clientId: config.gmailWebClientId || '',
  };
  
  // expo-auth-session requires iosClientId on iOS, so use web client ID as fallback if missing
  if (Platform.OS === 'ios') {
    googleAuthConfig.iosClientId = config.gmailIosClientId || config.gmailWebClientId;
  } else if (config.gmailIosClientId) {
    googleAuthConfig.iosClientId = config.gmailIosClientId;
  }
  
  if (config.gmailAndroidClientId) {
    googleAuthConfig.androidClientId = config.gmailAndroidClientId;
  }
  
  const [, response, promptAsync] = Google.useIdTokenAuthRequest(googleAuthConfig);

  const performGoogleLogin = useCallback(async (idToken: string) => {
    try {
      if (state.user) return;

      if (!idToken) {
        throw new Error('ID Token is empty');
      }

      await loginWithGoogle(idToken);
      onLoginSuccess?.();
    } catch (error: any) {
      // Clear the error from state to prevent the useEffect from showing another alert
      clearError();
      
      console.error('Google Login Error:', error);
      showAlert('Login Failed', getErrorMessage(error) || 'Failed to verify Google token');
    } finally {
      setIsLoading(false);
    }
  }, [state.user, loginWithGoogle, onLoginSuccess, clearError]);

  // Show inline error when auth state reports a manual auth failure
  useEffect(() => {
    if (state.error && !state.isLoading) {
      setFormError(state.error);
    }
  }, [state.error, state.isLoading]);

  // Handle expo-auth-session Sign-In Response (web + native fallback in Expo Go)
  useEffect(() => {
    // Only handle response if we're using expo-auth-session (web or Expo Go fallback)
    // Native availability is a module-level flag in nativeGoogleSignIn, checked at runtime
    if (Platform.OS === 'web' || !isNativeGoogleSignInAvailable()) {
      if (response?.type === 'success') {
        // parsing the response to find the idToken
        // Sometimes it comes in authentication.idToken, sometimes in params.id_token
        const { authentication, params } = response;
        const idToken = authentication?.idToken || params?.id_token;

        if (idToken) {
          performGoogleLogin(idToken);
        } else {
          console.warn('No ID token in successful response', response);
          setIsLoading(false);
          showAlert('Login Failed', 'No ID Token received from Google');
        }
      } else if (response?.type === 'error') {
        setIsLoading(false);
        console.error('Auth Session Error:', response.error);
        showAlert('Login Failed', 'Google sign-in failed');
      } else if (response?.type === 'dismiss') {
        setIsLoading(false);
      }
    }
     
  }, [response, performGoogleLogin]);


  const handleSubmit = async () => {
    setFormError(null);
    clearError();

    // Validate email
    if (!email.trim()) {
      setFormError('Enter your email address to continue.');
      return;
    }

    if (!validateEmail(email)) {
      setFormError('Enter a valid email address.');
      return;
    }

    // Validate password
    if (!password) {
      setFormError(isRegistering ? 'Create a password to continue.' : 'Enter your password to continue.');
      return;
    }

    if (isRegistering) {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        const message = passwordValidation.errors.join(', ');
        setFormError(`Password must include ${message}.`);
        return;
      }
    }

    try {
      setIsLoading(true);
      
      if (isRegistering) {
        await register(email.trim().toLowerCase(), password);
        onLoginSuccess?.();
      } else {
        await login(email.trim().toLowerCase(), password);
        onLoginSuccess?.();
      }
    } catch {
      // Error is already set in state by UserContext
      // state.error will be displayed when the component re-renders
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setFormError(null);
      clearError();
      setIsLoading(true);

      // Use expo-auth-session for web OR when native module isn't available (Expo Go)
      if (Platform.OS === 'web' || !isNativeGoogleSignInAvailable()) {
        await promptAsync();
        // The effect will handle the response
      } else {
        // Native (Android/iOS) Flow - only for development builds with native modules
        const GoogleSignin = getGoogleSignin();
        await GoogleSignin.hasPlayServices();
        const response = await GoogleSignin.signIn();

        if (response.data?.idToken) {
          await performGoogleLogin(response.data.idToken);
        } else {
          throw new Error('No ID token obtained from Google');
        }
      }
    } catch (error: any) {
      setIsLoading(false);
      const statusCodes = getGoogleStatusCodes();
      if (statusCodes && error.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled the login flow
      } else if (statusCodes && error.code === statusCodes.IN_PROGRESS) {
        // operation (e.g. sign in) is in progress already
      } else if (statusCodes && error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        showAlert('Error', 'Google Play Services not available');
      } else {
        console.error('Google Sign-In Error', error);
        console.log('ℹ️ Configured Web Client ID:', config.gmailWebClientId);
        console.log('ℹ️ Configured iOS Client ID:', config.gmailIosClientId);
        console.log('ℹ️ Configured Android Client ID:', config.gmailAndroidClientId);
        showAlert('Login Failed', getErrorMessage(error) || 'Failed to sign in with Google');
      }
    }
  };


  const handleAppleLogin = async () => {
    try {
      setFormError(null);
      clearError();
      setIsLoading(true);

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Decode JWT payload to see claims (for debugging and validation)
      const tokenClaims = decodeAppleTokenClaims(credential.identityToken);

      if (__DEV__) {
        console.log('🍎 Apple Sign-In credential received:', {
          hasIdentityToken: !!credential.identityToken,
          hasEmail: !!credential.email,
          hasFullName: !!credential.fullName,
          user: credential.user,
          tokenClaims,
        });
        const now = Math.floor(Date.now() / 1000);
        if (tokenClaims?.exp && tokenClaims.exp < now) {
          console.warn('⚠️ Apple token is expired. This should not happen as tokens are fresh.');
        }
      }

      // identityToken is the JWT we need to verify on the backend
      if (!credential.identityToken) {
        throw new Error('No identity token obtained from Apple. Please try again.');
      }

      // Validate token format (basic JWT structure check)
      if (credential.identityToken.split('.').length !== 3) {
        throw new Error('Invalid token format received from Apple. Please try again.');
      }

      // Prepare user data (only available on first sign-in)
      // Note: Email may be null on subsequent sign-ins - that's expected
      const userData = credential.email ? {
        email: credential.email,
        name: credential.fullName ? {
          firstName: credential.fullName.givenName || undefined,
          lastName: credential.fullName.familyName || undefined,
        } : undefined,
      } : undefined;

      await loginWithApple(credential.identityToken, userData);

      onLoginSuccess?.();
    } catch (error: any) {
      setIsLoading(false);

      if (__DEV__) {
        console.log("🍎 APPLE ERROR", error?.code, error?.message, error);
      }

      const outcome = describeAppleSignInError(error, state.error);
      if (outcome.kind === 'silent') {
        return;
      }

      if (outcome.clearContextError) {
        console.error('Apple Sign-In Error', error);
        // Clear the error from state to prevent the useEffect from showing another alert
        clearError();
      }

      showAlert(outcome.title, outcome.message);
    }
  };

  const openPasswordReset = () => {
    setFormError(null);
    setShowPasswordReset(true);
  };

  const closePasswordReset = () => {
    setShowPasswordReset(false);
  };

  const handleSetRegistering = (nextValue: boolean) => {
    setIsRegistering(nextValue);
    setFormError(null);
    clearError();
  };

  const hasOauthOptions = showGoogleAuth || (showAppleAuth && isAppleSignInAvailable);

  useEffect(() => {
    if (!hasOauthOptions) {
      setAuthMethod('email');
      setDisplayedAuthMethod('email');
    } else if (authMethod !== 'oauth' && authMethod !== 'email') {
      setAuthMethod('oauth');
      setDisplayedAuthMethod('oauth');
    }
  }, [hasOauthOptions, authMethod]);

  const handleAuthMethodChange = (nextMethod: 'oauth' | 'email') => {
    if (nextMethod === authMethod) return;

    setFormError(null);
    clearError();

    Animated.timing(authPanelOverlayOpacity, {
      toValue: 1,
      duration: 90,
      useNativeDriver: true,
    }).start(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setAuthMethod(nextMethod);
      setDisplayedAuthMethod(nextMethod);

      Animated.timing(authPanelOverlayOpacity, {
        toValue: 0,
        duration: 130,
        useNativeDriver: true,
      }).start();
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          overScrollMode={Platform.OS === 'android' ? 'always' : 'auto'}
          bounces={true}
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              {/* MASCOT: brand mark — neutral crossed-arms bust */}
              <View style={styles.mascotLogoWrap}>
                <MascotPlaceholder pose="neutral" size={96} />
              </View>
              <Text style={styles.title}>SnackTrack</Text>
              <Text style={styles.subtitle}>
                Sign in to import receipts and start seeing your delivery spending more clearly.
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  style={[styles.toggleButton, isRegistering && styles.toggleButtonActive]}
                  onPress={() => handleSetRegistering(true)}
                >
                  <Text style={[styles.toggleText, isRegistering && styles.toggleTextActive]}>
                    Sign Up
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleButton, !isRegistering && styles.toggleButtonActive]}
                  onPress={() => handleSetRegistering(false)}
                >
                  <Text style={[styles.toggleText, !isRegistering && styles.toggleTextActive]}>
                    Sign In
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.authPanelContainer}>
              {displayedAuthMethod === 'oauth' && hasOauthOptions && (
                <View style={styles.authPanel}>
                  <Text style={styles.oauthTitle}>Fastest way to get started</Text>
                  <Text style={styles.oauthSubtitle}>
                    Try to use{' '}
                    <Text style={styles.oauthSubtitleEmphasis}>
                      the same email you use for your delivery apps
                    </Text>{' '}
                    to make importing easier later.
                  </Text>

                  {showAppleAuth && isAppleSignInAvailable && (
                    <AppleAuthentication.AppleAuthenticationButton
                      buttonType={
                        isRegistering
                          ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
                          : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                      }
                      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                      cornerRadius={8}
                      style={styles.appleButton}
                      onPress={handleAppleLogin}
                    />
                  )}

                  {showGoogleAuth && (
                    <TouchableOpacity
                      style={styles.googleButton}
                      onPress={handleGoogleLogin}
                      disabled={isLoading || state.isLoading}
                    >
                      <Ionicons name="logo-google" size={24} color={Colors.textPrimary} style={styles.googleIcon} />
                      <Text style={styles.googleButtonText}>
                        {isRegistering ? 'Sign up with Google' : 'Continue with Google'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <View style={styles.infoContainer}>
                    <Text style={styles.infoText}>
                      {isRegistering
                        ? 'You can always connect an inbox or import receipts after your account is ready.'
                        : 'After signing in, you will continue into your import and insights flow.'}
                    </Text>
                    <TouchableOpacity
                      style={styles.methodSwapLink}
                      onPress={() => handleAuthMethodChange('email')}
                    >
                      <Text style={styles.methodSwapLinkText}>
                        {isRegistering ? 'Create account with email instead' : 'Sign in with email instead'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {(displayedAuthMethod === 'email' || !hasOauthOptions) && (
                <View style={styles.authPanel}>
                  <Text style={styles.manualIntro}>
                    {isRegistering
                      ? 'Create an account with the email you use for your delivery apps if you can.'
                      : 'Use the email tied to your account to pick up where you left off.'}
                  </Text>

                  <View style={styles.inputContainer}>
                    <Ionicons name="mail-outline" size={24} color={Colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your email address"
                      placeholderTextColor={Colors.gray500}
                      value={email}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="email"
                      onChangeText={(value) => {
                        setEmail(value);
                        if (formError) setFormError(null);
                        if (state.error) clearError();
                      }}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed-outline" size={24} color={Colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your password"
                      placeholderTextColor={Colors.gray500}
                      value={password}
                      onChangeText={(value) => {
                        setPassword(value);
                        if (formError) setFormError(null);
                        if (state.error) clearError();
                      }}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="password"
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons
                        name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                        size={24}
                        color={Colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>

                  {isRegistering && (
                    <View style={styles.passwordRequirements}>
                      <Text style={styles.passwordRequirementsTitle}>Choose a password with:</Text>
                      <Text style={styles.passwordRequirement}>
                        8+ characters, 1 uppercase letter, and 1 number
                      </Text>
                    </View>
                  )}

                  {formError && (
                    <View style={styles.errorContainer}>
                      <Ionicons
                        name="alert-circle-outline"
                        size={18}
                        color={Colors.errorDark}
                        style={styles.errorIcon}
                      />
                      <Text style={styles.errorText}>{formError}</Text>
                    </View>
                  )}

                  {!isRegistering && (
                    <TouchableOpacity onPress={openPasswordReset}>
                      <Text style={styles.forgotPassword}>Forgot password?</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={isLoading || state.isLoading}
                  >
                    {isLoading || state.isLoading ? (
                      <Text style={styles.loginButtonText}>
                        {isRegistering ? 'Creating Account...' : 'Signing In...'}
                      </Text>
                    ) : (
                      <Text style={styles.loginButtonText}>
                        {isRegistering ? 'Create Account' : 'Sign In'}
                      </Text>
                    )}
                  </TouchableOpacity>

                  <View style={styles.infoContainer}>
                    <Text style={styles.infoText}>
                      {isRegistering
                        ? 'You can always connect an inbox or import receipts after your account is ready.'
                        : 'After signing in, you will continue into your import and insights flow.'}
                    </Text>
                    {hasOauthOptions && (
                      <TouchableOpacity
                        style={styles.methodSwapLink}
                        onPress={() => handleAuthMethodChange('oauth')}
                      >
                        <Text style={styles.methodSwapLinkText}>Use Google / Apple instead</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.authPanelOverlay,
                    { opacity: authPanelOverlayOpacity },
                  ]}
                />
              </View>

            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <PasswordResetModal
        visible={showPasswordReset}
        defaultEmail={email}
        onClose={closePasswordReset}
      />
    </SafeAreaView>
  );
};
