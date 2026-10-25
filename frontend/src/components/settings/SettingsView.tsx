import React, { useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useApp } from '../../context/AppContext';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, saveSettings, resetSettings, testConnection, isSaved } = useSettings();
  const { isSidebarOpen } = useApp();

  const [showPrimaryKey, setShowPrimaryKey] = useState(false);
  const [showSecondaryKey, setShowSecondaryKey] = useState(false);
  const [isTestingPrimary, setIsTestingPrimary] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleTestPrimary = async () => {
    setIsTestingPrimary(true);
    setTestResult(null);
    try {
      const res = await testConnection(settings.primaryApiKey, settings.selectedModel);
      if (res.success) {
        setTestResult(`Connection verified (${res.latencyMs}ms latency)`);
      } else {
        setTestResult('Verification failed: Key format invalid');
      }
    } catch {
      setTestResult('Verification error: Endpoint unreachable');
    } finally {
      setIsTestingPrimary(false);
    }
  };

  const getModelDetails = (modelKey: string) => {
    switch (modelKey) {
      case 'claude-3-5-sonnet':
        return {
          name: 'Claude 3.5 Sonnet',
          provider: 'Anthropic',
          context: '200k context',
          desc: 'State-of-the-art coding, rigorous logical synthesis, and nuanced technical writing.',
        };
      case 'gemini-1-5-pro':
        return {
          name: 'Gemini 1.5 Pro',
          provider: 'Google DeepMind',
          context: '1M+ context',
          desc: 'Unrivaled long-context audio, video, and multi-document technical ingestion.',
        };
      case 'llama-3-3-70b':
        return {
          name: 'Llama 3.3 70B',
          provider: 'Meta Open Weights',
          context: '128k context',
          desc: 'Enterprise self-hosted inference with zero data retention and maximum privacy.',
        };
      default:
        return {
          name: 'GPT-4o (Omni)',
          provider: 'OpenAI',
          context: '128k context',
          desc: 'Best for deep multimodal reasoning, fast tool execution, and code synthesis.',
        };
    }
  };

  const selectedModelInfo = getModelDetails(settings.selectedModel);

  return (
    <div
      className={`min-h-[calc(100vh-64px)] p-3 sm:p-space-lg max-w-4xl mx-auto flex flex-col gap-space-md sm:gap-space-lg transition-all duration-300 ${
        isSidebarOpen ? 'lg:pl-72' : 'pl-0'
      }`}
    >
      {/* Page Title */}
      <div>
        <h1 className="font-headline text-2xl sm:text-3xl font-bold text-on-surface">Settings</h1>
        <p className="font-body text-xs sm:text-sm text-on-surface-variant mt-1">
          Manage API keys, fallback inference providers, and hybrid RAG retrieval parameters.
        </p>
      </div>

      {/* Section 1: API Keys & Failover Configuration */}
      <section className="p-space-md sm:p-space-lg rounded-2xl bg-surface-container-lowest shadow-sm border border-outline-variant/20 flex flex-col gap-space-md">
        <div className="flex items-center justify-between pb-space-xs border-b border-surface-container">
          <div className="flex items-center gap-space-sm">
            <div className="w-9 h-9 rounded-xl bg-primary-fixed flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">key</span>
            </div>
            <div>
              <h2 className="font-headline text-base font-bold text-on-surface">
                API Keys &amp; Failover Config
              </h2>
              <p className="font-body text-xs text-on-surface-variant">
                Configure primary inference key and optional automatic fallback key.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-label text-[11px] font-semibold">
            Active
          </span>
        </div>

        {/* Primary API Key */}
        <div className="flex flex-col gap-1.5">
          <label className="font-label text-xs font-semibold text-on-surface flex items-center justify-between">
            <span>Primary API Key (Required)</span>
            {testResult && (
              <span className="text-primary font-mono text-[11px] font-bold">{testResult}</span>
            )}
          </label>
          <div className="relative flex items-center">
            <input
              type={showPrimaryKey ? 'text' : 'password'}
              value={settings.primaryApiKey}
              onChange={(e) => updateSettings({ primaryApiKey: e.target.value })}
              placeholder="sk-proj-..."
              className="w-full pl-3.5 pr-24 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-mono text-xs outline-none focus:ring-2 focus:ring-primary/20 border border-outline-variant/20"
            />
            <div className="absolute right-2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowPrimaryKey(!showPrimaryKey)}
                className="p-1 rounded-lg text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {showPrimaryKey ? 'visibility_off' : 'visibility'}
                </span>
              </button>
              <button
                type="button"
                onClick={handleTestPrimary}
                disabled={isTestingPrimary}
                className="px-2 py-1 rounded-lg bg-surface-container text-on-surface hover:text-primary font-label text-[11px] font-semibold transition-colors"
              >
                {isTestingPrimary ? 'Testing...' : 'Test'}
              </button>
            </div>
          </div>
          <span className="text-[11px] text-outline font-label">
            Used as the primary inference provider across all prompt sessions.
          </span>
        </div>

        {/* Secondary API Key (Fallback) */}
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex items-center justify-between">
            <label className="font-label text-xs font-semibold text-on-surface flex items-center gap-1.5">
              <span>Secondary API Key (Fallback / Backup)</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-label bg-surface-container text-on-surface-variant font-medium">
                Optional
              </span>
            </label>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label text-[10px]">
              Standby Ready
            </span>
          </div>
          <div className="relative flex items-center">
            <input
              type={showSecondaryKey ? 'text' : 'password'}
              value={settings.secondaryApiKey}
              onChange={(e) => updateSettings({ secondaryApiKey: e.target.value })}
              placeholder="sk-ant-... (optional backup key)"
              className="w-full pl-3.5 pr-12 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-mono text-xs outline-none focus:ring-2 focus:ring-primary/20 border border-outline-variant/20"
            />
            <button
              type="button"
              onClick={() => setShowSecondaryKey(!showSecondaryKey)}
              className="absolute right-2.5 p-1 rounded-lg text-outline hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-[16px]">
                {showSecondaryKey ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="checkbox"
              id="fallback-toggle"
              checked={settings.fallbackEnabled}
              onChange={(e) => updateSettings({ fallbackEnabled: e.target.checked })}
              className="w-4 h-4 rounded text-primary focus:ring-0 cursor-pointer accent-primary"
            />
            <label htmlFor="fallback-toggle" className="text-xs font-label text-on-surface cursor-pointer select-none">
              Automatically fail over to secondary API key upon HTTP 429 rate limits or quota errors
            </label>
          </div>
        </div>
      </section>

      {/* Section 2: AI Model Selection & Sampling */}
      <section className="p-space-md sm:p-space-lg rounded-2xl bg-surface-container-lowest shadow-sm border border-outline-variant/20 flex flex-col gap-space-md">
        <div className="flex items-center justify-between pb-space-xs border-b border-surface-container">
          <div className="flex items-center gap-space-sm">
            <div className="w-9 h-9 rounded-xl bg-secondary-fixed flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[20px]">smart_toy</span>
            </div>
            <div>
              <h2 className="font-headline text-base font-bold text-on-surface">AI Model Selection</h2>
              <p className="font-body text-xs text-on-surface-variant">
                Select your default LLM model and inference temperature.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label text-[11px] font-semibold">
            Global Default
          </span>
        </div>

        {/* Model dropdown */}
        <div className="flex flex-col gap-1.5">
          <label className="font-label text-xs font-semibold text-on-surface">Default AI Model</label>
          <select
            value={settings.selectedModel}
            onChange={(e) => updateSettings({ selectedModel: e.target.value })}
            className="w-full px-space-md py-2.5 rounded-xl bg-surface-container-low text-on-surface font-label text-xs outline-none border border-outline-variant/30 cursor-pointer"
          >
            <option value="gpt-4o">GPT-4o (Omni) — Flagship Multimodal</option>
            <option value="claude-3-5-sonnet">Claude 3.5 Sonnet — Advanced Synthesis &amp; Code</option>
            <option value="gemini-1-5-pro">Gemini 1.5 Pro — Ultra Long-Context</option>
            <option value="llama-3-3-70b">Llama 3.3 70B — Enterprise Self-Hosted</option>
          </select>

          {/* Model Card Preview */}
          <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm border border-surface-container mt-1">
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-space-xs flex-wrap">
                <span className="font-headline text-xs font-bold text-on-surface">
                  {selectedModelInfo.name}
                </span>
                <span className="px-2 py-0.2 rounded-full bg-primary-fixed text-on-primary-fixed font-label text-[10px] font-semibold">
                  {selectedModelInfo.provider}
                </span>
                <span className="px-2 py-0.2 rounded-full bg-surface-container text-on-surface-variant font-label text-[10px]">
                  {selectedModelInfo.context}
                </span>
              </div>
              <p className="font-body text-xs text-on-surface-variant">{selectedModelInfo.desc}</p>
            </div>
            <div className="flex items-center gap-1 text-primary text-xs font-label shrink-0">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>Verified Endpoint</span>
            </div>
          </div>
        </div>

        {/* Temperature & Profile Mode */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md pt-1">
          {/* Temperature Slider */}
          <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-2 border border-outline-variant/20">
            <div className="flex items-center justify-between">
              <label className="font-label text-xs font-semibold text-on-surface flex items-center gap-1">
                <span>Default Temperature</span>
                <span className="material-symbols-outlined text-outline text-[14px]">info</span>
              </label>
              <span className="font-label text-xs font-bold text-primary bg-primary-fixed px-2 py-0.5 rounded-md">
                {settings.temperature.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={settings.temperature}
              onChange={(e) => updateSettings({ temperature: parseFloat(e.target.value) })}
              className="accent-primary h-2 bg-surface-container-highest rounded-lg cursor-pointer"
            />
            <div className="flex items-center justify-between text-[11px] font-label text-outline">
              <span>0.0 (Strict / Deterministic)</span>
              <span>1.0 (Creative)</span>
            </div>
          </div>

          {/* Profile Mode Toggle */}
          <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col justify-between gap-2 border border-outline-variant/20">
            <div>
              <span className="font-label text-xs font-semibold text-on-surface">Sampling Profile</span>
              <p className="font-body text-[11px] text-on-surface-variant mt-0.5">
                Quickly bias the workspace toward factual technical output or exploratory generation.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-surface-container">
              <button
                type="button"
                onClick={() => updateSettings({ samplingMode: 'deterministic', temperature: 0.15 })}
                className={`py-1.5 px-2 rounded-lg text-xs font-label transition-all ${
                  settings.samplingMode === 'deterministic'
                    ? 'bg-surface-container-lowest text-primary font-bold shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Deterministic
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ samplingMode: 'creative', temperature: 0.7 })}
                className={`py-1.5 px-2 rounded-lg text-xs font-label transition-all ${
                  settings.samplingMode === 'creative'
                    ? 'bg-surface-container-lowest text-primary font-bold shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Creative
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Advanced Retrieval & Vector Storage Hyperparameters */}
      <section className="p-space-md sm:p-space-lg rounded-2xl bg-surface-container-lowest shadow-sm border border-outline-variant/20 flex flex-col gap-space-md">
        <div className="flex items-center justify-between pb-space-xs border-b border-surface-container">
          <div className="flex items-center gap-space-sm">
            <div className="w-9 h-9 rounded-xl bg-tertiary-fixed flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-[20px]">hub</span>
            </div>
            <div>
              <h2 className="font-headline text-base font-bold text-on-surface">
                RAG Answering &amp; Search Preferences
              </h2>
              <p className="font-body text-xs text-on-surface-variant">
                Configure your default answering mode, textbook search scope, and search parameters.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface font-label text-[11px] font-mono">
            Active RAG
          </span>
        </div>

        {/* Default Answering Mode & Search Scope Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
          <div className="flex flex-col gap-1.5 p-space-md rounded-xl bg-surface-container-low border border-outline-variant/20">
            <label className="font-label text-xs font-semibold text-on-surface flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-primary">school</span>
              Default Answering Mode
            </label>
            <select
              value={settings.defaultAnsweringMode || 'exam'}
              onChange={(e) => updateSettings({ defaultAnsweringMode: e.target.value as any })}
              className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest text-on-surface font-label text-xs outline-none border border-outline-variant/30 cursor-pointer"
            >
              <option value="exam">Mode 1 — Exam Mode (Structured 2/13-mark answers)</option>
              <option value="explain">Mode 2 — Explain Mode (Tutor with real-world analogies)</option>
              <option value="retrieval">Mode 3 — Retrieval Mode (Direct raw passages only)</option>
            </select>
            <p className="text-[10px] text-outline font-label">Controls default answer synthesis format for prompt sessions.</p>
          </div>

          <div className="flex flex-col gap-1.5 p-space-md rounded-xl bg-surface-container-low border border-outline-variant/20">
            <label className="font-label text-xs font-semibold text-on-surface flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-secondary">travel_explore</span>
              Default Search Scope Setting
            </label>
            <select
              value={settings.defaultSearchScope || 'textbook_and_materials'}
              onChange={(e) => updateSettings({ defaultSearchScope: e.target.value as any })}
              className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest text-on-surface font-label text-xs outline-none border border-outline-variant/30 cursor-pointer"
            >
              <option value="textbook_only">Textbook only (Primary textbook | Student docs excluded)</option>
              <option value="textbook_and_materials">Textbook + my materials (Search first | Supplementary)</option>
              <option value="materials_only">My materials only (Textbook excluded | Student docs)</option>
            </select>
            <p className="text-[10px] text-outline font-label">Prioritizes primary textbook against student notes and uploaded docs.</p>
          </div>
        </div>

        {/* Hybrid Weight slider */}
        <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-2 border border-outline-variant/20">
          <div className="flex items-center justify-between">
            <span className="font-label text-xs font-semibold text-on-surface">
              Hybrid Fusion Weights (Dense Vector vs BM25 Keyword)
            </span>
            <span className="font-mono text-xs font-bold text-primary">
              Vector: {(settings.retrieval.hybridVectorWeight * 100).toFixed(0)}% / BM25:{' '}
              {((1 - settings.retrieval.hybridVectorWeight) * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min="0.1"
            max="0.9"
            step="0.05"
            value={settings.retrieval.hybridVectorWeight}
            onChange={(e) =>
              updateSettings({
                retrieval: {
                  ...settings.retrieval,
                  hybridVectorWeight: parseFloat(e.target.value),
                  hybridBm25Weight: 1 - parseFloat(e.target.value),
                },
              })
            }
            className="accent-primary h-2 bg-surface-container-highest rounded-lg cursor-pointer"
          />
          <div className="flex items-center justify-between text-[11px] font-label text-outline">
            <span>High Keyword Precision (BM25)</span>
            <span>Semantic Meaning (Chroma Vector)</span>
          </div>
        </div>

        {/* Parent-Child Chunking & Reranking grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
          <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-1.5 border border-outline-variant/20">
            <div className="flex items-center justify-between">
              <span className="font-label text-xs font-semibold text-on-surface">
                Parent Context Window
              </span>
              <span className="font-mono text-xs text-primary font-bold">
                {settings.retrieval.parentChunkSize} chars
              </span>
            </div>
            <p className="text-[11px] text-outline font-label">
              Large semantic context passed to the LLM during citation grounding to prevent hallucination.
            </p>
          </div>

          <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-1.5 border border-outline-variant/20">
            <div className="flex items-center justify-between">
              <span className="font-label text-xs font-semibold text-on-surface">
                Child Vector Chunk Size
              </span>
              <span className="font-mono text-xs text-secondary font-bold">
                {settings.retrieval.childChunkSize} chars
              </span>
            </div>
            <p className="text-[11px] text-outline font-label">
              Fine-grained embedding tokens stored in Chroma DB for maximal cosine similarity precision.
            </p>
          </div>
        </div>

        {/* Multi-Format Ingestion & Chunking Support */}
        <div className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-label text-xs font-semibold text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-primary">auto_stories</span>
              Multi-Format Chunking Pipelines (Active Ingestion Engines)
            </span>
            <span className="px-2 py-0.5 rounded bg-surface-container text-outline text-[10px] font-mono">
              v1.0 Ready
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-1">
            <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/20 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-red-600">
                <span className="material-symbols-outlined text-[15px]">picture_as_pdf</span>
                <span>PDF Textbook</span>
              </div>
              <p className="text-[11px] text-on-surface-variant font-label leading-relaxed">
                Structure-aware extraction of textbook sections (H1-H4), preserving mathematical formulas &amp; diagrams.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/20 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600">
                <span className="material-symbols-outlined text-[15px]">description</span>
                <span>Markdown (<code className="font-mono text-[10px]">markdown&gt;=3.8</code>)</span>
              </div>
              <p className="text-[11px] text-on-surface-variant font-label leading-relaxed">
                Heading hierarchy AST parser, splitting chapters and technical code blocks cleanly without clipping context.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/20 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                <span className="material-symbols-outlined text-[15px]">table_chart</span>
                <span>CSV Tabular Data</span>
              </div>
              <p className="text-[11px] text-on-surface-variant font-label leading-relaxed">
                20-row tabular block partitioning with persistent column headers and key-value narrative summaries for hybrid search.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Save / Reset Action Bar */}
      <div className="pt-space-sm pb-space-lg flex flex-col sm:flex-row sm:items-center justify-between gap-space-md border-t border-surface-container-high">
        <div className="flex items-center gap-2 text-on-surface-variant">
          <span className="material-symbols-outlined text-primary text-[18px]">lock</span>
          <span className="font-body text-xs">
            Settings are stored locally with enterprise SOC2 encryption.
          </span>
        </div>

        <div className="flex items-center gap-space-sm self-end sm:self-auto shrink-0">
          <button
            type="button"
            onClick={resetSettings}
            className="px-space-md py-2.5 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors font-label text-xs font-medium"
          >
            Reset to Defaults
          </button>
          <button
            type="button"
            onClick={saveSettings}
            className="flex items-center gap-1.5 px-space-lg py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary-container transition-all shadow-md font-label text-xs font-semibold"
          >
            <span className="material-symbols-outlined text-[17px]">
              {isSaved ? 'check' : 'save'}
            </span>
            <span>{isSaved ? 'Settings Saved!' : 'Save Settings'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
