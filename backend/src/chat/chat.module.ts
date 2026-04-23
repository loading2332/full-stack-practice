import { Module } from '@nestjs/common';
import { AgentModule } from '../agent/agent.module';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ChatSession } from './chat-session.entity';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [AgentModule, MikroOrmModule.forFeature([ChatSession])],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
