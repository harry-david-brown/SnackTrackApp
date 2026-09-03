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

type UnknownRecord = Record<string, unknown>;

export interface ReceiptListFilters {
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

const normalizeItem = (value: unknown, field: string): ReceiptItem => {
  const item = record(value, field);
  if (item.customizations !== undefined && !Array.isArray(item.customizations)) {
    invalid(`${field}.customizations`);
  }
  const customizations = item.customizations as unknown[] | undefined;
  return {
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
  return {
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
