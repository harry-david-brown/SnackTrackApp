/** Canonical receipt API boundary and runtime transport validation. */
import { api } from './client';
import {
  DataSource,
  ReceiptType,
  type DeleteReceiptsResponse,
  type Receipt,
  type ReceiptItem,
  type ReceiptPage,
} from '@/types/api';
import { API_CONFIG } from '@/constants';
import { normalizeReceiptOutcome, normalizeReceiptOrderDay } from '@services/normalizers/receiptOutcomeNormalizer';
import type { ReceiptOutcomeFilter } from '@/types/receiptOutcome';

type UnknownRecord = Record<string, unknown>;

export interface ReceiptListFilters {
  readonly outcome?: ReceiptOutcomeFilter;
  readonly currencyCode?: 'CAD' | 'USD' | 'EUR' | 'GBP' | 'UNKNOWN';
  readonly receiptType?: ReceiptType;
  readonly restaurantName?: string;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly minAmount?: number;
  readonly maxAmount?: number;
}

export interface ReceiptListRequest {
  readonly page: number;
  readonly limit: number;
  readonly filters?: ReceiptListFilters;
}

export interface InsightReceiptListRequest {
  readonly snapshotId?: string;
  readonly userId: string;
  readonly insightId: string;
  readonly localDate: string;
  readonly page: number;
  readonly limit: number;
}

const invalid = (field: string): never => {
  throw new Error(`Invalid receipt response: ${field}`);
};
const record = (value: unknown, field: string): UnknownRecord =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : invalid(field);
const string = (value: unknown, field: string): string =>
  typeof value === 'string' && value.trim().length > 0 ? value : invalid(field);
const nullableString = (value: unknown, field: string): string | null =>
  value === null ? null : string(value, field);
const finiteNumber = (value: unknown, field: string): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : invalid(field);
const nonnegativeNumber = (value: unknown, field: string): number => {
  const candidate = finiteNumber(value, field);
  return candidate >= 0 ? candidate : invalid(field);
};
const integer = (value: unknown, field: string, minimum: number): number => {
  const candidate = finiteNumber(value, field);
  return Number.isInteger(candidate) && candidate >= minimum ? candidate : invalid(field);
};
const member = <T extends string>(value: unknown, allowed: readonly T[], field: string): T =>
  typeof value === 'string' && allowed.includes(value as T) ? (value as T) : invalid(field);
const isoDate = (value: unknown, field: string): string => {
  const candidate = string(value, field);
  return Number.isNaN(Date.parse(candidate)) ? invalid(field) : candidate;
};

const receiptTypes = Object.values(ReceiptType);
const dataSources = Object.values(DataSource);

const normalizeCheckoutDifference = (value: unknown, field: string): NonNullable<Receipt['checkoutDifference']> => {
  const o = record(value, field);
  const status = member(o.status, ['available','unavailable'] as const, `${field}.status`);
  const amount = o.amount === null ? null : finiteNumber(o.amount, `${field}.amount`);
  const exportSubtotal = o.exportSubtotal === null ? null : nonnegativeNumber(o.exportSubtotal, `${field}.exportSubtotal`);
  const emailTotal = nonnegativeNumber(o.emailTotal, `${field}.emailTotal`);
  if ((status === 'available') !== (amount !== null) || (status === 'available' && (exportSubtotal === null || Math.round(amount! * 100) !== Math.round(emailTotal * 100) - Math.round(exportSubtotal * 100)))) invalid(field);
  return { status, amount, exportSubtotal, emailTotal,
    ...(o.receiptSubtotal === undefined ? {} : { receiptSubtotal: nonnegativeNumber(o.receiptSubtotal, `${field}.receiptSubtotal`) }),
    ...(o.subtotalDiscrepancy === undefined ? {} : { subtotalDiscrepancy: finiteNumber(o.subtotalDiscrepancy, `${field}.subtotalDiscrepancy`) }),
    currencyCode: string(o.currencyCode, `${field}.currencyCode`),
    subtotalBasis: member(o.subtotalBasis, ['export_item_subtotal','reconstructed','receipt_reconciled','unavailable'] as const, `${field}.subtotalBasis`),
    ...(o.emailSourceMessageId === undefined ? {} : { emailSourceMessageId: string(o.emailSourceMessageId, `${field}.emailSourceMessageId`) }),
    ...(o.emailRevisionAt === undefined ? {} : { emailRevisionAt: isoDate(o.emailRevisionAt, `${field}.emailRevisionAt`) }),
    ...(o.reason === undefined ? {} : { reason: member(o.reason, ['missing_export_subtotal','unknown_currency','currency_conflict'] as const, `${field}.reason`) }),
  };
};

const normalizeItem = (value: unknown, field: string): ReceiptItem => {
  const item = record(value, field);
  if (item.customizations !== undefined && !Array.isArray(item.customizations)) {
    invalid(`${field}.customizations`);
  }
  const customizations = item.customizations as unknown[] | undefined;
  return {
    ...(item.configuredLineTotal === undefined ? {} : { configuredLineTotal: nonnegativeNumber(item.configuredLineTotal, `${field}.configuredLineTotal`) }),
    ...(item.recordedPrice === undefined ? {} : { recordedPrice: nonnegativeNumber(item.recordedPrice, `${field}.recordedPrice`) }),
    ...(item.inferred === undefined ? {} : { inferred: typeof item.inferred === 'boolean' ? item.inferred : invalid(`${field}.inferred`) }),
    name: string(item.name, `${field}.name`),
    quantity: nonnegativeNumber(item.quantity, `${field}.quantity`),
    price: nonnegativeNumber(item.price, `${field}.price`),
    ...(customizations === undefined
      ? {}
      : {
          customizations: customizations.map((entry, index) =>
            string(entry, `${field}.customizations.${index}`),
          ),
        }),
  };
};

export const normalizeReceipt = (value: unknown, index = 0): Receipt => {
  const field = `items.${index}`;
  const receipt = record(value, field);
  if (!Array.isArray(receipt.items)) invalid(`${field}.items`);
  const receiptItems = receipt.items as unknown[];
  if (receipt.sources !== undefined && !Array.isArray(receipt.sources)) invalid(`${field}.sources`);
  let reconciliation: Receipt['reconciliation'];
  if (receipt.reconciliation !== undefined) {
    const r=record(receipt.reconciliation,`${field}.reconciliation`);
    reconciliation={status:member(r.status,['merged','standalone','unresolved'] as const,`${field}.reconciliation.status`),method:string(r.method,`${field}.reconciliation.method`),...(r.reason===undefined?{}:{reason:string(r.reason,`${field}.reconciliation.reason`)})};
  }
  return {
    ...(reconciliation ? {reconciliation} : {}),
    ...(receipt.orderDay === undefined ? {} : { orderDay: normalizeReceiptOrderDay(receipt.orderDay, `${field}.orderDay`) }),
    ...(receipt.orderOutcome === undefined ? {} : { orderOutcome: normalizeReceiptOutcome(receipt.orderOutcome, `${field}.orderOutcome`) }),
    ...(receipt.sources === undefined ? {} : { sources: (receipt.sources as unknown[]).map(source => member(source,dataSources,`${field}.sources`)) }),
    ...(receipt.checkoutDifference === undefined ? {} : { checkoutDifference: normalizeCheckoutDifference(receipt.checkoutDifference,`${field}.checkoutDifference`) }),
    ...(receipt.currencyCode === undefined ? {} : { currencyCode: string(receipt.currencyCode, `${field}.currencyCode`) }),
    ...(receipt.itemSubtotal === undefined ? {} : { itemSubtotal: nonnegativeNumber(receipt.itemSubtotal, `${field}.itemSubtotal`) }),
    ...(receipt.amountBasis === undefined ? {} : { amountBasis: string(receipt.amountBasis, `${field}.amountBasis`) }),
    ...(receipt.evidenceSummary === undefined ? {} : { evidenceSummary: string(receipt.evidenceSummary, `${field}.evidenceSummary`) }),
    ...(receipt.resolutionVersion === undefined ? {} : { resolutionVersion: integer(receipt.resolutionVersion, `${field}.resolutionVersion`, 1) }),
    id: string(receipt.id, `${field}.id`),
    userId: string(receipt.userId, `${field}.userId`),
    restaurantName: nullableString(receipt.restaurantName, `${field}.restaurantName`),
    orderDate:
      receipt.orderDate === null ? null : isoDate(receipt.orderDate, `${field}.orderDate`),
    amountSpent: nonnegativeNumber(receipt.amountSpent, `${field}.amountSpent`),
    items: receiptItems.map((item, itemIndex) =>
      normalizeItem(item, `${field}.items.${itemIndex}`),
    ),
    dataSource: member(receipt.dataSource, dataSources, `${field}.dataSource`),
    receiptType: member(receipt.receiptType, receiptTypes, `${field}.receiptType`),
  };
};

export const normalizeReceiptPage = (value: unknown): ReceiptPage => {
  const root = record(value, 'root');
  if (!Array.isArray(root.items)) invalid('items');
  const receiptValues = root.items as unknown[];
  const pageInfo = record(root.pageInfo, 'pageInfo');
  const page = integer(pageInfo.page, 'pageInfo.page', 1);
  const limit = integer(pageInfo.limit, 'pageInfo.limit', 1);
  const total = integer(pageInfo.total, 'pageInfo.total', 0);
  const totalPages = integer(pageInfo.totalPages, 'pageInfo.totalPages', 0);
  const hasMore =
    typeof pageInfo.hasMore === 'boolean' ? pageInfo.hasMore : invalid('pageInfo.hasMore');
  const nextPage =
    pageInfo.nextPage === null ? null : integer(pageInfo.nextPage, 'pageInfo.nextPage', 2);
  const items = receiptValues.map(normalizeReceipt);

  if (
    items.length > limit ||
    totalPages !== Math.ceil(total / limit) ||
    hasMore !== (page < totalPages) ||
    nextPage !== (hasMore ? page + 1 : null)
  ) {
    invalid('pageInfo');
  }
  return { items, pageInfo: { page, limit, total, totalPages, hasMore, nextPage } };
};

export const receiptApi = {
  getReceipts: async ({ page, limit, filters = {} }: ReceiptListRequest): Promise<ReceiptPage> => {
    const response = await api.get<unknown>('/receipts', {
      params: { page, limit, ...filters },
    });
    return normalizeReceiptPage(response.data);
  },
  getInsightReceipts: async ({ userId, insightId, localDate, page, limit, snapshotId }: InsightReceiptListRequest): Promise<ReceiptPage> => {
    const response = await api.get<unknown>(
      `/users/${encodeURIComponent(userId)}/dashboard-insights/${encodeURIComponent(insightId)}/orders`,
      { params: { localDate, page, limit, snapshotId } },
    );
    return normalizeReceiptPage(response.data);
  },
  clearReceipts: async (): Promise<DeleteReceiptsResponse> => {
    const response = await api.delete<unknown>('/receipts');
    const data = record(response.data, 'clear');
    if (typeof data.success !== 'boolean') invalid('clear.success');
    const success = data.success as boolean;
    return {
      success,
      message: string(data.message, 'clear.message'),
      deletedCount:
        data.deletedCount === undefined
          ? undefined
          : integer(data.deletedCount, 'clear.deletedCount', 0),
    };
  },
};

export const DEFAULT_RECEIPT_PAGE_SIZE = API_CONFIG.DEFAULT_PAGINATION_LIMIT;
