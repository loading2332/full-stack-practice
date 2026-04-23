import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable, NotFoundException } from '@nestjs/common';
import { UIMessage } from 'ai';
import { ChatSession } from './chat-session.entity';
import { normalizeToolParts } from './normalize-tool-parts';

export type ChatSessionSnapshot = {
  id: string;
  title: string;
  messages: UIMessage[];
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class ChatService {
  constructor(private readonly em: EntityManager) {}

  async createSession(): Promise<ChatSession> {
    const now = new Date();
    const session = this.em.create(ChatSession, {
      title: '新对话',
      messages: [],
      createdAt: now,
      updatedAt: now,
    });

    await this.em.persistAndFlush(session);

    return session;
  }

  async saveSession(id: string, messages: UIMessage[]): Promise<ChatSession> {
    const normalizedMessages = normalizeToolParts(messages);
    const title = this.deriveTitle(normalizedMessages);
    const now = new Date();
    const session = await this.em.findOne(ChatSession, { id });

    if (session) {
      session.title = title;
      session.messages = normalizedMessages;
      session.updatedAt = now;
      await this.em.persistAndFlush(session);

      return session;
    }

    const created = this.em.create(ChatSession, {
      id,
      title,
      messages: normalizedMessages,
      createdAt: now,
      updatedAt: now,
    });

    await this.em.persistAndFlush(created);

    return created;
  }

  async getSession(id: string): Promise<ChatSessionSnapshot | null> {
    const session = await this.em.findOne(ChatSession, { id });

    if (!session) {
      return null;
    }

    return this.toSnapshot(session);
  }

  async listSessions(): Promise<ChatSessionSnapshot[]> {
    const sessions = await this.em.find(
      ChatSession,
      {},
      { orderBy: { updatedAt: 'DESC', createdAt: 'DESC' } },
    );

    return sessions.map((session) => this.toSnapshot(session));
  }

  async deleteSession(id: string): Promise<void> {
    const session = await this.em.findOne(ChatSession, { id });

    if (!session) {
      throw new NotFoundException(`Chat session "${id}" not found`);
    }

    await this.em.removeAndFlush(session);
  }

  private deriveTitle(messages: UIMessage[]): string {
    for (const message of messages) {
      if (message.role !== 'user') {
        continue;
      }

      for (const part of message.parts ?? []) {
        if (part.type !== 'text') {
          continue;
        }

        const title = part.text.replace(/\s+/g, ' ').trim();

        if (title) {
          return title;
        }
      }
    }

    return '新对话';
  }

  private toSnapshot(session: ChatSession): ChatSessionSnapshot {
    return {
      id: session.id,
      title: session.title,
      messages: normalizeToolParts(session.messages),
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }
}
