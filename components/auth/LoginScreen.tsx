import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
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
import Constants from 'expo-constants';
import { getConfig } from '../../config/env';
import { featureFlags } from '../../config/featureFlags';
import { getErrorMessage } from '../../utils/errorUtils';

// Initialize WebBrowser for auth
WebBrowser.maybeCompleteAuthSession();

// Dynamic Google Signin variables for native module (dev builds only)
let GoogleSignin: any = null;
let statusCodes: any = null;
let nativeGoogleSignInAvailable = false;
let nativeModuleChecked = false;

// Check if native Google Sign-In is available (only in development builds, not Expo Go)
// This is called lazily, not at module load time, to avoid crashes in Expo Go
const checkNativeGoogleSignIn = () => {
  if (nativeModuleChecked) {
    return nativeGoogleSignInAvailable;
  }
  
  nativeModuleChecked = true;
  
  if (Platform.OS === 'web') {
    nativeGoogleSignInAvailable = false;
    return false;
  }

  // Check if we're in Expo Go - if so, skip native module check entirely
  // Constants.executionEnvironment is 'storeClient' in Expo Go, 'standalone' in production builds
  const executionEnvironment = Constants.executionEnvironment;
  if (executionEnvironment === 'storeClient') {
    // We're in Expo Go - native modules won't be available
    nativeGoogleSignInAvailable = false;
    return false;
  }

  // Only try to load native module if we're in a development build (not Expo Go)
  try {
    // Try to require the module - this will work in development builds
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const googleSigninModule = require('@react-native-google-signin/google-signin');
    GoogleSignin = googleSigninModule.GoogleSignin;
    statusCodes = googleSigninModule.statusCodes;

    // Configure only if loaded successfully and config is available
    if (GoogleSignin) {
      try {
        const config = getConfig();
        if (config.gmailWebClientId) {
          GoogleSignin.configure({
            webClientId: config.gmailWebClientId,
            iosClientId: config.gmailIosClientId,
            offlineAccess: true,
          });
          nativeGoogleSignInAvailable = true;
          return true;
        }
      } catch {
        // Config might not be ready yet - that's okay, we'll use expo-auth-session
        if (__DEV__) {
          console.log('Config not ready for Google Sign-In, using expo-auth-session fallback');
        }
      }
    }
  } catch {
    // Native module not available - use expo-auth-session fallback
    if (__DEV__) {
      console.log('Native Google Sign-In not available, using expo-auth-session fallback');
    }
  }
  
  nativeGoogleSignInAvailable = false;
  return false;
};

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
    // nativeGoogleSignInAvailable is a module-level variable, checked at runtime
    if (Platform.OS === 'web' || !nativeGoogleSignInAvailable) {
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

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('At least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('At least 1 uppercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('At least 1 number');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  };

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
      if (Platform.OS === 'web' || !nativeGoogleSignInAvailable) {
        await promptAsync();
        // The effect will handle the response
      } else {
        // Native (Android/iOS) Flow - only for development builds with native modules
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
      let tokenClaims: any = null;
      if (credential.identityToken) {
        try {
          const parts = credential.identityToken.split('.');
          if (parts.length === 3) {
            const payload = parts[1];
            // Add padding if needed for base64 decoding
            const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
            // Use global atob or Buffer for base64 decoding
            const decodedPayload = typeof atob !== 'undefined' 
              ? atob(paddedPayload)
              : Buffer.from(paddedPayload, 'base64').toString('utf-8');
            tokenClaims = JSON.parse(decodedPayload);
          }
        } catch (e) {
          // Ignore decode errors - token might be in different format
          if (__DEV__) {
            console.warn('Could not decode Apple identity token:', e);
          }
        }
      }
      
      // Log credential details for debugging
      if (__DEV__) {
        console.log('🍎 Apple Sign-In credential received:', {
          hasIdentityToken: !!credential.identityToken,
          identityTokenLength: credential.identityToken?.length,
          hasEmail: !!credential.email,
          hasFullName: !!credential.fullName,
          user: credential.user, // Apple user ID (stable identifier)
          tokenClaims: tokenClaims ? {
            sub: tokenClaims.sub, // Apple user ID (same as credential.user)
            email: tokenClaims.email,
            email_verified: tokenClaims.email_verified,
            iss: tokenClaims.iss, // Should be "https://appleid.apple.com"
            aud: tokenClaims.aud, // Should be your Apple Client ID
            exp: tokenClaims.exp, // Expiration timestamp
            iat: tokenClaims.iat, // Issued at timestamp
          } : null,
        });
      }
      
      // identityToken is the JWT we need to verify on the backend
      if (!credential.identityToken) {
        throw new Error('No identity token obtained from Apple. Please try again.');
      }

      // Validate token format (basic JWT structure check)
      const tokenParts = credential.identityToken.split('.');
      if (tokenParts.length !== 3) {
        throw new Error('Invalid token format received from Apple. Please try again.');
      }

      // Check token expiration if we decoded it
      if (__DEV__ && tokenClaims) {
        const now = Math.floor(Date.now() / 1000);
        if (tokenClaims.exp && tokenClaims.exp < now) {
          console.warn('⚠️ Apple token is expired. This should not happen as tokens are fresh.');
        }
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

      // Log if email is missing (expected on subsequent sign-ins)
      if (__DEV__ && !credential.email && tokenClaims?.email) {
        console.log('ℹ️ Email not in credential but present in token (subsequent sign-in)');
      }

      await loginWithApple(credential.identityToken, userData);
      
      onLoginSuccess?.();
    } catch (error: any) {
      setIsLoading(false);
      
      // Log detailed error information for debugging
      if (__DEV__) {
        console.log("🍎 APPLE ERROR", error?.code, error?.message, error);
      }
      
      // Handle user cancellation - don't show error
      if (error.code === 'ERR_REQUEST_CANCELED' || error.code === 'ERR_CANCELED') {
        if (__DEV__) {
          console.log('ℹ️ User cancelled Apple Sign-In');
        }
        return;
      }
      
      // Handle Apple Sign-In not available (shouldn't happen if button is shown)
      if (error.code === 'ERR_NOT_AVAILABLE' || error.message?.includes('not available')) {
        showAlert(
          'Apple Sign-In Unavailable',
          'Apple Sign-In is not available on this device. Please use email/password or Google Sign-In.'
        );
        return;
      }
      
      // Handle network errors
      if (!error.response && (error.code === 'ERR_NETWORK' || error.message?.includes('Network'))) {
        showAlert(
          'Connection Error',
          'Unable to connect to the server. Please check your internet connection and try again.'
        );
        return;
      }
      
      console.error('Apple Sign-In Error', error);
      
      // Clear the error from state to prevent the useEffect from showing another alert
      clearError();
      
      // Extract user-friendly error message
      let errorMessage = 'Failed to sign in with Apple. Please try again.';
      
      if (error.response?.data) {
        const errorData = error.response.data.error || error.response.data;
        
        // Check for specific error messages we can make user-friendly
        if (errorData.message) {
          const msg = errorData.message.toLowerCase();
          
          // Backend configuration errors
          if (msg.includes('audience invalid') || msg.includes('jwt audience invalid')) {
            errorMessage = 'Apple Sign-In configuration issue. This is a development/testing issue. Please contact support or try a development build.';
            if (__DEV__) {
              console.error('🔧 Backend needs to accept both "com.snacktrack.mobile" and "host.exp.Exponent" audiences. See docs/APPLE_SIGNIN_BACKEND_FIX.md');
            }
          } else if (msg.includes('not configured') || msg.includes('apple sign in not configured')) {
            errorMessage = 'Apple Sign In is not configured on the server. Please contact support.';
          } 
          // Token validation errors
          else if (msg.includes('invalid') && (msg.includes('token') || msg.includes('signature'))) {
            errorMessage = 'Authentication failed. The token could not be verified. Please try signing in again.';
          } else if (msg.includes('expired') || msg.includes('exp')) {
            errorMessage = 'Your sign-in session expired. Please try again.';
          }
          // User data errors
          else if (msg.includes('email not provided') || msg.includes('email required')) {
            errorMessage = 'Unable to get your email from Apple. Please try again or use a different sign-in method.';
          } 
          // Generic authentication failures
          else if (msg.includes('authentication failed') || msg.includes('verification failed')) {
            errorMessage = 'Unable to verify your Apple ID. Please try again.';
          } 
          // Server errors
          else if (error.response.status >= 500) {
            errorMessage = 'Server error occurred. Please try again in a moment.';
          }
          // Use the backend message if it's user-friendly
          else {
            errorMessage = errorData.message || errorMessage;
          }
        } else if (error.response.status === 401) {
          errorMessage = 'Authentication failed. Please try signing in again.';
        } else if (error.response.status === 403) {
          errorMessage = 'Access denied. Please contact support.';
        } else if (error.response.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        }
      } else if (error.message) {
        // Handle frontend errors
        if (error.message.includes('No identity token')) {
          errorMessage = 'Unable to get authentication token from Apple. Please try again.';
        } else if (error.message.includes('Invalid token format')) {
          errorMessage = 'Invalid authentication token received. Please try again.';
        } else if (error.message === 'SESSION_EXPIRED') {
          errorMessage = 'Your session has expired. Please try again.';
        } else {
          errorMessage = error.message;
        }
      } else if (state.error) {
        // Use error from UserContext if available
        errorMessage = state.error;
      }
      
      showAlert('Sign In Failed', errorMessage);
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
                      <Ionicons name="logo-google" size={24} color="#222222" style={styles.googleIcon} />
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
                    <Ionicons name="mail-outline" size={24} color="#6F756E" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your email address"
                      placeholderTextColor="#999"
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
                    <Ionicons name="lock-closed-outline" size={24} color="#6F756E" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your password"
                      placeholderTextColor="#999"
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
                        color="#6F756E"
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
                        color="#b42318"
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F4',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 24,
  },
  content: {
    padding: 24,
    paddingTop: 40,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  mascotLogoWrap: {
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#222222',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6F756E',
    textAlign: 'center',
    lineHeight: 24,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#1F4E3A',
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6F756E',
  },
  toggleTextActive: {
    color: 'white',
  },
  form: {
    marginBottom: 32,
  },
  authPanel: {
    width: '100%',
  },
  authPanelContainer: {
    position: 'relative',
  },
  authPanelOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FAF8F4',
  },
  oauthSection: {
    marginBottom: 20,
  },
  oauthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 6,
  },
  oauthSubtitle: {
    fontSize: 14,
    color: '#6F756E',
    lineHeight: 20,
    marginBottom: 16,
  },
  oauthSubtitleEmphasis: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  manualIntro: {
    fontSize: 14,
    color: '#6F756E',
    lineHeight: 20,
    marginBottom: 12,
  },
  manualToggleButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#fff',
  },
  manualToggleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2563eb',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  passwordRequirements: {
    backgroundColor: '#FAF8F4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  passwordRequirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 8,
  },
  passwordRequirement: {
    fontSize: 13,
    color: '#6F756E',
    lineHeight: 18,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef3f2',
    borderWidth: 1,
    borderColor: '#fecdca',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorIcon: {
    marginRight: 8,
    marginTop: 1,
  },
  errorText: {
    flex: 1,
    color: '#b42318',
    fontSize: 14,
    lineHeight: 20,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    fontWeight: '600',
    color: '#1F4E3A',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#222222',
  },
  loginButton: {
    backgroundColor: '#1F4E3A',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loginButtonDisabled: {
    backgroundColor: '#ccc',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  infoContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#6F756E',
    textAlign: 'center',
    lineHeight: 20,
  },
  methodSwapLink: {
    marginTop: 12,
    paddingVertical: 4,
  },
  methodSwapLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#999',
    fontWeight: '600',
  },
  appleButton: {
    width: '100%',
    height: 50,
    marginBottom: 12,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  googleIcon: {
    marginRight: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222222',
  },
});

export default LoginScreen;
