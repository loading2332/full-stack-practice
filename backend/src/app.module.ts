import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getNestMikroOrmConfig } from './database/mikro-orm.config';
import { YouTubeModule } from './youtube/youtube.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MikroOrmModule.forRootAsync({
      useFactory: () => getNestMikroOrmConfig(),
    }),
    YouTubeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
