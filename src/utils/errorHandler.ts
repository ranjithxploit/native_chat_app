/**
 * Error Handler Utility
 */

export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler = {
  /**
   * Handle API errors
   */
  handleApiError: (error: any): AppError => {
    if (error instanceof AppError) {
      return error;
    }

    if (error.response) {
      // API error
      return new AppError(
        'API_ERROR',
        error.response.data?.message || 'An error occurred',
        error.response.status
      );
    }

    if (error.message) {
      // Network or other error
      return new AppError('ERROR', error.message);
    }

    return new AppError('UNKNOWN_ERROR', 'An unknown error occurred');
  },

  /**
   * Format error message for user
   */
  formatErrorMessage: (error: any): string => {
    if (typeof error === 'string') return error;
    if (error.message) return error.message;
    if (error.code === 'INVALID_CREDENTIALS') return 'Invalid email or password';
    if (error.code === 'USER_NOT_FOUND') return 'User not found';
    if (error.code === 'ALREADY_REGISTERED') return 'Email already registered';
    if (error.code === 'NETWORK_ERROR') return 'Network error. Please check your connection';
    return 'An error occurred. Please try again.';
  },

  /**
   * Log error for debugging
   */
  logError: (error: any, context: string = ''): void => {
    console.error(`[${context}]`, error);
    // In production, send to error tracking service
  },
};

/**
 * Retry mechanism for failed requests
 */
export const retry = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: any;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
      }
    }
  }

  throw lastError;
};
