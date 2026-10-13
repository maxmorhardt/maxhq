import { isAxiosError } from 'axios';
import type { APIError } from '../types/error';

// normalize any thrown value (axios or otherwise) into an APIError
export function handleError(err: unknown): APIError {
  const now = new Date().toISOString();

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

  // prefer backend-provided error body when present
  if (response?.data) {
    return response.data;
  }

  // response without a body — synthesize from status
  if (response) {
    return {
      code: response.status ?? 0,
      message: `Request failed with status ${response.status}`,
      timestamp: now,
      requestId: (response.headers?.['x-request-id'] as string) ?? '',
    };
  }

  // request sent but no response — network failure
  if (request) {
    return {
      code: 0,
      message: 'Network error: Unable to reach the server',
      timestamp: now,
      requestId: '',
    };
  }

  // request was never sent (config/setup error)
  return {
    code: 0,
    message: err.message ?? 'Request setup error',
    timestamp: now,
    requestId: '',
  };
}
