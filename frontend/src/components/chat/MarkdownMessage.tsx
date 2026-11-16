import React, { useMemo } from 'react';

interface MarkdownMessageProps {
  content: string;
}

// Helper to safely render KaTeX math when window.katex is available
const renderKaTeX = (latex: string, displayMode: boolean): { html: string; isMath: boolean } => {
  const clean = latex.trim();
  if (typeof window !== 'undefined' && (window as any).katex) {
    try {
      const html = (window as any).katex.renderToString(clean, {
        displayMode,
        throwOnError: false,
      });
      return { html, isMath: true };
    } catch {
      // fallback
    }
  }
  return { html: clean, isMath: false };
};

// Inline parser for bold, italic, code, links, and inline math ($...$)
export const InlineText: React.FC<{ text: string }> = ({ text }) => {
  // Regex to split on inline math ($...$), code (`...`), bold (**...**), italic (*...*)
  const tokens = useMemo(() => {
    const parts: React.ReactNode[] = [];
    let keyIdx = 0;

    // Pattern matches:
    // 1. Inline math: $...$
    // 2. Bold: **...**
    // 3. Inline code: `...`
    // 4. Italic: *...*
    const regex = /(\$([^\$\n]+)\$)|(\*\*([^*]+)\*\*)|(`([^`]+)`)|(\*([^*]+)\*)/g;

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      // Push preceding plain text
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }

      if (match[1]) {
        // Inline math $...$
        const latex = match[2];
        const { html, isMath } = renderKaTeX(latex, false);
        if (isMath) {
          parts.push(
            <span
              key={`math-${keyIdx++}`}
              className="inline-math px-0.5"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } else {
          parts.push(
            <code
              key={`mcode-${keyIdx++}`}
              className="font-mono text-[11px] bg-surface-container px-1 py-0.5 rounded text-primary font-semibold"
            >
              {latex}
            </code>
          );
        }
      } else if (match[3]) {
        // Bold **...**
        parts.push(
          <strong key={`b-${keyIdx++}`} className="font-bold text-on-surface">
            {match[4]}
          </strong>
        );
      } else if (match[5]) {
        // Inline code `...`
        parts.push(
          <code
            key={`c-${keyIdx++}`}
            className="font-mono text-[11px] bg-surface-container px-1 py-0.5 rounded text-primary"
          >
            {match[6]}
          </code>
        );
      } else if (match[7]) {
        // Italic *...*
        parts.push(
          <em key={`i-${keyIdx++}`} className="italic text-on-surface-variant">
            {match[8]}
          </em>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts;
  }, [text]);

  return <>{tokens}</>;
};

// Full Markdown message component
export const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ content }) => {
  const renderedBlocks = useMemo(() => {
    if (!content) return null;

    // Split raw text into top-level blocks: code fences, display math, tables, lists, headers, etc.
    const lines = content.split('\n');
    const blocks: React.ReactNode[] = [];
    let i = 0;
    let blockKey = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // 1. Code Fence (```)
      if (trimmed.startsWith('```')) {
        const lang = trimmed.slice(3).trim();
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // skip closing ```
        blocks.push(
          <div key={`code-${blockKey++}`} className="my-3 rounded-xl overflow-hidden border border-outline-variant/30 shadow-xs">
            {lang && (
              <div className="bg-surface-container-high px-3 py-1 font-mono text-[10px] text-outline uppercase tracking-wider font-semibold border-b border-outline-variant/20">
                {lang}
              </div>
            )}
            <pre className="p-3 bg-surface-container-lowest font-mono text-xs overflow-x-auto text-primary leading-relaxed">
              <code>{codeLines.join('\n')}</code>
            </pre>
          </div>
        );
        continue;
      }

      // 2. Display Math ($$ ... $$)
      if (trimmed.startsWith('$$')) {
        let mathText = trimmed.slice(2);
        if (mathText.endsWith('$$') && mathText.length > 2) {
          mathText = mathText.slice(0, -2);
          i++;
        } else {
          const mathLines = [mathText];
          i++;
          while (i < lines.length && !lines[i].trim().endsWith('$$')) {
            mathLines.push(lines[i]);
            i++;
          }
          if (i < lines.length) {
            const endLine = lines[i].trim();
            mathLines.push(endLine.slice(0, -2));
            i++;
          }
          mathText = mathLines.join('\n');
        }

        const { html, isMath } = renderKaTeX(mathText, true);
        blocks.push(
          <div
            key={`disp-math-${blockKey++}`}
            className="my-3 p-3 bg-surface-container-low/50 rounded-xl overflow-x-auto border border-outline-variant/20 text-center"
          >
            {isMath ? (
              <div dangerouslySetInnerHTML={{ __html: html }} />
            ) : (
              <code className="font-mono text-xs text-primary">{mathText}</code>
            )}
          </div>
        );
        continue;
      }

      // 3. GFM Markdown Table (line starts and ends with |)
      if (trimmed.startsWith('|') && trimmed.endsWith('|') && lines[i + 1] && lines[i + 1].includes('|') && lines[i + 1].includes('---')) {
        const tableLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
          tableLines.push(lines[i].trim());
          i++;
        }

        if (tableLines.length >= 2) {
          const headerCells = tableLines[0]
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim());
          const alignCells = tableLines[1]
            .split('|')
            .slice(1, -1)
            .map((c) => {
              const t = c.trim();
              if (t.startsWith(':') && t.endsWith(':')) return 'text-center';
              if (t.endsWith(':')) return 'text-right';
              return 'text-left';
            });

          const bodyRows = tableLines.slice(2).map((r) =>
            r
              .split('|')
              .slice(1, -1)
              .map((c) => c.trim())
          );

          blocks.push(
            <div
              key={`table-${blockKey++}`}
              className="overflow-x-auto my-3 rounded-xl border border-outline-variant/30 shadow-xs"
            >
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-surface-container-low text-primary font-bold uppercase tracking-wider text-[11px] border-b border-outline-variant/30">
                  <tr>
                    {headerCells.map((h, hIdx) => (
                      <th
                        key={hIdx}
                        className={`px-3 py-2.5 font-semibold ${alignCells[hIdx] || 'text-left'}`}
                      >
                        <InlineText text={h} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/15">
                  {bodyRows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className={rIdx % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low/20'}
                    >
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className={`px-3 py-2 text-on-surface ${alignCells[cIdx] || 'text-left'}`}
                        >
                          <InlineText text={cell} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          continue;
        }
      }

      // 4. Headings
      if (trimmed.startsWith('#')) {
        const hashMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
        if (hashMatch) {
          const level = hashMatch[1].length;
          const text = hashMatch[2];
          i++;

          if (level === 1) {
            blocks.push(
              <h2 key={`h1-${blockKey++}`} className="font-headline text-base sm:text-lg font-bold text-primary mt-4 mb-2 pb-1 border-b border-outline-variant/20">
                <InlineText text={text} />
              </h2>
            );
          } else if (level === 2) {
            blocks.push(
              <h3 key={`h2-${blockKey++}`} className="font-headline text-sm sm:text-base font-bold text-on-surface mt-3.5 mb-1.5">
                <InlineText text={text} />
              </h3>
            );
          } else if (level === 3) {
            blocks.push(
              <h4 key={`h3-${blockKey++}`} className="font-headline text-xs sm:text-sm font-bold text-primary mt-3 mb-1">
                <InlineText text={text} />
              </h4>
            );
          } else {
            blocks.push(
              <h5 key={`h4-${blockKey++}`} className="font-headline text-xs font-semibold text-on-surface-variant mt-2 mb-1">
                <InlineText text={text} />
              </h5>
            );
          }
          continue;
        }
      }

      // 5. Horizontal rule
      if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
        blocks.push(<hr key={`hr-${blockKey++}`} className="my-3 border-outline-variant/30" />);
        i++;
        continue;
      }

      // 6. Blockquote
      if (trimmed.startsWith('>')) {
        const quoteLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('>')) {
          quoteLines.push(lines[i].trim().replace(/^>\s*/, ''));
          i++;
        }
        blocks.push(
          <blockquote
            key={`quote-${blockKey++}`}
            className="my-2 pl-3 border-l-4 border-primary/50 text-xs sm:text-sm italic text-on-surface-variant bg-surface-container-low/30 py-1.5 rounded-r-lg"
          >
            <InlineText text={quoteLines.join(' ')} />
          </blockquote>
        );
        continue;
      }

      // 7. Unordered / Ordered Lists
      if (/^(\*|-|\+|\d+\.)\s+/.test(trimmed)) {
        const listItems: { isNumbered: boolean; text: string }[] = [];
        while (i < lines.length && /^(\*|-|\+|\d+\.)\s+/.test(lines[i].trim())) {
          const l = lines[i].trim();
          const matchNum = l.match(/^(\d+)\.\s+(.*)$/);
          if (matchNum) {
            listItems.push({ isNumbered: true, text: matchNum[2] });
          } else {
            listItems.push({ isNumbered: false, text: l.replace(/^(\*|-|\+)\s+/, '') });
          }
          i++;
        }

        const isNumberedList = listItems[0].isNumbered;
        if (isNumberedList) {
          blocks.push(
            <ol key={`ol-${blockKey++}`} className="my-2 pl-5 list-decimal space-y-1 text-xs sm:text-sm text-on-surface">
              {listItems.map((item, lIdx) => (
                <li key={lIdx} className="leading-relaxed">
                  <InlineText text={item.text} />
                </li>
              ))}
            </ol>
          );
        } else {
          blocks.push(
            <ul key={`ul-${blockKey++}`} className="my-2 pl-5 list-disc space-y-1 text-xs sm:text-sm text-on-surface">
              {listItems.map((item, lIdx) => (
                <li key={lIdx} className="leading-relaxed">
                  <InlineText text={item.text} />
                </li>
              ))}
            </ul>
          );
        }
        continue;
      }

      // 8. Plain paragraph
      if (trimmed.length > 0) {
        const paraLines: string[] = [line];
        i++;
        while (
          i < lines.length &&
          lines[i].trim().length > 0 &&
          !lines[i].trim().startsWith('#') &&
          !lines[i].trim().startsWith('```') &&
          !lines[i].trim().startsWith('$$') &&
          !lines[i].trim().startsWith('|') &&
          !lines[i].trim().startsWith('>') &&
          !/^(\*|-|\+|\d+\.)\s+/.test(lines[i].trim())
        ) {
          paraLines.push(lines[i]);
          i++;
        }

        blocks.push(
          <p key={`p-${blockKey++}`} className="my-1.5 text-xs sm:text-sm leading-relaxed text-on-surface">
            <InlineText text={paraLines.join(' ')} />
          </p>
        );
        continue;
      }

      // Empty line
      i++;
    }

    return blocks;
  }, [content]);

  return <div className="markdown-body space-y-1">{renderedBlocks}</div>;
};
