import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';

@Injectable()
export class LlmService {
  constructor(private readonly configService: ConfigService) {}

  getModel() {
    return new ChatOpenAI({
      model: this.configService.get('MODEL_NAME') || 'gpt-4o',
      apiKey: this.configService.get('OPENAI_API_KEY'),
      configuration: {
        baseURL: this.configService.get('OPENAI_BASE_URL'),
      },
    });
  }
}
