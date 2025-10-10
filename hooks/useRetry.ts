import { useState, useCallback } from 'react';

interface RetryOptions {
  maxRetries?: number;
  delay?: number;
  exponentialBackoff?: boolean;
}

interface RetryState {
  isLoading: boolean;
  error: Error | null;
  retryCount: number;
}

export const useRetry = (options: RetryOptions = {}) => {
  const { maxRetries = 3, delay = 1000, exponentialBackoff = true } = options;
  
  const [state, setState] = useState<RetryState>({
    isLoading: false,
    error: null,
    retryCount: 0,
  });

  const executeWithRetry = useCallback(async <T>(
    asyncFunction: () => Promise<T>,
    customOptions?: Partial<RetryOptions>
  ): Promise<T> => {
    const finalOptions = { maxRetries, delay, exponentialBackoff, ...customOptions };
    let currentRetry = 0;

    while (currentRetry <= finalOptions.maxRetries!) {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        const result = await asyncFunction();
        setState(prev => ({ ...prev, isLoading: false, retryCount: currentRetry }));
        return result;
      } catch (error) {
        currentRetry++;
        setState(prev => ({ ...prev, retryCount: currentRetry, error: error as Error }));

        if (currentRetry > finalOptions.maxRetries!) {
          setState(prev => ({ ...prev, isLoading: false }));
          throw error;
        }

        // Calculate delay with optional exponential backoff
        const currentDelay = finalOptions.exponentialBackoff 
          ? finalOptions.delay! * Math.pow(2, currentRetry - 1)
          : finalOptions.delay!;

        await new Promise(resolve => setTimeout(resolve, currentDelay));
      }
    }

    throw new Error('Max retries exceeded');
  }, [maxRetries, delay, exponentialBackoff]);

  const reset = useCallback(() => {
    setState({ isLoading: false, error: null, retryCount: 0 });
  }, []);

  return {
    ...state,
    executeWithRetry,
    reset,
  };
};

export default useRetry;
