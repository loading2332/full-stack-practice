import type { UIMessage } from 'ai';
import type { ChatToolPart, ToolDisplayState } from './chat-utils';

export type ChatSessionListItem = {
  id: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ChatSessionDetail = {
  id: string;
  title: string;
  messages: UIMessage[];
  createdAt?: string;
  updatedAt?: string;
};

export type SaveUiState = {
  isSaving: boolean;
  saveError: string | null;
  messageCount: number;
  toolCount: number;
  status: 'ready' | 'submitted' | 'streaming' | 'error';
};

export type ToolTimelineItem = {
  id: string;
  toolName: string;
  summary: string;
  status: ToolDisplayState;
  target: string | null;
  part: ChatToolPart;
};

export type RunContextSnapshot = {
  pending: ToolTimelineItem[];
  latestCompleted: ToolTimelineItem | null;
  timeline: ToolTimelineItem[];
  toolCount: number;
};
