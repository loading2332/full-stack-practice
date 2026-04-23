import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ToolPanels } from './ToolPanels';

describe('ToolPanels', () => {
  it('renders a repository analysis card from stringified JSON output', () => {
    const markup = renderToStaticMarkup(
      <ToolPanels
        part={{
          type: 'tool-run_repo_analysis',
          toolCallId: 'tool-1',
          state: 'output-available',
          input: {
            owner: 'openai',
            repo: 'openai-node',
            branch: 'main',
          },
          output: JSON.stringify({
            scope: 'repo',
            owner: 'openai',
            repo: 'openai-node',
            branch: 'main',
            score: 82,
            grade: 'B',
            findings: [{ severity: 'medium', title: 'Flaky CI' }],
            quickWins: ['Stabilize the lint workflow'],
          }),
        }}
      />,
    );

    expect(markup).toContain('Repository Analysis');
    expect(markup).toContain('openai/openai-node');
    expect(markup).toContain('82');
    expect(markup).toContain('Grade B');
    expect(markup).toContain('Stabilize the lint workflow');
  });

  it('renders a pull request analysis card with CI and risk details', () => {
    const markup = renderToStaticMarkup(
      <ToolPanels
        part={{
          type: 'tool-run_pr_analysis',
          toolCallId: 'tool-2',
          state: 'output-available',
          input: {
            owner: 'openai',
            repo: 'openai-node',
            prNumber: 123,
          },
          output: {
            scope: 'pull_request',
            owner: 'openai',
            repo: 'openai-node',
            prNumber: 123,
            score: 76,
            grade: 'B',
            riskFiles: ['backend/src/pipeline/pipeline.service.ts'],
            ciSummary: { total: 2, failed: 1, passed: 1 },
            quickWins: ['Add regression coverage for pipeline retries'],
          },
        }}
      />,
    );

    expect(markup).toContain('Pull Request Analysis');
    expect(markup).toContain('openai/openai-node');
    expect(markup).toContain('#123');
    expect(markup).toContain('1 failing');
    expect(markup).toContain('backend/src/pipeline/pipeline.service.ts');
    expect(markup).toContain('Add regression coverage for pipeline retries');
  });

  it('renders pending and error tool states with concise status text', () => {
    const pendingMarkup = renderToStaticMarkup(
      <ToolPanels
        part={{
          type: 'tool-pipeline_trigger',
          toolCallId: 'tool-3',
          state: 'input-available',
          input: {
            scope: 'repo',
            owner: 'openai',
            repo: 'openai-node',
            reason: 'nightly scan',
          },
        }}
      />,
    );

    const errorMarkup = renderToStaticMarkup(
      <ToolPanels
        part={{
          type: 'tool-feishu_card',
          toolCallId: 'tool-4',
          state: 'output-error',
          input: {
            title: 'PR risk summary',
          },
          errorText: 'Feishu webhook rejected the payload',
        }}
      />,
    );

    expect(pendingMarkup).toContain('Pending');
    expect(pendingMarkup).toContain('nightly scan');
    expect(errorMarkup).toContain('Failed');
    expect(errorMarkup).toContain('Feishu webhook rejected the payload');
  });
});
