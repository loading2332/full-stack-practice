import type { UIMessage } from 'ai';
import { describe, expect, it } from 'vitest';
import {
  FOLLOW_UP_PROMPTS,
  getRunContextSummary,
  getTextParts,
  getToolTarget,
  getToolSummary,
  getUsedToolNames,
  hasUnrenderedParts,
  isScrolledNearBottom,
  orderSuggestedPrompts,
  parseToolPayload,
} from './chat-utils';

describe('chat-utils', () => {
  it('keeps text parts in their original order', () => {
    const message: UIMessage = {
      id: 'm1',
      role: 'assistant',
      parts: [
        { type: 'step-start' },
        { type: 'text', text: 'First' },
        { type: 'reasoning', text: 'hidden' },
        { type: 'text', text: 'Second', state: 'streaming' },
      ],
    };

    expect(getTextParts(message)).toEqual([
      { type: 'text', text: 'First' },
      { type: 'text', text: 'Second', state: 'streaming' },
    ]);
  });

  it('treats nearby scroll positions as sticky to the bottom', () => {
    expect(
      isScrolledNearBottom({
        scrollHeight: 1_200,
        scrollTop: 500,
        clientHeight: 620,
      }),
    ).toBe(true);

    expect(
      isScrolledNearBottom({
        scrollHeight: 1_200,
        scrollTop: 300,
        clientHeight: 620,
      }),
    ).toBe(false);
  });

  it('parses stringified JSON payloads while preserving plain strings', () => {
    expect(
      parseToolPayload('{"owner":"openai","repo":"openai-node","score":82}'),
    ).toEqual({
      owner: 'openai',
      repo: 'openai-node',
      score: 82,
    });

    expect(parseToolPayload('not-json')).toBe('not-json');
    expect(parseToolPayload({ ok: true })).toEqual({ ok: true });
  });

  it('builds tool summaries from stringified outputs', () => {
    const summary = getToolSummary({
      type: 'tool-run_pr_analysis',
      toolCallId: 'tool-1',
      state: 'output-available',
      input: {
        owner: 'openai',
        repo: 'openai-node',
        prNumber: 123,
      },
      output:
        '{"owner":"openai","repo":"openai-node","prNumber":123,"score":76,"grade":"B"}',
    });

    expect(summary).toContain('openai/openai-node');
    expect(summary).toContain('#123');
    expect(summary).toContain('76');
    expect(summary).toContain('B');
  });

  it('keeps track of assistant parts that are not rendered as text or tool cards', () => {
    const message: UIMessage = {
      id: 'm2',
      role: 'assistant',
      parts: [
        { type: 'reasoning', text: 'hidden' },
        {
          type: 'source-url',
          sourceId: 'source-1',
          url: 'https://example.com',
          title: 'Example',
        },
      ],
    };

    expect(hasUnrenderedParts(message)).toBe(true);
  });

  it('builds pipeline summaries from nested mock payload targets', () => {
    const summary = getToolSummary({
      type: 'tool-pipeline_trigger',
      toolCallId: 'tool-5',
      state: 'output-available',
      input: {
        scope: 'pull_request',
        owner: 'openai',
        repo: 'openai-node',
        prNumber: 123,
      },
      output: {
        ok: true,
        status: 'queued',
        input: {
          scope: 'pull_request',
          owner: 'openai',
          repo: 'openai-node',
          prNumber: 123,
        },
      },
    });

    expect(summary).toContain('pull request');
    expect(summary).toContain('openai/openai-node');
    expect(summary).toContain('#123');
  });

  it('extracts targets for pipeline tools from nested payloads', () => {
    const target = getToolTarget({
      type: 'tool-pipeline_trigger',
      toolCallId: 'tool-6',
      state: 'output-available',
      output: {
        status: 'queued',
        input: {
          scope: 'repo',
          owner: 'openai',
          repo: 'openai-node',
          branch: 'main',
        },
      },
    });

    expect(target).toContain('openai/openai-node');
  });

  it('extracts used tool names from static and dynamic tool parts', () => {
    const messages: UIMessage[] = [
      {
        id: 'm1',
        role: 'assistant',
        parts: [
          {
            type: 'tool-run_repo_analysis',
            toolCallId: 'tool-1',
            state: 'output-available',
            input: {
              owner: 'openai',
              repo: 'openai-node',
            },
            output: {
              score: 82,
            },
          } as UIMessage['parts'][number],
          {
            type: 'dynamic-tool',
            toolName: 'pipeline_trigger',
            toolCallId: 'tool-2',
            state: 'output-available',
            input: {
              scope: 'repo',
            },
            output: {
              status: 'triggered',
            },
          } as UIMessage['parts'][number],
        ],
      },
    ];

    expect(getUsedToolNames(messages)).toEqual(
      new Set(['run_repo_analysis', 'pipeline_trigger']),
    );
  });

  it('orders prompts so suggestions for unused tools surface first', () => {
    const ordered = orderSuggestedPrompts(
      FOLLOW_UP_PROMPTS,
      new Set(['run_pr_analysis', 'github_pr_fetch']),
    );

    expect(ordered[0]?.tools).not.toContain('run_pr_analysis');
    expect(ordered[0]?.tools).not.toContain('github_pr_fetch');
    expect(ordered.at(-1)?.tools).toContain('run_pr_analysis');
  });

  it('derives run-context summary with pending and latest-completed tools', () => {
    const messages: UIMessage[] = [
      {
        id: 'm1',
        role: 'assistant',
        parts: [
          {
            type: 'tool-github_pr_fetch',
            toolCallId: 'tool-1',
            state: 'output-available',
            input: {
              owner: 'openai',
              repo: 'openai-node',
              prNumber: 123,
            },
            output: {
              owner: 'openai',
              repo: 'openai-node',
              prNumber: 123,
            },
          } as UIMessage['parts'][number],
          {
            type: 'tool-run_pr_analysis',
            toolCallId: 'tool-2',
            state: 'input-available',
            input: {
              owner: 'openai',
              repo: 'openai-node',
              prNumber: 123,
            },
          } as UIMessage['parts'][number],
        ],
      },
    ];

    const summary = getRunContextSummary(messages);

    expect(summary.toolCount).toBe(2);
    expect(summary.pending[0]?.toolName).toBe('run_pr_analysis');
    expect(summary.latestCompleted?.toolName).toBe('github_pr_fetch');
    expect(summary.timeline[0]?.toolName).toBe('run_pr_analysis');
  });
});
