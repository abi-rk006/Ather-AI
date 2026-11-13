import React, { useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useApp } from '../../context/AppContext';
import type { LLMProvider } from '../../types';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, saveSettings, resetSettings, testConnection, isSaved } = useSettings();
  const { isSidebarOpen } = useApp();

  const [showPrimaryKey, setShowPrimaryKey] = useState(false);
  const [isTestingPrimary, setIsTestingPrimary] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);
  const [customModelInput, setCustomModelInput] = useState(false);

  const presets: { id: LLMProvider; label: string; icon: string; url: string; defaultModel: string; note: string }[] = [
    {
      id: 'groq',
      label: 'Groq Cloud',
      icon: 'bolt',
      url: 'https://api.groq.com/openai/v1',
      defaultModel: 'llama-3.3-70b-versatile',
      note: 'Ultra-fast cloud LPU inference (>250 tokens/sec)',
    },
    {
      id: 'lmstudio',
      label: 'Local LM Studio',
      icon: 'laptop_mac',
      url: 'http://localhost:1234/v1',
      defaultModel: 'local-model',
      note: 'Runs on localhost:1234 in LM Studio (100% offline & private)',
    },
    {
      id: 'ollama',
      label: 'Local Ollama',
      icon: 'terminal',
      url: 'http://localhost:11434/v1',
      defaultModel: 'llama3.2',
      note: 'Runs locally on port 11434 via Ollama daemon',
    },
    {
      id: 'custom',
      label: 'Remote / Custom URL',
      icon: 'link',
      url: 'http://localhost:1234/v1',
      defaultModel: 'local-model',
      note: 'Any HTTP or HTTPS link of an LLM running on another machine',
    },
    {
      id: 'openai',
      label: 'OpenAI',
      icon: 'psychology',
      url: 'https://api.openai.com/v1',
      defaultModel: 'gpt-4o',
      note: 'Official OpenAI API (GPT-4o, GPT-4o-mini)',
    },
    {
      id: 'gemini',
      label: 'Google Gemini',
      icon: 'auto_awesome',
      url: 'https://generativelanguage.googleapis.com/v1beta/openai',
      defaultModel: 'gemini-2.0-flash',
      note: 'Gemini 2.0 Flash / 1.5 Pro via OpenAI API endpoint',
    },
  ];

  const modelOptionsByProvider: Record<LLMProvider, { label: string; value: string }[]> = {
    groq: [
      { label: 'Llama 3.3 70B Versatile (Recommended - 128k context)', value: 'llama-3.3-70b-versatile' },
      { label: 'Llama 3.1 8B Instant (Ultra-fast - 128k context)', value: 'llama-3.1-8b-instant' },
      { label: 'DeepSeek R1 Distill Llama 70B', value: 'deepseek-r1-distill-llama-70b' },
      { label: 'Mixtral 8x7B (32k context)', value: 'mixtral-8x7b-32768' },
    ],
    lmstudio: [
      { label: 'local-model (Active model loaded in LM Studio)', value: 'local-model' },
      { label: 'llama-3.2-3b-instruct', value: 'llama-3.2-3b-instruct' },
      { label: 'mistral-7b-instruct', value: 'mistral-7b-instruct' },
      { label: 'qwen2.5-coder-7b', value: 'qwen2.5-coder-7b' },
    ],
    ollama: [
      { label: 'llama3.2 (Meta Llama 3.2)', value: 'llama3.2' },
      { label: 'mistral (Mistral 7B)', value: 'mistral' },
      { label: 'deepseek-r1:8b', value: 'deepseek-r1:8b' },
      { label: 'qwen2.5:7b', value: 'qwen2.5:7b' },
    ],
    openai: [
      { label: 'GPT-4o (Omni - Flagship Multimodal)', value: 'gpt-4o' },
      { label: 'GPT-4o-mini (Lightweight & Fast)', value: 'gpt-4o-mini' },
      { label: 'o3-mini (High-reasoning STEM)', value: 'o3-mini' },
    ],
    gemini: [
      { label: 'Gemini 2.0 Flash (Fastest Next-Gen)', value: 'gemini-2.0-flash' },
      { label: 'Gemini 1.5 Pro (1M+ Context)', value: 'gemini-1.5-pro' },
      { label: 'Gemini 1.5 Flash (Balanced)', value: 'gemini-1.5-flash' },
    ],
    custom: [
      { label: 'Custom Model (Specify below)', value: settings.selectedModel || 'custom-model' },
    ],
    anthropic: [
      { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet' },
      { label: 'Claude 3.5 Haiku', value: 'claude-3-5-haiku' },
    ],
  };

  const selectPreset = (p: typeof presets[0]) => {
    updateSettings({
      llmProvider: p.id,
      llmBaseUrl: p.url,
      selectedModel: p.defaultModel,
    });
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setIsTestingPrimary(true);
    setTestResult(null);
    try {
      const res = await testConnection(
        settings.primaryApiKey,
        settings.llmProvider,
        settings.llmBaseUrl,
        settings.selectedModel
      );
      setTestResult({
        success: res.success,
        message: res.message || (res.success ? 'Connected successfully!' : 'Endpoint unreachable'),
        latencyMs: res.latencyMs,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Verification error: Endpoint unreachable',
      });
    } finally {
      setIsTestingPrimary(false);
    }
  };

  const isLocalProvider = settings.llmProvider === 'lmstudio' || settings.llmProvider === 'ollama';

  return (
    <div
      className={`min-h-[calc(100vh-64px)] p-3 sm:p-space-lg max-w-4xl mx-auto flex flex-col gap-space-md sm:gap-space-lg transition-all duration-300 ${
        isSidebarOpen ? 'lg:pl-72' : 'pl-0'
      }`}
    >
      {/* Page Title */}
      <div>
        <h1 className="font-headline text-2xl sm:text-3xl font-bold text-on-surface">LLM Provider &amp; Model Settings</h1>
        <p className="font-body text-xs sm:text-sm text-on-surface-variant mt-1">
          Configure inference providers: choose Groq, local models via LM Studio or Ollama on localhost, or custom remote endpoints.
        </p>
      </div>

      {/* Section 1: LLM Provider & Inference Endpoint */}
      <section className="p-space-md sm:p-space-lg rounded-2xl bg-surface-container-lowest shadow-sm border border-outline-variant/20 flex flex-col gap-space-md">
        <div className="flex items-center justify-between pb-space-xs border-b border-surface-container">
          <div className="flex items-center gap-space-sm">
            <div className="w-9 h-9 rounded-xl bg-primary-fixed flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">smart_toy</span>
            </div>
            <div>
              <h2 className="font-headline text-base font-bold text-on-surface">
                LLM Provider Selection
              </h2>
              <p className="font-body text-xs text-on-surface-variant">
                Select your LLM inference engine or connect to a local / remote server.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-label text-[11px] font-semibold uppercase tracking-wide">
            {settings.llmProvider || 'groq'}
          </span>
        </div>

        {/* Quick Presets Grid */}
        <div className="flex flex-col gap-2">
          <label className="font-label text-xs font-semibold text-on-surface">Quick Provider Presets</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {presets.map((p) => {
              const isSelected = settings.llmProvider === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectPreset(p)}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                    isSelected
                      ? 'bg-primary/5 border-primary ring-2 ring-primary/20 shadow-xs'
                      : 'bg-surface-container-low border-outline-variant/30 hover:bg-surface-container'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="material-symbols-outlined text-[20px] text-primary">{p.icon}</span>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <span className="font-label text-xs font-bold text-on-surface mt-1">{p.label}</span>
                  <span className="text-[10px] text-outline line-clamp-1">{p.note}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Endpoint Base URL Input */}
        <div className="flex flex-col gap-1.5 pt-1">
          <label className="font-label text-xs font-semibold text-on-surface flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span>Inference Base URL (OpenAI-compatible)</span>
              {isLocalProvider && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  Localhost
                </span>
              )}
            </span>
            <span className="text-[11px] font-mono text-outline">
              Target endpoint for /chat/completions
            </span>
          </label>
          <div className="relative flex items-center">
            <input
              type="text"
              value={settings.llmBaseUrl || ''}
              onChange={(e) => updateSettings({ llmBaseUrl: e.target.value })}
              placeholder={
                settings.llmProvider === 'lmstudio'
                  ? 'http://localhost:1234/v1'
                  : settings.llmProvider === 'ollama'
                  ? 'http://localhost:11434/v1'
                  : 'https://api.groq.com/openai/v1 or https://remote-server:1234/v1'
              }
              className="w-full pl-3.5 pr-28 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-mono text-xs outline-none focus:ring-2 focus:ring-primary/20 border border-outline-variant/20"
            />
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTestingPrimary}
              className="absolute right-2 px-3 py-1 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-label text-xs font-semibold transition-all shadow-xs disabled:opacity-60"
            >
              {isTestingPrimary ? 'Testing...' : 'Test Connection'}
            </button>
          </div>

          {/* Connection Test Output Banner */}
          {testResult && (
            <div
              className={`p-2.5 rounded-xl text-xs font-mono flex items-start gap-2 border mt-1 ${
                testResult.success
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">
                {testResult.success ? 'check_circle' : 'error'}
              </span>
              <div className="flex-1">
                <span>{testResult.message}</span>
                {testResult.latencyMs !== undefined && testResult.latencyMs > 0 && (
                  <span className="ml-2 font-bold opacity-80">({testResult.latencyMs}ms response time)</span>
                )}
              </div>
            </div>
          )}

          {/* Context help text based on selected provider */}
          <div className="text-[11px] text-outline flex items-center gap-1.5 mt-0.5">
            <span className="material-symbols-outlined text-[14px]">info</span>
            {settings.llmProvider === 'lmstudio' && (
              <span>Start the local inference server in LM Studio on port <strong>1234</strong> (default: <code>http://localhost:1234/v1</code>).</span>
            )}
            {settings.llmProvider === 'ollama' && (
              <span>Ensure Ollama is running in background (default: <code>http://localhost:11434/v1</code>).</span>
            )}
            {settings.llmProvider === 'groq' && (
              <span>Powered by Groq Cloud LPU (<code>https://api.groq.com/openai/v1</code>). Ultra-fast syllabus generation.</span>
            )}
            {settings.llmProvider === 'custom' && (
              <span>Enter any <code>http://...</code> or <code>https://...</code> endpoint of an LLM running on your local network or cloud node.</span>
            )}
          </div>
        </div>

        {/* Primary API Key */}
        <div className="flex flex-col gap-1.5 pt-1">
          <label className="font-label text-xs font-semibold text-on-surface flex items-center justify-between">
            <span>
              API Key {isLocalProvider ? '(Optional for Localhost / LM Studio)' : '(Required for Cloud Inference)'}
            </span>
            {isLocalProvider && (
              <span className="text-[10px] text-outline font-medium">Local models typically don't require an API key</span>
            )}
          </label>
          <div className="relative flex items-center">
            <input
              type={showPrimaryKey ? 'text' : 'password'}
              value={settings.primaryApiKey}
              onChange={(e) => updateSettings({ primaryApiKey: e.target.value })}
              placeholder={isLocalProvider ? 'Not needed (leave blank or any text)' : 'gsk_... or sk-proj-...'}
              className="w-full pl-3.5 pr-12 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-mono text-xs outline-none focus:ring-2 focus:ring-primary/20 border border-outline-variant/20"
            />
            <button
              type="button"
              onClick={() => setShowPrimaryKey(!showPrimaryKey)}
              className="absolute right-2.5 p-1 rounded-lg text-outline hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-[16px]">
                {showPrimaryKey ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Section 2: Model Selection & Sampling Controls */}
      <section className="p-space-md sm:p-space-lg rounded-2xl bg-surface-container-lowest shadow-sm border border-outline-variant/20 flex flex-col gap-space-md">
        <div className="flex items-center justify-between pb-space-xs border-b border-surface-container">
          <div className="flex items-center gap-space-sm">
            <div className="w-9 h-9 rounded-xl bg-secondary-fixed flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[20px]">psychology</span>
            </div>
            <div>
              <h2 className="font-headline text-base font-bold text-on-surface">Model Identifier &amp; Sampling</h2>
              <p className="font-body text-xs text-on-surface-variant">
                Select or specify the model name to dispatch inference to.
              </p>
            </div>
          </div>
          <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-bold">
            {settings.selectedModel}
          </span>
        </div>

        {/* Model dropdown / input */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="font-label text-xs font-semibold text-on-surface">Target Model Name</label>
            <button
              type="button"
              onClick={() => setCustomModelInput(!customModelInput)}
              className="text-xs text-primary hover:underline font-label flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">edit</span>
              <span>{customModelInput ? 'Select from list' : 'Type custom model name'}</span>
            </button>
          </div>

          {customModelInput ? (
            <input
              type="text"
              value={settings.selectedModel}
              onChange={(e) => updateSettings({ selectedModel: e.target.value })}
              placeholder="e.g. llama-3.3-70b-versatile, local-model, qwen2.5-coder-7b..."
              className="w-full px-space-md py-2.5 rounded-xl bg-surface-container-low text-on-surface font-mono text-xs outline-none border border-outline-variant/30"
            />
          ) : (
            <select
              value={settings.selectedModel}
              onChange={(e) => updateSettings({ selectedModel: e.target.value })}
              className="w-full px-space-md py-2.5 rounded-xl bg-surface-container-low text-on-surface font-label text-xs outline-none border border-outline-variant/30 cursor-pointer"
            >
              {(modelOptionsByProvider[settings.llmProvider] || modelOptionsByProvider.groq).map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          )}

          <span className="text-[11px] text-outline font-label">
            {settings.llmProvider === 'lmstudio'
              ? 'For LM Studio, use "local-model" or the identifier shown in LM Studio\'s developer tab.'
              : 'Sent in the payload `model` field to the LLM endpoint.'}
          </span>
        </div>

        {/* Temperature & Profile Mode */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md pt-1">
          {/* Temperature Slider */}
          <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-2 border border-outline-variant/20">
            <div className="flex items-center justify-between">
              <label className="font-label text-xs font-semibold text-on-surface flex items-center gap-1">
                <span>Inference Temperature</span>
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
              <span>1.0 (Creative / Exploratory)</span>
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
                Configure default answering mode, textbook search scope, and hybrid fusion weights.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-label text-[11px] font-semibold">
            Qdrant Docker Vector Store
          </span>
        </div>

        {/* Mode Defaults */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
          <div className="flex flex-col gap-1.5">
            <label className="font-label text-xs font-semibold text-on-surface">Default Answering Mode</label>
            <select
              value={settings.defaultAnsweringMode}
              onChange={(e) => updateSettings({ defaultAnsweringMode: e.target.value as any })}
              className="w-full px-space-md py-2.5 rounded-xl bg-surface-container-low text-on-surface font-label text-xs outline-none border border-outline-variant/30 cursor-pointer"
            >
              <option value="exam">Exam Mode (Anna University 2-Mark &amp; 13-Mark)</option>
              <option value="explain">Explain Mode (Socratic Intuition &amp; Metaphor)</option>
              <option value="retrieval">Retrieval Mode (Zero-Hallucination Textbook Quotation)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-label text-xs font-semibold text-on-surface">Default Search Scope</label>
            <select
              value={settings.defaultSearchScope}
              onChange={(e) => updateSettings({ defaultSearchScope: e.target.value as any })}
              className="w-full px-space-md py-2.5 rounded-xl bg-surface-container-low text-on-surface font-label text-xs outline-none border border-outline-variant/30 cursor-pointer"
            >
              <option value="textbook_and_materials">Textbook + Uploaded Materials</option>
              <option value="textbook_only">Authorized Textbook Only</option>
              <option value="materials_only">My Uploaded Materials Only</option>
            </select>
          </div>
        </div>
      </section>

      {/* Bottom Save / Reset Action Bar */}
      <div className="pt-space-sm pb-space-lg flex flex-col sm:flex-row sm:items-center justify-between gap-space-md border-t border-surface-container-high">
        <div className="flex items-center gap-2 text-on-surface-variant">
          <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
          <span className="font-body text-xs">
            Settings are saved locally and synced with your active session.
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
