import type { ExportProvider } from './contracts';

interface ImportErrorDetails {
  readonly code?: string;
  readonly details?: unknown;
}

export interface ExportUploadLimitNotice {
  readonly provider: ExportProvider;
  readonly retryAt: string | null;
  readonly title: string;
  readonly message: string;
}

const record = (value: unknown): Record<string, unknown> | null => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
);

export const resolveExportUploadLimitNotice = (
  error: ImportErrorDetails,
  selectedProvider: ExportProvider,
): ExportUploadLimitNotice | null => {
  if (error.code !== 'EXPORT_UPLOAD_RATE_LIMITED') return null;
  const details = record(error.details);
  const retryAt = typeof details?.retryAt === 'string' && !Number.isNaN(Date.parse(details.retryAt))
    ? details.retryAt
    : null;
  const providerName = selectedProvider === 'uber_eats' ? 'Uber Eats' : 'DoorDash';
  return {
    provider: selectedProvider,
    retryAt,
    title: `Today’s ${providerName} import limit is reached`,
    message: `You’ve started several ${providerName} imports recently. Your selected file is still here. Come back tomorrow to try again.`,
  };
};
