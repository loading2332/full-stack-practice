import { AlertTriangle, CheckCircle2, LoaderCircle } from 'lucide-react';
import {
  getToolDisplayState,
  getToolPartName,
  getToolSummary,
  parseToolPayload,
  type ChatToolPart,
  type ToolDisplayState,
} from './chat-utils';

type ToolPanelsProps = {
  part: ChatToolPart;
};

type SectionProps = {
  title: string;
  children: React.ReactNode;
};

type Metric = {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
};

const TOOL_TITLES: Record<string, string> = {
  github_repo_fetch: 'Repository Snapshot',
  github_pr_fetch: 'Pull Request Snapshot',
  run_repo_analysis: 'Repository Analysis',
  run_pr_analysis: 'Pull Request Analysis',
  repo_report_query: 'Repository Reports',
  pr_report_query: 'Pull Request Reports',
  feishu_card: 'Feishu Card',
  pipeline_trigger: 'Pipeline Trigger',
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
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

function asStringArray(value: unknown): string[] {
  return asArray(value)
    .map((item) => {
      if (typeof item === 'string') {
        return item;
      }

      const record = asRecord(item);

      return asString(record?.title) ?? asString(record?.name) ?? null;
    })
    .filter((item): item is string => Boolean(item));
}

function formatRepoTarget(value: unknown): string | null {
  const record = asRecord(value);

  if (!record) {
    return null;
  }

  const owner = asString(record.owner);
  const repo = asString(record.repo);
  const branch = asString(record.branch) ?? asString(record.defaultBranch);

  if (!owner || !repo) {
    return null;
  }

  return branch ? `${owner}/${repo} (${branch})` : `${owner}/${repo}`;
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

function formatNumber(value: number | null): string | null {
  return value === null ? null : Intl.NumberFormat('en-US').format(value);
}

function formatJson(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function getStatusMeta(state: ToolDisplayState) {
  switch (state) {
    case 'output-available':
      return {
        label: 'Completed',
        icon: <CheckCircle2 aria-hidden="true" className="size-3.5" />,
        classes: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100',
      };
    case 'output-error':
      return {
        label: 'Failed',
        icon: <AlertTriangle aria-hidden="true" className="size-3.5" />,
        classes: 'border-red-400/30 bg-red-500/10 text-red-100',
      };
    default:
      return {
        label: 'Pending',
        icon: (
          <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
        ),
        classes: 'border-amber-400/30 bg-amber-500/10 text-amber-100',
      };
  }
}

function MetricPill({ label, value, tone = 'default' }: Metric) {
  const toneClasses =
    tone === 'success'
      ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100'
      : tone === 'warning'
        ? 'border-amber-400/20 bg-amber-500/10 text-amber-100'
        : tone === 'danger'
          ? 'border-red-400/20 bg-red-500/10 text-red-100'
          : 'border-white/10 bg-white/[0.04] text-zinc-200';

  return (
    <div className={`rounded-2xl border px-3 py-2 ${toneClasses}`}>
      <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

function Section({ title, children }: SectionProps) {
  return (
    <section className="space-y-2">
      <h4 className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">
        {title}
      </h4>
      {children}
    </section>
  );
}

function ChipList({
  items,
  emptyLabel,
}: {
  items: string[];
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-zinc-500">{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-200"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function RawPayload({ value }: { value: unknown }) {
  return (
    <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-black/30 p-4 text-xs leading-6 text-zinc-300">
      {formatJson(value)}
    </pre>
  );
}

function renderGithubRepoFetch(input: unknown, output: unknown) {
  const payload = asRecord(output) ?? asRecord(input);

  if (!payload) {
    return <RawPayload value={output ?? input} />;
  }

  const repoTarget = formatRepoTarget(payload) ?? 'Repository';
  const repoMeta = asRecord(payload.repoMeta);
  const workflowRuns = asArray(payload.recentWorkflowRuns)
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => Boolean(item));
  const languages = asRecord(payload.languages);
  const recentCommits = asArray(payload.recentCommits)
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => Boolean(item));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricPill label="Repository" value={repoTarget} />
        <MetricPill
          label="Open issues"
          value={formatNumber(asNumber(payload.openIssueCount)) ?? 'n/a'}
        />
        <MetricPill
          label="Open PRs"
          value={formatNumber(asNumber(payload.openPullRequestCount)) ?? 'n/a'}
        />
        <MetricPill
          label="Visibility"
          value={asString(repoMeta?.visibility) ?? 'n/a'}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricPill
          label="Stars"
          value={formatNumber(asNumber(repoMeta?.stars)) ?? 'n/a'}
        />
        <MetricPill
          label="Forks"
          value={formatNumber(asNumber(repoMeta?.forks)) ?? 'n/a'}
        />
        <MetricPill
          label="Watchers"
          value={formatNumber(asNumber(repoMeta?.watchers)) ?? 'n/a'}
        />
      </div>

      <Section title="Languages">
        <ChipList
          items={Object.entries(languages ?? {}).map(
            ([name, percentage]) => `${name} ${percentage}%`,
          )}
          emptyLabel="No language breakdown available."
        />
      </Section>

      <Section title="Recent workflow runs">
        <ChipList
          items={workflowRuns.map((run) => {
            const name = asString(run.name) ?? 'Workflow';
            const conclusion =
              asString(run.conclusion) ?? asString(run.status) ?? 'unknown';

            return `${name}: ${conclusion}`;
          })}
          emptyLabel="No workflow runs available."
        />
      </Section>

      {recentCommits[0] ? (
        <Section title="Latest commit">
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-200">
            <div className="font-medium">
              {asString(recentCommits[0].message) ?? 'No commit message'}
            </div>
            <div className="mt-1 text-xs text-zinc-400">
              {(asString(recentCommits[0].author) ?? 'Unknown author') +
                ' • ' +
                (asString(recentCommits[0].sha) ?? 'unknown sha')}
            </div>
          </div>
        </Section>
      ) : null}
    </div>
  );
}

function renderGithubPrFetch(input: unknown, output: unknown) {
  const payload = asRecord(output) ?? asRecord(input);

  if (!payload) {
    return <RawPayload value={output ?? input} />;
  }

  const prTarget = formatPrTarget(payload) ?? 'Pull request';
  const changedFiles = asArray(payload.changedFiles)
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => Boolean(item));
  const checkRuns = asArray(payload.checkRuns)
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => Boolean(item));
  const failingChecks = checkRuns.filter(
    (check) => asString(check.conclusion) === 'failure',
  ).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricPill label="Pull request" value={prTarget} />
        <MetricPill label="State" value={asString(payload.state) ?? 'n/a'} />
        <MetricPill
          label="Additions"
          value={formatNumber(asNumber(payload.additions)) ?? 'n/a'}
        />
        <MetricPill
          label="Deletions"
          value={formatNumber(asNumber(payload.deletions)) ?? 'n/a'}
        />
      </div>

      <Section title="Branches">
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-200">
          {(asString(payload.baseBranch) ?? 'unknown base') +
            ' <- ' +
            (asString(payload.headBranch) ?? 'unknown head')}
        </div>
      </Section>

      <Section title="Changed files">
        <ChipList
          items={changedFiles
            .slice(0, 6)
            .map((file) => asString(file.filename))
            .filter((item): item is string => Boolean(item))}
          emptyLabel="No changed files available."
        />
      </Section>

      <Section title="Checks">
        <div className="grid gap-3 sm:grid-cols-2">
          <MetricPill
            label="Total checks"
            value={formatNumber(checkRuns.length) ?? '0'}
          />
          <MetricPill
            label="Failing"
            value={`${failingChecks} failing`}
            tone={failingChecks > 0 ? 'danger' : 'success'}
          />
        </div>
      </Section>
    </div>
  );
}

function renderRepoAnalysis(input: unknown, output: unknown) {
  const payload = asRecord(output) ?? asRecord(input);

  if (!payload) {
    return <RawPayload value={output ?? input} />;
  }

  const findings = asStringArray(payload.findings);
  const quickWins = asStringArray(payload.quickWins);
  const repoTarget = formatRepoTarget(payload) ?? 'Repository';

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricPill label="Repository" value={repoTarget} />
        <MetricPill
          label="Score"
          value={formatNumber(asNumber(payload.score)) ?? 'n/a'}
          tone="success"
        />
        <MetricPill
          label="Grade"
          value={
            asString(payload.grade) ? `Grade ${asString(payload.grade)}` : 'n/a'
          }
        />
        <MetricPill
          label="Findings"
          value={formatNumber(findings.length) ?? '0'}
          tone={findings.length > 0 ? 'warning' : 'success'}
        />
      </div>

      <Section title="Quick wins">
        <ChipList items={quickWins} emptyLabel="No quick wins suggested." />
      </Section>

      <Section title="Findings">
        <ChipList items={findings} emptyLabel="No findings reported." />
      </Section>
    </div>
  );
}

function renderPrAnalysis(input: unknown, output: unknown) {
  const payload = asRecord(output) ?? asRecord(input);

  if (!payload) {
    return <RawPayload value={output ?? input} />;
  }

  const riskFiles = asStringArray(payload.riskFiles);
  const quickWins = asStringArray(payload.quickWins);
  const ciSummary = asRecord(payload.ciSummary);
  const prTarget = formatPrTarget(payload) ?? 'Pull request';
  const failedChecks = asNumber(ciSummary?.failed) ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricPill label="Pull request" value={prTarget} />
        <MetricPill
          label="Score"
          value={formatNumber(asNumber(payload.score)) ?? 'n/a'}
          tone="warning"
        />
        <MetricPill
          label="Grade"
          value={
            asString(payload.grade) ? `Grade ${asString(payload.grade)}` : 'n/a'
          }
        />
        <MetricPill
          label="CI"
          value={`${failedChecks} failing`}
          tone={failedChecks > 0 ? 'danger' : 'success'}
        />
      </div>

      <Section title="Risk files">
        <ChipList items={riskFiles} emptyLabel="No risk files highlighted." />
      </Section>

      <Section title="Quick wins">
        <ChipList items={quickWins} emptyLabel="No quick wins suggested." />
      </Section>
    </div>
  );
}

function renderReportQuery(
  input: unknown,
  output: unknown,
  scope: 'repo' | 'pr',
) {
  const payload = asRecord(output) ?? asRecord(input);

  if (!payload) {
    return <RawPayload value={output ?? input} />;
  }

  const reports = asArray(payload.reports)
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => Boolean(item));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricPill
          label={scope === 'repo' ? 'Repository' : 'Pull request'}
          value={
            scope === 'repo'
              ? (formatRepoTarget(payload) ?? 'Scoped query')
              : (formatPrTarget(payload) ?? 'Scoped query')
          }
        />
        <MetricPill
          label="Reports"
          value={formatNumber(reports.length) ?? '0'}
        />
        <MetricPill label="Date" value={asString(payload.date) ?? 'latest'} />
        <MetricPill
          label="Limit"
          value={formatNumber(asNumber(payload.limit)) ?? 'n/a'}
        />
      </div>

      <Section title="Results">
        {reports.length === 0 ? (
          <p className="text-sm text-zinc-500">No reports returned.</p>
        ) : (
          <div className="space-y-3">
            {reports.slice(0, 4).map((report, index) => {
              const title =
                scope === 'repo'
                  ? (formatRepoTarget(report) ??
                    `Repository report ${index + 1}`)
                  : (formatPrTarget(report) ??
                    `Pull request report ${index + 1}`);
              const score = formatNumber(asNumber(report.score)) ?? 'n/a';
              const grade = asString(report.grade) ?? 'n/a';
              const date = asString(report.date) ?? 'unknown date';

              return (
                <div
                  key={`${title}-${date}-${index}`}
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-200"
                >
                  <div className="font-medium">{title}</div>
                  <div className="mt-1 text-zinc-400">
                    Score {score} • Grade {grade} • {date}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

function renderFeishuCard(input: unknown, output: unknown) {
  const payload = asRecord(output) ?? asRecord(input);

  if (!payload) {
    return <RawPayload value={output ?? input} />;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <MetricPill label="Title" value={asString(payload.title) ?? 'n/a'} />
        <MetricPill label="Repo" value={asString(payload.repo) ?? 'n/a'} />
        <MetricPill
          label="Status"
          value={asString(payload.ok) === 'true' ? 'Ready' : 'Prepared'}
        />
      </div>

      <Section title="Summary">
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-zinc-200">
          {asString(payload.summary) ?? 'No summary provided.'}
        </div>
      </Section>
    </div>
  );
}

function renderPipelineTrigger(input: unknown, output: unknown) {
  const inputRecord = asRecord(input);
  const payload = asRecord(output) ?? inputRecord;

  if (!payload) {
    return <RawPayload value={output ?? input} />;
  }

  const scope =
    asString(payload.scope) ?? asString(inputRecord?.scope) ?? 'repo';
  const target =
    scope === 'pull_request'
      ? (formatPrTarget(payload) ?? formatPrTarget(inputRecord))
      : (formatRepoTarget(payload) ?? formatRepoTarget(inputRecord));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricPill label="Scope" value={scope.replaceAll('_', ' ')} />
        <MetricPill label="Target" value={target ?? 'n/a'} />
        <MetricPill
          label="Status"
          value={asString(payload.status) ?? 'queued'}
        />
        <MetricPill
          label="Reason"
          value={
            asString(payload.reason) ?? asString(inputRecord?.reason) ?? 'n/a'
          }
        />
      </div>

      {payload.input ? (
        <Section title="Submitted payload">
          <RawPayload value={payload.input} />
        </Section>
      ) : null}
    </div>
  );
}

function renderToolBody(toolName: string, input: unknown, output: unknown) {
  switch (toolName) {
    case 'github_repo_fetch':
      return renderGithubRepoFetch(input, output);
    case 'github_pr_fetch':
      return renderGithubPrFetch(input, output);
    case 'run_repo_analysis':
      return renderRepoAnalysis(input, output);
    case 'run_pr_analysis':
      return renderPrAnalysis(input, output);
    case 'repo_report_query':
      return renderReportQuery(input, output, 'repo');
    case 'pr_report_query':
      return renderReportQuery(input, output, 'pr');
    case 'feishu_card':
      return renderFeishuCard(input, output);
    case 'pipeline_trigger':
      return renderPipelineTrigger(input, output);
    default:
      return <RawPayload value={output ?? input} />;
  }
}

export function ToolPanels({ part }: ToolPanelsProps) {
  const toolName = getToolPartName(part);
  const status = getToolDisplayState(part);
  const input = parseToolPayload(part.input);
  const output = parseToolPayload(part.output);
  const statusMeta = getStatusMeta(status);
  const errorMessage =
    part.errorText ??
    (typeof output === 'string'
      ? output
      : 'The tool did not return a usable result.');

  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4 shadow-lg shadow-black/10">
      <header className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-zinc-500">
            <span>Tool</span>
            <span className="text-zinc-700">/</span>
            <span className="font-mono" translate="no">
              {toolName}
            </span>
          </div>
          <h3 className="mt-2 text-base font-semibold text-white">
            {TOOL_TITLES[toolName] ?? toolName.replaceAll('_', ' ')}
          </h3>
          <p className="mt-1 text-sm leading-6 text-zinc-400">
            {getToolSummary(part)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start">
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${statusMeta.classes}`}
          >
            {statusMeta.icon}
            {statusMeta.label}
          </span>
          {part.toolCallId ? (
            <span
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-[11px] text-zinc-400"
              translate="no"
            >
              {part.toolCallId}
            </span>
          ) : null}
        </div>
      </header>

      <div className="mt-4 space-y-4">
        {status === 'output-error' ? (
          <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-100">
            {errorMessage}
          </div>
        ) : (
          renderToolBody(toolName, input, output)
        )}
      </div>
    </section>
  );
}
