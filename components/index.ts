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
export { UberDataUpload } from './upload/UberDataUpload';
export { default as UberDataTutorial } from './upload/UberDataTutorial';

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

// Gmail component
export { GmailConnection } from './gmail/GmailConnection';

// Other components (kept at root for now)
export { default as InsightsPanel } from './InsightsPanel';
export { NetworkStatusIndicator } from './NetworkStatusIndicator';
export { default as OnboardingScreen } from './OnboardingScreen';
export { ErrorTestingPanel } from './ErrorTestingPanel';
export { ErrorThrower } from './ErrorThrower';

