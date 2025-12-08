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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../contexts/UserContext';
import PasswordResetModal from './PasswordResetModal';
import { useRouter } from 'expo-router';
import { showAlert } from '../utils/alerts';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import { getConfig } from '../config/env';

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
  const [isRegistering, setIsRegistering] = useState(true); // Default to registration
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const { register, login, loginWithGoogle, state, clearError } = useUser();
  const router = useRouter();
  
  // Get config inside component to ensure it's loaded
  const config = getConfig();
  
  // Check native module availability lazily (only when needed)
  useEffect(() => {
    checkNativeGoogleSignIn();
  }, []);

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
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Google Login Error:', error);
      showAlert('Login Failed', error.message || 'Failed to verify Google token');
    } finally {
      setIsLoading(false);
    }
  }, [state.user, loginWithGoogle, onLoginSuccess, router]);

  // Show error alert when state.error changes
  useEffect(() => {
    if (state.error && !state.isLoading) {
      const title = isRegistering ? 'Registration Failed' : 'Login Failed';
      showAlert(title, state.error);
      clearError();
    }
  }, [state.error, state.isLoading, isRegistering, clearError]);

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
    // Validate email
    if (!email.trim()) {
      showAlert('Error', 'Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      showAlert('Error', 'Please enter a valid email address');
      return;
    }

    // Validate password
    if (!password) {
      showAlert('Error', 'Please enter your password');
      return;
    }

    if (isRegistering) {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        const message = passwordValidation.errors.map(e => '• ' + e).join('\n');
        showAlert('Invalid Password', message);
        return;
      }
    }

    try {
      setIsLoading(true);

      if (isRegistering) {
        await register(email.trim().toLowerCase(), password);
        // Tutorial will be shown automatically by app/index.tsx since onboarding is not complete
      } else {
        await login(email.trim().toLowerCase(), password);
        // Email verification is optional - proceed to app regardless
        onLoginSuccess?.();
        router.replace('/(tabs)');
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
        showAlert('Login Failed', error.message || 'Failed to sign in with Google');
      }
    }
  };

  const openPasswordReset = () => {
    setShowPasswordReset(true);
  };

  const closePasswordReset = () => {
    setShowPasswordReset(false);
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
              <Text style={styles.title}>🥡 SnackTrack</Text>
              <Text style={styles.subtitle}>
                Track your food spending and discover amazing insights
              </Text>
            </View>

            {/* Login/Register Toggle */}
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[styles.toggleButton, isRegistering && styles.toggleButtonActive]}
                onPress={() => setIsRegistering(true)}
              >
                <Text style={[styles.toggleText, isRegistering && styles.toggleTextActive]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, !isRegistering && styles.toggleButtonActive]}
                onPress={() => setIsRegistering(false)}
              >
                <Text style={[styles.toggleText, !isRegistering && styles.toggleTextActive]}>
                  Sign In
                </Text>
              </TouchableOpacity>
            </View>

            {/* Login Form */}
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={24} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email address"
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={24} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size={24}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>

              {isRegistering && (
                <View style={styles.passwordRequirements}>
                  <Text style={styles.passwordRequirementsTitle}>Password must have:</Text>
                  <Text style={styles.passwordRequirement}>• At least 8 characters</Text>
                  <Text style={styles.passwordRequirement}>• At least 1 uppercase letter</Text>
                  <Text style={styles.passwordRequirement}>• At least 1 number</Text>
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

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google Sign In Button */}
              <TouchableOpacity
                style={styles.googleButton}
                onPress={handleGoogleLogin}
                disabled={isLoading || state.isLoading}
              >
                <Ionicons name="logo-google" size={24} color="#333" style={styles.googleIcon} />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </TouchableOpacity>

              {/* Info */}
              <View style={styles.infoContainer}>
                <Text style={styles.infoText}>
                  {isRegistering
                    ? "We'll use your email to create your account and securely save your spending data."
                    : "Sign in to access your spending insights and analytics."
                  }
                </Text>
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
    backgroundColor: '#f8f9fa',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
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
    backgroundColor: '#007AFF',
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  toggleTextActive: {
    color: 'white',
  },
  form: {
    marginBottom: 32,
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
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  passwordRequirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  passwordRequirement: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  loginButton: {
    backgroundColor: '#007AFF',
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
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
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
    color: '#333',
  },
});

export default LoginScreen;
