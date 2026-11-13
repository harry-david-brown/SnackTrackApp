import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useMemo, useState } from 'react';
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
import { Mascot } from '@components/mascot/Mascot';
import PasswordResetModal from './PasswordResetModal';
import { MicrosoftEmailVerificationModal } from './MicrosoftEmailVerificationModal';
import { createLoginStyles } from './loginStyles';
import { useLoginForm } from './useLoginForm';
import { useLoginProviders } from './useLoginProviders';
import { useAppTheme } from '@contexts/AppearanceContext';

WebBrowser.maybeCompleteAuthSession();

interface LoginScreenProps { onLoginSuccess?: () => void }
type AuthMethod = 'oauth' | 'email';

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const theme = useAppTheme();
  const styles = useMemo(() => createLoginStyles(theme), [theme]);
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
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent} overScrollMode={Platform.OS === 'android' ? 'always' : 'auto'} bounces>
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.mascotLogoWrap}><Mascot pose="neutral" size={96} /></View>
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
                    <Text style={styles.oauthTitle}>{form.isRegistering ? 'Create your SnackTrack account' : 'Welcome back'}</Text>
                    <Text style={styles.oauthSubtitle}>
                      {form.isRegistering ? 'Your sign-in email can be different from the inbox that receives your delivery receipts.' : 'Sign in with the account you used to join SnackTrack.'}
                    </Text>
                    {providers.showApple && providers.isAppleAvailable ? (
                      <AppleAuthentication.AppleAuthenticationButton
                        buttonType={form.isRegistering ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                        buttonStyle={theme.scheme === 'dark' ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
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
                        <Ionicons name="logo-google" size={24} color={theme.colors.textPrimary} style={styles.googleIcon} />
                        <Text style={styles.googleButtonText}>{form.isRegistering ? 'Sign up with Google' : 'Continue with Google'}</Text>
                      </TouchableOpacity>
                    ) : null}
                    {providers.showMicrosoft ? (
                      <TouchableOpacity
                        style={styles.googleButton}
                        onPress={() => void providers.loginWithMicrosoft()}
                        disabled={busy}
                        accessibilityRole="button"
                        accessibilityLabel={form.isRegistering ? 'Sign up with Microsoft' : 'Continue with Microsoft'}
                        accessibilityState={{ disabled: busy, busy }}
                      >
                        <Ionicons name="logo-microsoft" size={24} color={theme.colors.textPrimary} style={styles.googleIcon} />
                        <Text style={styles.googleButtonText}>
                          {form.isRegistering ? 'Sign up with Microsoft' : 'Continue with Microsoft'}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                    <View style={styles.infoContainer}>
                      <Text style={styles.infoText}>{form.isRegistering
                        ? 'You’ll add your orders after creating your account.'
                        : 'Pick up where you left off.'}</Text>
                      <TouchableOpacity style={styles.methodSwapLink} onPress={() => changeAuthMethod('email')} accessibilityRole="button">
                        <Text style={styles.methodSwapLinkText}>{form.isRegistering ? 'Create account with email instead' : 'Sign in with email instead'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.authPanel}>
                    <Text style={styles.manualIntro}>{form.isRegistering
                      ? 'Use any email you can access. You’ll choose the email registered with your delivery apps after signup.'
                      : 'Use the email tied to your account to pick up where you left off.'}</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="mail-outline" size={24} color={theme.colors.textSecondary} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter your email address"
                        placeholderTextColor={theme.colors.gray500}
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
                      <Ionicons name="lock-closed-outline" size={24} color={theme.colors.textSecondary} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter your password"
                        placeholderTextColor={theme.colors.gray500}
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
                        <Ionicons name={form.showPassword ? 'eye-outline' : 'eye-off-outline'} size={24} color={theme.colors.textSecondary} />
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
                        <Ionicons name="alert-circle-outline" size={18} color={theme.colors.errorDark} style={styles.errorIcon} />
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
                        ? 'You’ll add your orders after creating your account.'
                        : 'Pick up where you left off.'}</Text>
                      {providers.hasOauthOptions ? (
                        <TouchableOpacity style={styles.methodSwapLink} onPress={() => changeAuthMethod('oauth')} accessibilityRole="button">
                          <Text style={styles.methodSwapLinkText}>See other sign-in options</Text>
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
      <MicrosoftEmailVerificationModal
        visible={providers.microsoftChallenge !== null}
        suggestedEmail={providers.microsoftChallenge?.suggestedEmail}
        onSendCode={providers.sendMicrosoftVerificationEmail}
        onConfirm={providers.confirmMicrosoftVerificationEmail}
        onCancel={providers.cancelMicrosoftVerification}
      />
    </SafeAreaView>
  );
};
