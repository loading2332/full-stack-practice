import { Module, Provider, Type } from '@nestjs/common';
import { LlmService } from './llm.service';
import {
  mockAccountComparisonTool,
  mockDiagnosisTool,
  mockFeishuCardTool,
  mockGoogleAdsTool,
  mockOptimizationAdviceTool,
  mockPipelineTriggerTool,
  mockReportQueryTool,
  mockTrendAnalysisTool,
} from './mock-tools';
import { GoogleAdsToolService } from './google-ads-tool.service';
import { DiagnosisToolService } from './diagnosis-tool.service';
import { FeishuCardToolService } from './feishu-card-tool.service';
import { PipelineTriggerToolService } from './pipeline-trigger-tool.service';
import { TrendAnalysisToolService } from './trend-analysis-tool.service';
import { AccountComparisonToolService } from './account-comparison-tool.service';
import { OptimizationAdviceToolService } from './optimization-advice-tool.service';
import { ReportQueryToolService } from './report-query-tool.service';
import { GoogleAdsModule } from '../../google-ads/google-ads.module';
import { DiagnosisModule } from '../../diagnosis/diagnosis.module';
import { FeishuModule } from '../../feishu/feishu.module';
import { ReportsModule } from '../../reports/reports.module';
import { PipelineModule } from '../../pipeline/pipeline.module';

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
      GoogleAdsToolService,
      DiagnosisToolService,
      FeishuCardToolService,
      PipelineTriggerToolService,
      TrendAnalysisToolService,
      AccountComparisonToolService,
      OptimizationAdviceToolService,
      ReportQueryToolService,
    ];

const realModuleImports = isMockMode
  ? []
  : [
      GoogleAdsModule,
      DiagnosisModule,
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
    toolProvider('GOOGLE_ADS_TOOL', GoogleAdsToolService, mockGoogleAdsTool),
    toolProvider('DIAGNOSIS_TOOL', DiagnosisToolService, mockDiagnosisTool),
    toolProvider('FEISHU_CARD_TOOL', FeishuCardToolService, mockFeishuCardTool),
    toolProvider(
      'PIPELINE_TRIGGER_TOOL',
      PipelineTriggerToolService,
      mockPipelineTriggerTool,
    ),
    toolProvider(
      'TREND_ANALYSIS_TOOL',
      TrendAnalysisToolService,
      mockTrendAnalysisTool,
    ),
    toolProvider(
      'ACCOUNT_COMPARISON_TOOL',
      AccountComparisonToolService,
      mockAccountComparisonTool,
    ),
    toolProvider(
      'OPTIMIZATION_ADVICE_TOOL',
      OptimizationAdviceToolService,
      mockOptimizationAdviceTool,
    ),
    toolProvider(
      'REPORT_QUERY_TOOL',
      ReportQueryToolService,
      mockReportQueryTool,
    ),
  ],
  exports: [
    'CHAT_MODEL',
    'GOOGLE_ADS_TOOL',
    'DIAGNOSIS_TOOL',
    'FEISHU_CARD_TOOL',
    'PIPELINE_TRIGGER_TOOL',
    'TREND_ANALYSIS_TOOL',
    'ACCOUNT_COMPARISON_TOOL',
    'OPTIMIZATION_ADVICE_TOOL',
    'REPORT_QUERY_TOOL',
  ],
})
export class ToolModule {}
