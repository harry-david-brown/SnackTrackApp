import { useCallback, useEffect, useState } from 'react';
import { useUser } from '../../contexts/UserContext';
import { validateEmail, validatePassword } from './authValidation';

export function useLoginForm(onSuccess?: () => void) {
  const { register, login, state, clearError } = useUser();
  const [email, setEmailState] = useState('');
  const [password, setPasswordState] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegisteringState] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (state.error && !state.isLoading) setError(state.error);
  }, [state.error, state.isLoading]);

  const clearErrors = useCallback(() => {
    setError(null);
    clearError();
  }, [clearError]);

  const setEmail = useCallback((value: string) => {
    setEmailState(value);
    if (error || state.error) clearErrors();
  }, [clearErrors, error, state.error]);

  const setPassword = useCallback((value: string) => {
    setPasswordState(value);
    if (error || state.error) clearErrors();
  }, [clearErrors, error, state.error]);

  const setIsRegistering = useCallback((value: boolean) => {
    setIsRegisteringState(value);
    clearErrors();
  }, [clearErrors]);

  const submit = useCallback(async () => {
    clearErrors();
    if (!email.trim()) return setError('Enter your email address to continue.');
    if (!validateEmail(email)) return setError('Enter a valid email address.');
    if (!password) return setError(isRegistering ? 'Create a password to continue.' : 'Enter your password to continue.');
    if (isRegistering) {
      const validation = validatePassword(password);
      if (!validation.isValid) return setError(`Password must include ${validation.errors.join(', ')}.`);
    }
    setIsSubmitting(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (isRegistering) await register(normalizedEmail, password);
      else await login(normalizedEmail, password);
      onSuccess?.();
    } catch {
      // UserContext publishes a safe form error.
    } finally {
      setIsSubmitting(false);
    }
  }, [clearErrors, email, isRegistering, login, onSuccess, password, register]);

  return {
    email, password, showPassword, isRegistering, error,
    isSubmitting: isSubmitting || state.isLoading,
    setEmail, setPassword, setShowPassword, setIsRegistering, clearErrors, submit,
  };
}
