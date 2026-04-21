import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getNestMikroOrmConfig } from './database/mikro-orm.config';
import { GithubSyncModule } from './github-sync/github-sync.module';
import { AnalysisModule } from './analysis/analysis.module';
import { FeishuModule } from './feishu/feishu.module';
import { ReportsModule } from './reports/reports.module';
import { PipelineModule } from './pipeline/pipeline.module';
import { AgentModule } from './agent/agent.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MikroOrmModule.forRootAsync({
      useFactory: () => getNestMikroOrmConfig(),
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
    GithubSyncModule,
    AnalysisModule,
    FeishuModule,
    ReportsModule,
    PipelineModule,
    AgentModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
