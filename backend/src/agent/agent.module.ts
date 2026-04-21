import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { ToolModule } from './tools/tool.module';

@Module({
  imports: [ToolModule],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {}
