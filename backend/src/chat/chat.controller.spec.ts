import { Response } from 'express';
import { pipeUIMessageStreamToResponse } from 'ai';
import { ChatController } from './chat.controller';

jest.mock('ai', () => ({
  pipeUIMessageStreamToResponse: jest.fn(),
}));

jest.mock('../agent/agent.service', () => ({
  AgentService: class AgentService {},
}));

describe('ChatController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('pipes the agent UI stream to the HTTP response', async () => {
    const stream = { name: 'ui-stream' };
    const agentService = {
      stream: jest.fn().mockResolvedValue(stream),
    };

    const controller = new ChatController(agentService as never);
    const response = {} as Response;
    const body = {
      messages: [
        { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'hi' }] },
      ],
    };

    await controller.stream(body, response);

    expect(agentService.stream).toHaveBeenCalledWith(body.messages);
    expect(pipeUIMessageStreamToResponse).toHaveBeenCalledWith({
      response,
      stream,
    });
  });
});
