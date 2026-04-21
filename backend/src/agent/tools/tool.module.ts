import { Module, Provider, Type } from '@nestjs/common';
import { AnalysisModule } from '../../analysis/analysis.module';
import { FeishuModule } from '../../feishu/feishu.module';
import { GithubSyncModule } from '../../github-sync/github-sync.module';
import { PipelineModule } from '../../pipeline/pipeline.module';
import { ReportsModule } from '../../reports/reports.module';
import { FeishuCardToolService } from './feishu-card-tool.service';
import { GithubPrFetchToolService } from './github-pr-fetch-tool.service';
import { GithubRepoFetchToolService } from './github-repo-fetch-tool.service';
import { LlmService } from './llm.service';
import {
  mockFeishuCardTool,
  mockGithubPrFetchTool,
  mockGithubRepoFetchTool,
  mockPipelineTriggerTool,
  mockPrReportQueryTool,
  mockRepoReportQueryTool,
  mockRunPrAnalysisTool,
  mockRunRepoAnalysisTool,
} from './mock-tools';
import { PipelineTriggerToolService } from './pipeline-trigger-tool.service';
import { PrReportQueryToolService } from './pr-report-query-tool.service';
import { RepoReportQueryToolService } from './repo-report-query-tool.service';
import { RunPrAnalysisToolService } from './run-pr-analysis-tool.service';
import { RunRepoAnalysisToolService } from './run-repo-analysis-tool.service';

export function buildToolProvider(
  token: string,
  realServiceClass: Type<{ tool: any }>,
  mockTool: any,
  isMockMode = process.env.MOCK_MODE === 'true',
): Provider {
  if (isMockMode) {
    return { provide: token, useValue: mockTool };
  }

  return {
    provide: token,
    useFactory: (svc: { tool: any }) => svc.tool,
    inject: [realServiceClass],
  };
}

function toolProvider(
  token: string,
  realServiceClass: Type<{ tool: any }>,
  mockTool: any,
): Provider {
  return buildToolProvider(token, realServiceClass, mockTool);
}

const isMockMode = process.env.MOCK_MODE === 'true';

const realToolServices = isMockMode
  ? []
  : [
      GithubRepoFetchToolService,
      GithubPrFetchToolService,
      RunRepoAnalysisToolService,
      RunPrAnalysisToolService,
      FeishuCardToolService,
      PipelineTriggerToolService,
      RepoReportQueryToolService,
      PrReportQueryToolService,
    ];

const realModuleImports = isMockMode
  ? []
  : [
      GithubSyncModule,
      AnalysisModule,
      FeishuModule,
      ReportsModule,
      PipelineModule,
    ];

@Module({
  imports: [...realModuleImports],
  providers: [
    LlmService,
    ...realToolServices,
    {
      provide: 'CHAT_MODEL',
      useFactory: (svc: LlmService) => svc.getModel(),
      inject: [LlmService],
    },
    toolProvider(
      'GITHUB_REPO_FETCH_TOOL',
      GithubRepoFetchToolService,
      mockGithubRepoFetchTool,
    ),
    toolProvider(
      'GITHUB_PR_FETCH_TOOL',
      GithubPrFetchToolService,
      mockGithubPrFetchTool,
    ),
    toolProvider(
      'RUN_REPO_ANALYSIS_TOOL',
      RunRepoAnalysisToolService,
      mockRunRepoAnalysisTool,
    ),
    toolProvider(
      'RUN_PR_ANALYSIS_TOOL',
      RunPrAnalysisToolService,
      mockRunPrAnalysisTool,
    ),
    toolProvider('FEISHU_CARD_TOOL', FeishuCardToolService, mockFeishuCardTool),
    toolProvider(
      'PIPELINE_TRIGGER_TOOL',
      PipelineTriggerToolService,
      mockPipelineTriggerTool,
    ),
    toolProvider(
      'REPO_REPORT_QUERY_TOOL',
      RepoReportQueryToolService,
      mockRepoReportQueryTool,
    ),
    toolProvider(
      'PR_REPORT_QUERY_TOOL',
      PrReportQueryToolService,
      mockPrReportQueryTool,
    ),
  ],
  exports: [
    'CHAT_MODEL',
    'GITHUB_REPO_FETCH_TOOL',
    'GITHUB_PR_FETCH_TOOL',
    'RUN_REPO_ANALYSIS_TOOL',
    'RUN_PR_ANALYSIS_TOOL',
    'FEISHU_CARD_TOOL',
    'PIPELINE_TRIGGER_TOOL',
    'REPO_REPORT_QUERY_TOOL',
    'PR_REPORT_QUERY_TOOL',
  ],
})
export class ToolModule {}
