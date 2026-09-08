import type { ExportProvider } from './contracts';
import { buildAddHistoryDestination } from './postOnboardingImportRoute';
import type { ImportReturnTo } from './importNavigation';

export const buildProviderHistoryDestination = (provider: ExportProvider, status?: string, returnTo: ImportReturnTo = 'home') =>
  buildAddHistoryDestination(status && ['requested', 'file_ready', 'import_processing', 'failed'].includes(status) ? 'resume_export' : 'provider', provider, returnTo);
