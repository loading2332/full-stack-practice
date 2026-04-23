'use client';

import type { CSSProperties, ReactNode } from 'react';

type ChatWorkspaceShellProps = {
  sidebar: ReactNode;
  main: ReactNode;
  sidebarCollapsed: boolean;
  transitionsEnabled?: boolean;
};

export function ChatWorkspaceShell({
  sidebar,
  main,
  sidebarCollapsed,
  transitionsEnabled = false,
}: ChatWorkspaceShellProps) {
  return (
    <div className="h-[100svh] overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_35%),linear-gradient(180deg,_#09090b_0%,_#0b0b10_100%)] text-zinc-100">
      <div className="mx-auto flex h-full w-full max-w-[1720px] px-3 py-3 lg:px-4 lg:py-4">
        <div
          data-sidebar-collapsed={sidebarCollapsed}
          className={`grid h-full w-full min-w-0 gap-4 xl:grid-cols-[var(--chat-shell-sidebar-width)_minmax(0,1fr)] ${
            transitionsEnabled
              ? 'motion-safe:xl:transition-[grid-template-columns] motion-safe:xl:duration-200 motion-safe:xl:ease-out'
              : ''
          }`}
          style={
            {
              '--chat-shell-sidebar-width': sidebarCollapsed
                ? '5.5rem'
                : '20rem',
            } as CSSProperties
          }
        >
          <aside className="hidden min-h-0 overflow-hidden xl:flex">
            {sidebar}
          </aside>
          <main className="flex min-w-0 min-h-0 flex-col items-center">
            <div
              id="chat-main"
              className="flex min-h-0 w-full min-w-0 max-w-[1120px] flex-1 flex-col"
            >
              {main}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
