import type { ProviderExportLifecycleStatus } from './contracts';

export type ProviderTutorialJob =
  | 'request'
  | 'waiting'
  | 'download'
  | 'processing'
  | 'retry'
  | 'update';

export interface ProviderTutorialEntry {
  job: ProviderTutorialJob;
  mode: 'request' | 'download';
}

export function resolveProviderTutorialEntry(
  status: ProviderExportLifecycleStatus | string | undefined,
): ProviderTutorialEntry {
  switch (status) {
    case 'requested': return { job: 'waiting', mode: 'request' };
    case 'file_ready': return { job: 'download', mode: 'download' };
    case 'import_processing': return { job: 'processing', mode: 'download' };
    case 'failed': return { job: 'retry', mode: 'download' };
    case 'completed': return { job: 'update', mode: 'request' };
    default: return { job: 'request', mode: 'request' };
  }
}
