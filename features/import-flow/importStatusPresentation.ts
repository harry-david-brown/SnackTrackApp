import type { ImportOperation } from './contracts';

export function importStageLabel(status: string | undefined, stage?: string): string {
  if (status === 'awaiting_upload') return 'Waiting for your file';
  if (status === 'pending_dispatch' || status === 'queued') return 'Waiting to start';
  if (status === 'retrying') return 'Retrying automatically';
  if (status === 'succeeded') return 'Import complete';
  switch (stage) {
    case 'discovering': return 'Finding your orders';
    case 'building_history': return 'Building your stats';
    case 'preparing_recap': return 'Preparing your recap';
    default: return 'Getting ready';
  }
}

export function importFailureMessage(operation: Pick<ImportOperation, 'status' | 'errorCode' | 'kind'>): string {
  if (operation.status === 'cancelled') return 'This import was cancelled. Orders already saved are still here.';
  if (operation.status === 'expired') return operation.kind === 'export_file' ? 'This import expired before it finished. Choose your file again to continue. Your saved orders are still here.' : 'This import expired before it finished. Try checking your inbox again. Your saved orders are still here.';
  if (operation.status === 'superseded') return 'A newer import or account reset replaced this import. Open Add orders to see your current progress.';
  if (operation.errorCode?.includes('RECONNECT')) return 'Your inbox needs to be reconnected before we can check for orders. Your saved orders are still here.';
  if (['ZIP_INVALID', 'ZIP_INTEGRITY_FAILED', 'ZIP_ENCRYPTED'].includes(operation.errorCode ?? '')) return 'We couldn’t read this file. Request a new copy of your order history and upload the original downloaded file.';
  if (operation.errorCode === 'NO_VALID_EXPORT_ORDERS') return 'We couldn’t find orders in this file. Request a new copy of your order history from the delivery app.';
  return 'We couldn’t finish adding your orders. Your saved history is still here. Follow the next step below to try again.';
}
