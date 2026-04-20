import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';

@Injectable()
export class AgentService {
  constructor(
    @Inject('CHAT_MODEL') private readonly model: ChatOpenAI,
    private readonly configService: ConfigService,
  ) {}
}
