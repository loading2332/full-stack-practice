import type { ChatToolPart } from './chat-utils';
import { ToolPanels } from './ToolPanels';

type ToolMessagePartProps = {
  part: ChatToolPart;
};

export function ToolMessagePart({ part }: ToolMessagePartProps) {
  return (
    <div className="pt-1">
      <ToolPanels part={part} />
    </div>
  );
}
