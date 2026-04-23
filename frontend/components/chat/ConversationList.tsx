import { MessageSquarePlus, Trash2 } from 'lucide-react';
import type { ChatSessionListItem } from './chat-types';

type ConversationListProps = {
  sessions: ChatSessionListItem[];
  activeSessionId: string | null;
  isLoading: boolean;
  deletingSessionId: string | null;
  onNewConversation: () => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
};

function formatTimestamp(value?: string): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function ConversationList({
  sessions,
  activeSessionId,
  isLoading,
  deletingSessionId,
  onNewConversation,
  onSelectSession,
  onDeleteSession,
}: ConversationListProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/20">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
            Chat
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            Conversations
          </h2>
        </div>
      </div>

      <div className="border-b border-white/10 p-4">
        <button
          type="button"
          onClick={onNewConversation}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
        >
          <MessageSquarePlus aria-hidden="true" className="size-4" />
          New Conversation
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div
            aria-live="polite"
            className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-sm text-zinc-400"
          >
            Loading conversations
            <span aria-hidden="true" className="cursor-blink">
              |
            </span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-sm text-zinc-400">
            No saved conversations yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              const isDeleting = deletingSessionId === session.id;
              const timestamp = formatTimestamp(session.updatedAt);

              return (
                <li key={session.id}>
                  <div
                    className={`rounded-2xl border transition-colors ${
                      isActive
                        ? 'border-white/20 bg-white/10'
                        : 'border-transparent bg-white/[0.03] hover:border-white/10 hover:bg-white/[0.06]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectSession(session.id)}
                      className="flex w-full flex-col items-start gap-1 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400/60"
                      aria-pressed={isActive}
                    >
                      <span className="line-clamp-2 text-sm font-medium text-white">
                        {session.title}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {timestamp ?? 'Saved conversation'}
                      </span>
                    </button>
                    <div className="flex items-center justify-end px-3 pb-3">
                      <button
                        type="button"
                        onClick={() => onDeleteSession(session.id)}
                        disabled={isDeleting}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-red-400/40 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 aria-hidden="true" className="size-3.5" />
                        {isDeleting ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
