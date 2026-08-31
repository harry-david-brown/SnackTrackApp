import { resolveProviderTutorialEntry } from '@features/import-flow/providerTutorialEntry';

describe('resolveProviderTutorialEntry', () => {
  it.each([
    ['not_started', 'request', 'request'],
    ['requested', 'waiting', 'request'],
    ['file_ready', 'download', 'download'],
    ['import_processing', 'processing', 'download'],
    ['failed', 'retry', 'download'],
    ['completed', 'update', 'request'],
  ] as const)('maps %s to %s', (status, job, mode) => {
    expect(resolveProviderTutorialEntry(status)).toEqual({ job, mode });
  });
});
