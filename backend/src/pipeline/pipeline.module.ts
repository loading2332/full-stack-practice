import { Module } from '@nestjs/common';
import { AnalysisModule } from '../analysis/analysis.module';
import { FeishuModule } from '../feishu/feishu.module';
import { GithubSyncModule } from '../github-sync/github-sync.module';
import { ReportsModule } from '../reports/reports.module';
import { PipelineController } from './pipeline.controller';
import { PipelineService } from './pipeline.service';

@Module({
  imports: [GithubSyncModule, AnalysisModule, FeishuModule, ReportsModule],
  controllers: [PipelineController],
  providers: [PipelineService],
  exports: [PipelineService],
})
export class PipelineModule {}
