import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getNestMikroOrmConfig } from './database/mikro-orm.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MikroOrmModule.forRootAsync({
      useFactory: () => getNestMikroOrmConfig(),
    }),
    SchedulerModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
    GoogleAdsModule,
    DiagnosisModule,
    FeishuModule,
    ReportsModule,
    PipelineModule,
    AgentModule,
    ChatModule,
    AuthModule, // 业务模块
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
