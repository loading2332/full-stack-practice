import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpException,
  NotFoundException,
  Param,
  Post,
  Delete,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { UIMessage, pipeUIMessageStreamToResponse } from 'ai';
import { AgentService } from '../agent/agent.service';
import { ChatService } from './chat.service';

type ChatBody = {
  sessionId?: string;
  messages: UIMessage[];
};

@Controller('chat')
export class ChatController {
  constructor(
    private readonly agentService: AgentService,
    private readonly chatService: ChatService,
  ) {}

  @Post()
  async chat(@Body() body: ChatBody, @Res() response: Response): Promise<void> {
    try {
      const parsedBody = this.getBody(body);
      const latestMessage = this.getLatestMessage(parsedBody.messages);
      const session = await this.resolveSession(parsedBody.sessionId);
      const activeSession = session ?? (await this.chatService.createSession());
      const allMessages = session
        ? [...session.messages, latestMessage]
        : parsedBody.messages;

      response.setHeader('X-Session-Id', activeSession.id);

      const stream = await this.agentService.stream(allMessages);

      pipeUIMessageStreamToResponse({
        response,
        stream,
      });
    } catch (error) {
      this.handleStreamError(response, error);
    }
  }

  @Post('save')
  async save(@Body() body: ChatBody) {
    const parsedBody = this.getBody(body);
    const messages = this.getMessages(parsedBody.messages);
    const sessionId =
      parsedBody.sessionId ?? (await this.chatService.createSession()).id;
    const session = await this.chatService.saveSession(sessionId, messages);

    return {
      sessionId: session.id,
      title: session.title,
    };
  }

  @Get('sessions')
  async listSessions() {
    return this.chatService.listSessions();
  }

  @Get('sessions/:id')
  async getSession(@Param('id') id: string) {
    const session = await this.chatService.getSession(id);

    if (!session) {
      throw new NotFoundException(`Chat session "${id}" not found`);
    }

    return session;
  }

  @Delete('sessions/:id')
  async deleteSession(@Param('id') id: string) {
    await this.chatService.deleteSession(id);

    return {
      ok: true,
    };
  }

  private getLatestMessage(messages: UIMessage[]): UIMessage {
    const allMessages = this.getMessages(messages);

    if (allMessages.length === 0) {
      throw new BadRequestException('messages must not be empty');
    }

    return allMessages[allMessages.length - 1];
  }

  private getMessages(messages: UIMessage[]): UIMessage[] {
    if (!Array.isArray(messages)) {
      throw new BadRequestException('messages must be an array');
    }

    return messages;
  }

  private getBody(body: ChatBody | null | undefined): ChatBody {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('request body must be an object');
    }

    return {
      ...body,
      sessionId: this.normalizeSessionId(body.sessionId),
    };
  }

  private handleStreamError(response: Response, error: unknown) {
    if (response.headersSent) {
      response.end();
      return;
    }

    const { status, message } = this.getErrorResponse(error);

    response.status(status).json({ message });
  }

  private getErrorResponse(error: unknown): {
    status: number;
    message: string;
  } {
    if (error instanceof HttpException) {
      const status = error.getStatus();
      const payload = error.getResponse();

      if (
        payload &&
        typeof payload === 'object' &&
        'message' in payload &&
        typeof payload.message === 'string'
      ) {
        return {
          status,
          message: payload.message,
        };
      }

      return {
        status,
        message: error.message,
      };
    }

    if (this.isConnectionError(error)) {
      return {
        status: 502,
        message: 'Failed to connect to the chat model',
      };
    }

    return {
      status: 500,
      message: 'Failed to start chat stream',
    };
  }

  private async resolveSession(sessionId?: string) {
    if (!sessionId) {
      return null;
    }

    const session = await this.chatService.getSession(sessionId);

    if (!session) {
      throw new NotFoundException(`Chat session "${sessionId}" not found`);
    }

    return session;
  }

  private isConnectionError(error: unknown): boolean {
    const connectionErrorCodes = new Set([
      'ECONNREFUSED',
      'ECONNRESET',
      'ENOTFOUND',
      'ETIMEDOUT',
      'EHOSTUNREACH',
      'UND_ERR_CONNECT_TIMEOUT',
    ]);
    const visited = new Set<object>();
    let current = error;

    while (current && typeof current === 'object') {
      if (visited.has(current)) {
        return false;
      }

      visited.add(current);

      const candidate = current as {
        code?: unknown;
        cause?: unknown;
      };

      if (
        typeof candidate.code === 'string' &&
        connectionErrorCodes.has(candidate.code)
      ) {
        return true;
      }

      current = candidate.cause;
    }

    return false;
  }

  private normalizeSessionId(sessionId?: string | null): string | undefined {
    if (sessionId === undefined || sessionId === null) {
      return undefined;
    }

    if (typeof sessionId !== 'string') {
      throw new BadRequestException('sessionId must be a string');
    }

    const trimmed = sessionId.trim();

    if (!trimmed) {
      throw new BadRequestException('sessionId must not be blank');
    }

    return trimmed;
  }
}
