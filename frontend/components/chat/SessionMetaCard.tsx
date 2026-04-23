import type { SaveUiState } from './chat-types';

type SessionMetaCardProps = {
  sessionId: string | null;
  sessionTitle: string | null;
  saveUiState: SaveUiState;
};

export function SessionMetaCard({
  sessionId,
  sessionTitle,
  saveUiState,
}: SessionMetaCardProps) {
  const statusLabel = saveUiState.isSaving
    ? 'Saving…'
    : saveUiState.saveError
      ? 'Save issue'
      : saveUiState.status === 'streaming'
        ? 'Streaming'
        : saveUiState.status === 'submitted'
          ? 'Submitting'
          : 'Ready';

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">
        Session
      </p>
      <p className="mt-2 text-sm font-medium text-white" translate="no">
        {sessionTitle ?? 'New Conversation'}
      </p>
      <p className="mt-1 text-sm text-zinc-400" translate="no">
        {sessionId ?? 'Unsaved thread'}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">
            State
          </p>
          <p className="mt-1 text-sm text-zinc-200">{statusLabel}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">
            Messages
          </p>
          <p className="mt-1 text-sm text-zinc-200">
            {saveUiState.messageCount}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">
            Tools
          </p>
          <p className="mt-1 text-sm text-zinc-200">{saveUiState.toolCount}</p>
        </div>
      </div>

      {saveUiState.saveError ? (
        <p className="mt-4 text-sm leading-6 text-amber-200">
          {saveUiState.saveError}
        </p>
      ) : null}
    </div>
  );
}
