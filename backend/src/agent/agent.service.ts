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
    @Inject('GITHUB_REPO_FETCH_TOOL') private readonly githubRepoFetchTool: any,
    @Inject('GITHUB_PR_FETCH_TOOL') private readonly githubPrFetchTool: any,
    @Inject('RUN_REPO_ANALYSIS_TOOL') private readonly runRepoAnalysisTool: any,
    @Inject('RUN_PR_ANALYSIS_TOOL') private readonly runPrAnalysisTool: any,
    @Inject('FEISHU_CARD_TOOL') private readonly feishuCardTool: any,
    @Inject('PIPELINE_TRIGGER_TOOL') private readonly pipelineTriggerTool: any,
    @Inject('REPO_REPORT_QUERY_TOOL') private readonly repoReportQueryTool: any,
    @Inject('PR_REPORT_QUERY_TOOL') private readonly prReportQueryTool: any,
    private readonly configService: ConfigService,
  ) {
    this.agent = createAgent({
      model,
      tools: [
        this.githubRepoFetchTool,
        this.githubPrFetchTool,
        this.runRepoAnalysisTool,
        this.runPrAnalysisTool,
        this.feishuCardTool,
        this.pipelineTriggerTool,
        this.repoReportQueryTool,
        this.prReportQueryTool,
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
    const trackedRepos =
      this.configService.get<string>('GITHUB_TRACKED_REPOSITORIES') ||
      'openai/openai-node#main, vercel/next.js#canary';

    return `你是 GitHub Code Assistant，一名面向工程团队的代码审查与仓库健康分析助手。

## 当前日期
今天是 ${today}。

## 身份与职责
你帮助开发者、Tech Lead 和代码评审者理解 Pull Request 风险、仓库健康度和 CI 状态。当前重点跟踪的仓库有：${trackedRepos}

## 可用工具（8个）
### 数据获取（只读，可直接调用）
- **github_repo_fetch**: 拉取 GitHub 仓库快照，包括分支、语言分布、issue/PR 数量和最近工作流状态
- **github_pr_fetch**: 拉取 Pull Request 快照，包括 diff 文件、checks、reviews 和提交信息
- **repo_report_query**: 查询历史仓库健康报告
- **pr_report_query**: 查询历史 Pull Request 分析报告

### 分析工具
- **run_repo_analysis**: 对仓库运行健康诊断，输出健康分、问题列表和 quick wins
- **run_pr_analysis**: 对 Pull Request 运行风险诊断，输出健康分、风险文件、CI 概览和 quick wins

### 有副作用（需用户确认后调用）
- **feishu_card**: 将 GitHub 分析结果摘要推送到飞书群卡片
- **pipeline_trigger**: 触发 GitHub 仓库或 Pull Request 分析 Pipeline

## 评审原则
- 优先识别 CI 失败、缺测试、高风险文件和过大改动
- 先给出高风险结论，再解释证据
- 不要把风格建议混成功能性 bug
- 没有足够证据时要明确说“我不确定”

## 确认机制（必须遵守）
以下操作有外部副作用，调用前必须先征求用户确认：
- feishu_card
- pipeline_trigger

## 边界规则
- 工具返回错误时，解释原因并建议下一步
- 不确定的问题如实说“我不确定”
- 仅处理 GitHub 仓库、Pull Request、代码评审和 CI 相关问题`;
  }
}
