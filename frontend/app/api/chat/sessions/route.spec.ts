import { beforeEach, describe, expect, it, vi } from 'vitest';

const cookiesMock = vi.fn();

vi.mock('next/headers', () => ({
  cookies: cookiesMock,
}));

describe('chat sessions list proxy route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.BACKEND_URL = 'http://backend.test';
  });

  it('forwards session list requests and returns backend JSON', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        Response.json([{ id: 's1', title: '新对话' }]),
      ) as typeof fetch;

    cookiesMock.mockResolvedValue({
      get: vi.fn().mockReturnValue(null),
    });

    const { GET } = await import('./route');

    const response = await GET();

    expect(global.fetch).toHaveBeenCalledWith(
      'http://backend.test/chat/sessions',
      expect.objectContaining({
        method: 'GET',
        headers: expect.any(Headers),
      }),
    );
    await expect(response.json()).resolves.toEqual([
      { id: 's1', title: '新对话' },
    ]);
  });
});
