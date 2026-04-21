import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { LlmService } from './llm.service';

jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn(),
}));

describe('LlmService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds ChatOpenAI with the tutorial configuration shape', () => {
    const configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          MODEL_NAME: 'gpt-4o',
          OPENAI_API_KEY: 'test-key',
          OPENAI_BASE_URL: 'https://example.com/v1',
        };
        return values[key];
      }),
    } as unknown as ConfigService;

    const service = new LlmService(configService);

    service.getModel();

    expect(ChatOpenAI).toHaveBeenCalledWith({
      model: 'gpt-4o',
      apiKey: 'test-key',
      configuration: {
        baseURL: 'https://example.com/v1',
      },
    });
  });

  it('falls back to gpt-4o when MODEL_NAME is not provided', () => {
    const configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string | undefined> = {
          OPENAI_API_KEY: 'test-key',
          OPENAI_BASE_URL: 'https://example.com/v1',
        };
        return values[key];
      }),
    } as unknown as ConfigService;

    const service = new LlmService(configService);

    service.getModel();

    expect(ChatOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o',
      }),
    );
  });
});
