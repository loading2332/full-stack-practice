import { Body, Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { UIMessage, pipeUIMessageStreamToResponse } from 'ai';
import { AgentService } from '../agent/agent.service';

type ChatStreamBody = {
  messages: UIMessage[];
};

@Controller('chat')
export class ChatController {
  constructor(private readonly agentService: AgentService) {}

  @Post('stream')
  async stream(@Body() body: ChatStreamBody, @Res() response: Response) {
    const stream = await this.agentService.stream(body.messages);

    pipeUIMessageStreamToResponse({
      response,
      stream,
    });
  }
}
