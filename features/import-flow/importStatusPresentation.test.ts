import { importFailureMessage, importStageLabel } from './importStatusPresentation';

it.each(['pending_dispatch', 'queued'])('does not claim receipt discovery while %s', status => {
  expect(importStageLabel(status, 'discovering')).toBe('Waiting to start');
});

it('prioritizes automatic retry over a stale discovery stage', () => {
  expect(importStageLabel('retrying', 'discovering')).toBe('Retrying automatically');
});

it('does not claim pre-reset history is preserved after supersession', () => {
  const message = importFailureMessage({ status: 'superseded', kind: 'export_file', errorCode: 'GMAIL_RECONNECT_REQUIRED' });
  expect(message).toContain('account reset');
  expect(message).not.toContain('reconnected');
});

it('gives mailbox expiry recovery without asking for a file', () => {
  const message = importFailureMessage({ status: 'expired', kind: 'gmail_historical', errorCode: null });
  expect(message).toContain('inbox');
  expect(message).not.toContain('file');
});
