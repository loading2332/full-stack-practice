import { Options } from '@mikro-orm/core';
import { MikroOrmModuleSyncOptions } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { ChatSession } from '../chat/chat-session.entity';
import { PullRequestReport } from '../reports/pull-request-report.entity';
import { RepoReport } from '../reports/repo-report.entity';

type DatabaseEnv = Partial<
  Record<
    'DB_HOST' | 'DB_PORT' | 'DB_NAME' | 'DB_USER' | 'DB_PASSWORD' | 'DB_DEBUG',
    string
  >
>;

function toPort(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) ? parsed : fallback;
}

export function getMikroOrmConfig(
  env: DatabaseEnv = process.env,
): Options<PostgreSqlDriver> {
  return {
    driver: PostgreSqlDriver,
    entities: [RepoReport, PullRequestReport, ChatSession],
    entitiesTs: [RepoReport, PullRequestReport, ChatSession],
    host: env.DB_HOST ?? '127.0.0.1',
    port: toPort(env.DB_PORT, 5432),
    dbName: env.DB_NAME ?? 'adam_app',
    user: env.DB_USER ?? 'postgres',
    password: env.DB_PASSWORD ?? 'postgres',
    debug: env.DB_DEBUG === 'true',
    migrations: {
      path: 'dist/database/migrations',
      pathTs: 'src/database/migrations',
    },
  };
}

export function getNestMikroOrmConfig(
  env: DatabaseEnv = process.env,
): MikroOrmModuleSyncOptions {
  return {
    ...getMikroOrmConfig(env),
  };
}
