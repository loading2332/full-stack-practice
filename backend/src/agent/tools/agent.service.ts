import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class AgentService {
  constructor(
    @Inject('CHAT_MODEL') model: ChatOpenAI, //找到token 为CHAT_MODEL 的提供者，并注入到model参数中
    private readonly configService: ConfigService,
  ) {}
}
