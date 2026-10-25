import React, { useState, useRef, type KeyboardEvent } from 'react';
import { useChat } from '../../context/ChatContext';
import type { AnsweringMode, SearchScope } from '../../types';

export const PromptInput: React.FC = () => {
  const {
    sendMessage,
    isSending,
    answeringMode,
    setAnsweringMode,
    searchScope,
    setSearchScope,
    examMarksFormat,
    setExamMarksFormat,
  } = useChat();

  const [prompt, setPrompt] = useState('');
  const [attachments, setAttachments] = useState<{ name: string; size: string; type: string }[]>([]);
  const [showModeGuide, setShowModeGuide] = useState(false);
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const [isCorpusMenuOpen, setIsCorpusMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if ((!prompt.trim() && attachments.length === 0) || isSending) return;
    sendMessage(prompt, attachments.length > 0 ? attachments : undefined);
    setPrompt('');
    setAttachments([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const sizeStr =
        file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(file.size / 1024)} KB`;

      setAttachments((prev) => [
        ...prev,
        {
          name: file.name,
          size: sizeStr,
          type: file.name.split('.').pop() || 'file',
        },
      ]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const answeringModes: {
    mode: AnsweringMode;
    title: string;
    label: string;
    icon: string;
    tagline: string;
  }[] = [
    {
      mode: 'exam',
      title: 'Mode 1 — Exam Mode',
      label: 'Exam Mode',
      icon: 'school',
      tagline: 'Structured 2/13-mark answers, definitions & keywords',
    },
    {
      mode: 'explain',
      title: 'Mode 2 — Explain Mode',
      label: 'Explain Mode',
      icon: 'psychology',
      tagline: 'Step-by-step tutor explanation with real-world analogies',
    },
    {
      mode: 'retrieval',
      title: 'Mode 3 — Retrieval Mode',
      label: 'Retrieval Mode',
      icon: 'manage_search',
      tagline: 'Raw textbook passages & export without LLM synthesis',
    },
  ];

  const searchScopes: {
    scope: SearchScope;
    label: string;
    icon: string;
    textbookBehavior: string;
    studentDocsBehavior: string;
  }[] = [
    {
      scope: 'textbook_only',
      label: 'Textbook only',
      icon: 'menu_book',
      textbookBehavior: 'Search',
      studentDocsBehavior: 'Excluded',
    },
    {
      scope: 'textbook_and_materials',
      label: 'Textbook + my materials',
      icon: 'library_add_check',
      textbookBehavior: 'Search first',
      studentDocsBehavior: 'Supplementary search',
    },
    {
      scope: 'materials_only',
      label: 'My materials only',
      icon: 'folder_shared',
      textbookBehavior: 'Excluded',
      studentDocsBehavior: 'Search',
    },
  ];

  return (
    <footer className="w-full bg-surface-container-lowest/95 backdrop-blur-md border-t border-outline-variant/30 py-2 sm:py-2.5 px-2 sm:px-space-md shadow-lg">
      <div className="max-w-5xl mx-auto flex flex-col gap-1.5 sm:gap-2">
        {/* Unified Selectable Controls Bar (Workspace Switch Tab Format) */}
        <div className="flex items-center justify-between gap-1.5 flex-wrap sm:flex-nowrap py-0.5">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
            {/* 1. Answering Mode Switcher Tab */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsModeMenuOpen(!isModeMenuOpen);
                  setIsCorpusMenuOpen(false);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label text-xs font-medium transition-colors border border-outline-variant/30 shadow-xs cursor-pointer select-none"
              >
                <span className="material-symbols-outlined text-[16px] text-primary flex-shrink-0">
                  {answeringModes.find((m) => m.mode === answeringMode)?.icon}
                </span>
                <span className="font-semibold text-on-surface whitespace-nowrap">
                  {answeringModes.find((m) => m.mode === answeringMode)?.label}
                </span>
                {answeringMode === 'exam' && (
                  <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary font-mono text-[10px] font-bold">
                    {examMarksFormat}
                  </span>
                )}
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant flex-shrink-0">
                  expand_more
                </span>
              </button>

              {isModeMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsModeMenuOpen(false)} />
                  <div className="absolute bottom-full mb-1.5 left-0 w-72 sm:w-80 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/30 py-1.5 z-50 animate-in fade-in slide-in-from-bottom-1">
                    <div className="px-3 py-1.5 text-[10px] font-label uppercase tracking-wider text-outline border-b border-surface-container flex items-center justify-between">
                      <span>Switch Answering Mode</span>
                      <span className="text-[9px] font-mono lowercase">3 modes</span>
                    </div>
                    <div className="p-1 flex flex-col gap-0.5">
                      {answeringModes.map((item) => {
                        const isSelected = answeringMode === item.mode;
                        return (
                          <div
                            key={item.mode}
                            onClick={() => {
                              setAnsweringMode(item.mode);
                              setIsModeMenuOpen(false);
                            }}
                            className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs font-label transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-primary/10 text-primary font-semibold'
                                : 'text-on-surface hover:bg-surface-container'
                            }`}
                          >
                            <span
                              className={`material-symbols-outlined text-[18px] mt-0.5 ${
                                isSelected ? 'text-primary' : 'text-on-surface-variant'
                              }`}
                            >
                              {item.icon}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-semibold text-xs text-on-surface">{item.title}</span>
                                {isSelected && (
                                  <span className="material-symbols-outlined text-primary text-[16px]">
                                    check
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-on-surface-variant font-normal leading-relaxed mt-0.5">
                                {item.tagline}
                              </p>
                              {item.mode === 'exam' && (
                                <div className="flex items-center gap-1.5 mt-1.5 pt-1 border-t border-surface-container">
                                  <span className="text-[10px] text-outline font-label">Exam Marks:</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExamMarksFormat('2-mark');
                                      setAnsweringMode('exam');
                                    }}
                                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                                      examMarksFormat === '2-mark'
                                        ? 'bg-primary text-on-primary font-bold'
                                        : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                                    }`}
                                  >
                                    2-Mark
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExamMarksFormat('13-mark');
                                      setAnsweringMode('exam');
                                    }}
                                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                                      examMarksFormat === '13-mark'
                                        ? 'bg-primary text-on-primary font-bold'
                                        : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                                    }`}
                                  >
                                    13-Mark
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Quick 2-Mark / 13-Mark selector pill when Exam Mode active */}
            {answeringMode === 'exam' && (
              <div className="flex items-center bg-surface-container-low p-0.5 rounded-lg border border-outline-variant/30 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setExamMarksFormat('2-mark')}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono transition-all ${
                    examMarksFormat === '2-mark'
                      ? 'bg-primary text-on-primary font-bold shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  2-Mark
                </button>
                <button
                  type="button"
                  onClick={() => setExamMarksFormat('13-mark')}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono transition-all ${
                    examMarksFormat === '13-mark'
                      ? 'bg-primary text-on-primary font-bold shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  13-Mark
                </button>
              </div>
            )}

            {/* 2. Search Corpus Switcher Tab */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsCorpusMenuOpen(!isCorpusMenuOpen);
                  setIsModeMenuOpen(false);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label text-xs font-medium transition-colors border border-outline-variant/30 shadow-xs cursor-pointer select-none"
              >
                <span className="material-symbols-outlined text-[16px] text-secondary flex-shrink-0">
                  {searchScopes.find((s) => s.scope === searchScope)?.icon}
                </span>
                <span className="font-semibold text-on-surface whitespace-nowrap">
                  {searchScopes.find((s) => s.scope === searchScope)?.label}
                </span>
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant flex-shrink-0">
                  expand_more
                </span>
              </button>

              {isCorpusMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsCorpusMenuOpen(false)} />
                  <div className="absolute bottom-full mb-1.5 left-0 sm:left-auto sm:right-0 w-72 sm:w-80 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/30 py-1.5 z-50 animate-in fade-in slide-in-from-bottom-1">
                    <div className="px-3 py-1.5 text-[10px] font-label uppercase tracking-wider text-outline border-b border-surface-container flex items-center justify-between">
                      <span>Switch Search Corpus</span>
                      <span className="text-[9px] font-mono lowercase">Scope</span>
                    </div>
                    <div className="p-1 flex flex-col gap-0.5">
                      {searchScopes.map((scopeItem) => {
                        const isSelected = searchScope === scopeItem.scope;
                        return (
                          <div
                            key={scopeItem.scope}
                            onClick={() => {
                              setSearchScope(scopeItem.scope);
                              setIsCorpusMenuOpen(false);
                            }}
                            className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs font-label transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-secondary/10 text-secondary font-semibold'
                                : 'text-on-surface hover:bg-surface-container'
                            }`}
                          >
                            <span
                              className={`material-symbols-outlined text-[18px] mt-0.5 ${
                                isSelected ? 'text-secondary' : 'text-on-surface-variant'
                              }`}
                            >
                              {scopeItem.icon}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-semibold text-xs text-on-surface">
                                  {scopeItem.label}
                                </span>
                                {isSelected && (
                                  <span className="material-symbols-outlined text-secondary text-[16px]">
                                    check
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant mt-1 font-mono">
                                <span>
                                  Textbook:{' '}
                                  <strong
                                    className={
                                      scopeItem.textbookBehavior.includes('Search')
                                        ? 'text-emerald-600'
                                        : 'text-error'
                                    }
                                  >
                                    {scopeItem.textbookBehavior}
                                  </strong>
                                </span>
                                <span>•</span>
                                <span>
                                  Student Docs:{' '}
                                  <strong
                                    className={
                                      scopeItem.studentDocsBehavior.includes('Search')
                                        ? 'text-secondary'
                                        : 'text-error'
                                    }
                                  >
                                    {scopeItem.studentDocsBehavior}
                                  </strong>
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="border-t border-surface-container mt-1 pt-1 px-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCorpusMenuOpen(false);
                          setShowModeGuide(true);
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-label text-primary hover:bg-surface-container transition-colors"
                      >
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">grid_view</span>
                          <span>Open Search Matrix Guide</span>
                        </span>
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Mode Guide Popover Trigger */}
          <button
            onClick={() => setShowModeGuide(!showModeGuide)}
            className="text-outline hover:text-primary p-1.5 rounded-lg hover:bg-surface-container transition-colors flex-shrink-0"
            title="View Modes & Search Settings Guide"
          >
            <span className="material-symbols-outlined text-[16px]">help_outline</span>
          </button>
        </div>

        {/* Mode & Search Scope Explanatory Matrix Guide Modal/Drawer */}
        {showModeGuide && (
          <div className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs flex flex-col gap-space-sm animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-1 border-b border-surface-container">
              <span className="font-headline font-bold text-on-surface text-xs flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">menu_book</span>
                Three Answering Modes &amp; Search Matrix Guide
              </span>
              <button
                onClick={() => setShowModeGuide(false)}
                className="text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            {/* Answering Modes details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="bg-surface-container-lowest p-2 rounded-lg border border-primary/20">
                <div className="font-label font-bold text-primary flex items-center gap-1 text-[11px]">
                  <span className="material-symbols-outlined text-[14px]">school</span>
                  Mode 1 — Exam Mode
                </div>
                <p className="text-[10px] text-on-surface-variant mt-1 leading-relaxed">
                  2-mark or 13-mark structured answer with definitions, keywords, diagrams, algorithms, and textbook citations.
                </p>
              </div>

              <div className="bg-surface-container-lowest p-2 rounded-lg border border-secondary/20">
                <div className="font-label font-bold text-secondary flex items-center gap-1 text-[11px]">
                  <span className="material-symbols-outlined text-[14px]">psychology</span>
                  Mode 2 — Explain Mode
                </div>
                <p className="text-[10px] text-on-surface-variant mt-1 leading-relaxed">
                  Tutor-style explanation with simple step-by-step logic, real-world analogies, and follow-up check questions.
                </p>
              </div>

              <div className="bg-surface-container-lowest p-2 rounded-lg border border-tertiary/20">
                <div className="font-label font-bold text-tertiary flex items-center gap-1 text-[11px]">
                  <span className="material-symbols-outlined text-[14px]">manage_search</span>
                  Mode 3 — Retrieval Mode
                </div>
                <p className="text-[10px] text-on-surface-variant mt-1 leading-relaxed">
                  Displays raw textbook passages with page references, one-click copy, and export as TXT/Markdown or ChatGPT prompt.
                </p>
              </div>
            </div>

            {/* Search Scope Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] font-label border border-surface-container mt-1">
                <thead className="bg-surface-container text-on-surface font-semibold">
                  <tr>
                    <th className="p-1.5 border-r border-surface-container-high">Textbook Setting</th>
                    <th className="p-1.5 border-r border-surface-container-high">Primary Textbook</th>
                    <th className="p-1.5">Student Documents</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  <tr className={searchScope === 'textbook_only' ? 'bg-primary/5 font-semibold' : ''}>
                    <td className="p-1.5 border-r border-surface-container font-mono">Textbook only</td>
                    <td className="p-1.5 border-r border-surface-container text-emerald-600 font-bold">Search</td>
                    <td className="p-1.5 text-error">Excluded</td>
                  </tr>
                  <tr className={searchScope === 'textbook_and_materials' ? 'bg-primary/5 font-semibold' : ''}>
                    <td className="p-1.5 border-r border-surface-container font-mono">Textbook + my materials</td>
                    <td className="p-1.5 border-r border-surface-container text-emerald-600 font-bold">Search first</td>
                    <td className="p-1.5 text-secondary font-bold">Supplementary search</td>
                  </tr>
                  <tr className={searchScope === 'materials_only' ? 'bg-primary/5 font-semibold' : ''}>
                    <td className="p-1.5 border-r border-surface-container font-mono">My materials only</td>
                    <td className="p-1.5 border-r border-surface-container text-error">Excluded</td>
                    <td className="p-1.5 text-emerald-600 font-bold">Search</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Attached files chips */}
        {attachments.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            {attachments.map((att, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-surface-container text-on-surface text-[11px] font-label border border-outline-variant/20"
              >
                <span className="material-symbols-outlined text-[13px] text-primary">attach_file</span>
                <span className="font-medium max-w-[140px] truncate">{att.name}</span>
                <span className="text-[9px] text-outline font-mono">({att.size})</span>
                <button
                  onClick={() => removeAttachment(idx)}
                  className="hover:text-error ml-0.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[13px]">close</span>
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Input box row */}
        <div className="relative flex items-end gap-1.5 bg-surface-container-low rounded-2xl p-1.5 sm:p-2 border border-outline-variant/30 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all shadow-inner">
          {/* Attachment button */}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-outline hover:text-primary hover:bg-surface-container transition-colors flex-shrink-0"
            title="Attach reference document"
          >
            <span className="material-symbols-outlined text-[18px]">attach_file</span>
          </button>

          {/* Prompt Textarea */}
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={
              answeringMode === 'exam'
                ? 'Enter topic or question for exam-ready answer (e.g. Explain 2-phase idempotency barrier)...'
                : answeringMode === 'explain'
                ? 'Ask for an intuitive explanation with real-world analogies...'
                : 'Enter query to retrieve exact textbook passages & page references...'
            }
            className="w-full bg-transparent text-on-surface font-body text-xs sm:text-sm resize-none outline-none placeholder:text-outline py-1 px-1 leading-relaxed max-h-32 overflow-y-auto"
          />

          {/* Send button */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={handleSend}
              disabled={(!prompt.trim() && attachments.length === 0) || isSending}
              className={`flex items-center gap-1 px-2.5 sm:px-space-md py-1.5 sm:py-2 rounded-xl font-label text-xs font-semibold shadow-md transition-all active:scale-95 ${
                (!prompt.trim() && attachments.length === 0) || isSending
                  ? 'bg-surface-container-high text-outline cursor-not-allowed shadow-none'
                  : 'bg-primary text-on-primary hover:bg-primary-container'
              }`}
            >
              <span className="hidden sm:inline">
                {isSending
                  ? 'Processing...'
                  : answeringMode === 'retrieval'
                  ? 'Retrieve'
                  : 'Send'}
              </span>
              <span className="material-symbols-outlined text-[16px]">
                {isSending ? 'sync' : 'arrow_upward'}
              </span>
            </button>
          </div>
        </div>

        {/* Active Mode & Scope Status Footer */}
        <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-label text-outline px-1 flex-wrap gap-1">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-on-surface flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              {answeringMode === 'exam'
                ? `Exam Mode (${examMarksFormat})`
                : answeringMode === 'explain'
                ? 'Explain Mode (Tutor)'
                : 'Retrieval Mode (Raw Passages)'}
            </span>
            <span>•</span>
            <span>
              Scope:{' '}
              {searchScope === 'textbook_only'
                ? 'Textbook only'
                : searchScope === 'textbook_and_materials'
                ? 'Textbook + My Materials'
                : 'My Materials only'}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">verified_user</span>
            <span>PCI-DSS &amp; SOC2 Grounded</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
