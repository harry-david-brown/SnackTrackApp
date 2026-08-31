import type { WrappedCoverage } from '@/types/api';
import type { OngoingTrackingEffectiveState } from '@services/gmailApi';

export type PostWrappedExportEligibility = 'loading' | 'show' | 'hide';
export type ImportedCoverageAssessment = 'sparse' | 'standard' | 'unknown';

export interface PostWrappedExperience {
  exportEligibility: PostWrappedExportEligibility;
  coverageAssessment: ImportedCoverageAssessment;
}

export interface TrackingPropositionCopy {
  eyebrow: string;
  title: string;
  body: string;
}

export const resolveInitialPostDeckStep = (
  exportEligibility: PostWrappedExportEligibility
): 'tracking' | 'export' => exportEligibility === 'loading' ? 'export' : 'tracking';

// Intentionally conservative starting thresholds. A tiny order history is
// sparse on its own; a short date window is only sparse when the order count is
// also low. Keeping these named makes the rule easy to tune from launch data.
export const SPARSE_COVERAGE_MAX_ORDERS = 5;
export const SHORT_COVERAGE_MAX_DAYS = 90;
export const SHORT_COVERAGE_MAX_ORDERS = 10;

const daysBetween = (start: string, end: string): number | null => {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();

  if (Number.isNaN(startTime) || Number.isNaN(endTime) || endTime < startTime) {
    return null;
  }

  return Math.floor((endTime - startTime) / (24 * 60 * 60 * 1000));
};

export const assessImportedCoverage = (
  coverage?: WrappedCoverage
): ImportedCoverageAssessment => {
  if (!coverage) {
    return 'unknown';
  }

  if (coverage.orderCount <= SPARSE_COVERAGE_MAX_ORDERS) {
    return 'sparse';
  }

  if (!coverage.earliestOrderDate || !coverage.latestOrderDate) {
    return 'unknown';
  }

  const coverageDays = daysBetween(
    coverage.earliestOrderDate,
    coverage.latestOrderDate
  );

  if (coverageDays === null) {
    return 'unknown';
  }

  if (
    coverageDays <= SHORT_COVERAGE_MAX_DAYS
    && coverage.orderCount <= SHORT_COVERAGE_MAX_ORDERS
  ) {
    return 'sparse';
  }

  return 'standard';
};

export const resolvePostWrappedExperience = ({
  isExportStateLoading,
  hasCompletedAllExports,
  coverage,
}: {
  isExportStateLoading: boolean;
  hasCompletedAllExports: boolean;
  coverage?: WrappedCoverage;
}): PostWrappedExperience => ({
  exportEligibility: isExportStateLoading
    ? 'loading'
    : hasCompletedAllExports
      ? 'hide'
      : 'show',
  coverageAssessment: assessImportedCoverage(coverage),
});

export const resolveTrackingPropositionCopy = ({
  trackingState,
}: {
  trackingState: OngoingTrackingEffectiveState;
}): TrackingPropositionCopy => {
  if (trackingState === 'setting_up') {
    return {
      eyebrow: 'CATCHING UP',
      title: 'Your ongoing updates are being prepared',
      body: 'SnackTrack is checking for supported delivery receipts newer than your existing history.',
    };
  }
  if (trackingState === 'active') {
    return {
      eyebrow: 'ONGOING TRACKING IS ON',
      title: 'Your stats will keep growing',
      body: 'SnackTrack can periodically check Gmail for new delivery receipts and keep your spending stats up to date.',
    };
  }
  if (trackingState === 'reconnect_required') {
    return {
      eyebrow: 'ONGOING UPDATES ARE PAUSED',
      title: 'Reconnect Gmail to keep tracking',
      body: 'Your history is safe, but SnackTrack needs a healthy Gmail connection before it can check for future receipts.',
    };
  }
  if (trackingState === 'error') {
    return {
      eyebrow: 'TRACKING NEEDS ATTENTION',
      title: 'We couldn’t start ongoing updates',
      body: 'Your imported history is safe. Reconnect Gmail or try again from the dashboard.',
    };
  }
  return {
    eyebrow: 'OPTIONAL FUTURE UPDATES',
    title: 'Keep your stats growing',
    body: 'Allow SnackTrack to periodically check your connected Gmail for new delivery receipts. You can turn this off at any time.',
  };
};
