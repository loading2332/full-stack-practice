import { tool } from 'langchain';
import { z } from 'zod';

const MOCK_REPO = {
  owner: 'openai',
  repo: 'openai-node',
  branch: 'main',
  defaultBranch: 'main',
  openIssueCount: 12,
  openPullRequestCount: 4,
  recentWorkflowRuns: [
    { name: 'CI', status: 'completed', conclusion: 'success' },
    { name: 'Lint', status: 'completed', conclusion: 'failure' },
  ],
  recentCommits: [
    {
      sha: 'abc123',
      message: 'feat: improve pipeline workflow',
      author: 'didi',
      committedAt: '2026-04-21T06:30:00.000Z',
    },
  ],
  languages: { TypeScript: 82, CSS: 18 },
  repoMeta: { stars: 42, forks: 6, watchers: 11, visibility: 'public' },
};

const MOCK_PR = {
  owner: 'openai',
  repo: 'openai-node',
  prNumber: 123,
  title: 'feat: improve pipeline and agent workflow',
  body: 'body',
  state: 'open',
  baseBranch: 'main',
  headBranch: 'feature/pr-123',
  additions: 420,
  deletions: 138,
  changedFiles: [
    {
      filename: 'backend/src/pipeline/pipeline.service.ts',
      status: 'modified',
      additions: 110,
      deletions: 28,
      changes: 138,
    },
  ],
  commits: [],
  reviews: [],
  checkRuns: [{ name: 'CI', status: 'completed', conclusion: 'failure' }],
};

export const mockGithubRepoFetchTool = tool(
  async ({ owner, repo, branch }) =>
    JSON.stringify({
      ...MOCK_REPO,
      owner,
      repo,
      branch: branch || 'main',
      source: 'mock',
    }),
  {
    name: 'github_repo_fetch',
    description: 'Mock GitHub repo fetch tool',
    schema: z.object({
      owner: z.string(),
      repo: z.string(),
      branch: z.string().optional(),
    }),
  },
);

export const mockGithubPrFetchTool = tool(
  async ({ owner, repo, prNumber }) =>
    JSON.stringify({ ...MOCK_PR, owner, repo, prNumber, source: 'mock' }),
  {
    name: 'github_pr_fetch',
    description: 'Mock GitHub PR fetch tool',
    schema: z.object({
      owner: z.string(),
      repo: z.string(),
      prNumber: z.number().int(),
    }),
  },
);

export const mockRunRepoAnalysisTool = tool(
  async ({ owner, repo, branch }) =>
    JSON.stringify({
      scope: 'repo',
      owner,
      repo,
      branch: branch || 'main',
      score: 82,
      grade: 'B',
      findings: [],
      quickWins: [],
      categoryScores: {},
      source: 'mock',
    }),
  {
    name: 'run_repo_analysis',
    description: 'Mock repo analysis tool',
    schema: z.object({
      owner: z.string(),
      repo: z.string(),
      branch: z.string().optional(),
    }),
  },
);

export const mockRunPrAnalysisTool = tool(
  async ({ owner, repo, prNumber }) =>
    JSON.stringify({
      scope: 'pull_request',
      owner,
      repo,
      prNumber,
      score: 76,
      grade: 'B',
      riskFiles: ['backend/src/pipeline/pipeline.service.ts'],
      ciSummary: { total: 2, failed: 1, passed: 1 },
      findings: [],
      quickWins: [],
      categoryScores: {},
      source: 'mock',
    }),
  {
    name: 'run_pr_analysis',
    description: 'Mock PR analysis tool',
    schema: z.object({
      owner: z.string(),
      repo: z.string(),
      prNumber: z.number().int(),
    }),
  },
);

export const mockFeishuCardTool = tool(
  async ({ title, summary, repo }) =>
    JSON.stringify({ ok: true, title, summary, repo, source: 'mock' }),
  {
    name: 'feishu_card',
    description: 'Mock Feishu card tool',
    schema: z.object({
      title: z.string(),
      summary: z.string(),
      repo: z.string().optional(),
    }),
  },
);

export const mockPipelineTriggerTool = tool(
  async (input) =>
    JSON.stringify({ ok: true, input, status: 'triggered', source: 'mock' }),
  {
    name: 'pipeline_trigger',
    description: 'Mock pipeline trigger tool',
    schema: z.discriminatedUnion('scope', [
      z.object({
        scope: z.literal('repo'),
        owner: z.string(),
        repo: z.string(),
        branch: z.string().optional(),
        reason: z.string().optional(),
      }),
      z.object({
        scope: z.literal('pull_request'),
        owner: z.string(),
        repo: z.string(),
        prNumber: z.number().int(),
        reason: z.string().optional(),
      }),
    ]),
  },
);

export const mockRepoReportQueryTool = tool(
  async ({ owner, repo, branch, date, limit }) =>
    JSON.stringify({
      owner,
      repo,
      branch,
      date,
      limit,
      reports: [
        {
          owner: owner || MOCK_REPO.owner,
          repo: repo || MOCK_REPO.repo,
          branch: branch || MOCK_REPO.branch,
          date: date || '2026-04-21',
          score: 82,
          grade: 'B',
        },
      ],
      source: 'mock',
    }),
  {
    name: 'repo_report_query',
    description: 'Mock repo report query tool',
    schema: z.object({
      owner: z.string().optional(),
      repo: z.string().optional(),
      branch: z.string().optional(),
      date: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(30),
    }),
  },
);

export const mockPrReportQueryTool = tool(
  async ({ owner, repo, prNumber, date, limit }) =>
    JSON.stringify({
      owner,
      repo,
      prNumber,
      date,
      limit,
      reports: [
        {
          owner: owner || MOCK_PR.owner,
          repo: repo || MOCK_PR.repo,
          prNumber: prNumber || MOCK_PR.prNumber,
          date: date || '2026-04-21',
          score: 76,
          grade: 'B',
        },
      ],
      source: 'mock',
    }),
  {
    name: 'pr_report_query',
    description: 'Mock PR report query tool',
    schema: z.object({
      owner: z.string().optional(),
      repo: z.string().optional(),
      prNumber: z.number().int().optional(),
      date: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(30),
    }),
  },
);
