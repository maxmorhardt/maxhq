import { isAxiosError } from 'axios';
import type { APIError } from '../types/error';

// convert any error into standardized APIError format
export function handleError(err: unknown): APIError {
  const now = new Date().toISOString();

  // handle non-axios errors
  if (!isAxiosError(err)) {
    return {
      code: 0,
      message: (err as Error)?.message ?? 'Unknown error occurred',
      timestamp: now,
      requestId: 'unknown',
    };
  }

  const response = err.response;
  const request = err.request;

  // return api error from response data if available
  if (response?.data) {
    return response.data;
  }

  // create error from response status
  if (response) {
    return {
      code: response.status ?? 0,
      message: `Request failed with status ${response.status}`,
      timestamp: now,
      requestId: (response.headers?.['x-request-id'] as string) ?? '',
    };
  }

  // network error (no response received)
  if (request) {
    return {
      code: 0,
      message: 'Network error: Unable to reach the server',
      timestamp: now,
      requestId: '',
    };
  }

  // request setup error
  return {
    code: 0,
    message: err.message ?? 'Request setup error',
    timestamp: now,
    requestId: '',
  };
}
