import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { createApiClient } from './http';

function setup(response: Response) {
  const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response);
  const onUnauthorized = vi.fn();
  const http = createApiClient({
    baseUrl: 'https://gateway.example.test/',
    getAccessToken: () => 'memory-access-token',
    fetchImpl,
    onUnauthorized,
  });
  return { http, fetchImpl, onUnauthorized };
}

describe('Gateway HTTP client', () => {
  it('sends Bearer with omitted credentials and validates direct DTO', async () => {
    const { http, fetchImpl } = setup(Response.json({ id: 'one' }));
    const result = await http.request('/api/v1/example', { schema: z.object({ id: z.string() }) });
    expect(result).toEqual({ id: 'one' });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://gateway.example.test/api/v1/example',
      expect.objectContaining({
        credentials: 'omit',
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer memory-access-token',
        },
      }),
    );
  });

  it('does not send Bearer to public login and serializes JSON', async () => {
    const { http, fetchImpl } = setup(Response.json({ ok: true }));
    await http.request('/api/v1/auth/login', {
      method: 'POST',
      auth: false,
      body: { username: 'a', password: 'example' },
    });
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      body: '{"username":"a","password":"example"}',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    expect(fetchImpl.mock.calls[0][1]?.headers).not.toHaveProperty('Authorization');
  });

  it('returns undefined for 204 instead of parsing JSON', async () => {
    const { http } = setup(new Response(null, { status: 204 }));
    await expect(http.request('/api/v1/example', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('preserves backend code and traceId on a state conflict', async () => {
    const { http } = setup(
      Response.json(
        {
          status: 409,
          code: 'LISTING_ALREADY_COMMITTED',
          message: 'Giao dịch đã được chốt.',
          traceId: 'trace-example',
        },
        { status: 409 },
      ),
    );
    await expect(http.request('/api/v1/example')).rejects.toMatchObject({
      status: 409,
      code: 'LISTING_ALREADY_COMMITTED',
      traceId: 'trace-example',
    });
  });

  it('clears only through the protected request unauthorized callback', async () => {
    const { http, onUnauthorized } = setup(
      Response.json({ status: 401, code: 'UNAUTHORIZED', message: 'Expired' }, { status: 401 }),
    );
    await expect(http.request('/api/v1/example')).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledWith('memory-access-token');
  });

  it('does not expire another session when a public login fails', async () => {
    const { http, onUnauthorized } = setup(
      Response.json(
        { status: 401, code: 'INVALID_CREDENTIALS', message: 'Failed' },
        { status: 401 },
      ),
    );
    await expect(http.request('/api/v1/auth/login', { auth: false })).rejects.toMatchObject({
      status: 401,
    });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('rejects successful responses whose DTO is incompatible', async () => {
    const { http } = setup(Response.json({ id: 123 }));
    await expect(
      http.request('/api/v1/example', { schema: z.object({ id: z.string() }) }),
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('reports non JSON server responses', async () => {
    const { http } = setup(new Response('<html>Proxy error</html>', { status: 502 }));
    await expect(http.request('/api/v1/example')).rejects.toMatchObject({
      status: 502,
      code: 'INVALID_RESPONSE',
    });
  });

  it('normalizes network errors without exposing transport internals', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('network internals'));
    const http = createApiClient({ baseUrl: '', getAccessToken: () => undefined, fetchImpl });
    await expect(http.request('/api/v1/example')).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
    });
  });

  it('preserves abort instead of rendering it as a network failure', async () => {
    const controller = new AbortController();
    controller.abort();
    const original = new DOMException('Aborted', 'AbortError');
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(original);
    const http = createApiClient({ baseUrl: '', getAccessToken: () => undefined, fetchImpl });
    await expect(http.request('/api/v1/example', { signal: controller.signal })).rejects.toBe(
      original,
    );
  });

  it.each([
    '/internal/v1/accounts/a',
    'https://untrusted.example/api/v1/x',
    '//evil/api/v1/x',
    '/api/v1/../internal/x',
  ])('rejects non public API path %s before fetching', async (path) => {
    const { http, fetchImpl } = setup(Response.json({}));
    await expect(http.request(path)).rejects.toThrow('Chỉ gọi API public');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('passes an existing idempotency key without inventing a retry attempt', async () => {
    const { http, fetchImpl } = setup(Response.json({}));
    await http.request('/api/v1/example', {
      method: 'POST',
      body: {},
      idempotencyKey: 'same-attempt',
    });
    expect(fetchImpl.mock.calls[0][1]?.headers).toHaveProperty('Idempotency-Key', 'same-attempt');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
