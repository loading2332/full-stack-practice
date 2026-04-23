import { Migration } from '@mikro-orm/migrations';

export class Migration20260422093000 extends Migration {
  override up(): Promise<void> {
    this.addSql(
      `create table "chat_session" ("id" text not null, "title" varchar(255) not null, "messages" jsonb not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "chat_session_pkey" primary key ("id"));`,
    );

    return Promise.resolve();
  }

  override down(): Promise<void> {
    this.addSql(`drop table if exists "chat_session" cascade;`);

    return Promise.resolve();
  }
}
