/**
 * Components barrel export
 * Re-exports all components organized by feature for convenient importing
 */

// Auth components
export { LoginScreen } from './auth/LoginScreen';
export { default as PasswordResetModal } from './auth/PasswordResetModal';
export { default as EmailVerificationModal } from './auth/EmailVerificationModal';
export { default as EmailVerificationBanner } from './auth/EmailVerificationBanner';

// Chart components
export { default as CategoryAnalysisChart } from './charts/CategoryAnalysisChart';
export { default as RestaurantBreakdownChart } from './charts/RestaurantBreakdownChart';
export { default as SpendingTrendChart } from './charts/SpendingTrendChart';
export { default as SimpleChart } from './charts/SimpleChart';
export { default as ChartContainer } from './charts/ChartContainer';

// Upload components
export { ExportDataUpload, UberDataUpload } from './upload/UberDataUpload';
export { default as UberDataTutorial } from './upload/UberDataTutorial';
export { ImportTaskCard } from './upload/ImportTaskCard';
export type { ImportTaskId } from './upload/ImportTaskCard';

// Wrapped components
export { default as WrappedShareJourney } from './wrapped/WrappedShareJourney';
export { default as WrappedJourneyLoader } from './wrapped/WrappedJourneyLoader';

// Sharing components
export { default as SocialShareModal } from './sharing/SocialShareModal';
export { default as ShareableGraphics } from './sharing/ShareableGraphics';
export { default as QuickShareButton } from './sharing/QuickShareButton';

// UI/Shared components
export { EmptyState } from './ui/EmptyState';
export { ErrorMessage } from './ui/ErrorMessage';
export { ErrorBoundary } from './ui/ErrorBoundary';
export { LoadingSpinner } from './ui/LoadingSpinner';
export { FadeInView } from './ui/FadeInView';
export { SlideInView } from './ui/SlideInView';

// Mascot
export { MascotPlaceholder } from './mascot/MascotPlaceholder';
export type { MascotPose } from './mascot/MascotPlaceholder';

// Gmail components
export { GmailConnection } from './gmail/GmailConnection';
export { GmailImportLoadingModal } from './gmail/GmailImportLoadingModal';
export type { GmailConnectPhase } from './gmail/GmailImportLoadingModal';

// Profile components
export { HelpSupportModal } from './profile/HelpSupportModal';
export { CurrencySelectorModal } from './profile/CurrencySelectorModal';

// Other components (kept at root for now)
export { default as InsightsPanel } from './InsightsPanel';
export { NetworkStatusIndicator } from './NetworkStatusIndicator';
export { default as OnboardingScreen } from './OnboardingScreen';
export { ErrorThrower } from './ErrorThrower';
