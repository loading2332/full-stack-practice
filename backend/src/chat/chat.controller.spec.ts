import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { UIMessage, pipeUIMessageStreamToResponse } from 'ai';
import { ChatController } from './chat.controller';

jest.mock('ai', () => ({
  pipeUIMessageStreamToResponse: jest.fn(),
}));

jest.mock('../agent/agent.service', () => ({
  AgentService: class AgentService {},
}));

describe('ChatController', () => {
  const createResponse = () => {
    const response = {
      setHeader: jest.fn(),
      status: jest.fn(),
      json: jest.fn(),
      end: jest.fn(),
      headersSent: false,
    };

    response.status.mockReturnValue(response);

    return {
      response: response as unknown as Response,
      mocks: response,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a 400 response for empty chat requests before streaming starts', async () => {
    const agentService = {
      stream: jest.fn(),
    };
    const chatService = {
      createSession: jest.fn(),
      saveSession: jest.fn(),
      getSession: jest.fn(),
      listSessions: jest.fn(),
    };

    const controller = new ChatController(
      agentService as never,
      chatService as never,
    );

    const { response, mocks } = createResponse();

    await controller.chat({ messages: [] }, response);

    expect(mocks.status).toHaveBeenCalledWith(400);
    expect(mocks.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'messages must not be empty',
      }),
    );
    expect(chatService.createSession).not.toHaveBeenCalled();
    expect(agentService.stream).not.toHaveBeenCalled();
  });

  it('returns a 400 response for non-array chat messages before streaming starts', async () => {
    const agentService = {
      stream: jest.fn(),
    };
    const chatService = {
      createSession: jest.fn(),
      saveSession: jest.fn(),
      getSession: jest.fn(),
      listSessions: jest.fn(),
    };
    const controller = new ChatController(
      agentService as never,
      chatService as never,
    );

    const { response, mocks } = createResponse();

    await controller.chat({ messages: 'bad-shape' as never }, response);

    expect(mocks.status).toHaveBeenCalledWith(400);
    expect(mocks.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'messages must be an array',
      }),
    );
    expect(chatService.createSession).not.toHaveBeenCalled();
    expect(agentService.stream).not.toHaveBeenCalled();
  });

  it('returns a 400 response for a null chat body before streaming starts', async () => {
    const controller = new ChatController(
      { stream: jest.fn() } as never,
      {
        createSession: jest.fn(),
        saveSession: jest.fn(),
        getSession: jest.fn(),
        listSessions: jest.fn(),
      } as never,
    );
    const { response, mocks } = createResponse();

    await controller.chat(null as never, response);

    expect(mocks.status).toHaveBeenCalledWith(400);
    expect(mocks.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'request body must be an object',
      }),
    );
  });

  it('returns a 400 response for a blank session id before streaming starts', async () => {
    const agentService = {
      stream: jest.fn(),
    };
    const chatService = {
      createSession: jest.fn(),
      saveSession: jest.fn(),
      getSession: jest.fn(),
      listSessions: jest.fn(),
    };
    const controller = new ChatController(
      agentService as never,
      chatService as never,
    );
    const { response, mocks } = createResponse();

    await controller.chat(
      {
        sessionId: '   ',
        messages: [
          { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
        ],
      },
      response,
    );

    expect(mocks.status).toHaveBeenCalledWith(400);
    expect(mocks.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'sessionId must not be blank',
      }),
    );
    expect(chatService.getSession).not.toHaveBeenCalled();
    expect(chatService.createSession).not.toHaveBeenCalled();
    expect(agentService.stream).not.toHaveBeenCalled();
  });

  it('returns a 404 response for an unknown provided session id instead of creating a new session', async () => {
    const agentService = {
      stream: jest.fn(),
    };
    const chatService = {
      createSession: jest.fn(),
      saveSession: jest.fn(),
      getSession: jest.fn().mockResolvedValue(null),
      listSessions: jest.fn(),
    };
    const controller = new ChatController(
      agentService as never,
      chatService as never,
    );

    const { response, mocks } = createResponse();

    await controller.chat(
      {
        sessionId: 'missing-session',
        messages: [
          { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
        ],
      },
      response,
    );

    expect(mocks.status).toHaveBeenCalledWith(404);
    expect(mocks.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Chat session "missing-session" not found',
      }),
    );
    expect(chatService.getSession).toHaveBeenCalledWith('missing-session');
    expect(chatService.createSession).not.toHaveBeenCalled();
    expect(agentService.stream).not.toHaveBeenCalled();
  });

  it('restores an existing session and appends only the latest incoming message', async () => {
    const stream = { name: 'ui-stream' };
    const agentService = {
      stream: jest.fn().mockResolvedValue(stream),
    };
    const chatService = {
      createSession: jest.fn(),
      saveSession: jest.fn(),
      getSession: jest.fn().mockResolvedValue({
        id: 'session-1',
        title: 'Saved',
        messages: [
          {
            id: 'saved-user',
            role: 'user',
            parts: [{ type: 'text', text: 'saved question' }],
          },
          {
            id: 'saved-assistant',
            role: 'assistant',
            parts: [{ type: 'text', text: 'saved answer' }],
          },
        ],
        createdAt: new Date('2026-04-21T00:00:00.000Z'),
        updatedAt: new Date('2026-04-21T00:00:00.000Z'),
      }),
      listSessions: jest.fn(),
    };

    const controller = new ChatController(
      agentService as never,
      chatService as never,
    );
    const { response, mocks } = createResponse();
    const body: {
      sessionId: string;
      messages: UIMessage[];
    } = {
      sessionId: 'session-1',
      messages: [
        {
          id: 'stale-local',
          role: 'assistant',
          parts: [{ type: 'text', text: 'stale local draft' }],
        },
        {
          id: 'u1',
          role: 'user',
          parts: [{ type: 'text', text: 'latest question' }],
        },
      ],
    };

    await controller.chat(body, response);

    expect(chatService.getSession).toHaveBeenCalledWith('session-1');
    expect(chatService.createSession).not.toHaveBeenCalled();
    expect(mocks.setHeader).toHaveBeenCalledWith('X-Session-Id', 'session-1');
    expect(agentService.stream).toHaveBeenCalledWith([
      {
        id: 'saved-user',
        role: 'user',
        parts: [{ type: 'text', text: 'saved question' }],
      },
      {
        id: 'saved-assistant',
        role: 'assistant',
        parts: [{ type: 'text', text: 'saved answer' }],
      },
      {
        id: 'u1',
        role: 'user',
        parts: [{ type: 'text', text: 'latest question' }],
      },
    ]);
    expect(pipeUIMessageStreamToResponse).toHaveBeenCalledWith({
      response,
      stream,
    });
  });

  it('creates a new session, sets the header, and streams the provided messages', async () => {
    const stream = { name: 'ui-stream' };
    const agentService = {
      stream: jest.fn().mockResolvedValue(stream),
    };
    const chatService = {
      createSession: jest.fn().mockResolvedValue({
        id: 'session-new',
      }),
      saveSession: jest.fn(),
      getSession: jest.fn(),
      listSessions: jest.fn(),
    };

    const controller = new ChatController(
      agentService as never,
      chatService as never,
    );
    const { response, mocks } = createResponse();
    const body: {
      messages: UIMessage[];
    } = {
      messages: [
        { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
      ],
    };

    await controller.chat(body, response);

    expect(chatService.createSession).toHaveBeenCalled();
    expect(mocks.setHeader).toHaveBeenCalledWith('X-Session-Id', 'session-new');
    expect(agentService.stream).toHaveBeenCalledWith(body.messages);
  });

  it('maps upstream connection failures to 502 before streaming starts', async () => {
    const agentService = {
      stream: jest.fn().mockRejectedValue(
        Object.assign(new Error('connect ECONNREFUSED'), {
          code: 'ECONNREFUSED',
        }),
      ),
    };
    const chatService = {
      createSession: jest.fn().mockResolvedValue({
        id: 'session-new',
      }),
      saveSession: jest.fn(),
      getSession: jest.fn(),
      listSessions: jest.fn(),
    };

    const controller = new ChatController(
      agentService as never,
      chatService as never,
    );
    const { response, mocks } = createResponse();

    await controller.chat(
      {
        messages: [
          { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
        ],
      },
      response,
    );

    expect(mocks.status).toHaveBeenCalledWith(502);
    expect(mocks.json).toHaveBeenCalledWith({
      message: 'Failed to connect to the chat model',
    });
    expect(pipeUIMessageStreamToResponse).not.toHaveBeenCalled();
  });

  it('does not classify unrelated error messages as connection failures', async () => {
    const agentService = {
      stream: jest.fn().mockRejectedValue(new Error('connect your account')),
    };
    const chatService = {
      createSession: jest.fn().mockResolvedValue({
        id: 'session-new',
      }),
      saveSession: jest.fn(),
      getSession: jest.fn(),
      listSessions: jest.fn(),
    };
    const controller = new ChatController(
      agentService as never,
      chatService as never,
    );
    const { response, mocks } = createResponse();

    await controller.chat(
      {
        messages: [
          { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
        ],
      },
      response,
    );

    expect(mocks.status).toHaveBeenCalledWith(500);
    expect(mocks.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Failed to start chat stream',
      }),
    );
  });

  it('handles cyclic error causes while classifying connection failures', async () => {
    const error = Object.assign(new Error('socket hang up'), {
      code: 'ECONNRESET',
    }) as Error & { cause?: unknown };
    error.cause = error;
    const agentService = {
      stream: jest.fn().mockRejectedValue(error),
    };
    const chatService = {
      createSession: jest.fn().mockResolvedValue({
        id: 'session-new',
      }),
      saveSession: jest.fn(),
      getSession: jest.fn(),
      listSessions: jest.fn(),
    };
    const controller = new ChatController(
      agentService as never,
      chatService as never,
    );
    const { response, mocks } = createResponse();

    await controller.chat(
      {
        messages: [
          { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
        ],
      },
      response,
    );

    expect(mocks.status).toHaveBeenCalledWith(502);
    expect(mocks.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Failed to connect to the chat model',
      }),
    );
  });

  it('ends the response if streaming fails after headers were sent', async () => {
    const stream = { name: 'ui-stream' };
    const agentService = {
      stream: jest.fn().mockResolvedValue(stream),
    };
    const chatService = {
      createSession: jest.fn().mockResolvedValue({
        id: 'session-new',
      }),
      saveSession: jest.fn(),
      getSession: jest.fn(),
      listSessions: jest.fn(),
    };
    const controller = new ChatController(
      agentService as never,
      chatService as never,
    );
    const { response, mocks } = createResponse();
    mocks.headersSent = true;
    (pipeUIMessageStreamToResponse as jest.Mock).mockImplementationOnce(() => {
      throw new Error('stream broke');
    });

    await controller.chat(
      {
        messages: [
          { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
        ],
      },
      response,
    );

    expect(mocks.end).toHaveBeenCalled();
    expect(mocks.status).not.toHaveBeenCalled();
    expect(mocks.json).not.toHaveBeenCalled();
  });

  it('saves full messages and returns the session metadata', async () => {
    const agentService = {
      stream: jest.fn(),
    };
    const chatService = {
      createSession: jest.fn().mockResolvedValue({
        id: 'session-new',
      }),
      saveSession: jest.fn().mockResolvedValue({
        id: 'session-new',
        title: 'Saved title',
      }),
      getSession: jest.fn(),
      listSessions: jest.fn(),
    };
    const controller = new ChatController(
      agentService as never,
      chatService as never,
    );
    const messages: UIMessage[] = [
      { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'save me' }] },
    ];

    await expect(controller.save({ messages })).resolves.toEqual({
      sessionId: 'session-new',
      title: 'Saved title',
    });
    expect(chatService.createSession).toHaveBeenCalled();
    expect(chatService.saveSession).toHaveBeenCalledWith(
      'session-new',
      messages,
    );
  });

  it('rejects non-array save messages with a bad request', async () => {
    const controller = new ChatController(
      { stream: jest.fn() } as never,
      {
        createSession: jest.fn(),
        saveSession: jest.fn(),
        getSession: jest.fn(),
        listSessions: jest.fn(),
      } as never,
    );

    await expect(
      controller.save({ messages: 'bad-shape' as never }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a null save body with a bad request', async () => {
    const controller = new ChatController(
      { stream: jest.fn() } as never,
      {
        createSession: jest.fn(),
        saveSession: jest.fn(),
        getSession: jest.fn(),
        listSessions: jest.fn(),
      } as never,
    );

    await expect(controller.save(null as never)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects a blank save session id with a bad request', async () => {
    const chatService = {
      createSession: jest.fn(),
      saveSession: jest.fn(),
      getSession: jest.fn(),
      listSessions: jest.fn(),
    };
    const controller = new ChatController(
      { stream: jest.fn() } as never,
      chatService as never,
    );

    await expect(
      controller.save({
        sessionId: '   ',
        messages: [
          {
            id: 'u1',
            role: 'user',
            parts: [{ type: 'text', text: 'save me' }],
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(chatService.createSession).not.toHaveBeenCalled();
    expect(chatService.saveSession).not.toHaveBeenCalled();
  });

  it('treats a null save session id as a new session request', async () => {
    const chatService = {
      createSession: jest.fn().mockResolvedValue({
        id: 'session-null',
      }),
      saveSession: jest.fn().mockResolvedValue({
        id: 'session-null',
        title: 'Saved title',
      }),
      getSession: jest.fn(),
      listSessions: jest.fn(),
    };
    const controller = new ChatController(
      { stream: jest.fn() } as never,
      chatService as never,
    );
    const messages: UIMessage[] = [
      { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'save me' }] },
    ];

    await expect(
      controller.save({
        sessionId: null as never,
        messages,
      }),
    ).resolves.toEqual({
      sessionId: 'session-null',
      title: 'Saved title',
    });

    expect(chatService.createSession).toHaveBeenCalled();
    expect(chatService.saveSession).toHaveBeenCalledWith(
      'session-null',
      messages,
    );
  });

  it('lists saved sessions', async () => {
    const sessions = [{ id: 'session-1', title: 'Saved' }];
    const controller = new ChatController(
      { stream: jest.fn() } as never,
      {
        createSession: jest.fn(),
        saveSession: jest.fn(),
        getSession: jest.fn(),
        listSessions: jest.fn().mockResolvedValue(sessions),
      } as never,
    );

    await expect(controller.listSessions()).resolves.toEqual(sessions);
  });

  it('returns a single saved session and rejects missing sessions', async () => {
    const chatService = {
      createSession: jest.fn(),
      saveSession: jest.fn(),
      getSession: jest
        .fn()
        .mockResolvedValueOnce({ id: 'session-1', title: 'Saved' })
        .mockResolvedValueOnce(null),
      listSessions: jest.fn(),
    };
    const controller = new ChatController(
      { stream: jest.fn() } as never,
      chatService as never,
    );

    await expect(controller.getSession('session-1')).resolves.toEqual({
      id: 'session-1',
      title: 'Saved',
    });
    await expect(controller.getSession('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('deletes a session and returns ok true', async () => {
    const chatService = {
      createSession: jest.fn(),
      saveSession: jest.fn(),
      deleteSession: jest.fn().mockResolvedValue(undefined),
      getSession: jest.fn(),
      listSessions: jest.fn(),
    };
    const controller = new ChatController(
      { stream: jest.fn() } as never,
      chatService as never,
    );

    await expect(controller.deleteSession('session-1')).resolves.toEqual({
      ok: true,
    });

    expect(chatService.deleteSession).toHaveBeenCalledWith('session-1');
  });

  it('propagates not found when deleting a missing session', async () => {
    const chatService = {
      createSession: jest.fn(),
      saveSession: jest.fn(),
      deleteSession: jest
        .fn()
        .mockRejectedValue(
          new NotFoundException('Chat session "missing-session" not found'),
        ),
      getSession: jest.fn(),
      listSessions: jest.fn(),
    };
    const controller = new ChatController(
      { stream: jest.fn() } as never,
      chatService as never,
    );

    await expect(
      controller.deleteSession('missing-session'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
