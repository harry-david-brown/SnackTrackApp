/**
 * CSV/ZIP import API endpoints
 */

import api from './client';
import { CSVImportResponse } from '../../types/api';
import { validateAndAuthorizeUserId } from '../../utils/securityValidation';

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

    const response = await api.post('/csv/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

