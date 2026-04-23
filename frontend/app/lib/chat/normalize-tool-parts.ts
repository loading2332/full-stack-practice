import type { UIDataTypes, UIMessage, UIMessagePart, UITools } from 'ai';

type LegacyToolPart = {
  type: string;
  state?: string;
  output?: unknown;
  input?: unknown;
  errorText?: string;
  toolCallId?: string;
  toolName?: string;
};

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isLegacyToolPart(part: unknown): part is LegacyToolPart {
  if (!isObjectLike(part) || typeof part.type !== 'string') {
    return false;
  }

  return (
    part.type.startsWith('tool-') ||
    part.type === 'dynamic-tool' ||
    typeof part.toolCallId === 'string'
  );
}

function normalizeToolPart(part: LegacyToolPart): LegacyToolPart {
  if (!part.toolCallId) {
    return { ...part };
  }

  if (part.output !== undefined && part.state !== 'output-available') {
    return {
      ...part,
      state: 'output-available',
    };
  }

  if (part.output === undefined && part.state !== 'output-error') {
    return {
      ...part,
      state: 'output-error',
      output: '会话恢复时工具结果不可用',
    };
  }

  return {
    ...part,
  };
}

function normalizePart<DATA_TYPES extends UIDataTypes, TOOLS extends UITools>(
  part: UIMessagePart<DATA_TYPES, TOOLS>,
): UIMessagePart<DATA_TYPES, TOOLS> {
  if (!isLegacyToolPart(part)) {
    return part;
  }

  return normalizeToolPart(part) as UIMessagePart<DATA_TYPES, TOOLS>;
}

export function normalizeToolParts<
  METADATA = unknown,
  DATA_TYPES extends UIDataTypes = UIDataTypes,
  TOOLS extends UITools = UITools,
>(
  messages: UIMessage<METADATA, DATA_TYPES, TOOLS>[],
): UIMessage<METADATA, DATA_TYPES, TOOLS>[] {
  return messages.map((message) => ({
    ...message,
    parts: message.parts.map((part) => normalizePart(part)),
  }));
}
