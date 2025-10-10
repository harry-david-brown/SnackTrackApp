// Test utilities for simulating different error scenarios
// This file should only be imported in development builds

/**
 * Error simulation functions that create realistic error objects
 * matching what Axios would throw in production
 */
export const testErrorScenarios = {
  // Simulate network errors (no connection)
  simulateNetworkError: async () => {
    console.log('🧪 [TEST] Simulating Network Error...');
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
    const error: any = new Error('Network Error');
    error.code = 'ERR_NETWORK';
    error.message = 'Network Error';
    error.isAxiosError = true;
    throw error;
  },

  // Simulate timeout errors (request takes too long)
  simulateTimeoutError: async () => {
    console.log('🧪 [TEST] Simulating Timeout Error...');
    await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate long delay
    const error: any = new Error('timeout of 10000ms exceeded');
    error.code = 'ECONNABORTED';
    error.message = 'timeout of 10000ms exceeded';
    error.isAxiosError = true;
    throw error;
  },

  // Simulate server errors (500)
  simulateServerError: async () => {
    console.log('🧪 [TEST] Simulating Server Error (500)...');
    await new Promise(resolve => setTimeout(resolve, 800));
    const error: any = new Error('Request failed with status code 500');
    error.isAxiosError = true;
    error.response = {
      status: 500,
      statusText: 'Internal Server Error',
      data: {
        error: {
          message: 'Internal Server Error',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        },
      },
      headers: {},
      config: {},
    };
    throw error;
  },

  // Simulate validation errors (400)
  simulateValidationError: async () => {
    console.log('🧪 [TEST] Simulating Validation Error (400)...');
    await new Promise(resolve => setTimeout(resolve, 500));
    const error: any = new Error('Request failed with status code 400');
    error.isAxiosError = true;
    error.response = {
      status: 400,
      statusText: 'Bad Request',
      data: {
        error: {
          message: 'Validation Error: Invalid email format',
          statusCode: 400,
          timestamp: new Date().toISOString(),
          errors: {
            email: 'Email must be a valid email address',
          },
        },
      },
      headers: {},
      config: {},
    };
    throw error;
  },

  // Simulate rate limiting (429)
  simulateRateLimitError: async () => {
    console.log('🧪 [TEST] Simulating Rate Limit Error (429)...');
    await new Promise(resolve => setTimeout(resolve, 300));
    const error: any = new Error('Request failed with status code 429');
    error.isAxiosError = true;
    error.response = {
      status: 429,
      statusText: 'Too Many Requests',
      data: {
        error: {
          message: 'Too many requests. Please try again in 60 seconds.',
          statusCode: 429,
          timestamp: new Date().toISOString(),
          retryAfter: 60,
        },
      },
      headers: {
        'retry-after': '60',
      },
      config: {},
    };
    throw error;
  },

  // Simulate authentication errors (401)
  simulateAuthError: async () => {
    console.log('🧪 [TEST] Simulating Auth Error (401)...');
    await new Promise(resolve => setTimeout(resolve, 500));
    const error: any = new Error('Request failed with status code 401');
    error.isAxiosError = true;
    error.response = {
      status: 401,
      statusText: 'Unauthorized',
      data: {
        error: {
          message: 'Authentication required. Please log in.',
          statusCode: 401,
          timestamp: new Date().toISOString(),
        },
      },
      headers: {},
      config: {},
    };
    throw error;
  },
};

/**
 * Map error type keys from the UI to the correct test function names
 */
const errorTypeMap: Record<string, keyof typeof testErrorScenarios> = {
  'simulateNetworkError': 'simulateNetworkError',
  'simulateTimeoutError': 'simulateTimeoutError',
  'simulateServerError': 'simulateServerError',
  'simulateValidationError': 'simulateValidationError',
  'simulateRateLimitError': 'simulateRateLimitError',
  'simulateAuthError': 'simulateAuthError',
};

/**
 * Helper to create a mock API that fails with specific error types
 * This creates functions that match the real API signature but throw errors
 */
export const createFailingApi = (errorType: string) => {
  const mappedErrorType = errorTypeMap[errorType] || 'simulateNetworkError';
  const errorFunction = testErrorScenarios[mappedErrorType];

  return {
    // Analytics API - getUserSummary
    getUserSummary: async (userId: string) => {
      console.log(`🧪 [TEST] Calling getUserSummary with error: ${errorType}`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
      await errorFunction();
    },

    // User API - getTotalSpent
    getTotalSpent: async (userId: string) => {
      console.log(`🧪 [TEST] Calling getTotalSpent with error: ${errorType}`);
      await new Promise(resolve => setTimeout(resolve, 800));
      await errorFunction();
    },

    // CSV API - importCsv
    importCsv: async (userId: string, file: any) => {
      console.log(`🧪 [TEST] Calling importCsv with error: ${errorType}`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // CSV upload takes longer
      await errorFunction();
    },

    // User API - createUser
    createUser: async (data: { email: string }) => {
      console.log(`🧪 [TEST] Calling createUser with error: ${errorType}`);
      await new Promise(resolve => setTimeout(resolve, 600));
      await errorFunction();
    },

    // Receipt API - getReceipts
    getReceipts: async (userId: string, page?: number) => {
      console.log(`🧪 [TEST] Calling getReceipts with error: ${errorType}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await errorFunction();
    },
  };
};

/**
 * Test helper to run multiple consecutive errors (stress test)
 */
export const runConsecutiveErrors = async (
  errorType: keyof typeof testErrorScenarios,
  count: number = 3,
  delayMs: number = 1000
): Promise<void> => {
  console.log(`🧪 [STRESS TEST] Running ${count} consecutive ${errorType} errors...`);
  
  for (let i = 0; i < count; i++) {
    try {
      console.log(`🧪 [STRESS TEST] Attempt ${i + 1}/${count}`);
      await testErrorScenarios[errorType]();
    } catch (error) {
      console.log(`🧪 [STRESS TEST] Error ${i + 1} caught as expected`);
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  console.log(`🧪 [STRESS TEST] Completed ${count} error simulations`);
};

/**
 * Test helper to simulate random errors (chaos testing)
 */
export const runRandomErrors = async (count: number = 5): Promise<void> => {
  console.log(`🧪 [CHAOS TEST] Running ${count} random errors...`);
  
  const errorTypes = Object.keys(testErrorScenarios) as Array<keyof typeof testErrorScenarios>;
  
  for (let i = 0; i < count; i++) {
    const randomErrorType = errorTypes[Math.floor(Math.random() * errorTypes.length)];
    try {
      console.log(`🧪 [CHAOS TEST] ${i + 1}/${count}: ${randomErrorType}`);
      await testErrorScenarios[randomErrorType]();
    } catch (error) {
      console.log(`🧪 [CHAOS TEST] Error caught: ${(error as Error).message}`);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`🧪 [CHAOS TEST] Completed ${count} random error simulations`);
};
