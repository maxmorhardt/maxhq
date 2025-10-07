import { isAxiosError } from 'axios';
import type { APIError } from '../types/error';

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

  if (response?.data) {
    return response.data;
  }

  if (response) {
    return {
      code: response.status ?? 0,
      message: `Request failed with status ${response.status}`,
      timestamp: now,
      requestId: (response.headers?.['x-request-id'] as string) ?? '',
    };
  }

  if (request) {
    return {
      code: 0,
      message: 'Network error: Unable to reach the server',
      timestamp: now,
      requestId: '',
    };
  }

  return {
    code: 0,
    message: err.message ?? 'Request setup error',
    timestamp: now,
    requestId: '',
  };
}
