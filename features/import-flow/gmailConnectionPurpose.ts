export const GMAIL_CONNECTION_PURPOSES = [
  'receipt_import',
  'export_ready_alerts',
  'ongoing_tracking',
  'connection_recovery',
  'manage_connection',
] as const;

export type GmailConnectionPurpose = typeof GMAIL_CONNECTION_PURPOSES[number];

export const parseGmailConnectionPurpose = (value: unknown): GmailConnectionPurpose | null =>
  typeof value === 'string' && GMAIL_CONNECTION_PURPOSES.includes(value as GmailConnectionPurpose)
    ? value as GmailConnectionPurpose
    : null;
