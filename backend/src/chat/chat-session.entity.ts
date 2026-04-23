import { randomUUID } from 'crypto';
import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { UIMessage } from 'ai';

@Entity()
export class ChatSession {
  @PrimaryKey({ type: 'text' })
  id: string = randomUUID();

  @Property()
  title!: string;

  @Property({ type: 'json' })
  messages!: UIMessage[];

  @Property({ onCreate: () => new Date() })
  createdAt!: Date;

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt!: Date;
}
