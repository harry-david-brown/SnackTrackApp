import type { ImportOperationStatus, ImportTimeEstimate } from './contracts';

const duration = (minimum: number, maximum: number): string => {
  if (minimum === maximum) return minimum === 1 ? '1 minute' : `${minimum} minutes`;
  return `${minimum}–${maximum} minutes`;
};

export const importTimeEstimateText = (estimate: ImportTimeEstimate | null, status: ImportOperationStatus | undefined): string => {
  if (!estimate) return 'Estimating time…';
  if (estimate.kind === 'finishing') return status === 'running' ? 'Finishing up' : 'Estimating time…';
  const minimum = estimate.minimumMinutes!;
  const maximum = estimate.maximumMinutes!;
  if (estimate.kind === 'total') return `Usually takes ${duration(minimum, maximum)}`;
  return `About ${duration(minimum, maximum)} remaining`;
};

export const stabilizeImportTimeEstimate = (
  previous: ImportTimeEstimate | null,
  incoming: ImportTimeEstimate | null,
): ImportTimeEstimate | null => {
  if (!incoming) return previous;
  if (!previous || previous.kind !== incoming.kind || previous.revision !== incoming.revision) return incoming;
  if (incoming.kind === 'finishing' || previous.kind === 'finishing') return incoming;
  const maximumMinutes = Math.min(previous.maximumMinutes!, incoming.maximumMinutes!);
  return {
    ...incoming,
    minimumMinutes: Math.min(previous.minimumMinutes!, incoming.minimumMinutes!, maximumMinutes),
    maximumMinutes,
  };
};
