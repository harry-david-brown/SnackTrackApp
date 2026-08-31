import {
  assessImportedCoverage,
  resolveInitialPostDeckStep,
  resolvePostWrappedExperience,
  resolveTrackingPropositionCopy,
} from '@components/wrapped/postWrappedState';
import type { WrappedCoverage } from '@/types/api';

const coverage = (
  overrides: Partial<WrappedCoverage> = {}
): WrappedCoverage => ({
  orderCount: 30,
  earliestOrderDate: '2024-01-01',
  latestOrderDate: '2026-01-01',
  dataSources: ['email'],
  hasExportData: false,
  ...overrides,
});

describe('resolvePostWrappedExperience', () => {
  it('puts ongoing updates before an optional export once export state is known', () => {
    expect(resolveInitialPostDeckStep('show')).toBe('tracking');
    expect(resolveInitialPostDeckStep('loading')).toBe('export');
    expect(resolveInitialPostDeckStep('hide')).toBe('tracking');
  });
  it('shows the export proposition whenever export state is loaded and incomplete', () => {
    expect(resolvePostWrappedExperience({
      isExportStateLoading: false,
      hasCompletedAllExports: false,
      coverage: coverage(),
    }).exportEligibility).toBe('show');
  });

  it('does not use prior dismissals or summary-view count as eligibility inputs', () => {
    const input = {
      isExportStateLoading: false,
      hasCompletedAllExports: false,
      coverage: coverage(),
    };

    expect(resolvePostWrappedExperience(input).exportEligibility).toBe('show');
    expect(resolvePostWrappedExperience(input).exportEligibility).toBe('show');
  });

  it('hides the export proposition only after export completion', () => {
    expect(resolvePostWrappedExperience({
      isExportStateLoading: false,
      hasCompletedAllExports: true,
      coverage: coverage({ hasExportData: true }),
    }).exportEligibility).toBe('hide');
  });

  it('waits for export completion state before deciding', () => {
    expect(resolvePostWrappedExperience({
      isExportStateLoading: true,
      hasCompletedAllExports: false,
      coverage: coverage(),
    }).exportEligibility).toBe('loading');
  });
});

describe('assessImportedCoverage', () => {
  it('classifies a tiny inbox history as sparse', () => {
    expect(assessImportedCoverage(coverage({
      orderCount: 4,
      earliestOrderDate: '2025-01-01',
      latestOrderDate: '2026-01-01',
    }))).toBe('sparse');
  });

  it('classifies a short, low-volume history as sparse', () => {
    expect(assessImportedCoverage(coverage({
      orderCount: 8,
      earliestOrderDate: '2026-04-01',
      latestOrderDate: '2026-06-01',
    }))).toBe('sparse');
  });

  it('keeps a long, substantial inbox history standard', () => {
    expect(assessImportedCoverage(coverage())).toBe('standard');
  });

  it('uses neutral messaging when dates are unavailable or invalid', () => {
    expect(assessImportedCoverage(coverage({
      earliestOrderDate: null,
      latestOrderDate: null,
    }))).toBe('unknown');
    expect(assessImportedCoverage(coverage({
      earliestOrderDate: 'not-a-date',
    }))).toBe('unknown');
  });

  it('still assesses sparse coverage when only some export data exists', () => {
    expect(assessImportedCoverage(coverage({
      orderCount: 2,
      hasExportData: true,
    }))).toBe('sparse');
  });
});

describe('resolveTrackingPropositionCopy', () => {
  it('shows truthful active-tracking copy only when tracking is active', () => {
    const copy = resolveTrackingPropositionCopy({
      trackingState: 'active',
    });

    expect(copy.title).toBe('Your stats will keep growing');
    expect(copy.body).toContain('periodically check Gmail');
    expect(copy.body).toContain('keep your spending stats up to date');
    expect(copy.body).not.toContain('installed');
    expect(copy.body).not.toContain('data-ready email');
  });

  it('asks for ongoing consent without claiming it is already enabled', () => {
    const copy = resolveTrackingPropositionCopy({
      trackingState: 'not_offered',
    });

    expect(copy.title).toBe('Keep your stats growing');
    expect(copy.body).toContain('Allow SnackTrack');
    expect(copy.body).not.toContain('will continue');
    expect(copy.body).not.toContain('data-ready email');
  });

  it.each(['reconnect_required', 'error'] as const)('provides recovery copy for %s', (trackingState) => {
    const copy = resolveTrackingPropositionCopy({ trackingState });
    expect(copy.body).toContain('history is safe');
  });
});
