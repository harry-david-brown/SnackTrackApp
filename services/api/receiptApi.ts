/**
 * Receipt API endpoints
 */

import api from './client';
import { Receipt, PaginationResponse, DeleteReceiptsResponse } from '../../types/api';
import { API_CONFIG } from '@/constants';
import { logger } from '@utils/logger';
import { validateAndAuthorizeUserId } from '@utils/securityValidation';

export const receiptApi = {
  /**
   * Get receipts with pagination
   * Note: Backend uses page-based pagination (1-indexed), not offset
   * @param userId - The user ID to get receipts for
   * @param limit - Number of receipts per page (default: 20)
   * @param offset - Offset for pagination (converted to page number internally)
   * @returns Promise resolving to PaginationResponse with receipts array and pagination metadata
   * @throws {Error} If API request fails
   */
  getReceipts: async (
    userId: string,
    limit: number = API_CONFIG.DEFAULT_PAGINATION_LIMIT,
    offset: number = API_CONFIG.DEFAULT_PAGINATION_OFFSET
  ): Promise<PaginationResponse<Receipt>> => {
    // Validate and authorize user ID
    const validatedUserId = await validateAndAuthorizeUserId(userId);

    const page = Math.floor(offset / limit) + 1; // Convert offset to page number (1-based)
    const response = await api.get(`/receipts?userId=${validatedUserId}&limit=${limit}&page=${page}`);

    // Parse items if they come as JSON strings
    const data = response.data;
    if (data.data && Array.isArray(data.data)) {
      data.data = data.data.map((receipt: any, idx: number) => {
        if (__DEV__ && idx === 0) {
          logger.debug('Raw receipt items type:', typeof receipt.items);
          logger.debug('Raw receipt items:', receipt.items);
        }

        // Parse items if it's a string
        if (receipt.items && typeof receipt.items === 'string') {
          try {
            receipt.items = JSON.parse(receipt.items);
            if (__DEV__ && idx === 0) {
              logger.debug('Parsed items:', receipt.items);
            }
          } catch (error) {
            logger.error('Error parsing receipt items:', error);
            receipt.items = [];
          }
        }

        // Ensure items is an array
        if (!Array.isArray(receipt.items)) {
          if (__DEV__) {
            logger.warn('Items is not an array, converting:', receipt.items);
          }
          receipt.items = [];
        }

        // Ensure each item has the correct structure
        if (Array.isArray(receipt.items)) {
          receipt.items = receipt.items.map((item: any) => {
            // If item is a string, try to parse it
            if (typeof item === 'string') {
              try {
                return JSON.parse(item);
              } catch {
                return { name: item, quantity: 1, price: 0 };
              }
            }
            // If item is already an object, ensure it has required properties
            return {
              name: item?.name || 'Unknown item',
              quantity: typeof item?.quantity === 'number' ? item.quantity : 1,
              price: typeof item?.price === 'number' ? item.price : 0
            };
          });
        }

        // Ensure id field is preserved (backend may return it as 'id' or it might be missing)
        // Map snake_case fields to camelCase if needed
        const receiptId = receipt.id || receipt._id;

        const mappedReceipt: any = {
          ...receipt,
          id: receiptId || `receipt-${idx}`, // Ensure id exists (fallback for debugging)
          userId: receipt.userId || receipt.user_id,
          restaurantName: receipt.restaurantName || receipt.restaurant_name,
          orderDate: receipt.orderDate || receipt.order_date,
          amountSpent: receipt.amountSpent || receipt.amount_spent,
          dataSource: receipt.dataSource || receipt.data_source,
          receiptType: receipt.receiptType || receipt.receipt_type,
          createdAt: receipt.createdAt || receipt.created_at || new Date().toISOString(),
        };

        // Only warn if ID is truly missing (not just using fallback)
        if (!receiptId && __DEV__ && idx === 0) {
          logger.warn('Some receipts may be missing IDs from backend');
        }

        return mappedReceipt;
      });
    }

    return data;
  },

  /**
   * Delete all receipts for the authenticated user
   * @returns Promise resolving to the backend deletion response
   * @throws {Error} If API request fails
   */
  clearReceipts: async (): Promise<DeleteReceiptsResponse> => {
    const response = await api.delete<DeleteReceiptsResponse>('/receipts');
    return response.data;
  },
};
