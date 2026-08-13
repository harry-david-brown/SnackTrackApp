import type { WrappedCoverage } from '@/types/api';
import type { EffectiveMonitoringState } from '@services/gmailApi';

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
  if (!coverage || coverage.hasExportData) {
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
  hasCompletedExport,
  coverage,
}: {
  isExportStateLoading: boolean;
  hasCompletedExport: boolean;
  coverage?: WrappedCoverage;
}): PostWrappedExperience => ({
  exportEligibility: isExportStateLoading
    ? 'loading'
    : hasCompletedExport
      ? 'hide'
      : 'show',
  coverageAssessment: assessImportedCoverage(coverage),
});

export const resolveTrackingPropositionCopy = ({
  hasCompletedExport,
  monitoringState,
}: {
  hasCompletedExport: boolean;
  monitoringState: EffectiveMonitoringState;
}): TrackingPropositionCopy => {
  if (hasCompletedExport) {
    return {
      eyebrow: 'READY FOR WHAT’S NEXT',
      title: 'Your stats will keep growing',
      body: 'SnackTrack will continue to track new Uber Eats orders as receipts are imported, keeping your spending stats up to date.',
    };
  }

  if (monitoringState === 'enabled') {
    return {
      eyebrow: 'EXPORT ALERTS ON',
      title: 'We’ll let you know when it’s ready',
      body: 'When SnackTrack is active, it can check for Uber’s data-ready email and tell you when to download the file. It will never download the archive itself.',
    };
  }

  if (monitoringState === 'reconnect_required') {
    return {
      eyebrow: 'DON’T MISS YOUR EXPORT',
      title: 'Reconnect to restore alerts',
      body: 'Your permission is saved, but Gmail needs to be reconnected before SnackTrack can check for the data-ready email.',
    };
  }

  return {
    eyebrow: 'DON’T MISS YOUR EXPORT',
    title: 'Know when Uber’s file is ready',
    body: 'Allow SnackTrack to check only for Uber’s data-ready email while the app is active. You’ll still sign in to Uber and download the file yourself.',
  };
};
