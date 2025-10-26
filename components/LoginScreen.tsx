import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../contexts/UserContext';
import { useOnboarding } from '../contexts/OnboardingContext';
import UberDataTutorial from './UberDataTutorial';

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(true); // Default to registration
  const [showTutorial, setShowTutorial] = useState(false);
  const { register, login, state, clearError } = useUser();
  const { completeOnboarding } = useOnboarding();

  // Show error alert when state.error changes
  useEffect(() => {
    if (state.error && !state.isLoading) {
      Alert.alert(
        isRegistering ? 'Registration Failed' : 'Login Failed',
        state.error,
        [
          {
            text: 'OK',
            onPress: () => clearError(),
          },
        ]
      );
    }
  }, [state.error, state.isLoading]);

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
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    // Validate password
    if (!password) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    if (isRegistering) {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        Alert.alert(
          'Invalid Password',
          'Password must have:\n' + passwordValidation.errors.map(e => '• ' + e).join('\n')
        );
        return;
      }
    }

    try {
      setIsLoading(true);
      
      if (isRegistering) {
        await register(email.trim().toLowerCase(), password);
        
        // New users see the tutorial after registration
        setShowTutorial(true);
      } else {
        await login(email.trim().toLowerCase(), password);
        
        Alert.alert(
          'Welcome Back! 🥡',
          'You\'ve successfully logged in.',
          [
            {
              text: 'Continue',
              onPress: onLoginSuccess,
            },
          ]
        );
      }
    } catch (error: any) {
      // Error is already set in state by UserContext
      // state.error will be displayed when the component re-renders
    } finally {
      setIsLoading(false);
    }
  };

  const handleTutorialComplete = async () => {
    // Complete onboarding and let app/index.tsx handle navigation
    await completeOnboarding();
    setShowTutorial(false);
  };

  // Show tutorial as full-screen overlay
  if (showTutorial) {
    return <UberDataTutorial onComplete={handleTutorialComplete} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>🥡 Snack Track</Text>
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

            {/* Features Preview */}
            <View style={styles.featuresContainer}>
              <Text style={styles.featuresTitle}>What you&apos;ll get:</Text>
              <View style={styles.featureItem}>
                <Ionicons name="analytics-outline" size={20} color="#007AFF" />
                <Text style={styles.featureText}>Beautiful spending analytics</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="cloud-upload-outline" size={20} color="#007AFF" />
                <Text style={styles.featureText}>Easy CSV import from Uber Eats</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="share-social-outline" size={20} color="#007AFF" />
                <Text style={styles.featureText}>Shareable spending summaries</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  featuresContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
});

export default LoginScreen;
