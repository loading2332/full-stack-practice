import { UIMessage } from 'ai';
import { ChatSession } from './chat-session.entity';
import { normalizeToolParts } from './normalize-tool-parts';
import { ChatService } from './chat.service';

describe('normalizeToolParts', () => {
  it('converts tool output parts into approved restore states', () => {
    const messages = [
      {
        id: 'm1',
        role: 'assistant',
        parts: [
          {
            type: 'tool-search',
            toolCallId: 'tool-1',
            state: 'input-available',
            input: { query: 'openai' },
            output: { ok: true },
          },
          {
            type: 'tool-search',
            toolCallId: 'tool-3',
            state: 'output',
            input: { query: 'legacy-output' },
            output: { ok: 'legacy' },
          },
          {
            type: 'dynamic-tool',
            toolCallId: 'tool-2',
            state: 'input-available',
            input: { query: 'missing-output' },
          },
          {
            type: 'legacy-result',
            toolCallId: 'tool-4',
            state: 'input-available',
            input: { query: 'toolcall-only' },
          },
        ],
      },
    ] as UIMessage[];

    const normalized = normalizeToolParts(messages);

    expect(normalized[0].parts).toEqual([
      {
        type: 'tool-search',
        toolCallId: 'tool-1',
        state: 'output-available',
        input: { query: 'openai' },
        output: { ok: true },
      },
      {
        type: 'tool-search',
        toolCallId: 'tool-3',
        state: 'output-available',
        input: { query: 'legacy-output' },
        output: { ok: 'legacy' },
      },
      {
        type: 'dynamic-tool',
        toolCallId: 'tool-2',
        state: 'output-error',
        input: { query: 'missing-output' },
        output: '会话恢复时工具结果不可用',
      },
      {
        type: 'legacy-result',
        toolCallId: 'tool-4',
        state: 'output-error',
        input: { query: 'toolcall-only' },
        output: '会话恢复时工具结果不可用',
      },
    ]);
  });

  it('passes through malformed primitive parts without throwing', () => {
    const messages = [
      {
        id: 'm1',
        role: 'assistant',
        parts: [null, 'hello', 42],
      },
    ] as unknown as UIMessage[];

    expect(() => normalizeToolParts(messages)).not.toThrow();
    expect(normalizeToolParts(messages)[0].parts).toEqual([null, 'hello', 42]);
  });
});

describe('ChatService', () => {
  const createSessionData = {
    id: 'session-1',
    title: 'hello',
    messages: [],
    createdAt: new Date('2026-04-21T00:00:00.000Z'),
    updatedAt: new Date('2026-04-21T00:00:00.000Z'),
  } satisfies ChatSession;

  let em: {
    create: jest.Mock;
    persistAndFlush: jest.Mock;
    removeAndFlush: jest.Mock;
    upsert: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
  };

  beforeEach(() => {
    em = {
      create: jest.fn().mockReturnValue(createSessionData),
      persistAndFlush: jest.fn().mockResolvedValue(undefined),
      removeAndFlush: jest.fn().mockResolvedValue(undefined),
      upsert: jest.fn().mockResolvedValue(createSessionData),
      findOne: jest.fn().mockResolvedValue(createSessionData),
      find: jest.fn().mockResolvedValue([createSessionData]),
    };
  });

  it('creates an empty session with the default title', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-22T03:00:00.000Z'));

    const service = new ChatService(em as never);
    try {
      await service.createSession();

      const createCall = em.create.mock.calls[0] as [
        typeof ChatSession,
        {
          title: string;
          messages: UIMessage[];
          createdAt: Date;
          updatedAt: Date;
        },
      ];
      const created = createCall[1];

      expect(em.create).toHaveBeenCalledWith(
        ChatSession,
        expect.objectContaining({
          title: '新对话',
          messages: [],
        }),
      );
      expect(created.createdAt.toISOString()).toBe('2026-04-22T03:00:00.000Z');
      expect(created.updatedAt.toISOString()).toBe('2026-04-22T03:00:00.000Z');
      expect(em.persistAndFlush).toHaveBeenCalledWith(createSessionData);
    } finally {
      jest.useRealTimers();
    }
  });

  it('saves a session with normalized tool parts and a refreshed title', async () => {
    const service = new ChatService(em as never);
    const messages = [
      {
        id: 'm1',
        role: 'assistant',
        parts: [
          {
            type: 'tool-search',
            toolCallId: 'tool-1',
            state: 'output',
            input: { query: 'openai' },
            output: { ok: true },
          },
        ],
      },
      {
        id: 'm2',
        role: 'user',
        parts: [{ type: 'text', text: '保存这段对话' }],
      },
    ] as UIMessage[];

    em.findOne.mockResolvedValueOnce(null);
    await service.saveSession('session-2', messages);

    expect(em.findOne).toHaveBeenCalledWith(ChatSession, { id: 'session-2' });
    const saveCall = em.create.mock.calls[0] as [
      typeof ChatSession,
      {
        id: string;
        title: string;
        messages: UIMessage[];
        createdAt: Date;
        updatedAt: Date;
      },
    ];
    expect(em.create).toHaveBeenCalledWith(
      ChatSession,
      expect.objectContaining({
        id: 'session-2',
        title: '保存这段对话',
        messages: [
          {
            id: 'm1',
            role: 'assistant',
            parts: [
              {
                type: 'tool-search',
                toolCallId: 'tool-1',
                state: 'output-available',
                input: { query: 'openai' },
                output: { ok: true },
              },
            ],
          },
          {
            id: 'm2',
            role: 'user',
            parts: [{ type: 'text', text: '保存这段对话' }],
          },
        ],
      }),
    );
    expect(saveCall[1].createdAt).toBeInstanceOf(Date);
    expect(saveCall[1].updatedAt).toBeInstanceOf(Date);
    expect(em.persistAndFlush).toHaveBeenCalledWith(createSessionData);
    expect(em.upsert).not.toHaveBeenCalled();
  });

  it('updates an existing session in place and refreshes updatedAt before saving', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-22T03:00:00.000Z'));

    try {
      const service = new ChatService(em as never);
      const existing = {
        id: 'session-3',
        title: '旧标题',
        messages: [
          {
            id: 'old',
            role: 'assistant',
            parts: [{ type: 'text', text: 'old' }],
          },
        ],
        createdAt: new Date('2026-04-21T00:00:00.000Z'),
        updatedAt: new Date('2026-04-21T00:00:00.000Z'),
      } satisfies ChatSession;
      em.findOne.mockResolvedValueOnce(existing);

      const saved = await service.saveSession('session-3', [
        {
          id: 'm1',
          role: 'user',
          parts: [{ type: 'text', text: '新的标题' }],
        },
      ] as UIMessage[]);

      expect(em.findOne).toHaveBeenCalledWith(ChatSession, {
        id: 'session-3',
      });
      expect(em.upsert).not.toHaveBeenCalled();
      expect(em.persistAndFlush).toHaveBeenCalledWith(existing);
      expect(saved).toBe(existing);
      expect(existing.title).toBe('新的标题');
      expect(existing.messages).toEqual([
        {
          id: 'm1',
          role: 'user',
          parts: [{ type: 'text', text: '新的标题' }],
        },
      ]);
      expect(existing.updatedAt.toISOString()).toBe('2026-04-22T03:00:00.000Z');
    } finally {
      jest.useRealTimers();
    }
  });

  it('returns a normalized session when fetching by id', async () => {
    const service = new ChatService(em as never);
    const existing = {
      ...createSessionData,
      messages: [
        {
          id: 'm1',
          role: 'assistant',
          parts: [
            {
              type: 'tool-search',
              toolCallId: 'tool-1',
              state: 'input-available',
              input: { query: 'restore' },
            },
          ],
        },
      ],
    } satisfies ChatSession;
    em.findOne.mockResolvedValueOnce(existing);

    const session = await service.getSession('session-1');

    expect(em.findOne).toHaveBeenCalledWith(ChatSession, { id: 'session-1' });
    expect(session).not.toBe(existing);
    expect(existing.messages[0].parts).toEqual([
      {
        type: 'tool-search',
        toolCallId: 'tool-1',
        state: 'input-available',
        input: { query: 'restore' },
      },
    ]);
    expect(session?.messages[0].parts).toEqual([
      {
        type: 'tool-search',
        toolCallId: 'tool-1',
        state: 'output-error',
        input: { query: 'restore' },
        output: '会话恢复时工具结果不可用',
      },
    ]);
  });

  it('lists sessions ordered by newest update first', async () => {
    const service = new ChatService(em as never);

    const existing = {
      ...createSessionData,
      messages: [
        {
          id: 'm1',
          role: 'assistant',
          parts: [
            {
              type: 'tool-search',
              toolCallId: 'tool-1',
              state: 'input-available',
              input: { query: 'list' },
            },
          ],
        },
      ],
    } satisfies ChatSession;
    em.find.mockResolvedValueOnce([existing]);

    const sessions = await service.listSessions();

    expect(em.find).toHaveBeenCalledWith(
      ChatSession,
      {},
      { orderBy: { updatedAt: 'DESC', createdAt: 'DESC' } },
    );
    expect(sessions[0]).not.toBe(existing);
    expect(existing.messages[0].parts).toEqual([
      {
        type: 'tool-search',
        toolCallId: 'tool-1',
        state: 'input-available',
        input: { query: 'list' },
      },
    ]);
    expect(sessions[0].messages[0].parts).toEqual([
      {
        type: 'tool-search',
        toolCallId: 'tool-1',
        state: 'output-error',
        input: { query: 'list' },
        output: '会话恢复时工具结果不可用',
      },
    ]);
  });

  it('deletes an existing session', async () => {
    const service = new ChatService(em as never);
    em.findOne.mockResolvedValueOnce(createSessionData);

    await service.deleteSession('session-1');

    expect(em.findOne).toHaveBeenCalledWith(ChatSession, { id: 'session-1' });
    expect(em.removeAndFlush).toHaveBeenCalledWith(createSessionData);
  });

  it('throws when deleting a missing session', async () => {
    const service = new ChatService(em as never);
    em.findOne.mockResolvedValueOnce(null);

    await expect(service.deleteSession('missing-session')).rejects.toThrow(
      'Chat session "missing-session" not found',
    );

    expect(em.findOne).toHaveBeenCalledWith(ChatSession, {
      id: 'missing-session',
    });
    expect(em.removeAndFlush).not.toHaveBeenCalled();
  });
});
