'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { RunContextSnapshot, SaveUiState } from './chat-types';
import { SessionMetaCard } from './SessionMetaCard';
import { ToolTimelineList } from './ToolTimelineList';

type RunContextPanelProps = {
  sessionId: string | null;
  sessionTitle: string | null;
  runContext: RunContextSnapshot;
  saveUiState: SaveUiState;
};

export function RunContextPanel({
  sessionId,
  sessionTitle,
  runContext,
  saveUiState,
}: RunContextPanelProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Tabs defaultValue="latest" className="flex min-h-0 flex-1 flex-col">
          <TabsList>
            <TabsTrigger value="latest">Latest</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="session">Session</TabsTrigger>
          </TabsList>

          <TabsContent value="latest" className="space-y-4 pt-4">
            <SessionMetaCard
              sessionId={sessionId}
              sessionTitle={sessionTitle}
              saveUiState={saveUiState}
            />
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">
                Active tools
              </p>
              <div className="mt-3">
                <ToolTimelineList
                  items={
                    runContext.pending.length > 0
                      ? runContext.pending
                      : runContext.latestCompleted
                        ? [runContext.latestCompleted]
                        : []
                  }
                  emptyLabel="No tool activity yet in this thread."
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4 pt-4">
            <ToolTimelineList
              items={runContext.timeline}
              emptyLabel="Tool activity will appear here after the first invocation."
            />
          </TabsContent>

          <TabsContent value="session" className="space-y-4 pt-4">
            <SessionMetaCard
              sessionId={sessionId}
              sessionTitle={sessionTitle}
              saveUiState={saveUiState}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
