import { vi } from 'vitest';

// answers every request with the given json body and remembers what was sent
export function stubFetch(body: unknown = {}) {
  const fetchMock = vi.fn<(request: Request) => Promise<Response>>(
    async () =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
  );
  vi.stubGlobal('fetch', fetchMock);

  const lastRequest = () => {
    const request = fetchMock.mock.calls.at(-1)?.[0] as Request;
    const url = new URL(request.url);
    return { method: request.method, path: url.pathname.replace(/^\/squares/, ''), url, request };
  };

  return { fetchMock, lastRequest };
}
