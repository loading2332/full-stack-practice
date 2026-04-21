import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getNestMikroOrmConfig } from './database/mikro-orm.config';
import { GoogleAdsModule } from './google-ads/google-ads.module';
import { DiagnosisModule } from './diagnosis/diagnosis.module';
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
    GoogleAdsModule,
    DiagnosisModule,
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
