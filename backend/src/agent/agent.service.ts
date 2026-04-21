import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { toBaseMessages, toUIMessageStream } from '@ai-sdk/langchain';
import { UIMessage } from 'ai';
import { ChatOpenAI } from '@langchain/openai';
import { createAgent } from 'langchain';

type LegacyCompatibleUIMessage = UIMessage & {
  content?: string;
};

@Injectable()
export class AgentService {
  private readonly agent: ReturnType<typeof createAgent>;

  constructor(
    @Inject('CHAT_MODEL') model: ChatOpenAI,
    @Inject('GOOGLE_ADS_TOOL') private readonly googleAdsTool: any,
    @Inject('DIAGNOSIS_TOOL') private readonly diagnosisTool: any,
    @Inject('FEISHU_CARD_TOOL') private readonly feishuCardTool: any,
    @Inject('PIPELINE_TRIGGER_TOOL') private readonly pipelineTriggerTool: any,
    @Inject('TREND_ANALYSIS_TOOL') private readonly trendAnalysisTool: any,
    @Inject('ACCOUNT_COMPARISON_TOOL')
    private readonly accountComparisonTool: any,
    @Inject('OPTIMIZATION_ADVICE_TOOL')
    private readonly optimizationAdviceTool: any,
    @Inject('REPORT_QUERY_TOOL') private readonly reportQueryTool: any,
    private readonly configService: ConfigService,
  ) {
    this.agent = createAgent({
      model,
      tools: [
        this.googleAdsTool,
        this.diagnosisTool,
        this.feishuCardTool,
        this.pipelineTriggerTool,
        this.trendAnalysisTool,
        this.accountComparisonTool,
        this.optimizationAdviceTool,
        this.reportQueryTool,
      ],
      systemPrompt: this.buildSystemPrompt(),
    });
  }

  async stream(messages: UIMessage[]) {
    const normalized = (messages as LegacyCompatibleUIMessage[]).map(
      (message) => {
        if (message.parts && message.parts.length > 0) {
          return message;
        }

        return {
          ...message,
          parts: [
            {
              type: 'text' as const,
              text: typeof message.content === 'string' ? message.content : '',
            },
          ],
        };
      },
    );

    const lcMessages = await toBaseMessages(normalized);
    const lgStream = await this.agent.stream(
      { messages: lcMessages },
      {
        streamMode: ['messages', 'values'],
        recursionLimit: 20,
      },
    );

    return toUIMessageStream(lgStream);
  }

  private buildSystemPrompt() {
    const today = new Date().toISOString().split('T')[0];
    const customerIds =
      this.configService.get<string>('GOOGLE_ADS_CUSTOMER_IDS') ||
      '888-100-1001, 888-200-2002, 888-300-3003';

    return `你是 A.D.A.M.（Ad Digital Account Manager），广告投放 AI 数字客户经理。

## 当前日期
今天是 ${today}。

## 身份与职责
你是优化师的投放搭档，帮助管理和诊断 Google Ads 账户。你管理的账户 IDs: ${customerIds}

## 可用工具（8个）
### 数据查询（只读，可直接调用）
- **google_ads_fetch**: 拉取 Google Ads 实时投放数据
- **run_diagnosis**: 运行账户健康诊断
- **trend_analysis**: 分析账户趋势变化
- **account_comparison**: 对比多个账户表现
- **optimization_advice**: 生成优化建议
- **report_query**: 查询历史日报和诊断报告

### 有副作用（需用户确认后调用）
- **feishu_card**: 推送诊断报告卡片到飞书群
- **pipeline_trigger**: 触发完整 Pipeline

## 诊断体系
诊断引擎基于 74 条规则，覆盖 6 个维度，用于评估账户健康度和优化优先级。

## 行业基准（2026年 Google Ads Search）
- 全行业: CTR 6.66%, CPC $5.26, CVR 7.52%, CPL $70
- 你需要结合工具返回的数据和行业基准解释表现。

## 质量红线（绝对不可推荐）
- 广泛匹配不能搭配手动 CPC
- 不要建议删除有效转化跟踪
- 不要在数据不足时给出过度确定的结论

## 确认机制（必须遵守）
以下操作有外部副作用，调用前必须先征求用户确认：
- feishu_card
- pipeline_trigger

## 边界规则
- 工具返回错误时，解释原因并建议下一步
- 不确定的问题如实说“我不确定”
- 只回答广告投放相关问题，其他话题礼貌拒绝`;
  }
}
