import type { ToolTimelineItem } from './chat-types';

type ToolTimelineListProps = {
  items: ToolTimelineItem[];
  emptyLabel: string;
};

function getStatusClasses(status: ToolTimelineItem['status']) {
  switch (status) {
    case 'output-available':
      return 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100';
    case 'output-error':
      return 'border-red-400/20 bg-red-500/10 text-red-100';
    default:
      return 'border-amber-400/20 bg-amber-500/10 text-amber-100';
  }
}

export function ToolTimelineList({ items, emptyLabel }: ToolTimelineListProps) {
  if (items.length === 0) {
    return <p className="text-sm leading-6 text-zinc-500">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-2xl border border-white/10 bg-black/20 p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">
                {item.toolName.replaceAll('_', ' ')}
              </p>
              {item.target ? (
                <p
                  className="mt-1 truncate text-xs text-zinc-400"
                  translate="no"
                >
                  {item.target}
                </p>
              ) : null}
            </div>
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${getStatusClasses(item.status)}`}
            >
              {item.status === 'output-available'
                ? 'Done'
                : item.status === 'output-error'
                  ? 'Error'
                  : 'Live'}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-zinc-300">{item.summary}</p>
        </div>
      ))}
    </div>
  );
}
