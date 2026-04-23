// @vitest-environment jsdom

import {
  act,
  type MouseEvent,
  type PropsWithChildren,
  type ReactNode,
} from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatPanel } from './ChatPanel';

const SIDEBAR_PREFERENCE_KEY = 'chat-sidebar-collapsed';
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock('@/app/lib/chat/normalize-tool-parts', () => ({
  normalizeToolParts: (messages: unknown) => messages,
}));

vi.mock('./ChatInner', () => ({
  ChatInner: () => <div>Chat inner</div>,
}));

vi.mock('./ConversationList', () => ({
  ConversationList: ({
    sessions,
    onNewConversation,
    onSelectSession,
  }: {
    sessions: Array<{ id: string; title: string }>;
    onNewConversation: () => void;
    onSelectSession: (sessionId: string) => void;
  }) => (
    <div>
      <button
        type="button"
        aria-label="Mock new conversation"
        onClick={onNewConversation}
      >
        Mock new conversation
      </button>
      {sessions.map((session) => (
        <button
          key={session.id}
          type="button"
          aria-label={`Select ${session.title}`}
          onClick={() => onSelectSession(session.id)}
        >
          Select {session.title}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('./ChatWorkspaceShell', () => ({
  ChatWorkspaceShell: ({
    sidebar,
    main,
  }: {
    sidebar: ReactNode;
    main: ReactNode;
  }) => (
    <div>
      <div>{sidebar}</div>
      <div>{main}</div>
    </div>
  ),
}));

vi.mock('./RunContextPanel', () => ({
  RunContextPanel: () => <div>Run context</div>,
}));

vi.mock('@/components/ui/sheet', async () => {
  const React = await import('react');

  type SheetContextValue = {
    open: boolean;
    onOpenChange?: (open: boolean) => void;
  };

  const SheetContext = React.createContext<SheetContextValue>({
    open: false,
  });

  function Sheet({
    open = false,
    onOpenChange,
    children,
  }: PropsWithChildren<SheetContextValue>) {
    return (
      <SheetContext.Provider value={{ open, onOpenChange }}>
        {children}
      </SheetContext.Provider>
    );
  }

  function SheetTrigger({
    children,
  }: PropsWithChildren<{ asChild?: boolean }>) {
    const context = React.useContext(SheetContext);
    const child = React.Children.only(children) as React.ReactElement<{
      onClick?: (event: MouseEvent<HTMLElement>) => void;
    }>;

    if (!React.isValidElement(child)) {
      return child;
    }

    return React.cloneElement(child, {
      onClick: (event: MouseEvent<HTMLElement>) => {
        child.props.onClick?.(event);
        context.onOpenChange?.(true);
      },
    });
  }

  function SheetContent({
    children,
  }: PropsWithChildren<{ side?: 'left' | 'right'; className?: string }>) {
    const context = React.useContext(SheetContext);

    if (!context.open) {
      return null;
    }

    return (
      <div>
        <button
          type="button"
          aria-label="Close sheet"
          onClick={() => context.onOpenChange?.(false)}
        >
          Close sheet
        </button>
        {children}
      </div>
    );
  }

  return {
    Sheet,
    SheetContent,
    SheetDescription: ({ children }: PropsWithChildren) => (
      <div>{children}</div>
    ),
    SheetHeader: ({ children }: PropsWithChildren) => <div>{children}</div>,
    SheetTitle: ({ children }: PropsWithChildren) => <div>{children}</div>,
    SheetTrigger,
  };
});

type RenderResult = {
  container: HTMLDivElement;
  root: Root;
};

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
  });
}

async function renderChatPanel(): Promise<RenderResult> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(<ChatPanel />);
  });

  await flushEffects();

  return { container, root };
}

async function click(element: Element | null) {
  if (!(element instanceof HTMLElement)) {
    throw new Error('Expected clickable element');
  }

  await act(async () => {
    element.click();
  });

  await flushEffects();
}

describe('ChatPanel sidebar preference', () => {
  const fetchMock =
    vi.fn<
      (input: string | URL | Request, init?: RequestInit) => Promise<Response>
    >();

  function jsonResponse(body: unknown) {
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  beforeEach(() => {
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
    fetchMock.mockImplementation(async (input) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (url.endsWith('/api/chat/sessions')) {
        return jsonResponse([
          {
            id: 'session-1',
            title: 'First conversation',
            updatedAt: '2026-04-23T10:00:00.000Z',
          },
          {
            id: 'session-2',
            title: 'Second conversation',
            updatedAt: '2026-04-23T11:00:00.000Z',
          },
        ]);
      }

      if (url.endsWith('/api/chat/sessions/session-2')) {
        return jsonResponse({
          id: 'session-2',
          title: 'Second conversation',
          messages: [],
        });
      }

      return jsonResponse([]);
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
    window.localStorage.clear();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  it('initializes collapsed desktop mode from a stored true preference', async () => {
    window.localStorage.setItem(SIDEBAR_PREFERENCE_KEY, 'true');

    const { container, root } = await renderChatPanel();

    const toggle = container.querySelector(
      'button[aria-label="Expand sidebar"]',
    );

    expect(toggle).not.toBeNull();
    expect(
      container.querySelector('button[aria-label="Collapse sidebar"]'),
    ).toBeNull();

    await act(async () => {
      root.unmount();
    });
  });

  it('writes updated collapse state back to localStorage when toggled', async () => {
    window.localStorage.setItem(SIDEBAR_PREFERENCE_KEY, 'false');

    const { container, root } = await renderChatPanel();

    await click(
      container.querySelector('button[aria-label="Collapse sidebar"]'),
    );

    expect(window.localStorage.getItem(SIDEBAR_PREFERENCE_KEY)).toBe('true');

    await click(container.querySelector('button[aria-label="Expand sidebar"]'));

    expect(window.localStorage.getItem(SIDEBAR_PREFERENCE_KEY)).toBe('false');

    await act(async () => {
      root.unmount();
    });
  });

  it('does not overwrite the stored desktop preference when the mobile sheet opens and closes', async () => {
    window.localStorage.setItem(SIDEBAR_PREFERENCE_KEY, 'true');

    const { container, root } = await renderChatPanel();

    await click(
      container.querySelector('button[aria-label="Open conversation history"]'),
    );
    await click(container.querySelector('button[aria-label="Close sheet"]'));

    expect(window.localStorage.getItem(SIDEBAR_PREFERENCE_KEY)).toBe('true');

    await act(async () => {
      root.unmount();
    });
  });

  it('closes the context sheet when starting a new conversation', async () => {
    const { container, root } = await renderChatPanel();

    await click(
      container.querySelector('button[aria-label="Open run context"]'),
    );

    expect(container.textContent).toContain('Run context');

    await click(
      container.querySelector('button[aria-label="Start new conversation"]'),
    );

    expect(container.textContent).not.toContain('Run context');

    await act(async () => {
      root.unmount();
    });
  });

  it('closes the context sheet after switching sessions', async () => {
    const { container, root } = await renderChatPanel();

    await click(
      container.querySelector('button[aria-label="Open run context"]'),
    );

    expect(container.textContent).toContain('Run context');

    await click(
      container.querySelector(
        'button[aria-label="Select Second conversation"]',
      ),
    );

    expect(container.textContent).not.toContain('Run context');

    await act(async () => {
      root.unmount();
    });
  });
});
