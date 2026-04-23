import { beforeEach, describe, expect, it, vi } from 'vitest';

const cookiesMock = vi.fn();

vi.mock('next/headers', () => ({
  cookies: cookiesMock,
}));

describe('chat proxy route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.BACKEND_URL = 'http://backend.test';
  });

  it('builds backend authorization headers when a token is present', async () => {
    const { buildBackendHeaders } = await import('./_lib/backend');

    const headers = buildBackendHeaders({
      token: 'jwt-token',
      contentType: 'application/json',
    });

    expect(headers.get('Authorization')).toBe('Bearer jwt-token');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('forwards SSE responses with chat session headers', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: hello\n\n'));
        controller.close();
      },
    });

    global.fetch = vi.fn().mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'X-Session-Id': 's1',
        },
      }),
    ) as typeof fetch;

    cookiesMock.mockResolvedValue({
      get: vi.fn((name: string) =>
        name === 'token' ? { value: 'jwt-token' } : null,
      ),
    });

    const { POST } = await import('./route');

    const response = await POST(
      new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: {
          'X-Session-Id': 's-existing',
        },
        body: JSON.stringify({
          messages: [{ id: 'u1', role: 'user', parts: [] }],
        }),
      }),
    );

    expect(global.fetch).toHaveBeenCalledWith(
      'http://backend.test/chat',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          messages: [{ id: 'u1', role: 'user', parts: [] }],
          sessionId: 's-existing',
        }),
        headers: expect.any(Headers),
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    expect(response.headers.get('X-Session-Id')).toBe('s1');
    expect(response.headers.get('Cache-Control')).toBe('no-cache');

    const forwardedHeaders = (global.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0][1].headers as Headers;
    expect(forwardedHeaders.get('Authorization')).toBe('Bearer jwt-token');
    expect(forwardedHeaders.has('X-Session-Id')).toBe(false);
  });

  it('preserves an explicit sessionId already present in the request body', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 204,
      }),
    ) as typeof fetch;

    cookiesMock.mockResolvedValue({
      get: vi.fn().mockReturnValue(null),
    });

    const { POST } = await import('./route');

    await POST(
      new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: {
          'X-Session-Id': 's-header',
        },
        body: JSON.stringify({
          sessionId: 's-body',
          messages: [{ id: 'u1', role: 'user', parts: [] }],
        }),
      }),
    );

    expect(global.fetch).toHaveBeenCalledWith(
      'http://backend.test/chat',
      expect.objectContaining({
        body: JSON.stringify({
          sessionId: 's-body',
          messages: [{ id: 'u1', role: 'user', parts: [] }],
        }),
      }),
    );
  });

  it('forwards backend error payloads and status codes', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'bad request' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    ) as typeof fetch;

    cookiesMock.mockResolvedValue({
      get: vi.fn().mockReturnValue(null),
    });

    const { POST } = await import('./route');

    const response = await POST(
      new Request('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [],
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ message: 'bad request' });
  });

  it('allows anonymous chat proxy requests when no auth cookie exists', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 204,
      }),
    ) as typeof fetch;

    cookiesMock.mockResolvedValue({
      get: vi.fn().mockReturnValue(null),
    });

    const { POST } = await import('./route');

    const response = await POST(
      new Request('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ id: 'u1', role: 'user', parts: [] }],
        }),
      }),
    );

    expect(response.status).toBe(204);

    const forwardedHeaders = (global.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0][1].headers as Headers;
    expect(forwardedHeaders.has('Authorization')).toBe(false);
  });
});
