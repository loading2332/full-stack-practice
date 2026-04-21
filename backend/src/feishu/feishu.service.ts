import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type PushCardInput = {
  title: string;
  summary: string;
  repo?: string;
};

@Injectable()
export class FeishuService {
  private readonly logger = new Logger(FeishuService.name);

  constructor(private readonly configService: ConfigService) {}

  async pushCard(input: PushCardInput) {
    return {
      ok: true,
      messageId: 'mock-feishu-message-id',
      ...input,
    };
  }

  async sendRepoReportCard(
    snapshot: {
      owner: string;
      repo: string;
      branch: string;
      openIssueCount: number;
      openPullRequestCount: number;
    },
    analysis: {
      score: number;
      grade: string;
      checksEvaluated: number;
      checksTotal: number;
      categoryScores: Record<
        string,
        { score: number; grade: string; weight: number }
      >;
      findings: Array<{
        ruleId: string;
        titleZh: string;
        messageZh: string;
      }>;
      quickWins: Array<{
        ruleId: string;
        titleZh: string;
        messageZh: string;
      }>;
    },
  ): Promise<boolean> {
    const webhookUrl = this.configService.get<string>('FEISHU_WEBHOOK_URL');
    if (!webhookUrl || webhookUrl.includes('xxx')) {
      this.logger.warn('Feishu webhook URL not configured, skipping push');
      return false;
    }

    const scoreColor =
      analysis.score >= 75 ? 'green' : analysis.score >= 60 ? 'yellow' : 'red';
    const categoryLines = Object.entries(analysis.categoryScores)
      .map(([category, score]) => {
        const bar =
          '█'.repeat(Math.floor(score.score / 10)) +
          '░'.repeat(10 - Math.floor(score.score / 10));
        return `${category}(${(score.weight * 100).toFixed(0)}%) ${bar} ${score.score}分 ${score.grade}`;
      })
      .join('\n');
    const topFindings = analysis.findings
      .slice(0, 8)
      .map(
        (finding) =>
          `• **${finding.ruleId}** ${finding.titleZh}\n${finding.messageZh}`,
      )
      .join('\n');
    const quickWins = analysis.quickWins
      .slice(0, 5)
      .map(
        (quickWin) =>
          `⚡ **${quickWin.ruleId}** ${quickWin.titleZh}\n${quickWin.messageZh}`,
      )
      .join('\n');

    const card = {
      msg_type: 'interactive',
      card: {
        header: {
          title: {
            tag: 'plain_text',
            content: `GitHub 仓库健康诊断 · ${snapshot.owner}/${snapshot.repo}`,
          },
          template: scoreColor,
        },
        elements: [
          {
            tag: 'div',
            fields: [
              {
                is_short: true,
                text: {
                  tag: 'lark_md',
                  content: `**仓库**\n${snapshot.owner}/${snapshot.repo}`,
                },
              },
              {
                is_short: true,
                text: {
                  tag: 'lark_md',
                  content: `**分支**\n${snapshot.branch}`,
                },
              },
              {
                is_short: true,
                text: {
                  tag: 'lark_md',
                  content: `**Open PR**\n${snapshot.openPullRequestCount}`,
                },
              },
              {
                is_short: true,
                text: {
                  tag: 'lark_md',
                  content: `**Open Issue**\n${snapshot.openIssueCount}`,
                },
              },
              {
                is_short: true,
                text: {
                  tag: 'lark_md',
                  content: `**健康分**\n${analysis.score} (${analysis.grade})`,
                },
              },
            ],
          },
          { tag: 'hr' },
          {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: `**分类维度评分** (${analysis.checksEvaluated}/${analysis.checksTotal} 项已评估)\n${categoryLines}`,
            },
          },
          { tag: 'hr' },
          {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: `**发现问题 (${analysis.findings.length}项)**\n${topFindings || '暂无'}`,
            },
          },
          { tag: 'hr' },
          {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: `**Quick Wins**\n${quickWins || '暂无'}`,
            },
          },
        ],
      },
    };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card),
      });
      await response.json();
      return true;
    } catch (error) {
      this.logger.error(`Feishu push failed: ${(error as Error).message}`);
      return false;
    }
  }

  async sendPullRequestReportCard(
    snapshot: {
      owner: string;
      repo: string;
      prNumber: number;
      title: string;
      additions: number;
      deletions: number;
    },
    analysis: {
      score: number;
      grade: string;
      findings: Array<{ ruleId: string; titleZh: string; messageZh: string }>;
      quickWins: Array<{ ruleId: string; titleZh: string; messageZh: string }>;
      ciSummary: { total: number; failed: number; passed: number };
    },
  ): Promise<boolean> {
    const webhookUrl = this.configService.get<string>('FEISHU_WEBHOOK_URL');
    if (!webhookUrl || webhookUrl.includes('xxx')) {
      this.logger.warn('Feishu webhook URL not configured, skipping push');
      return false;
    }

    const scoreColor =
      analysis.score >= 75 ? 'green' : analysis.score >= 60 ? 'yellow' : 'red';
    const findings = analysis.findings
      .slice(0, 8)
      .map(
        (finding) =>
          `• **${finding.ruleId}** ${finding.titleZh}\n${finding.messageZh}`,
      )
      .join('\n');
    const quickWins = analysis.quickWins
      .slice(0, 5)
      .map(
        (quickWin) =>
          `⚡ **${quickWin.ruleId}** ${quickWin.titleZh}\n${quickWin.messageZh}`,
      )
      .join('\n');

    const card = {
      msg_type: 'interactive',
      card: {
        header: {
          title: {
            tag: 'plain_text',
            content: `PR 风险诊断 · ${snapshot.owner}/${snapshot.repo}#${snapshot.prNumber}`,
          },
          template: scoreColor,
        },
        elements: [
          {
            tag: 'div',
            fields: [
              {
                is_short: false,
                text: {
                  tag: 'lark_md',
                  content: `**标题**\n${snapshot.title}`,
                },
              },
              {
                is_short: true,
                text: {
                  tag: 'lark_md',
                  content: `**健康分**\n${analysis.score} (${analysis.grade})`,
                },
              },
              {
                is_short: true,
                text: {
                  tag: 'lark_md',
                  content: `**CI**\n${analysis.ciSummary.passed}/${analysis.ciSummary.total} 通过`,
                },
              },
              {
                is_short: true,
                text: {
                  tag: 'lark_md',
                  content: `**新增**\n${snapshot.additions}`,
                },
              },
              {
                is_short: true,
                text: {
                  tag: 'lark_md',
                  content: `**删除**\n${snapshot.deletions}`,
                },
              },
            ],
          },
          { tag: 'hr' },
          {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: `**发现问题 (${analysis.findings.length}项)**\n${findings || '暂无'}`,
            },
          },
          { tag: 'hr' },
          {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: `**Quick Wins**\n${quickWins || '暂无'}`,
            },
          },
        ],
      },
    };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card),
      });
      await response.json();
      return true;
    } catch (error) {
      this.logger.error(`Feishu push failed: ${(error as Error).message}`);
      return false;
    }
  }
}
