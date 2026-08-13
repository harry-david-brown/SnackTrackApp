/** Receipt API endpoints and transport normalization. */
import api from './client';
import { DataSource, ReceiptType, type DeleteReceiptsResponse, type PaginationResponse, type Receipt, type ReceiptItem } from '@/types/api';
import { API_CONFIG } from '@/constants';
import { validateAndAuthorizeUserId } from '@utils/securityValidation';

type UnknownRecord = Record<string, unknown>;

const record = (value: unknown, field: string): UnknownRecord => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid receipt response: ${field}`);
  return value as UnknownRecord;
};
const string = (value: unknown, field: string) => {
  if (typeof value !== 'string' || !value) throw new Error(`Invalid receipt response: ${field}`);
  return value;
};
const number = (value: unknown, field: string) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Invalid receipt response: ${field}`);
  return value;
};
const optionalNumber = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;

function normalizeItem(value: unknown): ReceiptItem {
  if (typeof value === 'string') {
    try { return normalizeItem(JSON.parse(value)); } catch { return { name: value, quantity: 1, price: 0 }; }
  }
  const item = record(value, 'item');
  return {
    name: typeof item.name === 'string' && item.name ? item.name : 'Unknown item',
    quantity: optionalNumber(item.quantity, 1),
    price: optionalNumber(item.price, 0),
  };
}

function normalizeItems(value: unknown): ReceiptItem[] {
  let candidate = value;
  if (typeof candidate === 'string') {
    try { candidate = JSON.parse(candidate); } catch { return []; }
  }
  return Array.isArray(candidate) ? candidate.map(normalizeItem) : [];
}

export function normalizeReceipt(value: unknown, index = 0): Receipt {
  const receipt = record(value, `data.${index}`);
  const id = receipt.id ?? receipt._id;
  const source = receipt.dataSource ?? receipt.data_source;
  const receiptType = receipt.receiptType ?? receipt.receipt_type;
  const orderDate = string(receipt.orderDate ?? receipt.order_date, `data.${index}.orderDate`);
  const createdAt = receipt.createdAt ?? receipt.created_at;
  return {
    id: string(id, `data.${index}.id`),
    userId: string(receipt.userId ?? receipt.user_id, `data.${index}.userId`),
    restaurantName: string(receipt.restaurantName ?? receipt.restaurant_name, `data.${index}.restaurantName`),
    orderDate,
    amountSpent: number(receipt.amountSpent ?? receipt.amount_spent, `data.${index}.amountSpent`),
    items: normalizeItems(receipt.items),
    dataSource: source === DataSource.EMAIL ? DataSource.EMAIL : DataSource.CSV,
    receiptType: receiptType === ReceiptType.UBER_EATS
      ? ReceiptType.UBER_EATS
      : receiptType === ReceiptType.DOORDASH ? ReceiptType.DOORDASH : ReceiptType.UNKNOWN,
    // The current receipts endpoint intentionally omits creation metadata.
    // Keep the app domain stable by using the order timestamp when absent.
    createdAt: typeof createdAt === 'string' && createdAt ? createdAt : orderDate,
  };
}

export function normalizeReceiptPage(value: unknown, limit: number, offset: number): PaginationResponse<Receipt> {
  const root = record(value, 'root');
  if (!Array.isArray(root.data)) throw new Error('Invalid receipt response: data');
  const data = root.data.map(normalizeReceipt);
  const pagination = record(root.pagination ?? {}, 'pagination');
  const total = optionalNumber(pagination.total, offset + data.length);
  return {
    data,
    pagination: {
      total,
      limit: optionalNumber(pagination.limit, limit),
      offset: optionalNumber(pagination.offset, offset),
      hasMore: typeof pagination.hasMore === 'boolean' ? pagination.hasMore : offset + data.length < total,
    },
  };
}

export const receiptApi = {
  getReceipts: async (
    userId: string,
    limit: number = API_CONFIG.DEFAULT_PAGINATION_LIMIT,
    offset: number = API_CONFIG.DEFAULT_PAGINATION_OFFSET
  ): Promise<PaginationResponse<Receipt>> => {
    const validatedUserId = await validateAndAuthorizeUserId(userId);
    const page = Math.floor(offset / limit) + 1;
    const response = await api.get(`/receipts?userId=${validatedUserId}&limit=${limit}&page=${page}`);
    return normalizeReceiptPage(response.data, limit, offset);
  },
  clearReceipts: async (): Promise<DeleteReceiptsResponse> => {
    const response = await api.delete<unknown>('/receipts');
    const data = record(response.data, 'clear');
    if (typeof data.success !== 'boolean') throw new Error('Invalid receipt response: clear.success');
    return {
      success: data.success,
      message: string(data.message, 'clear.message'),
      deletedCount: data.deletedCount === undefined ? undefined : number(data.deletedCount, 'clear.deletedCount'),
    };
  },
};
