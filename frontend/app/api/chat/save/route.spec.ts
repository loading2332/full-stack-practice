import { beforeEach, describe, expect, it, vi } from 'vitest';

const cookiesMock = vi.fn();

vi.mock('next/headers', () => ({
  cookies: cookiesMock,
}));

describe('chat save proxy route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.BACKEND_URL = 'http://backend.test';
  });

  it('forwards save requests and returns the backend JSON response', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        Response.json({ sessionId: 's1', title: '新对话' }),
      ) as typeof fetch;

    cookiesMock.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'jwt-token' }),
    });

    const { POST } = await import('./route');

    const response = await POST(
      new Request('http://localhost/api/chat/save', {
        method: 'POST',
        body: JSON.stringify({ sessionId: 's1', messages: [] }),
      }),
    );

    expect(global.fetch).toHaveBeenCalledWith(
      'http://backend.test/chat/save',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ sessionId: 's1', messages: [] }),
        headers: expect.any(Headers),
      }),
    );
    await expect(response.json()).resolves.toEqual({
      sessionId: 's1',
      title: '新对话',
    });
  });
});
