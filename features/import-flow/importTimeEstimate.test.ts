import { importTimeEstimateText, stabilizeImportTimeEstimate } from './importTimeEstimate';

describe('import time estimates', () => {
  it('uses calm, coarse language for each estimate state', () => {
    expect(importTimeEstimateText(null)).toBe('Estimating time…');
    expect(importTimeEstimateText({ kind: 'total', minimumMinutes: 2, maximumMinutes: 3, revision: 0 })).toBe('Usually takes 2–3 minutes');
    expect(importTimeEstimateText({ kind: 'remaining', minimumMinutes: 1, maximumMinutes: 2, revision: 0 })).toBe('About 1–2 minutes remaining');
    expect(importTimeEstimateText({ kind: 'retry_wait', minimumMinutes: 1, maximumMinutes: 2, revision: 1 })).toBe('About 1–2 minutes remaining');
    expect(importTimeEstimateText({ kind: 'finishing', minimumMinutes: null, maximumMinutes: null, revision: 1 })).toBe('Finishing up');
  });

  it('does not let a like-for-like estimate jump backward', () => {
    expect(stabilizeImportTimeEstimate(
      { kind: 'remaining', minimumMinutes: 1, maximumMinutes: 2, revision: 1 },
      { kind: 'remaining', minimumMinutes: 4, maximumMinutes: 5, revision: 1 },
    )).toEqual({ kind: 'remaining', minimumMinutes: 1, maximumMinutes: 2, revision: 1 });
  });

  it('allows a new retry attempt to establish a new estimate', () => {
    expect(stabilizeImportTimeEstimate(
      { kind: 'retry_wait', minimumMinutes: 1, maximumMinutes: 1, revision: 1 },
      { kind: 'retry_wait', minimumMinutes: 2, maximumMinutes: 3, revision: 2 },
    )).toEqual({ kind: 'retry_wait', minimumMinutes: 2, maximumMinutes: 3, revision: 2 });
  });
});
