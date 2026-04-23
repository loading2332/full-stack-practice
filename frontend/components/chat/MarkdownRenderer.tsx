import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type MarkdownRendererProps = {
  content: string;
};

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ className, ...props }) => (
          <a
            {...props}
            className={`text-sky-300 underline underline-offset-4 transition-colors hover:text-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 ${
              className ?? ''
            }`}
            rel="noreferrer"
            target="_blank"
          />
        ),
        code: ({ className, children, ...props }) => {
          const isInline = !className;

          if (isInline) {
            return (
              <code
                {...props}
                className="rounded bg-black/30 px-1.5 py-0.5 text-[0.95em] text-zinc-100"
              >
                {children}
              </code>
            );
          }

          return (
            <code
              {...props}
              className={`block overflow-x-auto rounded-2xl bg-black/40 p-4 text-sm text-zinc-100 ${
                className ?? ''
              }`}
            >
              {children}
            </code>
          );
        },
        p: ({ className, ...props }) => (
          <p
            {...props}
            className={`leading-7 [&:not(:last-child)]:mb-4 ${className ?? ''}`}
          />
        ),
        h1: ({ className, ...props }) => (
          <h1
            {...props}
            className={`mb-4 text-2xl font-semibold leading-tight text-white text-balance ${className ?? ''}`}
          />
        ),
        h2: ({ className, ...props }) => (
          <h2
            {...props}
            className={`mb-3 text-xl font-semibold leading-tight text-white text-balance ${className ?? ''}`}
          />
        ),
        h3: ({ className, ...props }) => (
          <h3
            {...props}
            className={`mb-3 text-lg font-semibold leading-tight text-white ${className ?? ''}`}
          />
        ),
        ul: ({ className, ...props }) => (
          <ul
            {...props}
            className={`mb-4 list-disc pl-5 [&>li:not(:last-child)]:mb-2 ${
              className ?? ''
            }`}
          />
        ),
        ol: ({ className, ...props }) => (
          <ol
            {...props}
            className={`mb-4 list-decimal pl-5 [&>li:not(:last-child)]:mb-2 ${
              className ?? ''
            }`}
          />
        ),
        pre: ({ className, ...props }) => (
          <pre
            {...props}
            className={`mb-4 overflow-x-auto rounded-2xl bg-black/40 p-4 ${
              className ?? ''
            }`}
          />
        ),
        blockquote: ({ className, ...props }) => (
          <blockquote
            {...props}
            className={`mb-4 border-l-2 border-white/10 pl-4 text-zinc-300 ${className ?? ''}`}
          />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
