import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { useApp } from '../../context/AppContext';
import { apiClient } from '../../api/client';
import type { RetrievalResultItem, RetrievalSearchResponse } from '../../types';

export const RetrievalStudio: React.FC = () => {
  const { setAnsweringMode, sendMessage } = useChat();
  const { setSelectedCitation, setIsDocDrawerOpen } = useApp();

  const [query, setQuery] = useState('');
  const [subjectId, setSubjectId] = useState('general');
  const [sourceScope, setSourceScope] = useState<'authorized_textbook' | 'textbook_and_materials' | 'my_materials'>('authorized_textbook');
  const [sortBy, setSortBy] = useState<'relevance' | 'page_order'>('relevance');
  const [pageSize, setPageSize] = useState(5);
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [searchResponse, setSearchResponse] = useState<RetrievalSearchResponse | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

  const subjects = [
    { id: 'general', code: 'ALL', name: 'All Subjects (Universal Search)' },
    { id: 'cs3391', code: 'CS3391', name: 'Database Management Systems (Reg 2021)' },
    { id: 'ad3391', code: 'AD3391', name: 'Database Design & Management (Reg 2021)' },
    { id: 'cs8591', code: 'CS8591', name: 'Computer Networks (Reg 2017)' },
    { id: 'cs8492', code: 'CS8492', name: 'Database Management Systems (Reg 2017)' },
    { id: 'it8501', code: 'IT8501', name: 'Web Technology' },
  ];

  const handleSearch = async (targetPage: number = 1) => {
    if (!query.trim()) return;
    setLoading(true);
    setHasSearched(true);
    setPage(targetPage);

    try {
      const resp = await apiClient.searchRetrieval({
        query: query.trim(),
        subject_id: subjectId === 'general' ? undefined : subjectId,
        source_scope: sourceScope,
        sort_by: sortBy,
        page: targetPage,
        page_size: pageSize,
        top_k: pageSize * 3,
      });
      setSearchResponse(resp);
    } catch (err) {
      console.error('Retrieval search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch(1);
    }
  };

  const handleCopyPassage = (item: RetrievalResultItem) => {
    navigator.clipboard.writeText(item.text);
    setCopiedId(item.chunk_id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleParentContext = (chunkId: string) => {
    setExpandedParents((prev) => ({
      ...prev,
      [chunkId]: !prev[chunkId],
    }));
  };

  const handleExplainWithAI = (item: RetrievalResultItem) => {
    setAnsweringMode('explain');
    const promptText = `Explain this textbook passage and its underlying concept in simple terms:\n\n"${item.text.slice(0, 300)}..."`;
    sendMessage(promptText);
  };

  const handleExamAnswerWithAI = (item: RetrievalResultItem) => {
    setAnsweringMode('exam');
    const promptText = `Provide an Anna University exam-ready answer based on:\n\n"${item.text.slice(0, 300)}..."`;
    sendMessage(promptText);
  };

  const handleOpenDocViewer = (item: RetrievalResultItem) => {
    setSelectedCitation({
      id: item.chunk_id,
      docTitle: item.source.book_title,
      docType: item.source.source_type === 'primary_textbook' ? 'pdf' : 'markdown',
      pageOrSection: `pp. ${item.source.page_start || 1}-${item.source.page_end || 1}`,
      chunkText: item.text,
      parentText: item.parent_text,
      relevanceScore: item.rrf_score,
      topic: item.source.heading_path || item.source.chapter || 'Syllabus Topic',
      chunkId: item.chunk_id,
      bookReference: item.source.book_title,
      chapter: item.source.chapter,
    });
    setIsDocDrawerOpen(true);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">
      {/* Studio Header Banner */}
      <div className="bg-gradient-to-r from-tertiary-fixed/20 via-surface-container-low to-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-tertiary/20 shadow-xs">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-tertiary/10 text-tertiary flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">manage_search</span>
          </div>
          <div>
            <h1 className="font-headline text-lg sm:text-xl font-bold text-on-surface">
              Mode 3 — Textbook Retrieval Mode
            </h1>
            <p className="font-body text-xs sm:text-sm text-on-surface-variant">
              Searches Anna University prescribed textbooks and materials using Hybrid BM25 + Jina vector search with Reciprocal Rank Fusion (RRF). Returns original verbatim passages without synthetic LLM generation.
            </p>
          </div>
        </div>
      </div>

      {/* Search & Control Matrix Card */}
      <div className="bg-surface-container-lowest p-4 sm:p-5 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col gap-4">
        {/* Main Search Input */}
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px]">
            search
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search textbook passages (e.g., Two-Phase Locking, Bellman-Ford, Normalization)..."
            className="w-full pl-11 pr-24 py-3 bg-surface-container-lowest rounded-xl border border-outline-variant/60 focus:border-tertiary focus:ring-2 focus:ring-tertiary/20 text-on-surface text-sm font-body outline-none transition-all placeholder:text-outline/70"
          />
          <button
            onClick={() => handleSearch(1)}
            disabled={loading || !query.trim()}
            className="absolute right-2 px-4 py-1.5 bg-tertiary hover:bg-tertiary/90 disabled:opacity-50 text-on-tertiary font-label text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-all"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-[16px]">travel_explore</span>
            )}
            <span>Search</span>
          </button>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-surface-container-low">
          {/* Subject Selector */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-label font-semibold text-outline uppercase tracking-wider">
              Curriculum Subject
            </label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="bg-surface-container-low rounded-lg px-2.5 py-1.5 text-xs font-body text-on-surface border border-outline-variant/30 focus:border-tertiary outline-none"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code}: {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Scope Selector */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-label font-semibold text-outline uppercase tracking-wider">
              Source Scope
            </label>
            <select
              value={sourceScope}
              onChange={(e) => setSourceScope(e.target.value as any)}
              className="bg-surface-container-low rounded-lg px-2.5 py-1.5 text-xs font-body text-on-surface border border-outline-variant/30 focus:border-tertiary outline-none"
            >
              <option value="authorized_textbook">Authorized Textbooks</option>
              <option value="textbook_and_materials">Textbooks + Student Materials</option>
              <option value="my_materials">My Uploads Only</option>
            </select>
          </div>

          {/* Sort By Selector */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-label font-semibold text-outline uppercase tracking-wider">
              Sort Order
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-surface-container-low rounded-lg px-2.5 py-1.5 text-xs font-body text-on-surface border border-outline-variant/30 focus:border-tertiary outline-none"
            >
              <option value="relevance">Relevance (Hybrid RRF)</option>
              <option value="page_order">Page Order (Sequence)</option>
            </select>
          </div>

          {/* Page Size Selector */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-label font-semibold text-outline uppercase tracking-wider">
              Passages per Page
            </label>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-surface-container-low rounded-lg px-2.5 py-1.5 text-xs font-body text-on-surface border border-outline-variant/30 focus:border-tertiary outline-none"
            >
              <option value={5}>5 Passages</option>
              <option value={10}>10 Passages</option>
              <option value={15}>15 Passages</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {loading ? (
        /* Loading Skeleton */
        <div className="flex flex-col gap-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-surface-container-low/60 border border-outline-variant/20 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <div className="h-5 w-32 bg-surface-container-high rounded-full" />
                <div className="h-5 w-24 bg-surface-container-high rounded-full" />
              </div>
              <div className="h-4 w-3/4 bg-surface-container-high rounded" />
              <div className="h-16 w-full bg-surface-container-high rounded-lg" />
            </div>
          ))}
        </div>
      ) : searchResponse && searchResponse.results.length > 0 ? (
        /* Live Retrieved Passage Cards */
        <div className="flex flex-col gap-4">
          {/* Results Summary Header */}
          <div className="flex items-center justify-between px-1 flex-wrap gap-2 text-xs font-label">
            <div className="flex items-center gap-1.5 text-on-surface font-semibold">
              <span className="material-symbols-outlined text-tertiary text-[18px]">verified</span>
              <span>
                Found {searchResponse.pagination.total_results} authentic passages for "{searchResponse.query}"
              </span>
            </div>
            <span className="text-outline">
              Showing Page {searchResponse.pagination.page} of {searchResponse.pagination.total_pages}
            </span>
          </div>

          {/* Passage Cards Feed */}
          {searchResponse.results.map((item) => {
            const isContextExpanded = !!expandedParents[item.chunk_id];
            return (
              <div
                key={item.chunk_id}
                className="bg-surface-container-lowest rounded-2xl border border-outline-variant/40 p-4 sm:p-5 shadow-xs hover:border-tertiary/40 transition-all flex flex-col gap-3 group"
              >
                {/* Passage Header Bar */}
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Ordinal Rank Indicator (NO fake percentages) */}
                    <span className="px-2.5 py-0.5 rounded-full bg-tertiary text-on-tertiary font-mono font-bold text-xs shadow-xs">
                      Rank #{item.rank}
                    </span>

                    {/* Book Title */}
                    <span className="font-headline text-xs sm:text-sm font-bold text-on-surface flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-tertiary">menu_book</span>
                      {item.source.book_title}
                    </span>

                    {/* Unit / Chapter Pill */}
                    {item.source.unit && (
                      <span className="px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant font-label text-[11px] font-medium">
                        {item.source.unit}
                      </span>
                    )}

                    {/* Page Numbers */}
                    {item.source.page_start && (
                      <span className="px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface font-mono text-[11px] font-semibold">
                        pp. {item.source.page_start}–{item.source.page_end || item.source.page_start}
                      </span>
                    )}
                  </div>

                  {/* Source Type Badge */}
                  <span className="text-[10px] font-label px-2 py-0.5 rounded-full bg-surface-container-low text-outline border border-outline-variant/30">
                    {item.source.source_type === 'primary_textbook' ? 'Authorized Textbook' : 'Student Material'}
                  </span>
                </div>

                {/* Heading Path / Section Breadcrumb */}
                {item.source.heading_path && (
                  <div className="flex items-center gap-1 text-[11px] font-label text-outline truncate">
                    <span className="material-symbols-outlined text-[13px]">subdirectory_arrow_right</span>
                    <span className="truncate">{item.source.heading_path}</span>
                  </div>
                )}

                {/* Verbatim Passage Original Text Block */}
                <div className="relative bg-surface-container-low/60 rounded-xl p-3.5 sm:p-4 border-l-4 border-tertiary font-body text-xs sm:text-sm text-on-surface leading-relaxed whitespace-pre-wrap select-text">
                  {item.text}
                </div>

                {/* Inline Expanded Surrounding Context Window */}
                {isContextExpanded && (
                  <div className="bg-surface-container/70 rounded-xl p-3.5 border border-outline-variant/30 flex flex-col gap-1.5 animate-in fade-in duration-200">
                    <div className="flex items-center gap-1 text-tertiary font-label text-xs font-bold uppercase tracking-wider">
                      <span className="material-symbols-outlined text-[16px]">account_tree</span>
                      <span>Surrounding Parent Section Context</span>
                    </div>
                    <p className="font-body text-xs text-on-surface-variant leading-relaxed whitespace-pre-wrap">
                      {item.parent_text || 'Complete section context is loaded directly from textbook chapter hierarchy.'}
                    </p>
                  </div>
                )}

                {/* Bottom Actions Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-surface-container flex-wrap gap-2 text-xs font-label">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Copy Passage */}
                    <button
                      onClick={() => handleCopyPassage(item)}
                      className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center gap-1 transition-colors"
                      title="Copy verbatim passage"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {copiedId === item.chunk_id ? 'check' : 'content_copy'}
                      </span>
                      <span>{copiedId === item.chunk_id ? 'Copied' : 'Copy passage'}</span>
                    </button>

                    {/* View Surrounding Context Toggle */}
                    <button
                      onClick={() => toggleParentContext(item.chunk_id)}
                      className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center gap-1 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {isContextExpanded ? 'unfold_less' : 'unfold_more'}
                      </span>
                      <span>{isContextExpanded ? 'Hide context' : 'View surrounding context'}</span>
                    </button>

                    {/* Open Inspector Drawer */}
                    <button
                      onClick={() => handleOpenDocViewer(item)}
                      className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center gap-1 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                      <span>Inspect</span>
                    </button>
                  </div>

                  {/* Mode Transitions: Explain or Exam */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleExplainWithAI(item)}
                      className="px-2.5 py-1 rounded-lg bg-secondary-fixed/50 hover:bg-secondary-fixed text-on-secondary-fixed font-semibold flex items-center gap-1 transition-colors shadow-xs"
                      title="Ask AI tutor to explain this passage"
                    >
                      <span className="material-symbols-outlined text-[14px]">psychology</span>
                      <span>Explain with AI</span>
                    </button>
                    <button
                      onClick={() => handleExamAnswerWithAI(item)}
                      className="px-2.5 py-1 rounded-lg bg-primary-fixed/50 hover:bg-primary-fixed text-on-primary-fixed font-semibold flex items-center gap-1 transition-colors shadow-xs"
                      title="Generate 13-mark answer from this passage"
                    >
                      <span className="material-symbols-outlined text-[14px]">school</span>
                      <span>Exam Answer</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Pagination Navigation */}
          {searchResponse.pagination.total_pages > 1 && (
            <div className="flex items-center justify-center gap-2 py-4">
              <button
                disabled={page <= 1}
                onClick={() => handleSearch(page - 1)}
                className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high disabled:opacity-40 text-on-surface font-label text-xs font-semibold flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                <span>Previous</span>
              </button>
              <span className="font-mono text-xs text-on-surface px-2">
                Page {page} of {searchResponse.pagination.total_pages}
              </span>
              <button
                disabled={!searchResponse.pagination.has_more}
                onClick={() => handleSearch(page + 1)}
                className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high disabled:opacity-40 text-on-surface font-label text-xs font-semibold flex items-center gap-1"
              >
                <span>Next</span>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          )}
        </div>
      ) : hasSearched ? (
        /* Empty State: No relevant passages found */
        <div className="bg-surface-container-lowest p-8 sm:p-12 rounded-2xl border border-dashed border-outline-variant flex flex-col items-center justify-center text-center gap-3">
          <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-outline">
            <span className="material-symbols-outlined text-[28px]">search_off</span>
          </div>
          <h3 className="font-headline text-base font-bold text-on-surface">
            No relevant passages found
          </h3>
          <p className="font-body text-xs sm:text-sm text-on-surface-variant max-w-md">
            No textbook passages matching "{query}" were found in the selected scope. Try using broader syllabus terms, switching the subject to 'All Subjects', or expanding your source scope.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => {
                setSourceScope('textbook_and_materials');
                setSubjectId('general');
                handleSearch(1);
              }}
              className="px-3 py-1.5 rounded-lg bg-tertiary/10 text-tertiary hover:bg-tertiary/20 font-label text-xs font-semibold transition-colors"
            >
              Search All Sources &amp; Subjects
            </button>
          </div>
        </div>
      ) : (
        /* Initial Guidance State */
        <div className="bg-surface-container-lowest p-8 sm:p-10 rounded-2xl border border-outline-variant/30 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-tertiary/10 text-tertiary flex items-center justify-center">
            <span className="material-symbols-outlined text-[26px]">library_books</span>
          </div>
          <h3 className="font-headline text-sm sm:text-base font-bold text-on-surface">
            Direct Textbook Evidence Retrieval
          </h3>
          <p className="font-body text-xs sm:text-sm text-on-surface-variant max-w-lg">
            Enter any syllabus topic or question above. The system will retrieve verbatim passages with exact book references and page numbers from authorized Anna University textbooks.
          </p>
        </div>
      )}
    </div>
  );
};
