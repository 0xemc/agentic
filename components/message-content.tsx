import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageContentProps {
  content: string;
  className?: string;
}

export function MessageContent({ content, className = '' }: MessageContentProps) {
  return (
    <div className={`prose prose-sm max-w-none dark:prose-invert ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Paragraphs
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,

          // Headings
          h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-3 first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-bold mb-1 mt-2 first:mt-0">{children}</h3>,

          // Lists
          ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,

          // Emphasis
          strong: ({ children }) => <strong className="font-bold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,

          // Code
          code: ({ inline, children, ...props }: any) => {
            if (inline) {
              return (
                <code className="px-1.5 py-0.5 rounded bg-muted/50 font-mono text-xs border border-border/30" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code className="block px-3 py-2 rounded bg-muted/50 font-mono text-xs border border-border/30 overflow-x-auto mb-2" {...props}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => <pre className="mb-2 overflow-x-auto">{children}</pre>,

          // Links
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:no-underline"
            >
              {children}
            </a>
          ),

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary/30 pl-3 italic my-2 text-muted-foreground">
              {children}
            </blockquote>
          ),

          // Horizontal rules
          hr: () => <hr className="my-3 border-border" />,

          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto mb-2">
              <table className="min-w-full border border-border rounded">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr className="border-b border-border last:border-0">{children}</tr>,
          th: ({ children }) => <th className="px-3 py-2 text-left text-xs font-semibold">{children}</th>,
          td: ({ children }) => <td className="px-3 py-2 text-xs">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
