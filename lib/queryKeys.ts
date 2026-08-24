export const analyticsKeys = {
  all: ['analytics'] as const,
  summary: (userId: string) => [...analyticsKeys.all, userId, 'summary'] as const,
  wrapped: (userId: string) => [...analyticsKeys.all, userId, 'wrapped'] as const,
  dashboardInsights: (userId: string, localDate: string, devDayOffset = 0) => [...analyticsKeys.all, userId, 'dashboard-insights', localDate, devDayOffset] as const,
};

export const receiptKeys = {
  all: ['receipts'] as const,
  list: (userId: string, pageSize: number) => [...receiptKeys.all, userId, 'list', pageSize] as const,
};

export const importPreferenceKeys = {
  all: ['import-preferences'] as const,
  current: (userId: string) => [...importPreferenceKeys.all, userId, 'current'] as const,
};

export const gmailStatusKeys = {
  all: ['gmail-status'] as const,
  current: (userId: string) => [...gmailStatusKeys.all, userId, 'current'] as const,
};
