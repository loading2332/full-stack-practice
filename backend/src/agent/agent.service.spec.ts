import { ConfigService } from '@nestjs/config';
import { UIMessage } from 'ai';
import { toBaseMessages, toUIMessageStream } from '@ai-sdk/langchain';
import { createAgent } from 'langchain';
import { AgentService } from './agent.service';

jest.mock('langchain', () => ({
  createAgent: jest.fn(),
}));

jest.mock('@ai-sdk/langchain', () => ({
  toBaseMessages: jest.fn(),
  toUIMessageStream: jest.fn(),
}));

describe('AgentService', () => {
  const agentStream = { name: 'agent-stream' };
  const uiStream = { name: 'ui-stream' };
  const fakeAgent = {
    stream: jest.fn().mockResolvedValue(agentStream),
  };

  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'GOOGLE_ADS_CUSTOMER_IDS') {
        return '123-456-7890,234-567-8901';
      }
      return undefined;
    }),
  } as unknown as ConfigService;

  const tools = Array.from({ length: 8 }, (_, index) => ({
    name: `tool-${index + 1}`,
  }));

  beforeEach(() => {
    jest.clearAllMocks();
    (createAgent as jest.Mock).mockReturnValue(fakeAgent);
    (toBaseMessages as jest.Mock).mockResolvedValue([{ role: 'human' }]);
    (toUIMessageStream as jest.Mock).mockReturnValue(uiStream);
  });

  it('creates the LangChain agent with the injected model, tools, and system prompt', () => {
    const model = { provider: 'test-model' };

    new AgentService(
      model as never,
      tools[0],
      tools[1],
      tools[2],
      tools[3],
      tools[4],
      tools[5],
      tools[6],
      tools[7],
      configService,
    );

    expect(createAgent).toHaveBeenCalledTimes(1);
    expect(createAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        model,
        tools,
        systemPrompt: expect.stringContaining('你是 A.D.A.M.'),
      }),
    );
  });

  it('normalizes UI messages, converts them to LangChain messages, and returns a UI stream', async () => {
    const service = new AgentService(
      { provider: 'test-model' } as never,
      tools[0],
      tools[1],
      tools[2],
      tools[3],
      tools[4],
      tools[5],
      tools[6],
      tools[7],
      configService,
    );

    const messages = [
      {
        id: 'm1',
        role: 'user',
        content: '账户花了多少钱？',
      },
      {
        id: 'm2',
        role: 'assistant',
        parts: [{ type: 'text', text: '请稍等' }],
      },
    ] as UIMessage[];

    const result = await service.stream(messages);

    expect(toBaseMessages).toHaveBeenCalledWith([
      {
        id: 'm1',
        role: 'user',
        content: '账户花了多少钱？',
        parts: [{ type: 'text', text: '账户花了多少钱？' }],
      },
      {
        id: 'm2',
        role: 'assistant',
        parts: [{ type: 'text', text: '请稍等' }],
      },
    ]);
    expect(fakeAgent.stream).toHaveBeenCalledWith(
      { messages: [{ role: 'human' }] },
      {
        streamMode: ['messages', 'values'],
        recursionLimit: 20,
      },
    );
    expect(toUIMessageStream).toHaveBeenCalledWith(agentStream);
    expect(result).toBe(uiStream);
  });
});
