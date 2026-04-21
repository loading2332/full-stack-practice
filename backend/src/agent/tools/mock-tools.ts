import { tool } from 'langchain';
import { z } from 'zod';

const MOCK_ACCOUNTS = [
  {
    customerId: '888-100-1001',
    name: 'Demo 品牌推广',
    spend: 1532.88,
    clicks: 3842,
    impressions: 48210,
    conversions: 156,
    diagnosisScore: 82,
    diagnosisGrade: 'B',
  },
  {
    customerId: '888-200-2002',
    name: 'Demo 效果获客',
    spend: 2888.12,
    clicks: 5210,
    impressions: 63881,
    conversions: 201,
    diagnosisScore: 65,
    diagnosisGrade: 'C',
  },
  {
    customerId: '888-300-3003',
    name: 'Demo 海外拓展',
    spend: 934.55,
    clicks: 1924,
    impressions: 24110,
    conversions: 88,
    diagnosisScore: 76,
    diagnosisGrade: 'B',
  },
];

const findAccount = (customerId?: string) =>
  MOCK_ACCOUNTS.find((account) => account.customerId === customerId) ||
  MOCK_ACCOUNTS[0];

export const mockGoogleAdsTool = tool(
  async ({ customerId, dateRange }) =>
    JSON.stringify({
      account: findAccount(customerId),
      dateRange,
      source: 'mock',
    }),
  {
    name: 'google_ads_fetch',
    description: 'Mock Google Ads 数据查询工具',
    schema: z.object({
      customerId: z.string().optional(),
      dateRange: z.string().default('LAST_7_DAYS'),
    }),
  },
);

export const mockDiagnosisTool = tool(
  async ({ customerId, dateRange }) =>
    JSON.stringify({
      customerId,
      dateRange,
      score: findAccount(customerId).diagnosisScore,
      grade: findAccount(customerId).diagnosisGrade,
      issues: [
        {
          ruleCode: 'CTR_LOW',
          title: 'CTR 低于行业基准',
          severity: 'medium',
        },
      ],
      source: 'mock',
    }),
  {
    name: 'run_diagnosis',
    description: 'Mock 诊断工具',
    schema: z.object({
      customerId: z.string(),
      dateRange: z.string().default('LAST_7_DAYS'),
    }),
  },
);

export const mockFeishuCardTool = tool(
  async ({ title, summary, customerId }) =>
    JSON.stringify({
      ok: true,
      title,
      summary,
      customerId,
      source: 'mock',
    }),
  {
    name: 'feishu_card',
    description: 'Mock 飞书推送工具',
    schema: z.object({
      title: z.string(),
      summary: z.string(),
      customerId: z.string().optional(),
    }),
  },
);

export const mockPipelineTriggerTool = tool(
  async ({ customerIds, reason }) =>
    JSON.stringify({
      ok: true,
      customerIds,
      reason,
      status: 'triggered',
      source: 'mock',
    }),
  {
    name: 'pipeline_trigger',
    description: 'Mock Pipeline 触发工具',
    schema: z.object({
      customerIds: z.array(z.string()).min(1),
      reason: z.string().optional(),
    }),
  },
);

export const mockTrendAnalysisTool = tool(
  async ({ customerId, days }) =>
    JSON.stringify({
      customerId,
      days,
      trend: Array.from({ length: days }, (_, index) => ({
        date: `2026-04-${String(index + 1).padStart(2, '0')}`,
        spend: 100 + index * 15,
        conversions: 8 + index,
      })),
      source: 'mock',
    }),
  {
    name: 'trend_analysis',
    description: 'Mock 趋势分析工具',
    schema: z.object({
      customerId: z.string(),
      days: z.number().int().min(1).max(90).default(7),
    }),
  },
);

export const mockAccountComparisonTool = tool(
  async ({ customerIds }) =>
    JSON.stringify({
      customerIds,
      comparison: customerIds.map((customerId) => findAccount(customerId)),
      source: 'mock',
    }),
  {
    name: 'account_comparison',
    description: 'Mock 账户对比工具',
    schema: z.object({
      customerIds: z.array(z.string()).min(2),
    }),
  },
);

export const mockOptimizationAdviceTool = tool(
  async ({ customerId, focus }) =>
    JSON.stringify({
      customerId,
      focus,
      advice: [
        '补充否定关键词，减少无效展示',
        '提升高转化广告组预算占比',
        '检查转化追踪完整性',
      ],
      source: 'mock',
    }),
  {
    name: 'optimization_advice',
    description: 'Mock 优化建议工具',
    schema: z.object({
      customerId: z.string(),
      focus: z.string().optional(),
    }),
  },
);

export const mockReportQueryTool = tool(
  async ({ customerId, date, limit }) =>
    JSON.stringify({
      customerId,
      date,
      limit,
      reports: MOCK_ACCOUNTS.slice(
        0,
        Math.min(limit, MOCK_ACCOUNTS.length),
      ).map((account) => ({
        customerId: account.customerId,
        date: date || '2026-04-20',
        diagnosisScore: account.diagnosisScore,
      })),
      source: 'mock',
    }),
  {
    name: 'report_query',
    description: 'Mock 报告查询工具',
    schema: z.object({
      customerId: z.string().optional(),
      date: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(30),
    }),
  },
);
