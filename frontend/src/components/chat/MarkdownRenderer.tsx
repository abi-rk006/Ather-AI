import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  return (
    <div className={`markdown-body text-xs sm:text-sm text-on-surface leading-relaxed break-words ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-lg sm:text-xl font-bold text-on-surface mt-4 mb-2 pb-1.5 border-b border-outline-variant/30 text-primary">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base sm:text-lg font-bold text-on-surface mt-3.5 mb-2 text-primary">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm sm:text-base font-semibold text-primary mt-3 mb-1.5 flex items-center gap-1.5">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-xs sm:text-sm font-semibold text-on-surface mt-2.5 mb-1 font-mono tracking-wide uppercase">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="my-1.5 leading-relaxed text-on-surface">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-outside pl-5 my-2 space-y-1">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside pl-5 my-2 space-y-1">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed text-on-surface">
              {children}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary/70 bg-primary/5 px-3 py-2 rounded-r-lg my-2 italic text-on-surface-variant font-body">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-xl border border-outline-variant/40 shadow-xs bg-surface-container-lowest">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-surface-container-low text-on-surface font-semibold border-b border-outline-variant/30 font-label">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-outline-variant/20">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-surface-container/40 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="py-2 px-3 font-semibold text-on-surface whitespace-nowrap">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="py-2 px-3 text-on-surface leading-normal">
              {children}
            </td>
          ),
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match && !String(children).includes('\n');
            if (isInline) {
              return (
                <code className="bg-surface-container-high/70 text-primary px-1.5 py-0.5 rounded font-mono text-[11px] sm:text-xs font-medium border border-outline-variant/20" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <div className="overflow-x-auto my-2 rounded-xl border border-outline-variant/30 bg-surface-container-lowest">
                <pre className="p-3 font-mono text-[11px] sm:text-xs text-on-surface leading-relaxed">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            );
          },
          hr: () => <hr className="my-3 border-outline-variant/30" />,
          strong: ({ children }) => (
            <strong className="font-semibold text-on-surface">
              {children}
            </strong>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
