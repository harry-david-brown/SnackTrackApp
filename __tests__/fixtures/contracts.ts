export const contractIds = {
  user: '5f586923-18d5-4bc8-b5eb-ea52ae35284c',
  receipt: '1785120c-8d5e-4d99-9734-1d3b8f72e3a1',
  request: '11111111-1111-4111-8111-111111111111',
} as const;

export const authSessionFixture = {
  userId: contractIds.user,
  email: 'person@example.com',
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  user: {
    id: contractIds.user,
    email: 'person@example.com',
    emailVerified: true,
    createdAt: '2026-08-31T00:00:00.000Z',
  },
} as const;

export const receiptPageFixture = {
  items: [
    {
      id: contractIds.receipt,
      userId: contractIds.user,
      restaurantName: 'Example Kitchen',
      amountSpent: 25.99,
      orderDate: '2026-08-30T18:30:00.000Z',
      items: [{ name: 'Dinner', quantity: 1, price: 25.99 }],
      receiptType: 'doordash',
      dataSource: 'email',
    },
  ],
  pageInfo: {
    page: 1,
    limit: 20,
    total: 1,
    totalPages: 1,
    hasMore: false,
    nextPage: null,
  },
} as const;

export const exportImportFixture = {
  message: 'CSV imported successfully',
  importedCount: 1,
  totalAmount: 25.99,
  fileType: 'csv',
  provider: 'doordash',
} as const;

export const errorEnvelopeFixture = {
  error: {
    version: '1',
    code: 'VALIDATION_ERROR',
    message: 'Validation Error for email: Invalid email format',
    details: { field: 'email' },
    statusCode: 400,
    timestamp: '2026-08-31T00:00:00.000Z',
    path: '/auth/register',
    method: 'POST',
    requestId: contractIds.request,
  },
} as const;

export const userSummaryFixture = {
  user: { id: contractIds.user },
  statistics: {
    totalSpent: 1000,
    totalReceipts: 10,
    averageSpent: 100,
    topRestaurants: [{ name: 'Restaurant 1', count: 5, total: 500 }],
    monthlyBreakdown: { '2025-01': { total: 500, count: 5 } },
  },
  validation: { refundedReceipts: 0, issues: [] as string[] },
};
