'use client';

import { useChat } from '@ai-sdk/react';
import {
  DefaultChatTransport,
  isTextUIPart,
  type ChatStatus,
  type UIMessage,
} from 'ai';
import { ArrowUp, LoaderCircle, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { RunContextSnapshot, SaveUiState } from './chat-types';
import { SuggestedPrompts } from './SuggestedPrompts';
import { MessagePart } from './MessagePart';
import { ToolMessagePart } from './ToolMessagePart';
import {
  getRunContextSummary,
  getTextParts,
  getToolParts,
  hasUnrenderedParts,
  isScrolledNearBottom,
  isToolMessagePart,
} from './chat-utils';

type SavedSession = {
  id: string;
  title: string;
  updatedAt?: string;
};

type ChatInnerProps = {
  conversationKey: number;
  initialMessages: UIMessage[];
  initialSessionId: string | null;
  onSessionSaved: (session: SavedSession, conversationKey: number) => void;
  onRunContextChange?: (snapshot: RunContextSnapshot) => void;
  onSaveStateChange?: (state: SaveUiState) => void;
};

async function parseResponse<T>(
  response: Response,
  fallbackMessage: string,
): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;

    throw new Error(payload?.message ?? fallbackMessage);
  }

  return (await response.json()) as T;
}

async function saveConversation(
  sessionId: string | null,
  messages: UIMessage[],
): Promise<SavedSession> {
  const response = await fetch('/api/chat/save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(
      sessionId
        ? {
            sessionId,
            messages,
          }
        : {
            messages,
          },
    ),
  });

  const payload = await parseResponse<{
    sessionId: string;
    title: string;
    updatedAt?: string;
  }>(response, '保存会话失败');

  return {
    id: payload.sessionId,
    title: payload.title,
    updatedAt: payload.updatedAt,
  };
}

function getLastAssistantMessageId(messages: UIMessage[]): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === 'assistant') {
      return messages[index].id;
    }
  }

  return null;
}

export function ChatInner({
  conversationKey,
  initialMessages,
  initialSessionId,
  onSessionSaved,
  onRunContextChange,
  onSaveStateChange,
}: ChatInnerProps) {
  const [input, setInput] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const sessionIdRef = useRef<string | null>(initialSessionId);
  const previousStatusRef = useRef<ChatStatus>('ready');
  const saveRequestIdRef = useRef(0);
  const isActiveRef = useRef(true);

  const { messages, status, error, clearError, sendMessage, stop } = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: () => ({
        sessionId: sessionIdRef.current,
      }),
      fetch: async (input, init) => {
        const response = await fetch(input, init);
        const nextSessionId = response.headers.get('X-Session-Id');

        if (nextSessionId) {
          sessionIdRef.current = nextSessionId;
        }

        return response;
      },
    }),
  });

  const isBusy = status === 'submitted' || status === 'streaming';
  const lastAssistantMessageId = getLastAssistantMessageId(messages);
  const toolCount = messages.reduce(
    (count, message) => count + getToolParts(message).length,
    0,
  );

  useEffect(() => {
    sessionIdRef.current = initialSessionId;
  }, [initialSessionId]);

  useEffect(() => {
    isActiveRef.current = true;

    return () => {
      isActiveRef.current = false;
      saveRequestIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    const viewport = scrollViewportRef.current;

    if (!viewport || !shouldStickToBottomRef.current) {
      return;
    }

    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, status]);

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    previousStatusRef.current = status;

    if (
      messages.length === 0 ||
      status !== 'ready' ||
      (previousStatus !== 'submitted' && previousStatus !== 'streaming')
    ) {
      return;
    }

    const requestId = saveRequestIdRef.current + 1;
    saveRequestIdRef.current = requestId;
    setIsSaving(true);
    setSaveError(null);

    void saveConversation(sessionIdRef.current, messages)
      .then((session) => {
        if (!isActiveRef.current || saveRequestIdRef.current !== requestId) {
          return;
        }

        sessionIdRef.current = session.id;
        onSessionSaved(session, conversationKey);
      })
      .catch((saveFailure: unknown) => {
        if (!isActiveRef.current || saveRequestIdRef.current !== requestId) {
          return;
        }

        setSaveError(
          saveFailure instanceof Error ? saveFailure.message : '保存会话失败',
        );
      })
      .finally(() => {
        if (isActiveRef.current && saveRequestIdRef.current === requestId) {
          setIsSaving(false);
        }
      });
  }, [conversationKey, messages, onSessionSaved, status]);

  useEffect(() => {
    onRunContextChange?.(getRunContextSummary(messages));
  }, [messages, onRunContextChange]);

  useEffect(() => {
    onSaveStateChange?.({
      isSaving,
      saveError,
      messageCount: messages.length,
      toolCount,
      status,
    });
  }, [
    isSaving,
    messages.length,
    onSaveStateChange,
    saveError,
    status,
    toolCount,
  ]);

  async function submitMessage(nextInput: string, restoreInput: string) {
    const trimmedInput = nextInput.trim();

    if (!trimmedInput || isBusy) {
      return;
    }

    setInput('');
    setSaveError(null);
    clearError();

    try {
      await sendMessage({
        text: trimmedInput,
      });
    } catch {
      setInput(restoreInput);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await submitMessage(input, input);
  }

  function handleScroll() {
    const viewport = scrollViewportRef.current;

    if (!viewport) {
      return;
    }

    shouldStickToBottomRef.current = isScrolledNearBottom({
      scrollHeight: viewport.scrollHeight,
      scrollTop: viewport.scrollTop,
      clientHeight: viewport.clientHeight,
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {error ? (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100"
        >
          {error.message}
        </div>
      ) : null}

      {saveError ? (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-50"
        >
          {saveError}
        </div>
      ) : null}

      <div
        ref={scrollViewportRef}
        onScroll={handleScroll}
        className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pr-2"
      >
        {messages.length === 0 ? (
          <div className="grid flex-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
            <section className="flex min-h-[420px] flex-col justify-between rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6">
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-zinc-500">
                  Thread
                </p>
                <h2 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight text-white text-balance">
                  Start a GitHub operator thread for a repository, pull request,
                  report history, or pipeline action.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">
                  The assistant streams analysis inline, preserves tool
                  chronology in the thread, and saves each completed exchange
                  back into your workspace automatically.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">
                    Inspect
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">
                    Pull live repository and PR snapshots into the thread.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">
                    Diagnose
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">
                    Run repo and PR analysis with visible tool execution.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">
                    Act
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">
                    Draft updates, query reports, and prepare reruns from the
                    same workspace.
                  </p>
                </div>
              </div>
            </section>

            <aside className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5">
              <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">
                Quick Start
              </p>
              <h3 className="mt-3 text-lg font-semibold text-white">
                Pick an operator action
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                These prompts are tuned to the GitHub tools already wired into
                this assistant.
              </p>
              <SuggestedPrompts
                kind="empty"
                messages={messages}
                disabled={isBusy}
                onSelectPrompt={(prompt) => {
                  void submitMessage(prompt, prompt);
                }}
              />
            </aside>
          </div>
        ) : (
          messages.map((message) => {
            const textParts = getTextParts(message);
            const toolParts = getToolParts(message);
            const hasOtherParts = hasUnrenderedParts(message);
            const lastTextPart = textParts.at(-1);

            if (
              textParts.length === 0 &&
              toolParts.length === 0 &&
              !hasOtherParts
            ) {
              return null;
            }

            const isUser = message.role === 'user';

            return (
              <article
                key={message.id}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`w-full max-w-4xl rounded-[1.75rem] px-5 py-4 shadow-lg shadow-black/10 ${
                    isUser
                      ? 'bg-white text-zinc-950 sm:max-w-2xl'
                      : 'border border-white/10 bg-white/[0.04]'
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p
                      className={`text-[11px] uppercase tracking-[0.3em] ${
                        isUser ? 'text-zinc-500' : 'text-zinc-500'
                      }`}
                    >
                      {isUser ? 'Operator Input' : 'Assistant Trace'}
                    </p>
                    {!isUser ? (
                      <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-zinc-400">
                        {message.parts.some(isToolMessagePart)
                          ? 'Tool-Aware'
                          : 'Response'}
                      </span>
                    ) : null}
                  </div>
                  <div className="space-y-4 text-sm">
                    {message.parts.map((part, index) => {
                      if (isTextUIPart(part)) {
                        const showStreamingCursor =
                          message.id === lastAssistantMessageId &&
                          part === lastTextPart &&
                          part.state === 'streaming';

                        return (
                          <MessagePart
                            key={`${message.id}-text-${index}`}
                            part={part}
                            role={message.role}
                            showStreamingCursor={showStreamingCursor}
                          />
                        );
                      }

                      if (isToolMessagePart(part)) {
                        return (
                          <ToolMessagePart
                            key={`${message.id}-tool-${part.toolCallId ?? index}`}
                            part={part}
                          />
                        );
                      }

                      return null;
                    })}
                    {textParts.length === 0 &&
                    toolParts.length === 0 &&
                    hasOtherParts ? (
                      <p className="text-sm leading-6 text-zinc-400">
                        Received structured assistant data that is not rendered
                        in this view yet.
                      </p>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })
        )}
        {messages.length > 0 && status === 'ready' ? (
          <SuggestedPrompts
            kind="follow-up"
            messages={messages}
            disabled={isBusy}
            onSelectPrompt={(prompt) => {
              void submitMessage(prompt, prompt);
            }}
          />
        ) : null}
      </div>

      <div className="mt-4 border-t border-white/10 pt-3">
        <div className="mb-2 flex items-center justify-between gap-3 text-[11px] text-zinc-500">
          <span aria-live="polite">
            {isSaving
              ? 'Saving conversation…'
              : 'Messages save automatically after each response.'}
          </span>
          {status !== 'ready' ? (
            <span aria-live="polite" className="inline-flex items-center gap-2">
              <LoaderCircle
                aria-hidden="true"
                className="size-3.5 animate-spin"
              />
              {status === 'submitted' ? 'Sending' : 'Streaming'}
            </span>
          ) : null}
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[1.5rem] border border-white/10 bg-black/20 p-2.5 transition-colors focus-within:border-white/20 focus-within:ring-2 focus-within:ring-sky-400/40"
        >
          <div className="mb-2 flex items-center justify-between gap-3 px-1">
            <label
              htmlFor="chat-input"
              className="text-[11px] font-medium uppercase tracking-[0.24em] text-zinc-400"
            >
              Prompt
            </label>
            <span className="text-[11px] text-zinc-500">
              Enter to send
              <span className="mx-1 text-zinc-700">/</span>
              Shift+Enter for newline
            </span>
          </div>

          <div className="flex items-end gap-2">
            <textarea
              id="chat-input"
              name="prompt"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={1}
              autoComplete="off"
              placeholder="Ask about owner/repo, PR #123, or a pipeline rerun…"
              className="min-h-11 max-h-36 flex-1 resize-none rounded-[1rem] border border-white/8 bg-white/[0.03] px-3.5 py-2.5 text-sm leading-6 text-zinc-100 transition-colors placeholder:text-zinc-500 focus:border-white/15 focus:bg-white/[0.05] focus-visible:outline-none"
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  const form = event.currentTarget.form;

                  form?.requestSubmit();
                }
              }}
            />

            {isBusy ? (
              <button
                type="button"
                onClick={() => {
                  void stop();
                }}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 text-sm font-medium text-zinc-100 transition-colors hover:border-white/20 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
                aria-label="Stop streaming response"
              >
                <Square aria-hidden="true" className="size-3.5 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={input.trim().length === 0}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Send message"
              >
                <ArrowUp aria-hidden="true" className="size-3.5" />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
