import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { useApp } from '../../context/AppContext';
import { useSettings } from '../../context/SettingsContext';
import { PromptInput } from './PromptInput';
import { DocumentViewer } from './DocumentViewer';
import { RetrievalStudio } from './RetrievalStudio';

export const ChatInterface: React.FC = () => {
  const {
    messages,
    currentThread,
    regenerateResponse,
    forkThread,
    sendMessage,
    answeringMode,
    setAnsweringMode,
  } = useChat();
  const { isDocDrawerOpen, setIsDocDrawerOpen, setSelectedCitation, isSidebarOpen } = useApp();
  const { settings, updateSettings } = useSettings();

  const [isParamsPanelOpen, setIsParamsPanelOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedExport, setCopiedExport] = useState<string | null>(null);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleExportText = (content: string, filename: string) => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleCopyChatGPT = (content: string) => {
    const promptWithPassages = `You are an expert Anna University study tutor. Based on the following retrieved textbook and syllabus reference passages, please answer my question accurately:

=== RETRIEVED TEXTBOOK PASSAGES ===
${content}
===================================

My Question: What are the primary technical considerations, definitions, and implementation steps?`;
    navigator.clipboard.writeText(promptWithPassages);
    setCopiedExport('chatgpt');
    setTimeout(() => setCopiedExport(null), 2000);
  };

  const sampleSuggestions = [
    {
      icon: 'school',
      text: 'Provide a 13-mark exam answer on Two-Phase Locking Protocol (CS3391 / CS8492)',
    },
    {
      icon: 'psychology',
      text: 'Explain Distance Vector Routing and Bellman-Ford using real-world analogies (CS8591)',
    },
    {
      icon: 'manage_search',
      text: 'Retrieve verbatim textbook passages on Relational Normalization (Boyce-Codd Normal Form)',
    },
  ];

  return (
    <div
      className={`relative min-h-[calc(100vh-64px)] flex flex-col justify-between transition-all duration-300 ease-in-out w-full ${
        isSidebarOpen ? 'lg:pl-72' : 'pl-0'
      } ${isDocDrawerOpen ? 'xl:pr-[420px]' : 'pr-0'}`}
    >
      {/* Top Session Sub-header */}
      <section className="sticky top-16 z-20 bg-surface/95 backdrop-blur-md border-b border-surface-container px-3 sm:px-space-lg py-2">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 flex-wrap">
          {/* Thread Title & Mode Selector */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap min-w-0">
            <h1 className="font-headline text-sm sm:text-base font-bold text-on-surface truncate max-w-[200px] sm:max-w-xs">
              {currentThread.title}
            </h1>

            {/* Interactive Mode Switching Tabs */}
            <div className="flex items-center gap-1 bg-surface-container-low p-0.5 rounded-xl border border-outline-variant/30 text-xs font-label">
              <button
                onClick={() => setAnsweringMode('exam')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                  answeringMode === 'exam'
                    ? 'bg-primary text-on-primary font-bold shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">school</span>
                <span>Mode 1: Exam</span>
              </button>

              <button
                onClick={() => setAnsweringMode('explain')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                  answeringMode === 'explain'
                    ? 'bg-secondary text-on-secondary font-bold shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">psychology</span>
                <span>Mode 2: Explain</span>
              </button>

              <button
                onClick={() => setAnsweringMode('retrieval')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                  answeringMode === 'retrieval'
                    ? 'bg-tertiary text-on-tertiary font-bold shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">manage_search</span>
                <span>Mode 3: Retrieval</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics & Parameters Toggle */}
          <div className="flex items-center gap-1 sm:gap-space-sm text-xs font-label">
            <div className="hidden md:flex items-center gap-1.5 text-on-surface-variant">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="font-semibold text-on-surface">{settings.selectedModel}</span>
              <span className="text-outline">•</span>
              <span className="text-outline">Live Chroma Cloud</span>
            </div>

            <button
              onClick={() => setIsParamsPanelOpen(!isParamsPanelOpen)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label text-[11px] sm:text-xs font-medium transition-colors"
            >
              <span className="material-symbols-outlined text-[15px] text-primary">tune</span>
              <span>Params</span>
              <span className="material-symbols-outlined text-[13px]">
                {isParamsPanelOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>
          </div>
        </div>

        {/* Collapsible Parameters Drawer */}
        {isParamsPanelOpen && (
          <div className="mt-2 pt-2 border-t border-surface-container max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-space-sm sm:gap-space-md items-center animate-in fade-in duration-200">
            {/* Temperature */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs font-label text-on-surface font-medium">
                <span>Temperature</span>
                <span className="text-primary font-bold">{settings.temperature.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.temperature}
                onChange={(e) => updateSettings({ temperature: parseFloat(e.target.value) })}
                className="accent-primary h-1.5 bg-surface-container rounded-lg cursor-pointer"
              />
              <span className="text-[10px] text-outline font-label">
                {settings.temperature < 0.3 ? 'Deterministic / Strict RAG' : 'Creative / Exploratory'}
              </span>
            </div>

            {/* Max Generation Tokens */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs font-label text-on-surface font-medium">
                <span>Max Tokens</span>
                <span className="text-primary font-bold">{settings.maxTokens}</span>
              </div>
              <input
                type="range"
                min="1024"
                max="16384"
                step="1024"
                value={settings.maxTokens}
                onChange={(e) => updateSettings({ maxTokens: parseInt(e.target.value) })}
                className="accent-primary h-1.5 bg-surface-container rounded-lg cursor-pointer"
              />
              <span className="text-[10px] text-outline font-label">Allows deep code scaffolds</span>
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-space-sm justify-end">
              <button
                onClick={() => updateSettings({ temperature: 0.2, maxTokens: 8192 })}
                className="px-2.5 py-1 rounded-lg bg-surface-container-high text-on-surface text-[11px] font-label font-medium hover:bg-surface-container-highest transition-colors"
              >
                Reset
              </button>
              <button
                onClick={() => setIsParamsPanelOpen(false)}
                className="px-3 py-1 rounded-lg bg-primary text-on-primary text-[11px] font-label font-semibold shadow-xs hover:bg-primary-container transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </section>

      {answeringMode === 'retrieval' ? (
        <div className="flex-1 w-full overflow-y-auto">
          <RetrievalStudio />
        </div>
      ) : (
        <>
          {/* Primary Chat Messages Scroll Area */}
          <main className="w-full max-w-5xl mx-auto px-3 sm:px-space-lg py-space-md sm:py-space-lg flex-1 flex flex-col gap-space-lg sm:gap-space-xl">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-4 gap-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-[36px]">school</span>
                </div>
                <div className="max-w-md flex flex-col gap-2">
                  <h2 className="font-headline text-lg sm:text-xl font-bold text-on-surface">
                    Anna University RAG Study Assistant
                  </h2>
                  <p className="font-body text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                    Powered by FastAPI, Chroma Cloud, and Jina AI embeddings. Grounded directly in prescribed textbook chapters and Regulation 2021 syllabus requirements.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl mt-2">
                  <button
                    onClick={() => {
                      setAnsweringMode('exam');
                      sendMessage('Provide a 13-mark answer on Two-Phase Locking (2PL) protocol with diagrams and serializability proof (CS3391)');
                    }}
                    className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 hover:border-primary/50 text-left transition-all group flex flex-col gap-2 shadow-xs"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-colors">
                      <span className="material-symbols-outlined text-[18px]">school</span>
                    </div>
                    <span className="font-headline text-xs font-bold text-on-surface">Mode 1: Exam Answer</span>
                    <span className="font-body text-[11px] text-on-surface-variant leading-tight">
                      13-Mark Two-Phase Locking with formal keywords &amp; textbook citations
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setAnsweringMode('explain');
                      sendMessage('Explain Bellman-Ford Distance Vector Routing like I am 12 using real-world analogies (CS8591)');
                    }}
                    className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 hover:border-secondary/50 text-left transition-all group flex flex-col gap-2 shadow-xs"
                  >
                    <div className="w-8 h-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center group-hover:bg-secondary group-hover:text-on-secondary transition-colors">
                      <span className="material-symbols-outlined text-[18px]">psychology</span>
                    </div>
                    <span className="font-headline text-xs font-bold text-on-surface">Mode 2: Concept Tutor</span>
                    <span className="font-body text-[11px] text-on-surface-variant leading-tight">
                      Step-by-step intuitive explanation with everyday analogies
                    </span>
                  </button>

                  <button
                    onClick={() => setAnsweringMode('retrieval')}
                    className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 hover:border-tertiary/50 text-left transition-all group flex flex-col gap-2 shadow-xs"
                  >
                    <div className="w-8 h-8 rounded-lg bg-tertiary/10 text-tertiary flex items-center justify-center group-hover:bg-tertiary group-hover:text-on-tertiary transition-colors">
                      <span className="material-symbols-outlined text-[18px]">manage_search</span>
                    </div>
                    <span className="font-headline text-xs font-bold text-on-surface">Mode 3: Retrieval Studio</span>
                    <span className="font-body text-[11px] text-on-surface-variant leading-tight">
                      Direct verbatim search across authorized textbooks with page numbers
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              messages.map((message) => {
          if (message.sender === 'user') {
            return (
              <div key={message.id} className="flex items-start justify-end gap-2 sm:gap-space-md w-full">
                <div className="flex flex-col items-end max-w-full sm:max-w-2xl min-w-0">
                  <div className="flex items-center gap-space-xs mb-1 text-[11px] sm:text-xs font-label text-outline flex-wrap justify-end">
                    <span>{message.timestamp}</span>
                    <span className="font-semibold text-on-surface truncate">Alex Mercer</span>
                    {message.answeringMode && (
                      <span className="px-1.5 py-0.2 rounded bg-surface-container text-primary font-bold text-[10px]">
                        {message.answeringMode === 'exam'
                          ? `Exam (${message.examMarksFormat || '13-mark'})`
                          : message.answeringMode === 'explain'
                          ? 'Explain'
                          : 'Retrieval'}
                      </span>
                    )}
                  </div>

                  {/* Prompt Bubble */}
                  <div className="bg-surface-container-lowest text-on-surface p-3 sm:p-space-md rounded-2xl rounded-tr-sm shadow-sm border border-outline-variant/20 flex flex-col gap-space-sm">
                    <p className="font-body text-xs sm:text-sm leading-relaxed text-on-surface whitespace-pre-wrap break-words">
                      {message.content}
                    </p>

                    {/* Attached files in prompt */}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                        {message.attachments.map((att, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-container-low font-label text-[11px] text-on-surface-variant border border-outline-variant/30"
                          >
                            <span className="material-symbols-outlined text-[13px] text-primary">attach_file</span>
                            <span className="truncate max-w-[150px]">{att.name}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          }

          // ASSISTANT MESSAGE ENTRY
          const mode = message.answeringMode || 'exam';
          const isRetrievalMode = mode === 'retrieval';
          const isExplainMode = mode === 'explain';

          return (
            <div key={message.id} className="flex items-start gap-2 sm:gap-space-md w-full">
              {/* Bot Avatar */}
              <div
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-on-primary font-headline text-xs sm:text-sm font-bold shadow-sm flex-shrink-0 ${
                  isRetrievalMode
                    ? 'bg-tertiary'
                    : isExplainMode
                    ? 'bg-secondary'
                    : 'bg-primary'
                }`}
              >
                {isRetrievalMode ? 'R' : isExplainMode ? 'E' : 'A'}
              </div>

              <div className="flex-1 min-w-0 flex flex-col gap-space-md">
                {/* Meta info bar */}
                <div className="flex items-center justify-between flex-wrap gap-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-headline text-xs sm:text-sm font-bold text-on-surface">Aether RAG</span>

                    {/* Answering Mode Badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.2 rounded-full font-label text-[10px] sm:text-xs font-semibold ${
                        isRetrievalMode
                          ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                          : isExplainMode
                          ? 'bg-secondary-fixed text-on-secondary-fixed'
                          : 'bg-primary-fixed text-on-primary-fixed'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px]">
                        {isRetrievalMode ? 'manage_search' : isExplainMode ? 'psychology' : 'school'}
                      </span>
                      <span>
                        {isRetrievalMode
                          ? 'Mode 3 — Retrieval Mode'
                          : isExplainMode
                          ? 'Mode 2 — Explain Mode'
                          : `Mode 1 — Exam Mode (${message.examMarksFormat || '13-Mark'})`}
                      </span>
                    </span>

                    {/* Search Scope Badge */}
                    {message.searchScope && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full bg-surface-container font-label text-[10px] text-outline">
                        {message.searchScope === 'textbook_only'
                          ? 'Textbook only'
                          : message.searchScope === 'materials_only'
                          ? 'My materials only'
                          : 'Textbook + My materials'}
                      </span>
                    )}
                  </div>

                  {/* Telemetry info */}
                  <div className="flex items-center gap-1 sm:gap-space-xs text-outline font-label text-[11px] flex-wrap">
                    {message.tokens && (
                      <span className="hidden sm:inline-flex items-center gap-0.5 text-on-surface-variant bg-surface-container-low px-1.5 py-0.5 rounded">
                        <span className="material-symbols-outlined text-[12px]">bolt</span>
                        {message.tokens} tokens
                      </span>
                    )}
                    {message.ttft && (
                      <span className="text-primary font-medium">{message.ttft} TTFT</span>
                    )}
                    <button
                      onClick={forkThread}
                      className="w-6 h-6 rounded hover:bg-surface-container text-on-surface-variant flex items-center justify-center transition-colors ml-0.5"
                      title="Fork thread"
                    >
                      <span className="material-symbols-outlined text-[15px]">fork_right</span>
                    </button>
                    <button
                      onClick={() => handleCopyCode(message.content)}
                      className="w-6 h-6 rounded hover:bg-surface-container text-on-surface-variant flex items-center justify-center transition-colors"
                      title={copiedCode ? "Copied!" : "Copy raw message"}
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        {copiedCode ? 'check' : 'content_copy'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Main Card with architectural response */}
                <div className="bg-surface-container-lowest p-3 sm:p-space-lg rounded-2xl shadow-sm border border-outline-variant/20 flex flex-col gap-space-md">
                  {/* Dynamic Header Box based on Mode */}
                  {isRetrievalMode ? (
                    /* RETRIEVAL MODE ACTIONS & PASSAGES */
                    <div className="p-space-md bg-tertiary-fixed/30 rounded-xl border border-tertiary/20 flex flex-col gap-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 text-tertiary font-label text-xs font-bold uppercase tracking-wider">
                          <span className="material-symbols-outlined text-[18px]">library_books</span>
                          <span>Extracted Textbook Passages (No LLM Composition)</span>
                        </div>

                        {/* Direct Export & Copy Options */}
                        <div className="flex items-center gap-1 flex-wrap">
                          <button
                            onClick={() => handleCopyCode(message.content)}
                            className="px-2 py-1 rounded-lg bg-surface-container-lowest text-on-surface hover:text-primary text-[11px] font-label font-semibold border border-outline-variant/30 flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[13px]">content_copy</span>
                            <span>Copy Text</span>
                          </button>
                          <button
                            onClick={() => handleExportText(message.content, 'textbook_passages.txt')}
                            className="px-2 py-1 rounded-lg bg-surface-container-lowest text-on-surface hover:text-primary text-[11px] font-label font-semibold border border-outline-variant/30 flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[13px]">download</span>
                            <span>Export TXT</span>
                          </button>
                          <button
                            onClick={() => handleExportText(message.content, 'textbook_passages.md')}
                            className="px-2 py-1 rounded-lg bg-surface-container-lowest text-on-surface hover:text-primary text-[11px] font-label font-semibold border border-outline-variant/30 flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[13px]">article</span>
                            <span>Export MD</span>
                          </button>
                          <button
                            onClick={() => handleCopyChatGPT(message.content)}
                            className="px-2.5 py-1 rounded-lg bg-tertiary text-on-tertiary hover:bg-tertiary-container text-[11px] font-label font-bold flex items-center gap-1 shadow-xs"
                          >
                            <span className="material-symbols-outlined text-[13px]">send</span>
                            <span>{copiedExport === 'chatgpt' ? 'Prompt Copied!' : 'Prompt for ChatGPT'}</span>
                          </button>
                        </div>
                      </div>
                      <p className="font-body text-xs text-on-surface-variant leading-relaxed">
                        Below are the exact passages retrieved directly from your indexed textbooks and materials with book, chapter, and page citations.
                      </p>
                    </div>
                  ) : isExplainMode ? (
                    /* EXPLAIN MODE CALLOUT */
                    <div className="bg-secondary-fixed/30 rounded-xl p-3 sm:p-space-md border-l-4 border-secondary">
                      <div className="flex items-center gap-1.5 text-secondary font-label text-xs font-bold uppercase tracking-wider mb-1">
                        <span className="material-symbols-outlined text-[18px]">psychology</span>
                        <span>Mode 2: Tutor Explanation &amp; Analogies</span>
                      </div>
                      <p className="font-body text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                        Concepts simplified with real-world metaphors, step-by-step intuition, and follow-up conceptual check questions.
                      </p>
                    </div>
                  ) : (
                    /* EXAM MODE CALLOUT */
                    <div className="bg-primary-fixed/30 rounded-xl p-3 sm:p-space-md border-l-4 border-primary">
                      <div className="flex items-center justify-between flex-wrap gap-1 mb-1">
                        <div className="flex items-center gap-1.5 text-primary font-label text-xs font-bold uppercase tracking-wider">
                          <span className="material-symbols-outlined text-[18px]">school</span>
                          <span>Mode 1: Exam-Ready Study Answer ({message.examMarksFormat || '13-Mark'})</span>
                        </div>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-bold">
                          Formal Syllabus Format
                        </span>
                      </div>
                      <p className="font-body text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                        Engineered with formal definitions, core keywords, architectural diagrams, algorithms, and textbook citations.
                      </p>
                    </div>
                  )}

                  {/* Render Message Body Markdown */}
                  <div className="font-body text-xs sm:text-sm text-on-surface leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </div>

                  {/* Grounding Sources Chips Bar */}
                  {message.citations && message.citations.length > 0 && (
                    <div className="p-2 sm:p-space-sm bg-surface-container-low/70 rounded-xl border border-outline-variant/30">
                      <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-primary text-[16px]">auto_stories</span>
                          <span className="font-label text-xs font-semibold text-on-surface">
                            Retrieved Textbook Passages &amp; Citations
                          </span>
                          <span className="px-1.5 py-0.2 rounded-full bg-primary-fixed text-on-primary-fixed text-[10px] font-mono font-bold">
                            {message.citations.length} Sources
                          </span>
                        </div>
                        <span className="text-[10px] font-label text-outline">
                          {message.searchScope === 'textbook_only'
                            ? 'Primary Textbooks'
                            : message.searchScope === 'materials_only'
                            ? 'Student Materials'
                            : 'Textbooks + Student Materials'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {message.citations.map((cit, citIdx) => (
                          <div
                            key={cit.id}
                            onClick={() => {
                              setSelectedCitation(cit);
                              setIsDocDrawerOpen(true);
                            }}
                            className="flex items-center justify-between p-2 rounded-lg bg-surface-container-lowest border border-outline-variant/30 hover:border-primary/50 transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="material-symbols-outlined text-primary text-[15px] flex-shrink-0">
                                menu_book
                              </span>
                              <div className="min-w-0">
                                <span
                                  className="font-label text-[11px] font-medium text-on-surface truncate block group-hover:text-primary transition-colors"
                                  title={cit.docTitle}
                                >
                                  {cit.docTitle}
                                </span>
                                <span className="text-[10px] text-outline font-label truncate block">
                                  {cit.chapter || cit.pageOrSection}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold flex-shrink-0 ml-1">
                              Rank #{citIdx + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Card bottom actions */}
                  <div className="flex items-center justify-between pt-1 border-t border-surface-container flex-wrap gap-2 text-xs font-label">
                    <div className="flex items-center gap-1">
                      <button
                        className="p-1 rounded text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
                        title="Helpful"
                      >
                        <span className="material-symbols-outlined text-[16px]">thumb_up</span>
                      </button>
                      <button
                        className="p-1 rounded text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
                        title="Needs improvement"
                      >
                        <span className="material-symbols-outlined text-[16px]">thumb_down</span>
                      </button>
                      <span className="text-outline mx-0.5">•</span>
                      <button
                        onClick={regenerateResponse}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">refresh</span>
                        <span>Regenerate</span>
                      </button>
                    </div>

                    <button
                      onClick={() => setIsDocDrawerOpen(!isDocDrawerOpen)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-primary text-on-primary font-label text-xs font-semibold shadow-xs hover:bg-primary-container transition-all"
                    >
                      <span className="material-symbols-outlined text-[15px]">description</span>
                      <span>Textbook Inspector ({message.citations?.length || 0})</span>
                      <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                    </button>
                  </div>
                </div>

                {/* Suggested prompt chips */}
                <div className="flex flex-col gap-1 ml-1 sm:ml-2">
                  <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-label text-outline uppercase font-semibold">
                    <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                    <span>Sample Inquiries in Different Modes</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {sampleSuggestions.map((sug, idx) => (
                      <button
                        key={idx}
                        onClick={() => sendMessage(sug.text)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-body text-xs transition-all shadow-xs text-left border border-outline-variant/20 max-w-full"
                      >
                        <span className="material-symbols-outlined text-primary text-[15px] flex-shrink-0">
                          {sug.icon}
                        </span>
                        <span className="line-clamp-1">{sug.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        }))}
      </main>

      {/* Sticky Bottom Prompt Input Bar */}
      <div className="sticky bottom-0 z-20">
        <PromptInput />
      </div>
    </>
  )}

      {/* Slide-over Right Drawer for Citations & Retrieved Documents */}
      <DocumentViewer />
    </div>
  );
};
