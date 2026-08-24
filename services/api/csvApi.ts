/**
 * CSV/ZIP import API endpoints
 */

import api from './client';
import { CSVImportResponse } from '@/types/api';
import { validateAndAuthorizeUserId } from '@utils/securityValidation';

/**
 * CSV/ZIP import API endpoints
 * Note: Named "csvApi" for historical reasons, but handles both ZIP and CSV files
 * Backend endpoint /csv/import accepts both file types
 */
export const csvApi = {
  /**
   * Import ZIP or CSV file containing delivery app order history
   * Backend auto-detects file type and processes accordingly
   * @param userId - The user ID to associate receipts with
   * @param csvFile - The file to import (ZIP or CSV format)
   * @returns Promise resolving to CSVImportResponse with import statistics
   * @throws {Error} If file format is invalid or import fails
   */
  importCsv: async (userId: string, csvFile: File): Promise<CSVImportResponse> => {
    // Validate and authorize user ID
    const validatedUserId = await validateAndAuthorizeUserId(userId);

    const formData = new FormData();
    formData.append('csvFile', csvFile); // Field name stays 'csvFile' for backend compatibility
    formData.append('userId', validatedUserId);

    const response = await api.post<unknown>('/csv/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    const data = typeof response.data === 'object' && response.data !== null
      ? response.data as Record<string, unknown>
      : {};
    if (
      typeof data.importedCount !== 'number'
      || !Number.isFinite(data.importedCount)
      || typeof data.message !== 'string'
      || (data.provider !== 'uber_eats' && data.provider !== 'doordash')
    ) {
      throw new Error('Invalid import response');
    }
    const fileType = data.fileType === 'csv' || data.fileType === 'zip' ? data.fileType : undefined;
    return {
      success: typeof data.success === 'boolean' ? data.success : undefined,
      importedCount: data.importedCount,
      totalAmount: typeof data.totalAmount === 'number' && Number.isFinite(data.totalAmount) ? data.totalAmount : undefined,
      fileType,
      provider: data.provider,
      message: data.message,
    };
  },
};
