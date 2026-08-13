import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MascotPlaceholder } from '../mascot/MascotPlaceholder';
import PasswordResetModal from './PasswordResetModal';
import { styles } from './loginStyles';
import { useLoginForm } from './useLoginForm';
import { useLoginProviders } from './useLoginProviders';

WebBrowser.maybeCompleteAuthSession();

interface LoginScreenProps { onLoginSuccess?: () => void }
type AuthMethod = 'oauth' | 'email';

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const form = useLoginForm(onLoginSuccess);
  const providers = useLoginProviders(onLoginSuccess);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [authMethod, setAuthMethod] = useState<AuthMethod>('oauth');
  const [displayedAuthMethod, setDisplayedAuthMethod] = useState<AuthMethod>('oauth');
  const overlayOpacity = useState(() => new Animated.Value(0))[0];
  const busy = form.isSubmitting || providers.isLoading;

  useEffect(() => {
    if (!providers.hasOauthOptions) {
      setAuthMethod('email');
      setDisplayedAuthMethod('email');
    }
  }, [providers.hasOauthOptions]);

  const changeAuthMethod = (next: AuthMethod) => {
    if (next === authMethod) return;
    form.clearErrors();
    Animated.timing(overlayOpacity, { toValue: 1, duration: 90, useNativeDriver: true }).start(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setAuthMethod(next);
      setDisplayedAuthMethod(next);
      Animated.timing(overlayOpacity, { toValue: 0, duration: 130, useNativeDriver: true }).start();
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoidingView}>
        <ScrollView contentContainerStyle={styles.scrollContent} overScrollMode={Platform.OS === 'android' ? 'always' : 'auto'} bounces>
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.mascotLogoWrap}><MascotPlaceholder pose="neutral" size={96} /></View>
              <Text style={styles.title}>SnackTrack</Text>
              <Text style={styles.subtitle}>Sign in to import receipts and start seeing your delivery spending more clearly.</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  style={[styles.toggleButton, form.isRegistering && styles.toggleButtonActive]}
                  onPress={() => form.setIsRegistering(true)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: form.isRegistering }}
                >
                  <Text style={[styles.toggleText, form.isRegistering && styles.toggleTextActive]}>Sign Up</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleButton, !form.isRegistering && styles.toggleButtonActive]}
                  onPress={() => form.setIsRegistering(false)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: !form.isRegistering }}
                >
                  <Text style={[styles.toggleText, !form.isRegistering && styles.toggleTextActive]}>Sign In</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.authPanelContainer}>
                {displayedAuthMethod === 'oauth' && providers.hasOauthOptions ? (
                  <View style={styles.authPanel}>
                    <Text style={styles.oauthTitle}>Fastest way to get started</Text>
                    <Text style={styles.oauthSubtitle}>
                      Try to use <Text style={styles.oauthSubtitleEmphasis}>the same email you use for your delivery apps</Text> to make importing easier later.
                    </Text>
                    {providers.showApple && providers.isAppleAvailable ? (
                      <AppleAuthentication.AppleAuthenticationButton
                        buttonType={form.isRegistering ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                        cornerRadius={8}
                        style={styles.appleButton}
                        onPress={() => void providers.loginWithApple()}
                      />
                    ) : null}
                    {providers.showGoogle ? (
                      <TouchableOpacity
                        style={styles.googleButton}
                        onPress={() => void providers.loginWithGoogle()}
                        disabled={busy}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: busy, busy }}
                      >
                        <Ionicons name="logo-google" size={24} color={Colors.textPrimary} style={styles.googleIcon} />
                        <Text style={styles.googleButtonText}>{form.isRegistering ? 'Sign up with Google' : 'Continue with Google'}</Text>
                      </TouchableOpacity>
                    ) : null}
                    <View style={styles.infoContainer}>
                      <Text style={styles.infoText}>{form.isRegistering
                        ? 'You can always connect an inbox or import receipts after your account is ready.'
                        : 'After signing in, you will continue into your import and insights flow.'}</Text>
                      <TouchableOpacity style={styles.methodSwapLink} onPress={() => changeAuthMethod('email')} accessibilityRole="button">
                        <Text style={styles.methodSwapLinkText}>{form.isRegistering ? 'Create account with email instead' : 'Sign in with email instead'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.authPanel}>
                    <Text style={styles.manualIntro}>{form.isRegistering
                      ? 'Create an account with the email you use for your delivery apps if you can.'
                      : 'Use the email tied to your account to pick up where you left off.'}</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="mail-outline" size={24} color={Colors.textSecondary} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter your email address"
                        placeholderTextColor={Colors.gray500}
                        value={form.email}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="email"
                        onChangeText={form.setEmail}
                        accessibilityLabel="Email address"
                      />
                    </View>
                    <View style={styles.inputContainer}>
                      <Ionicons name="lock-closed-outline" size={24} color={Colors.textSecondary} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter your password"
                        placeholderTextColor={Colors.gray500}
                        value={form.password}
                        onChangeText={form.setPassword}
                        secureTextEntry={!form.showPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="password"
                        accessibilityLabel="Password"
                      />
                      <TouchableOpacity
                        onPress={() => form.setShowPassword(!form.showPassword)}
                        accessibilityRole="button"
                        accessibilityLabel={form.showPassword ? 'Hide password' : 'Show password'}
                      >
                        <Ionicons name={form.showPassword ? 'eye-outline' : 'eye-off-outline'} size={24} color={Colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                    {form.isRegistering ? (
                      <View style={styles.passwordRequirements}>
                        <Text style={styles.passwordRequirementsTitle}>Choose a password with:</Text>
                        <Text style={styles.passwordRequirement}>8+ characters, 1 uppercase letter, and 1 number</Text>
                      </View>
                    ) : null}
                    {form.error ? (
                      <View style={styles.errorContainer} accessibilityRole="alert">
                        <Ionicons name="alert-circle-outline" size={18} color={Colors.errorDark} style={styles.errorIcon} />
                        <Text style={styles.errorText}>{form.error}</Text>
                      </View>
                    ) : null}
                    {!form.isRegistering ? (
                      <TouchableOpacity onPress={() => { form.clearErrors(); setShowPasswordReset(true); }} accessibilityRole="button">
                        <Text style={styles.forgotPassword}>Forgot password?</Text>
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                      style={[styles.loginButton, busy && styles.loginButtonDisabled]}
                      onPress={() => void form.submit()}
                      disabled={busy}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: busy, busy }}
                    >
                      <Text style={styles.loginButtonText}>{busy
                        ? form.isRegistering ? 'Creating Account...' : 'Signing In...'
                        : form.isRegistering ? 'Create Account' : 'Sign In'}</Text>
                    </TouchableOpacity>
                    <View style={styles.infoContainer}>
                      <Text style={styles.infoText}>{form.isRegistering
                        ? 'You can always connect an inbox or import receipts after your account is ready.'
                        : 'After signing in, you will continue into your import and insights flow.'}</Text>
                      {providers.hasOauthOptions ? (
                        <TouchableOpacity style={styles.methodSwapLink} onPress={() => changeAuthMethod('oauth')} accessibilityRole="button">
                          <Text style={styles.methodSwapLinkText}>Use Google / Apple instead</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                )}
                <Animated.View pointerEvents="none" style={[styles.authPanelOverlay, { opacity: overlayOpacity }]} />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <PasswordResetModal visible={showPasswordReset} defaultEmail={form.email} onClose={() => setShowPasswordReset(false)} />
    </SafeAreaView>
  );
};
