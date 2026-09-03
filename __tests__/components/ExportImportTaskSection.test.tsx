import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ExportImportTaskSection } from '@components/upload/ExportImportTaskSection';

jest.mock('@components/upload/UberDataUpload', () => {
  const { Text } = jest.requireActual('react-native');
  return { UberDataUpload: () => <Text>Choose Export File</Text> };
});

const baseProps = {
  state: { complete: false, label: 'Optional', tone: 'optional' as const },
  providerProgress: {
    importedCount: 0 as const,
    uberEats: { imported: false, receiptCount: 0, status: 'not_started' },
    doorDash: { imported: false, receiptCount: 0, status: 'not_started' },
  },
  isOpen: true,
  fileReady: false,
  exportRequested: false,
  downloadState: 'not_downloaded' as const,
  autoOpenToken: null,
  onToggle: jest.fn(),
  onLayout: jest.fn(),
  onOpenEmail: jest.fn(),
  onDownloaded: jest.fn(),
  onShowTutorial: jest.fn(),
  onImportProvider: jest.fn(),
  onAutoOpenConsumed: jest.fn(),
  onUploadSuccess: jest.fn(),
  onUploadError: jest.fn(),
};

describe('ExportImportTaskSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('leads an unrequested user into the guide instead of showing the file picker', () => {
    const screen = render(<ExportImportTaskSection {...baseProps} />);

    expect(screen.getByText('Request your delivery data')).toBeTruthy();
    expect(screen.getByText('Request Your Data')).toBeTruthy();
    expect(screen.queryByText('Choose Export File')).toBeNull();

    fireEvent.press(screen.getByText('Request Your Data'));
    expect(baseProps.onShowTutorial).toHaveBeenCalledTimes(1);
  });

  it('uses the guide to resolve the next step for a previously requested export', () => {
    const screen = render(<ExportImportTaskSection {...baseProps} exportRequested />);

    expect(screen.getByText('Continue your data request')).toBeTruthy();
    expect(screen.getByText('Check What to Do Next')).toBeTruthy();
    expect(screen.queryByText('Choose Export File')).toBeNull();
  });

  it('shows one-of-two progress and keeps the missing provider actionable', () => {
    const screen = render(<ExportImportTaskSection
      {...baseProps}
      state={{ complete: false, label: '1 of 2 imported', tone: 'recommended' }}
      providerProgress={{
        importedCount: 1,
        uberEats: { imported: true, receiptCount: 15, status: 'completed' },
        doorDash: { imported: false, receiptCount: 0, status: 'not_started' },
      }}
    />);

    expect(screen.getByText('One delivery app added')).toBeTruthy();
    expect(screen.getByText('Import DoorDash')).toBeTruthy();
    expect(screen.getByText('Add Newer Uber Eats History')).toBeTruthy();

    fireEvent.press(screen.getByText('Import DoorDash'));
    expect(baseProps.onImportProvider).toHaveBeenCalledWith('doordash');
  });

  it('shows the uploader when a second-provider archive has been downloaded', () => {
    const screen = render(<ExportImportTaskSection
      {...baseProps}
      state={{ complete: false, label: '1 of 2 imported', tone: 'recommended' }}
      downloadState="downloaded"
      providerProgress={{
        importedCount: 1,
        uberEats: { imported: true, receiptCount: 15, status: 'completed' },
        doorDash: { imported: false, receiptCount: 0, status: 'not_started' },
      }}
    />);

    expect(screen.getByText('Add your downloaded history')).toBeTruthy();
    expect(screen.getByText('Choose Export File')).toBeTruthy();
  });

  it('treats newer archives as one neutral maintenance action after both are imported', () => {
    const screen = render(<ExportImportTaskSection
      {...baseProps}
      state={{ complete: true, label: '2 of 2 imported', tone: 'complete' }}
      providerProgress={{
        importedCount: 2,
        uberEats: { imported: true, receiptCount: 15, status: 'completed' },
        doorDash: { imported: true, receiptCount: 8, status: 'completed' },
      }}
    />);

    expect(screen.getByText('Your delivery history is complete')).toBeTruthy();
    expect(screen.getByText('Add Newer History')).toBeTruthy();
    expect(screen.queryByText('Update Uber Eats')).toBeNull();
    expect(screen.queryByText('Update DoorDash')).toBeNull();

    fireEvent.press(screen.getByText('Add Newer History'));
    expect(baseProps.onShowTutorial).toHaveBeenCalledTimes(1);
  });

  it('makes a failed provider retry the primary action', () => {
    const screen = render(<ExportImportTaskSection
      {...baseProps}
      state={{ complete: false, label: 'Needs attention', tone: 'warning' }}
      providerProgress={{
        importedCount: 1,
        uberEats: { imported: true, receiptCount: 15, status: 'completed' },
        doorDash: { imported: false, receiptCount: 0, status: 'failed' },
      }}
    />);

    fireEvent.press(screen.getByText('Try DoorDash Again'));
    expect(baseProps.onImportProvider).toHaveBeenCalledWith('doordash');
  });

  it('disables the provider action while an import is processing', () => {
    const screen = render(<ExportImportTaskSection
      {...baseProps}
      state={{ complete: false, label: 'Importing', tone: 'recommended' }}
      providerProgress={{
        importedCount: 0,
        uberEats: { imported: false, receiptCount: 0, status: 'import_processing' },
        doorDash: { imported: false, receiptCount: 0, status: 'not_started' },
      }}
    />);

    expect(screen.getByRole('button', { name: 'Importing Uber Eats…' }).props.accessibilityState)
      .toEqual({ disabled: true, busy: false });
  });
});
