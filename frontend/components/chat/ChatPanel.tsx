'use client';

import type { UIMessage } from 'ai';
import { History, LayoutPanelTop, RefreshCw } from 'lucide-react';
import { startTransition, useEffect, useRef, useState } from 'react';
import { normalizeToolParts } from '@/app/lib/chat/normalize-tool-parts';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ChatInner } from './ChatInner';
import { ConversationList } from './ConversationList';
import { ChatWorkspaceShell } from './ChatWorkspaceShell';
import { RunContextPanel } from './RunContextPanel';
import type {
  ChatSessionDetail,
  ChatSessionListItem,
  RunContextSnapshot,
  SaveUiState,
} from './chat-types';

const EMPTY_MESSAGES: UIMessage[] = [];
const SIDEBAR_PREFERENCE_KEY = 'chat-sidebar-collapsed';

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;

    throw new Error(payload?.message ?? 'Request failed');
  }

  return (await response.json()) as T;
}

export function ChatPanel() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSessionListItem[]>([]);
  const [initialMessages, setInitialMessages] =
    useState<UIMessage[]>(EMPTY_MESSAGES);
  const [chatKey, setChatKey] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hasRestoredSidebarPreference, setHasRestoredSidebarPreference] =
    useState(false);
  const [shellTransitionsEnabled, setShellTransitionsEnabled] = useState(false);
  const [isConversationSheetOpen, setIsConversationSheetOpen] = useState(false);
  const [isRunContextSheetOpen, setIsRunContextSheetOpen] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [runContext, setRunContext] = useState<RunContextSnapshot>({
    pending: [],
    latestCompleted: null,
    timeline: [],
    toolCount: 0,
  });
  const [saveUiState, setSaveUiState] = useState<SaveUiState>({
    isSaving: false,
    saveError: null,
    messageCount: 0,
    toolCount: 0,
    status: 'ready',
  });
  const activeSessionIdRef = useRef<string | null>(activeSessionId);
  const activeChatKeyRef = useRef(chatKey);
  const latestSelectionRequestRef = useRef(0);
  const selectionAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  useEffect(() => {
    activeChatKeyRef.current = chatKey;
  }, [chatKey]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let frameId: number | null = null;

    try {
      setSidebarCollapsed(
        window.localStorage.getItem(SIDEBAR_PREFERENCE_KEY) === 'true',
      );
    } catch {
      setSidebarCollapsed(false);
    }

    setHasRestoredSidebarPreference(true);
    frameId = window.requestAnimationFrame(() => {
      setShellTransitionsEnabled(true);
    });

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !hasRestoredSidebarPreference) {
      return;
    }

    try {
      window.localStorage.setItem(
        SIDEBAR_PREFERENCE_KEY,
        String(sidebarCollapsed),
      );
    } catch {
      // Ignore storage failures so chat remains usable in restricted contexts.
    }
  }, [hasRestoredSidebarPreference, sidebarCollapsed]);

  function advanceChatContext(): number {
    const nextChatKey = activeChatKeyRef.current + 1;
    activeChatKeyRef.current = nextChatKey;
    setChatKey(nextChatKey);

    return nextChatKey;
  }

  useEffect(() => {
    let cancelled = false;

    async function loadSessions() {
      try {
        setIsLoadingSessions(true);
        const nextSessions = await parseResponse<ChatSessionListItem[]>(
          await fetch('/api/chat/sessions', {
            method: 'GET',
            cache: 'no-store',
          }),
        );

        if (cancelled) {
          return;
        }

        setSessions(nextSessions);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : '加载会话列表失败',
        );
      } finally {
        if (!cancelled) {
          setIsLoadingSessions(false);
        }
      }
    }

    void loadSessions();

    return () => {
      cancelled = true;
      selectionAbortControllerRef.current?.abort();
    };
  }, []);

  async function handleSelectSession(sessionId: string) {
    if (sessionId === activeSessionIdRef.current) {
      return;
    }

    setIsConversationSheetOpen(false);
    setIsRunContextSheetOpen(false);

    const requestId = latestSelectionRequestRef.current + 1;
    latestSelectionRequestRef.current = requestId;
    selectionAbortControllerRef.current?.abort();
    const abortController = new AbortController();
    selectionAbortControllerRef.current = abortController;

    try {
      setIsLoadingSession(true);
      setErrorMessage(null);

      const session = await parseResponse<ChatSessionDetail>(
        await fetch(`/api/chat/sessions/${encodeURIComponent(sessionId)}`, {
          method: 'GET',
          cache: 'no-store',
          signal: abortController.signal,
        }),
      );

      if (latestSelectionRequestRef.current !== requestId) {
        return;
      }

      startTransition(() => {
        setActiveSessionId(session.id);
        setInitialMessages(normalizeToolParts(session.messages));
        advanceChatContext();
        setSessions((currentSessions) =>
          currentSessions.map((item) =>
            item.id === session.id ? { ...item, title: session.title } : item,
          ),
        );
      });
    } catch (error) {
      if (
        abortController.signal.aborted ||
        latestSelectionRequestRef.current !== requestId
      ) {
        return;
      }

      setErrorMessage(error instanceof Error ? error.message : '加载会话失败');
    } finally {
      if (latestSelectionRequestRef.current === requestId) {
        setIsLoadingSession(false);
      }
    }
  }

  function handleNewConversation() {
    latestSelectionRequestRef.current += 1;
    selectionAbortControllerRef.current?.abort();
    selectionAbortControllerRef.current = null;
    setErrorMessage(null);
    setIsLoadingSession(false);
    activeSessionIdRef.current = null;
    setIsConversationSheetOpen(false);
    setIsRunContextSheetOpen(false);
    startTransition(() => {
      setActiveSessionId(null);
      setInitialMessages(EMPTY_MESSAGES);
      advanceChatContext();
      setRunContext({
        pending: [],
        latestCompleted: null,
        timeline: [],
        toolCount: 0,
      });
      setSaveUiState({
        isSaving: false,
        saveError: null,
        messageCount: 0,
        toolCount: 0,
        status: 'ready',
      });
    });
  }

  async function handleDeleteSession(sessionId: string) {
    if (deletingSessionId) {
      return;
    }

    const targetSession =
      sessions.find((session) => session.id === sessionId) ?? null;
    const confirmed = window.confirm(
      `Delete "${targetSession?.title ?? 'this conversation'}"? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingSessionId(sessionId);
      setErrorMessage(null);

      await parseResponse<{ ok: true }>(
        await fetch(`/api/chat/sessions/${encodeURIComponent(sessionId)}`, {
          method: 'DELETE',
        }),
      );

      const isDeletingActiveSession = activeSessionIdRef.current === sessionId;

      if (isDeletingActiveSession) {
        setIsConversationSheetOpen(false);
        setIsRunContextSheetOpen(false);
      }

      startTransition(() => {
        setSessions((currentSessions) =>
          currentSessions.filter((item) => item.id !== sessionId),
        );

        if (isDeletingActiveSession) {
          latestSelectionRequestRef.current += 1;
          selectionAbortControllerRef.current?.abort();
          selectionAbortControllerRef.current = null;
          activeSessionIdRef.current = null;
          setActiveSessionId(null);
          setInitialMessages(EMPTY_MESSAGES);
          advanceChatContext();
          setIsLoadingSession(false);
          setRunContext({
            pending: [],
            latestCompleted: null,
            timeline: [],
            toolCount: 0,
          });
          setSaveUiState({
            isSaving: false,
            saveError: null,
            messageCount: 0,
            toolCount: 0,
            status: 'ready',
          });
        }
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '删除会话失败');
    } finally {
      setDeletingSessionId(null);
    }
  }

  const chatInnerKey = `chat-${chatKey}`;
  const activeSession =
    sessions.find((session) => session.id === activeSessionId) ?? null;

  function handleSessionSaved(
    session: {
      id: string;
      title: string;
      updatedAt?: string;
    },
    sourceChatKey: number,
  ) {
    if (sourceChatKey !== activeChatKeyRef.current) {
      return;
    }

    const timestamp = session.updatedAt ?? new Date().toISOString();

    activeSessionIdRef.current = session.id;

    startTransition(() => {
      setActiveSessionId(session.id);
      setSessions((currentSessions) => {
        const existingSession = currentSessions.find(
          (item) => item.id === session.id,
        );
        const nextSession: ChatSessionListItem = existingSession
          ? {
              ...existingSession,
              title: session.title,
              updatedAt: timestamp,
            }
          : {
              id: session.id,
              title: session.title,
              createdAt: timestamp,
              updatedAt: timestamp,
            };

        return [
          nextSession,
          ...currentSessions.filter((item) => item.id !== session.id),
        ];
      });
    });
  }

  const conversationRail = (
    <ConversationList
      sessions={sessions}
      activeSessionId={activeSessionId}
      isLoading={isLoadingSessions}
      deletingSessionId={deletingSessionId}
      onNewConversation={handleNewConversation}
      onSelectSession={handleSelectSession}
      onDeleteSession={handleDeleteSession}
    />
  );

  const collapsedSidebarRail = (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-between rounded-[1.75rem] border border-white/10 bg-white/[0.04] px-3 py-4 shadow-2xl shadow-black/20">
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => setSidebarCollapsed(false)}
          className="inline-flex size-11 items-center justify-center rounded-2xl border border-white/10 text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
          aria-label="Expand sidebar"
        >
          <History aria-hidden="true" className="size-4" />
        </button>
        <span
          className="text-center text-[11px] uppercase tracking-[0.22em] text-zinc-500"
          aria-hidden="true"
        >
          Chat
        </span>
      </div>

      <button
        type="button"
        onClick={handleNewConversation}
        className="inline-flex size-11 items-center justify-center rounded-2xl border border-white/10 text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
        aria-label="Start new conversation"
      >
        <RefreshCw aria-hidden="true" className="size-4" />
      </button>
    </div>
  );

  const runContextPanel = (
    <RunContextPanel
      sessionId={activeSessionId}
      sessionTitle={activeSession?.title ?? null}
      runContext={runContext}
      saveUiState={saveUiState}
    />
  );

  const desktopSidebar = sidebarCollapsed
    ? collapsedSidebarRail
    : conversationRail;

  const mainContent = (
    <>
      <a
        href="#chat-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-zinc-950"
      >
        Skip to chat content
      </a>

      <section className="flex min-w-0 min-h-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-white/10 bg-black/20 px-3 py-3 shadow-lg shadow-black/10 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarCollapsed((current) => !current)}
              aria-label={
                sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'
              }
              aria-pressed={sidebarCollapsed}
              className="hidden xl:inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-sm text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
            >
              <History aria-hidden="true" className="size-4" />
              <span>{sidebarCollapsed ? 'Expand' : 'Collapse'}</span>
            </button>

            <div className="flex items-center gap-2 xl:hidden">
              <Sheet
                open={isConversationSheetOpen}
                onOpenChange={setIsConversationSheetOpen}
              >
                <SheetTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-sm text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
                    aria-label="Open conversation history"
                  >
                    <History aria-hidden="true" className="size-4" />
                    <span className="hidden sm:inline">History</span>
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0">
                  <SheetHeader>
                    <SheetTitle>Conversations</SheetTitle>
                    <SheetDescription>
                      Switch sessions or start a new thread.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="min-h-0 flex-1 p-4">{conversationRail}</div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isLoadingSession ? (
              <span aria-live="polite" className="text-sm text-zinc-400">
                Loading conversation
                <span aria-hidden="true" className="cursor-blink">
                  |
                </span>
              </span>
            ) : null}

            <button
              type="button"
              onClick={handleNewConversation}
              aria-label="Start new conversation"
              className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
            >
              <RefreshCw aria-hidden="true" className="size-4" />
              <span>New Chat</span>
            </button>

            <Sheet
              open={isRunContextSheetOpen}
              onOpenChange={setIsRunContextSheetOpen}
            >
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-sm text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
                  aria-label="Open run context"
                >
                  <LayoutPanelTop aria-hidden="true" className="size-4" />
                  <span className="hidden sm:inline">Context</span>
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="p-0">
                <SheetHeader>
                  <SheetTitle>Run Context</SheetTitle>
                  <SheetDescription>
                    Tool execution summaries and session metadata.
                  </SheetDescription>
                </SheetHeader>
                <div className="min-h-0 flex-1 p-4 sm:p-5">
                  {runContextPanel}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col pt-4 sm:pt-6">
          {errorMessage ? (
            <div
              role="status"
              aria-live="polite"
              className="mb-4 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100"
            >
              {errorMessage}
            </div>
          ) : null}

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/20">
            <div className="mb-6 flex items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <p className="text-sm font-medium text-white">
                  Operator Console
                </p>
                <p className="text-sm text-zinc-400">
                  The thread remains primary while history and run context stay
                  available on demand.
                </p>
              </div>
              {isLoadingSession ? (
                <span aria-live="polite" className="text-sm text-zinc-400">
                  Loading conversation
                  <span aria-hidden="true" className="cursor-blink">
                    |
                  </span>
                </span>
              ) : null}
            </div>

            <div key={chatInnerKey} className="flex min-h-0 flex-1 flex-col">
              <ChatInner
                conversationKey={chatKey}
                initialMessages={initialMessages}
                initialSessionId={activeSessionId}
                onSessionSaved={handleSessionSaved}
                onRunContextChange={setRunContext}
                onSaveStateChange={setSaveUiState}
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );

  return (
    <ChatWorkspaceShell
      sidebar={desktopSidebar}
      sidebarCollapsed={sidebarCollapsed}
      transitionsEnabled={shellTransitionsEnabled}
      main={mainContent}
    />
  );
}
