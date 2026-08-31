import React from 'react';
import { render } from '@testing-library/react-native';
import { GmailImportTaskSection } from '@components/upload/GmailImportTaskSection';

const baseProps = {
  state: { complete: true, label: 'Checked', tone: 'complete' as const },
  isOpen: true,
  connected: true,
  canImport: true,
  needsReconnect: false,
  temporarilyUnavailable: false,
  busy: false,
  buttonLabel: 'Import from Gmail',
  title: 'Email history checked',
  description: '24 Gmail orders included in your stats.',
  disconnectedHelper: 'Connect Gmail first.',
  passive: true,
  onToggle: jest.fn(),
  onImport: jest.fn(),
};

describe('GmailImportTaskSection', () => {
  it('renders completed Gmail history as passive status without another import button', () => {
    const screen = render(<GmailImportTaskSection {...baseProps} />);

    expect(screen.getByText('Email history checked')).toBeTruthy();
    expect(screen.getByText('24 Gmail orders included in your stats.')).toBeTruthy();
    expect(screen.queryByText('Import from Gmail')).toBeNull();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('keeps a failed manual check actionable for recovery', () => {
    const screen = render(<GmailImportTaskSection
      {...baseProps}
      state={{ complete: true, label: 'Retry available', tone: 'warning' }}
      passive={false}
      buttonLabel="Try checking again"
    />);

    expect(screen.getByText('Try checking again')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try checking again' })).toBeTruthy();
  });
});
