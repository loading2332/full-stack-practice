import type { TextUIPart, UIMessage } from 'ai';
import { MarkdownRenderer } from './MarkdownRenderer';

type MessagePartProps = {
  part: TextUIPart;
  role: UIMessage['role'];
  showStreamingCursor?: boolean;
};

export function MessagePart({
  part,
  role,
  showStreamingCursor = false,
}: MessagePartProps) {
  const toneClasses = role === 'user' ? 'text-zinc-900' : 'text-zinc-200';

  return (
    <div className={`${toneClasses} text-sm leading-7`}>
      <MarkdownRenderer content={part.text} />
      {showStreamingCursor ? (
        <span
          aria-hidden="true"
          className="cursor-blink inline-block align-baseline text-zinc-300"
        >
          |
        </span>
      ) : null}
    </div>
  );
}
