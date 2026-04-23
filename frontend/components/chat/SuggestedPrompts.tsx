'use client';

import type { UIMessage } from 'ai';
import {
  EMPTY_STATE_PROMPTS,
  FOLLOW_UP_PROMPTS,
  getUsedToolNames,
  orderSuggestedPrompts,
} from './chat-utils';

type SuggestedPromptsProps = {
  kind: 'empty' | 'follow-up';
  messages: UIMessage[];
  disabled?: boolean;
  onSelectPrompt: (prompt: string) => void;
};

export function SuggestedPrompts({
  kind,
  messages,
  disabled = false,
  onSelectPrompt,
}: SuggestedPromptsProps) {
  const prompts = orderSuggestedPrompts(
    kind === 'empty' ? EMPTY_STATE_PROMPTS : FOLLOW_UP_PROMPTS,
    getUsedToolNames(messages),
  );

  return (
    <section
      className={`w-full ${kind === 'empty' ? 'mt-6' : 'rounded-[1.5rem] border border-white/10 bg-black/20 p-4'}`}
    >
      <div className={kind === 'empty' ? '' : ''}>
        <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">
          {kind === 'empty' ? 'Operator starters' : 'Next actions'}
        </p>
        <h3 className="mt-2 text-lg font-semibold text-white">
          {kind === 'empty'
            ? 'Choose a first GitHub action'
            : 'Advance the investigation'}
        </h3>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          {kind === 'empty'
            ? 'Start with repository context, PR analysis, historical reporting, or a controlled pipeline action.'
            : 'Unused tools are ranked first so you can broaden context before repeating the same workflow.'}
        </p>
      </div>

      <div
        className={`mt-4 grid gap-3 ${kind === 'empty' ? 'sm:grid-cols-1' : 'sm:grid-cols-2'}`}
      >
        {prompts.map((prompt, index) => (
          <button
            key={prompt.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelectPrompt(prompt.prompt)}
            className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4 text-left transition-colors hover:border-white/20 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/20 text-[11px] font-medium text-zinc-300">
                {String(index + 1).padStart(2, '0')}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-white">
                  {prompt.label}
                </div>
                <div className="mt-2 text-sm leading-6 text-zinc-400">
                  {prompt.prompt}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
