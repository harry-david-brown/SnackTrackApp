/**
 * Database API endpoints (admin/debug)
 */

import api from './client';
import { User, DatabaseStats } from '../../types/api';

export const databaseApi = {
  /**
   * Get all users (admin/debug endpoint)
   * @returns Promise resolving to array of User objects
   * @throws {Error} If API request fails or user lacks permissions
   */
  getUsers: async (): Promise<User[]> => {
    const response = await api.get('/database/users');
    return response.data;
  },

  /**
   * Get database statistics (admin/debug endpoint)
   * @returns Promise resolving to DatabaseStats with database health and metrics
   * @throws {Error} If API request fails
   */
  getStats: async (): Promise<DatabaseStats> => {
    const response = await api.get('/database/stats');
    return response.data;
  },

  /**
   * Delete a user and all associated data (admin endpoint)
   * @param userId - The user ID to delete
   * @returns Promise that resolves when deletion is complete
   * @throws {Error} If API request fails or user not found
   */
  deleteUser: async (userId: string): Promise<void> => {
    await api.delete(`/database/users/${userId}`);
  },
};

