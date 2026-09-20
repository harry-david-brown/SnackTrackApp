export const analyticsKeys = {
  all: ["analytics"] as const,
  summary: (userId: string) =>
    [...analyticsKeys.all, userId, "summary"] as const,
  wrapped: (userId: string, currency?: string) =>
    [...analyticsKeys.all, userId, "wrapped", "historical-v1", ...(currency ? [currency] : [])] as const,
  dashboardInsights: (userId: string, localDate: string, devDayOffset = 0) =>
    [
      ...analyticsKeys.all,
      userId,
      "dashboard-insights",
      "historical-v1",
      localDate,
      devDayOffset,
    ] as const,
};

export const receiptKeys = {
  all: ["receipts"] as const,
  list: (userId: string, request: Readonly<Record<string, unknown>>) =>
    [...receiptKeys.all, userId, "list", request] as const,
};

export const importPreferenceKeys = {
  all: ["import-preferences"] as const,
  current: (userId: string) =>
    [...importPreferenceKeys.all, userId, "current"] as const,
  setupGuidance: (userId: string) =>
    [...importPreferenceKeys.all, userId, "setup-guidance"] as const,
};

export const importOperationKeys = {
  all: ["import-operations"] as const,
  active: (userId: string) => [...importOperationKeys.all, userId, "active"] as const,
  detail: (userId: string, operationId: string) => [...importOperationKeys.all, userId, "detail", operationId] as const,
};

export const adKeys = {
  all: ['ads'] as const,
  runtime: (userId: string) => [...adKeys.all, userId, 'runtime'] as const,
};

export const experienceKeys = {
  all: ['experience'] as const,
  state: (userId: string) => [...experienceKeys.all, userId, 'state'] as const,
};
