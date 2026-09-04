/**
 * Components barrel export
 * Re-exports all components organized by feature for convenient importing
 */

// Auth components
export { LoginScreen } from './auth/LoginScreen';
export { default as PasswordResetModal } from './auth/PasswordResetModal';
export { default as EmailVerificationModal } from './auth/EmailVerificationModal';
export { default as EmailVerificationBanner } from './auth/EmailVerificationBanner';

// Upload components
export { ExportDataUpload, UberDataUpload } from './upload/UberDataUpload';
export { default as UberDataTutorial } from './upload/UberDataTutorial';
export { ImportTaskCard } from './upload/ImportTaskCard';
export type { ImportTaskId } from './upload/ImportTaskCard';

// Wrapped components
export { default as WrappedShareJourney } from './wrapped/WrappedShareJourney';

// UI/Shared components
export { EmptyState } from './ui/EmptyState';
export { ErrorMessage } from './ui/ErrorMessage';
export { ErrorBoundary } from './ui/ErrorBoundary';
export { LoadingSpinner } from './ui/LoadingSpinner';
export { FadeInView } from './ui/FadeInView';

// Mascot
export { Mascot } from './mascot/Mascot';
export type { MascotPose } from './mascot/Mascot';

// Gmail components
export { GmailConnection } from './gmail/GmailConnection';
export { GmailImportLoadingModal } from './gmail/GmailImportLoadingModal';
export type { GmailConnectPhase } from './gmail/GmailImportLoadingModal';

// App entry
export { default as OnboardingScreen } from './OnboardingScreen';
