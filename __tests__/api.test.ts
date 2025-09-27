import { userApi, csvApi, validationApi } from '../services/api';

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  })),
}));

describe('API Services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('userApi', () => {
    it('should create user with correct data', async () => {
      const mockResponse = { data: { userId: '123', message: 'User created' } };
      const axios = require('axios');
      axios.create().post.mockResolvedValue(mockResponse);

      const result = await userApi.createUser({ email: 'test@example.com' });

      expect(axios.create().post).toHaveBeenCalledWith('/users/create', { email: 'test@example.com' });
      expect(result).toEqual(mockResponse.data);
    });

    it('should get total spent for user', async () => {
      const mockResponse = { data: { totalSpent: 150.50 } };
      const axios = require('axios');
      axios.create().get.mockResolvedValue(mockResponse);

      const result = await userApi.getTotalSpent('user123');

      expect(axios.create().get).toHaveBeenCalledWith('/users/user123/totalSpent');
      expect(result).toBe(150.50);
    });
  });

  describe('csvApi', () => {
    it('should import CSV file', async () => {
      const mockResponse = { 
        data: { 
          success: true, 
          receiptsImported: 5, 
          message: 'Import successful' 
        } 
      };
      const axios = require('axios');
      axios.create().post.mockResolvedValue(mockResponse);

      const mockFile = new File(['test'], 'test.csv', { type: 'text/csv' });
      const result = await csvApi.importCsv('user123', mockFile);

      expect(axios.create().post).toHaveBeenCalledWith(
        '/csv/import',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('validationApi', () => {
    it('should get user summary', async () => {
      const mockSummary = {
        userId: 'user123',
        totalSpent: 500,
        totalReceipts: 10,
        averageOrderValue: 50,
        topRestaurants: [],
        monthlyBreakdown: [],
        refundedReceipts: 0,
        dataQuality: { issues: [], recommendations: [] }
      };
      const mockResponse = { data: mockSummary };
      const axios = require('axios');
      axios.create().get.mockResolvedValue(mockResponse);

      const result = await validationApi.getUserSummary('user123');

      expect(axios.create().get).toHaveBeenCalledWith('/validation/user/user123/summary');
      expect(result).toEqual(mockSummary);
    });
  });
});
