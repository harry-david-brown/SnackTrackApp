import {
  assessImportedCoverage,
  resolvePostWrappedExperience,
  resolveTrackingPropositionCopy,
} from '../../components/wrapped/postWrappedState';
import type { WrappedCoverage } from '../../types/api';

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
  it('shows the export proposition whenever export state is loaded and incomplete', () => {
    expect(resolvePostWrappedExperience({
      isExportStateLoading: false,
      hasCompletedExport: false,
      coverage: coverage(),
    }).exportEligibility).toBe('show');
  });

  it('does not use prior dismissals or summary-view count as eligibility inputs', () => {
    const input = {
      isExportStateLoading: false,
      hasCompletedExport: false,
      coverage: coverage(),
    };

    expect(resolvePostWrappedExperience(input).exportEligibility).toBe('show');
    expect(resolvePostWrappedExperience(input).exportEligibility).toBe('show');
  });

  it('hides the export proposition only after export completion', () => {
    expect(resolvePostWrappedExperience({
      isExportStateLoading: false,
      hasCompletedExport: true,
      coverage: coverage({ hasExportData: true }),
    }).exportEligibility).toBe('hide');
  });

  it('waits for export completion state before deciding', () => {
    expect(resolvePostWrappedExperience({
      isExportStateLoading: true,
      hasCompletedExport: false,
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

  it('does not assess an already exported history as sparse', () => {
    expect(assessImportedCoverage(coverage({
      orderCount: 2,
      hasExportData: true,
    }))).toBe('unknown');
  });
});

describe('resolveTrackingPropositionCopy', () => {
  it('replaces export-ready alerts with ongoing value after an export completes', () => {
    const copy = resolveTrackingPropositionCopy({
      hasCompletedExport: true,
      monitoringState: 'enabled',
    });

    expect(copy.title).toBe('Your stats will keep growing');
    expect(copy.body).toContain('continue to track new Uber Eats orders');
    expect(copy.body).toContain('keeping your spending stats up to date');
    expect(copy.body).not.toContain('installed');
    expect(copy.body).not.toContain('data-ready email');
  });

  it('keeps export-ready messaging while an export is incomplete', () => {
    const copy = resolveTrackingPropositionCopy({
      hasCompletedExport: false,
      monitoringState: 'enabled',
    });

    expect(copy.title).toBe('We’ll let you know when it’s ready');
    expect(copy.body).toContain('data-ready email');
  });
});
