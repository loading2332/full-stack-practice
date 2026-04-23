import type { UIMessage } from 'ai';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const cookiesMock = vi.fn();

vi.mock('next/headers', () => ({
  cookies: cookiesMock,
}));

describe('chat session detail proxy route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.BACKEND_URL = 'http://backend.test';
  });

  it('forwards session detail requests and returns backend JSON', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      Response.json({
        id: 's1',
        title: '新对话',
        messages: [],
      }),
    ) as typeof fetch;

    cookiesMock.mockResolvedValue({
      get: vi.fn().mockReturnValue(null),
    });

    const { GET } = await import('./route');

    const response = await GET(
      new Request('http://localhost/api/chat/sessions/s1'),
      { params: Promise.resolve({ id: 's1' }) },
    );

    expect(global.fetch).toHaveBeenCalledWith(
      'http://backend.test/chat/sessions/s1',
      expect.objectContaining({
        method: 'GET',
        headers: expect.any(Headers),
      }),
    );
    await expect(response.json()).resolves.toEqual({
      id: 's1',
      title: '新对话',
      messages: [],
    });
  });

  it('forwards delete session requests to the backend', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(Response.json({ ok: true })) as typeof fetch;

    cookiesMock.mockResolvedValue({
      get: vi.fn().mockReturnValue(null),
    });

    const { DELETE } = await import('./route');

    const response = await DELETE(
      new Request('http://localhost/api/chat/sessions/s1', {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ id: 's1' }) },
    );

    expect(global.fetch).toHaveBeenCalledWith(
      'http://backend.test/chat/sessions/s1',
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.any(Headers),
      }),
    );
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it('preserves backend 404 responses for delete requests', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ message: 'Chat session "missing" not found' }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    ) as typeof fetch;

    cookiesMock.mockResolvedValue({
      get: vi.fn().mockReturnValue(null),
    });

    const { DELETE } = await import('./route');

    const response = await DELETE(
      new Request('http://localhost/api/chat/sessions/missing', {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ id: 'missing' }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      message: 'Chat session "missing" not found',
    });
  });

  it('normalizes restored tool parts for future UI restore logic', async () => {
    const { normalizeToolParts } =
      await import('@/app/lib/chat/normalize-tool-parts');

    const persistedMessages = [
      {
        id: 'a1',
        role: 'assistant',
        parts: [
          {
            type: 'tool-call',
            toolCallId: 'tool-1',
            state: 'input-available',
            input: { repo: 'openai/openai-node' },
            output: { ok: true },
          },
          {
            type: 'dynamic-tool',
            toolCallId: 'tool-2',
            toolName: 'repo_lookup',
            state: 'input-available',
            input: { repo: 'openai/openai-node' },
          },
        ],
      },
    ] as unknown as UIMessage[];

    const messages = normalizeToolParts(persistedMessages);

    expect(messages[0].parts?.[0]).toMatchObject({
      state: 'output-available',
    });
    expect(messages[0].parts?.[1]).toMatchObject({
      state: 'output-error',
      output: '会话恢复时工具结果不可用',
    });
  });
});
