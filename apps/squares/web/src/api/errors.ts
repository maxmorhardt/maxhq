import type { FetchBaseQueryError, FetchBaseQueryMeta } from '@reduxjs/toolkit/query';

// every failed request surfaces as one of these, whatever went wrong
export interface ApiError {
  status: number;
  message: string;
  requestId?: string;
}

interface ServerErrorBody {
  message?: unknown;
  requestId?: unknown;
}

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ApiError).status === 'number' &&
    typeof (value as ApiError).message === 'string'
  );
}

export function errorStatus(error: unknown): number | undefined {
  return isApiError(error) ? error.status : undefined;
}

export function errorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again'
): string {
  return isApiError(error) && error.message ? error.message : fallback;
}

export function toApiError(error: FetchBaseQueryError, meta?: FetchBaseQueryMeta): ApiError {
  const requestId = meta?.response?.headers.get('x-request-id') ?? undefined;

  if (typeof error.status === 'number') {
    const body = (error.data ?? {}) as ServerErrorBody;
    return {
      status: error.status,
      message:
        typeof body.message === 'string' && body.message
          ? body.message
          : `Request failed with status ${error.status}`,
      requestId: typeof body.requestId === 'string' ? body.requestId : requestId,
    };
  }

  switch (error.status) {
    case 'FETCH_ERROR':
      return { status: 0, message: 'Network error: Unable to reach the server' };
    case 'TIMEOUT_ERROR':
      return { status: 0, message: 'The server took too long to respond' };
    case 'PARSING_ERROR':
      return {
        status: error.originalStatus,
        message: `Unexpected response with status ${error.originalStatus}`,
        requestId,
      };
    default:
      return { status: 0, message: error.error };
  }
}
