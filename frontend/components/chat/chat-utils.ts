import { isTextUIPart, type TextUIPart, type UIMessage } from 'ai';
import type { RunContextSnapshot, ToolTimelineItem } from './chat-types';

export type ScrollMetrics = {
  scrollHeight: number;
  scrollTop: number;
  clientHeight: number;
};

export type ChatToolPart = {
  type: string;
  state?: string;
  toolCallId?: string;
  toolName?: string;
  title?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

export type ToolDisplayState = 'pending' | 'output-available' | 'output-error';

export type SuggestedPrompt = {
  id: string;
  label: string;
  prompt: string;
  tools: string[];
};

const AUTO_SCROLL_THRESHOLD_PX = 96;

export const EMPTY_STATE_PROMPTS: SuggestedPrompt[] = [
  {
    id: 'empty-repo-fetch',
    label: 'Inspect a repo',
    prompt:
      'Fetch the latest snapshot for openai/openai-node on main and summarize repository health.',
    tools: ['github_repo_fetch'],
  },
  {
    id: 'empty-pr-analysis',
    label: 'Analyze a PR',
    prompt:
      'Fetch openai/openai-node PR #123 and give me the top risks, failing checks, and review priorities.',
    tools: ['github_pr_fetch', 'run_pr_analysis'],
  },
  {
    id: 'empty-repo-analysis',
    label: 'Run repo health',
    prompt:
      'Run a repository analysis for openai/openai-node on main and call out quick wins.',
    tools: ['run_repo_analysis'],
  },
  {
    id: 'empty-repo-report',
    label: 'Review repo history',
    prompt:
      'Query recent repository reports for openai/openai-node and tell me whether the health trend is improving.',
    tools: ['repo_report_query'],
  },
  {
    id: 'empty-pr-report',
    label: 'Review PR history',
    prompt:
      'Query recent PR reports for openai/openai-node PR #123 and compare the latest score with prior runs.',
    tools: ['pr_report_query'],
  },
  {
    id: 'empty-pipeline',
    label: 'Trigger pipeline',
    prompt:
      'Prepare a pipeline trigger request for openai/openai-node on main and tell me what confirmation you need.',
    tools: ['pipeline_trigger'],
  },
];

export const FOLLOW_UP_PROMPTS: SuggestedPrompt[] = [
  {
    id: 'follow-feishu',
    label: 'Draft Feishu update',
    prompt:
      'Draft a concise Feishu card for the latest GitHub findings and wait for my confirmation before sending it.',
    tools: ['feishu_card'],
  },
  {
    id: 'follow-pipeline',
    label: 'Queue a rerun',
    prompt:
      'Prepare a pipeline trigger for the latest repository or PR we discussed and explain why a rerun is justified.',
    tools: ['pipeline_trigger'],
  },
  {
    id: 'follow-repo-report',
    label: 'Check repo reports',
    prompt:
      'Look up the latest repository reports for the repo we are discussing and compare them with the current assessment.',
    tools: ['repo_report_query'],
  },
  {
    id: 'follow-pr-report',
    label: 'Check PR reports',
    prompt:
      'Look up prior pull request reports for the PR we are discussing and highlight any score or risk changes.',
    tools: ['pr_report_query'],
  },
  {
    id: 'follow-repo-fetch',
    label: 'Refresh repo snapshot',
    prompt:
      'Fetch a fresh repository snapshot for the repo we are discussing and point out any new workflow or issue signals.',
    tools: ['github_repo_fetch'],
  },
  {
    id: 'follow-pr-fetch',
    label: 'Refresh PR snapshot',
    prompt:
      'Fetch a fresh PR snapshot for the pull request we are discussing and highlight risky files and failing checks.',
    tools: ['github_pr_fetch', 'run_pr_analysis'],
  },
];

export function getTextParts(message: UIMessage): TextUIPart[] {
  return message.parts.filter(isTextUIPart);
}

export function hasUnrenderedParts(message: UIMessage): boolean {
  return message.parts.some(
    (part) => !isTextUIPart(part) && !isToolMessagePart(part),
  );
}

export function isScrolledNearBottom(
  metrics: ScrollMetrics,
  threshold = AUTO_SCROLL_THRESHOLD_PX,
): boolean {
  const distanceFromBottom =
    metrics.scrollHeight - metrics.scrollTop - metrics.clientHeight;

  return distanceFromBottom <= threshold;
}

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isToolMessagePart(part: unknown): part is ChatToolPart {
  if (!isObjectLike(part) || typeof part.type !== 'string') {
    return false;
  }

  return (
    part.type.startsWith('tool-') ||
    part.type === 'dynamic-tool' ||
    typeof part.toolCallId === 'string'
  );
}

export function getToolParts(message: UIMessage): ChatToolPart[] {
  return message.parts.filter(isToolMessagePart);
}

export function getToolPartName(part: ChatToolPart): string {
  if (typeof part.toolName === 'string' && part.toolName.length > 0) {
    return part.toolName;
  }

  if (part.type.startsWith('tool-')) {
    return part.type.slice(5);
  }

  return 'tool';
}

export function parseToolPayload(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return value;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function getDisplayState(state?: string): ToolDisplayState {
  switch (state) {
    case 'output-available':
      return 'output-available';
    case 'output-error':
    case 'output-denied':
      return 'output-error';
    default:
      return 'pending';
  }
}

export function getToolDisplayState(part: ChatToolPart): ToolDisplayState {
  return getDisplayState(part.state);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return isObjectLike(value) ? value : null;
}

function asString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function formatRepoTarget(value: unknown): string | null {
  const record = asRecord(value);

  if (!record) {
    return null;
  }

  const owner = asString(record.owner);
  const repo = asString(record.repo);
  const branch = asString(record.branch) ?? asString(record.defaultBranch);
  const repoPath = owner && repo ? `${owner}/${repo}` : null;

  if (!repoPath) {
    return null;
  }

  return branch ? `${repoPath} (${branch})` : repoPath;
}

function formatPrTarget(value: unknown): string | null {
  const record = asRecord(value);

  if (!record) {
    return null;
  }

  const owner = asString(record.owner);
  const repo = asString(record.repo);
  const prNumber = asNumber(record.prNumber);

  if (!owner || !repo || prNumber === null) {
    return null;
  }

  return `${owner}/${repo} #${prNumber}`;
}

export function getToolTarget(part: ChatToolPart): string | null {
  const input = parseToolPayload(part.input);
  const output = parseToolPayload(part.output);
  const targetRecord = asRecord(output) ?? asRecord(input) ?? {};
  const nestedTargetRecord =
    asRecord(asRecord(output)?.input) ?? asRecord(asRecord(input)?.input);
  const pipelineTargetRecord = nestedTargetRecord ?? targetRecord;

  if (getToolPartName(part) === 'pipeline_trigger') {
    return (
      formatPrTarget(pipelineTargetRecord) ??
      formatRepoTarget(pipelineTargetRecord)
    );
  }

  return formatPrTarget(targetRecord) ?? formatRepoTarget(targetRecord);
}

function getReportCount(value: unknown): number | null {
  const record = asRecord(value);

  if (!record || !Array.isArray(record.reports)) {
    return null;
  }

  return record.reports.length;
}

export function getToolSummary(part: ChatToolPart): string {
  const toolName = getToolPartName(part);
  const state = getToolDisplayState(part);
  const input = parseToolPayload(part.input);
  const output = parseToolPayload(part.output);
  const targetRecord = asRecord(output) ?? asRecord(input) ?? {};
  const repoTarget = formatRepoTarget(targetRecord);
  const prTarget = formatPrTarget(targetRecord);

  switch (toolName) {
    case 'github_repo_fetch':
      return state === 'output-available'
        ? `Fetched repository snapshot for ${repoTarget ?? 'the selected repository'}.`
        : state === 'output-error'
          ? `Repository snapshot failed for ${repoTarget ?? 'the selected repository'}.`
          : `Fetching repository snapshot for ${repoTarget ?? 'the selected repository'}…`;
    case 'github_pr_fetch':
      return state === 'output-available'
        ? `Fetched pull request snapshot for ${prTarget ?? 'the selected PR'}.`
        : state === 'output-error'
          ? `Pull request snapshot failed for ${prTarget ?? 'the selected PR'}.`
          : `Fetching pull request snapshot for ${prTarget ?? 'the selected PR'}…`;
    case 'run_repo_analysis': {
      const score = asNumber(asRecord(output)?.score);
      const grade = asString(asRecord(output)?.grade);
      const suffix =
        score !== null ? ` scored ${score}${grade ? ` (${grade})` : ''}` : '';

      return state === 'output-available'
        ? `Repository analysis for ${repoTarget ?? 'the selected repository'}${suffix}.`
        : state === 'output-error'
          ? `Repository analysis failed for ${repoTarget ?? 'the selected repository'}.`
          : `Running repository analysis for ${repoTarget ?? 'the selected repository'}…`;
    }
    case 'run_pr_analysis': {
      const score = asNumber(asRecord(output)?.score);
      const grade = asString(asRecord(output)?.grade);
      const suffix =
        score !== null ? ` scored ${score}${grade ? ` (${grade})` : ''}` : '';

      return state === 'output-available'
        ? `Pull request analysis for ${prTarget ?? 'the selected PR'}${suffix}.`
        : state === 'output-error'
          ? `Pull request analysis failed for ${prTarget ?? 'the selected PR'}.`
          : `Running pull request analysis for ${prTarget ?? 'the selected PR'}…`;
    }
    case 'repo_report_query': {
      const reportCount = getReportCount(output);

      return state === 'output-available'
        ? `Found ${reportCount ?? 0} repository report${reportCount === 1 ? '' : 's'} for ${repoTarget ?? 'the selected repository'}.`
        : state === 'output-error'
          ? `Repository report lookup failed for ${repoTarget ?? 'the selected repository'}.`
          : `Looking up repository reports for ${repoTarget ?? 'the selected repository'}…`;
    }
    case 'pr_report_query': {
      const reportCount = getReportCount(output);

      return state === 'output-available'
        ? `Found ${reportCount ?? 0} pull request report${reportCount === 1 ? '' : 's'} for ${prTarget ?? 'the selected PR'}.`
        : state === 'output-error'
          ? `Pull request report lookup failed for ${prTarget ?? 'the selected PR'}.`
          : `Looking up pull request reports for ${prTarget ?? 'the selected PR'}…`;
    }
    case 'feishu_card':
      return state === 'output-available'
        ? 'Prepared a Feishu card payload.'
        : state === 'output-error'
          ? 'Feishu card delivery failed.'
          : 'Preparing a Feishu card payload…';
    case 'pipeline_trigger': {
      const nestedTargetRecord =
        asRecord(asRecord(output)?.input) ?? asRecord(asRecord(input)?.input);
      const pipelineTargetRecord = nestedTargetRecord ?? targetRecord;
      const scope =
        asString(targetRecord.scope) ??
        asString(nestedTargetRecord?.scope) ??
        asString(asRecord(input)?.scope);
      const target =
        scope === 'pull_request'
          ? (formatPrTarget(pipelineTargetRecord) ?? prTarget)
          : (formatRepoTarget(pipelineTargetRecord) ?? repoTarget);

      return state === 'output-available'
        ? `Triggered ${scope === 'pull_request' ? 'pull request' : 'repository'} pipeline for ${target ?? 'the selected target'}.`
        : state === 'output-error'
          ? `Pipeline trigger failed for ${target ?? 'the selected target'}.`
          : `Preparing ${scope === 'pull_request' ? 'pull request' : 'repository'} pipeline trigger for ${target ?? 'the selected target'}…`;
    }
    default: {
      const fallbackTarget = prTarget ?? repoTarget;

      return state === 'output-available'
        ? `Completed ${toolName.replaceAll('_', ' ')}${fallbackTarget ? ` for ${fallbackTarget}` : ''}.`
        : state === 'output-error'
          ? `${toolName.replaceAll('_', ' ')} failed${fallbackTarget ? ` for ${fallbackTarget}` : ''}.`
          : `Running ${toolName.replaceAll('_', ' ')}${fallbackTarget ? ` for ${fallbackTarget}` : ''}…`;
    }
  }
}

export function getUsedToolNames(messages: UIMessage[]): Set<string> {
  return new Set(
    messages.flatMap((message) =>
      getToolParts(message).map((part) => getToolPartName(part)),
    ),
  );
}

export function getRunContextSummary(
  messages: UIMessage[],
): RunContextSnapshot {
  const timeline: ToolTimelineItem[] = messages.flatMap(
    (message, messageIndex) =>
      getToolParts(message).map((part, partIndex) => ({
        id: part.toolCallId ?? `${message.id}-${partIndex}-${messageIndex}`,
        toolName: getToolPartName(part),
        summary: getToolSummary(part),
        status: getToolDisplayState(part),
        target: getToolTarget(part),
        part,
      })),
  );
  const pending = timeline.filter((item) => item.status === 'pending');
  const latestCompleted =
    [...timeline]
      .reverse()
      .find((item) => item.status === 'output-available') ?? null;

  return {
    pending,
    latestCompleted,
    timeline: [
      ...pending,
      ...timeline.filter((item) => item.status !== 'pending'),
    ],
    toolCount: timeline.length,
  };
}

export function orderSuggestedPrompts(
  prompts: SuggestedPrompt[],
  usedTools: Set<string>,
): SuggestedPrompt[] {
  return prompts
    .map((prompt, index) => {
      const usedCount = prompt.tools.filter((tool) =>
        usedTools.has(tool),
      ).length;

      return {
        prompt,
        index,
        usedCount,
        unusedCount: prompt.tools.length - usedCount,
      };
    })
    .sort((left, right) => {
      if (left.usedCount !== right.usedCount) {
        return left.usedCount - right.usedCount;
      }

      if (left.unusedCount !== right.unusedCount) {
        return right.unusedCount - left.unusedCount;
      }

      return left.index - right.index;
    })
    .map((entry) => entry.prompt);
}
