import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useChat } from '../../context/ChatContext';
import type { Citation } from '../../types';

export const DocumentViewer: React.FC = () => {
  const { isDocDrawerOpen, setIsDocDrawerOpen, selectedCitation, setSelectedCitation, setCurrentView } = useApp();
  const { messages } = useChat();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedParentId, setExpandedParentId] = useState<string | null>(null);

  if (!isDocDrawerOpen) return null;

  // Retrieve all citations from the latest assistant message, or fallback to any citations
  const latestAssistant = [...messages].reverse().find((m) => m.sender === 'assistant' && m.citations && m.citations.length > 0);
  const citations: Citation[] = latestAssistant?.citations || [];

  const handleCopy = (citation: Citation) => {
    navigator.clipboard.writeText(`"${citation.chunkText}" — ${citation.docTitle} (${citation.pageOrSection})`);
    setCopiedId(citation.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getDocIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return 'picture_as_pdf';
      case 'markdown':
      case 'md':
        return 'description';
      case 'csv':
        return 'table_chart';
      case 'security':
        return 'verified_user';
      default:
        return 'article';
    }
  };

  return (
    <>
      {/* Mobile Backdrop for Drawer */}
      <div
        onClick={() => setIsDocDrawerOpen(false)}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30 lg:hidden animate-in fade-in duration-200"
      />

      {/* Slide-over Right Drawer */}
      <aside
        className="fixed top-16 right-0 bottom-0 w-full sm:w-[420px] bg-surface-container-lowest border-l border-outline-variant/30 shadow-2xl z-40 flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300"
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="h-14 sm:h-16 px-space-md border-b border-outline-variant/30 flex items-center justify-between bg-surface-container-low/80 backdrop-blur-md">
            <div className="flex items-center gap-space-xs min-w-0">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                <span className="material-symbols-outlined text-[19px]">auto_stories</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="font-headline text-sm sm:text-[15px] font-bold text-on-surface truncate">
                    Retrieved Documents
                  </h2>
                  <span className="px-1.5 py-0.2 rounded-full bg-primary-fixed text-on-primary-fixed text-[10px] font-mono font-bold">
                    {citations.length} Sources
                  </span>
                </div>
                <p className="font-label text-[10px] sm:text-[11px] text-on-surface-variant">
                  RAG Grounding &amp; Citation Evidence
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {citations.length > 0 && (
                <button
                  onClick={() => {
                    const text = citations
                      .map(
                        (c, i) =>
                          `[Passage ${i + 1}] ${c.docTitle} (${c.pageOrSection})\n"${c.chunkText}"\n`
                      )
                      .join('\n---\n\n');
                    const element = document.createElement('a');
                    const file = new Blob([text], { type: 'text/markdown' });
                    element.href = URL.createObjectURL(file);
                    element.download = 'retrieved_textbook_passages.md';
                    document.body.appendChild(element);
                    element.click();
                    document.body.removeChild(element);
                  }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-primary hover:bg-surface-container transition-colors"
                  title="Export all passages as Markdown"
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                </button>
              )}
              <button
                onClick={() => setIsDocDrawerOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
                title="Close Drawer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </div>

          {/* Content list */}
          <div className="flex-1 overflow-y-auto p-space-sm space-y-space-sm">
            {citations.length === 0 ? (
              <div className="py-12 px-4 text-center text-outline text-xs">
                <span className="material-symbols-outlined text-4xl mb-2 text-outline/60">find_in_page</span>
                <p>No citations generated for this conversation turn yet.</p>
                <p className="mt-1 text-[11px]">Send a prompt to trigger RAG grounding.</p>
              </div>
            ) : (
              citations.map((citation) => {
                const isSelected = selectedCitation?.id === citation.id;
                const isParentExpanded = expandedParentId === citation.id;

                return (
                  <div
                    key={citation.id}
                    onClick={() => setSelectedCitation(citation)}
                    className={`rounded-xl p-space-sm border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-surface-container-low border-primary/60 shadow-md ring-2 ring-primary/10'
                        : 'bg-surface-container-low/70 hover:bg-surface-container-low border-outline-variant/30 shadow-xs'
                    }`}
                  >
                    {/* Top line: icon, title, score */}
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="material-symbols-outlined text-primary text-[17px] flex-shrink-0">
                          {getDocIcon(citation.docType)}
                        </span>
                        <span
                          className="font-label text-xs font-semibold text-on-surface truncate"
                          title={citation.docTitle}
                        >
                          {citation.docTitle}
                        </span>
                      </div>
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-primary/10 text-primary font-mono text-[10px] font-bold flex-shrink-0">
                        {(citation.relevanceScore * 100).toFixed(0)}% Match
                      </span>
                    </div>

                    {/* Metadata line */}
                    <div className="flex items-center gap-1.5 mb-1.5 text-[10px] sm:text-[11px] text-outline font-label">
                      <span>{citation.pageOrSection}</span>
                      <span>•</span>
                      <span className="text-primary font-medium">{citation.topic}</span>
                    </div>

                    {/* Quoted chunk snippet */}
                    <div className="bg-surface-container-lowest p-2 rounded-lg text-xs font-body text-on-surface-variant border-l-2 border-primary mb-2 shadow-xs">
                      <p className="line-clamp-3 leading-relaxed text-[11px] sm:text-xs">"{citation.chunkText}"</p>
                    </div>

                    {/* Parent Context Expansion (Parent-Child Retrieval inspection) */}
                    {isParentExpanded && citation.parentChunkText && (
                      <div className="mb-2 p-2 rounded-lg bg-surface-container text-xs text-on-surface border border-outline-variant/30 animate-in fade-in">
                        <div className="flex items-center gap-1 text-[10px] font-label font-bold text-secondary uppercase tracking-wider mb-1">
                          <span className="material-symbols-outlined text-[12px]">account_tree</span>
                          Parent Context Window (2,000 Chars)
                        </div>
                        <p className="text-[10px] sm:text-[11px] font-body text-on-surface-variant leading-relaxed">
                          {citation.parentChunkText}
                        </p>
                      </div>
                    )}

                    {/* Bottom action buttons */}
                    <div className="flex items-center justify-between pt-1 text-[11px] flex-wrap gap-1">
                      <span className="font-mono text-[9px] sm:text-[10px] text-outline">
                        Chunk: {citation.chunkId}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(citation);
                          }}
                          className="px-2 py-0.5 rounded bg-surface-container text-on-surface hover:text-primary font-label text-[11px] border border-outline-variant/30 flex items-center gap-1 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            {copiedId === citation.id ? 'check' : 'content_copy'}
                          </span>
                          <span>{copiedId === citation.id ? 'Copied' : 'Cite'}</span>
                        </button>

                        {citation.parentChunkText && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedParentId(isParentExpanded ? null : citation.id);
                            }}
                            className="px-2 py-0.5 rounded bg-surface-container text-secondary hover:bg-secondary/10 font-label text-[11px] border border-secondary/20 flex items-center gap-1 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[13px]">
                              {isParentExpanded ? 'expand_less' : 'account_tree'}
                            </span>
                            <span>{isParentExpanded ? 'Hide' : 'Parent RFC'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Drawer Footer */}
          <div className="p-space-sm bg-surface-container-low border-t border-outline-variant/30 flex items-center justify-between text-outline text-xs">
            <span className="flex items-center gap-1 text-[11px]">
              <span className="material-symbols-outlined text-[14px] text-primary">verified</span>
              Chroma: 12ms
            </span>
            <button
              onClick={() => {
                setIsDocDrawerOpen(false);
                setCurrentView('materials');
              }}
              className="text-primary hover:underline font-label text-xs font-semibold flex items-center gap-0.5"
            >
              <span>Manage Vectors</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
