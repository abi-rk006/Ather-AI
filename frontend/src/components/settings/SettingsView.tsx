import React, { useState, useMemo } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useApp } from '../../context/AppContext';
import type { LLMProvider } from '../../types';
import { PROVIDER_MODEL_OPTIONS, POPULAR_CUSTOM_MODEL_SUGGESTIONS } from '../../constants/models';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, saveSettings, resetSettings, testConnection, isSaved } = useSettings();
  const { isSidebarOpen } = useApp();

  const [showPrimaryKey, setShowPrimaryKey] = useState(false);
  const [isTestingPrimary, setIsTestingPrimary] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);
  const [showSecondaryKey, setShowSecondaryKey] = useState(false);
  const [isTestingSecondary, setIsTestingSecondary] = useState(false);
  const [secondaryTestResult, setSecondaryTestResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);
  const [discoveredModels, setDiscoveredModels] = useState<string[]>([]);
  const [customModelInput, setCustomModelInput] = useState(() => {
    const list = PROVIDER_MODEL_OPTIONS[settings.llmProvider] || [];
    return settings.llmProvider === 'custom' || (Boolean(settings.selectedModel) && !list.some((m) => m.value === settings.selectedModel));
  });

  // Helper to extract host & port from a URL
  const parseBaseUrl = (url: string) => {
    try {
      const match = url.match(/https?:\/\/([^:/]+)(?::(\d+))?/i);
      if (match) {
        return { host: match[1], port: match[2] || '' };
      }
    } catch {
      // fallback
    }
    return { host: '', port: '' };
  };

  const initialParsed = parseBaseUrl(settings.llmBaseUrl || '');
  const [networkHost, setNetworkHost] = useState(
    initialParsed.host && initialParsed.host !== 'localhost' && initialParsed.host !== '127.0.0.1'
      ? initialParsed.host
      : ''
  );
  const [networkPort, setNetworkPort] = useState(
    initialParsed.port || (settings.llmProvider === 'ollama' ? '11434' : '1234')
  );

  const isLocalProvider = settings.llmProvider === 'lmstudio' || settings.llmProvider === 'ollama';

  const isNetworkHost = useMemo(() => {
    const url = (settings.llmBaseUrl || '').toLowerCase();
    return Boolean(
      url &&
      !url.includes('localhost') &&
      !url.includes('127.0.0.1') &&
      !url.includes('api.groq.com') &&
      !url.includes('integrate.api.nvidia.com') &&
      !url.includes('generativelanguage.googleapis.com') &&
      !url.includes('api.openai.com')
    );
  }, [settings.llmBaseUrl]);

  const applyNetworkHost = (host: string, port?: string) => {
    const p = port || networkPort || (settings.llmProvider === 'ollama' ? '11434' : '1234');
    const cleanHost = host.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const url = cleanHost
      ? `http://${cleanHost}:${p}/v1`
      : settings.llmProvider === 'ollama'
      ? 'http://localhost:11434/v1'
      : 'http://localhost:1234/v1';
    updateSettings({ llmBaseUrl: url });
  };

  const setLocalhostMode = () => {
    const defaultUrl = settings.llmProvider === 'ollama' ? 'http://localhost:11434/v1' : 'http://localhost:1234/v1';
    updateSettings({ llmBaseUrl: defaultUrl });
  };

  const presets: { id: LLMProvider; label: string; icon: string; url: string; defaultModel: string; note: string }[] = [
    {
      id: 'groq',
      label: 'Groq Cloud',
      icon: 'bolt',
      url: 'https://api.groq.com/openai/v1',
      defaultModel: 'qwen/qwen3.8-27b',
      note: 'Ultra-fast cloud LPU inference (>250 tokens/sec)',
    },
    {
      id: 'lmstudio',
      label: 'LM Studio (Local / LAN)',
      icon: 'laptop_mac',
      url: 'http://localhost:1234/v1',
      defaultModel: 'local-model',
      note: 'Runs on this PC or a neighbour PC over local network (port 1234)',
    },
    {
      id: 'ollama',
      label: 'Ollama (Local / LAN)',
      icon: 'terminal',
      url: 'http://localhost:11434/v1',
      defaultModel: 'llama3.2',
      note: 'Runs locally or over local network on port 11434',
    },
    {
      id: 'custom',
      label: 'Remote / Custom URL',
      icon: 'link',
      url: 'http://localhost:1234/v1',
      defaultModel: 'custom-model',
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
      defaultModel: 'gemini-2.5-flash',
      note: 'Gemini 2.5 Flash / 1.5 Flash via OpenAI API endpoint',
    },
    {
      id: 'nvidia',
      label: 'NVIDIA NIM',
      icon: 'memory',
      url: 'https://integrate.api.nvidia.com/v1',
      defaultModel: 'meta/llama-3.3-70b-instruct',
      note: 'NVIDIA API Catalog / NIM Cloud endpoints (integrate.api.nvidia.com)',
    },
  ];

  const selectPreset = (p: typeof presets[0]) => {
    updateSettings({
      llmProvider: p.id,
      llmBaseUrl: p.url,
      selectedModel: p.defaultModel,
    });
    if (p.id === 'custom') {
      setCustomModelInput(true);
    } else {
      setCustomModelInput(false);
    }
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
      if (res.modelsAvailable && res.modelsAvailable.length > 0) {
        setDiscoveredModels(res.modelsAvailable);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Verification error: Endpoint unreachable',
      });
    } finally {
      setIsTestingPrimary(false);
    }
  };

  const handleTestSecondaryConnection = async () => {
    setIsTestingSecondary(true);
    setSecondaryTestResult(null);
    try {
      const res = await testConnection(
        settings.secondaryApiKey,
        settings.secondaryProvider || settings.llmProvider,
        settings.secondaryBaseUrl || settings.llmBaseUrl,
        settings.secondaryModel || settings.selectedModel
      );
      setSecondaryTestResult({
        success: res.success,
        message: res.message || (res.success ? 'Secondary API & Model verified successfully!' : 'Endpoint unreachable with secondary configuration'),
        latencyMs: res.latencyMs,
      });
    } catch (err: any) {
      setSecondaryTestResult({
        success: false,
        message: err?.message || 'Verification error: Secondary API verification failed',
      });
    } finally {
      setIsTestingSecondary(false);
    }
  };

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

        {/* Network & Neighbour Mode Selector for Local & LAN LLMs */}
        {isLocalProvider && (
          <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">
                  {isNetworkHost ? 'lan' : 'laptop_mac'}
                </span>
                <div>
                  <h4 className="font-label text-xs font-bold text-on-surface">
                    {settings.llmProvider === 'lmstudio' ? 'LM Studio Host Location' : 'Ollama Host Location'}
                  </h4>
                  <p className="text-[11px] text-outline font-body">
                    Run model on your own PC or connect to a neighbour's machine over Wi-Fi / LAN.
                  </p>
                </div>
              </div>

              {/* Host Toggle Buttons */}
              <div className="flex items-center p-1 bg-surface-container rounded-xl border border-outline-variant/20">
                <button
                  type="button"
                  onClick={setLocalhostMode}
                  className={`px-3 py-1.5 rounded-lg text-xs font-label font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    !isNetworkHost
                      ? 'bg-surface text-primary shadow-xs font-bold'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">computer</span>
                  <span>This PC (localhost)</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyNetworkHost(networkHost || '192.168.1.', networkPort || (settings.llmProvider === 'ollama' ? '11434' : '1234'))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-label font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isNetworkHost
                      ? 'bg-surface text-primary shadow-xs font-bold'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">wifi_tethering</span>
                  <span>Neighbour's PC / Network (LAN)</span>
                </button>
              </div>
            </div>

            {/* When Neighbour / Network mode is selected */}
            {isNetworkHost && (
              <div className="flex flex-col gap-2.5 pt-2 border-t border-outline-variant/20">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-3 flex flex-col gap-1">
                    <label className="text-[11px] font-label font-semibold text-on-surface">
                      Neighbour's IP Address or Local Hostname
                    </label>
                    <input
                      type="text"
                      value={networkHost}
                      onChange={(e) => {
                        setNetworkHost(e.target.value);
                        applyNetworkHost(e.target.value, networkPort);
                      }}
                      placeholder="e.g. 192.168.1.50 or neighbour-pc.local"
                      className="w-full px-3 py-2 rounded-xl bg-surface text-on-surface font-mono text-xs outline-none border border-outline-variant/30 focus:border-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-label font-semibold text-on-surface">
                      Port
                    </label>
                    <input
                      type="text"
                      value={networkPort}
                      onChange={(e) => {
                        setNetworkPort(e.target.value);
                        applyNetworkHost(networkHost, e.target.value);
                      }}
                      placeholder={settings.llmProvider === 'ollama' ? '11434' : '1234'}
                      className="w-full px-3 py-2 rounded-xl bg-surface text-on-surface font-mono text-xs outline-none border border-outline-variant/30 focus:border-primary"
                    />
                  </div>
                </div>

                {/* Quick IP Prefix Helper Chips */}
                <div className="flex flex-wrap items-center gap-1 text-[11px]">
                  <span className="text-outline font-label text-[10px]">Quick IP prefix:</span>
                  {['192.168.1.', '192.168.0.', '10.0.0.', '172.16.0.'].map((prefix) => (
                    <button
                      key={prefix}
                      type="button"
                      onClick={() => {
                        setNetworkHost(prefix);
                        applyNetworkHost(prefix, networkPort);
                      }}
                      className="px-2 py-0.5 rounded-md bg-surface border border-outline-variant/30 text-on-surface hover:bg-surface-container font-mono text-[10px] cursor-pointer"
                    >
                      {prefix}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTestingPrimary}
                    className="ml-auto px-3 py-1 rounded-lg bg-primary text-on-primary hover:bg-primary-container text-xs font-label font-semibold flex items-center gap-1 transition-all shadow-xs cursor-pointer disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[15px]">radar</span>
                    <span>{isTestingPrimary ? 'Scanning...' : 'Discover Models on Neighbour PC'}</span>
                  </button>
                </div>

                {/* Step-by-Step Guide for the Neighbour */}
                <div className="p-3 rounded-xl bg-surface text-[11px] border border-outline-variant/20 flex flex-col gap-1.5 text-on-surface-variant">
                  <span className="font-semibold text-on-surface flex items-center gap-1 text-xs">
                    <span className="material-symbols-outlined text-[16px] text-primary">lightbulb</span>
                    <span>How your neighbour sets up LM Studio for network access:</span>
                  </span>
                  <div className="text-[11px] text-outline leading-relaxed space-y-1 pl-1">
                    <p>1. On their PC, open <strong>LM Studio</strong> &rarr; Click the <strong>Developer / Local Server</strong> icon (<code>&lt;-&gt;</code>) in the left navigation.</p>
                    <p>2. Select a model to load and click <strong>Start Server</strong>.</p>
                    <p>3. Check the box <strong>"Serve on Local Network"</strong> (this binds LM Studio to <code>0.0.0.0:1234</code> so devices on your Wi-Fi can connect).</p>
                    <p>4. Have them run <code>ipconfig</code> in Command Prompt to find their Wi-Fi IPv4 address (e.g. <code>192.168.1.100</code>).</p>
                    <p>5. Enter their IP in the box above and click <strong>Discover Models on Neighbour PC</strong>!</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Endpoint Base URL Input */}
        <div className="flex flex-col gap-1.5 pt-1">
          <label className="font-label text-xs font-semibold text-on-surface flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span>Inference Base URL (OpenAI-compatible)</span>
              {isLocalProvider && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isNetworkHost
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                }`}>
                  {isNetworkHost ? 'Network LAN (Neighbour)' : 'Localhost'}
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
                  ? 'http://localhost:1234/v1 or http://192.168.1.50:1234/v1'
                  : settings.llmProvider === 'ollama'
                  ? 'http://localhost:11434/v1 or http://192.168.1.50:11434/v1'
                  : 'https://api.groq.com/openai/v1 or https://remote-server:1234/v1'
              }
              className="w-full pl-3.5 pr-28 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-mono text-xs outline-none focus:ring-2 focus:ring-primary/20 border border-outline-variant/20"
            />
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTestingPrimary}
              className="absolute right-2 px-3 py-1 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-label text-xs font-semibold transition-all shadow-xs disabled:opacity-60 cursor-pointer"
            >
              {isTestingPrimary ? 'Testing...' : 'Test Connection'}
            </button>
          </div>

          {/* Connection Test Output Banner with Discovered Models */}
          {testResult && (
            <div
              className={`p-3 rounded-xl text-xs font-mono flex flex-col gap-2 border mt-1 ${
                testResult.success
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/40 dark:text-emerald-300'
                  : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/20 dark:border-rose-800/40 dark:text-rose-300'
              }`}
            >
              <div className="flex items-start gap-2">
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

              {/* Models discovered during connection test */}
              {discoveredModels.length > 0 && (
                <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/30 flex flex-col gap-1.5">
                  <span className="font-label text-[11px] font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">smart_toy</span>
                    <span>Discovered Models ({discoveredModels.length}) &mdash; Click to select:</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {discoveredModels.map((mId) => (
                      <button
                        key={mId}
                        type="button"
                        onClick={() => updateSettings({ selectedModel: mId })}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition-all cursor-pointer ${
                          settings.selectedModel === mId
                            ? 'bg-emerald-600 text-white border-emerald-700 font-bold shadow-xs'
                            : 'bg-white/80 dark:bg-surface-container-high text-on-surface hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border-emerald-300 dark:border-emerald-700/50'
                        }`}
                      >
                        {mId}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Context help text based on selected provider */}
          <div className="text-[11px] text-outline flex items-center gap-1.5 mt-0.5">
            <span className="material-symbols-outlined text-[14px]">info</span>
            {settings.llmProvider === 'lmstudio' && (
              <span>
                {isNetworkHost
                  ? 'Connected to neighbour machine via LAN. Make sure neighbour enabled "Serve on Local Network" on port 1234.'
                  : 'Start the local inference server in LM Studio on port 1234 (default: http://localhost:1234/v1).'}
              </span>
            )}
            {settings.llmProvider === 'ollama' && (
              <span>
                {isNetworkHost
                  ? 'Connected to neighbour Ollama instance on local network.'
                  : 'Ensure Ollama is running in background (default: http://localhost:11434/v1).'}
              </span>
            )}
            {settings.llmProvider === 'groq' && (
              <span>Powered by Groq Cloud LPU (<code>https://api.groq.com/openai/v1</code>). Ultra-fast syllabus generation.</span>
            )}
            {settings.llmProvider === 'nvidia' && (
              <span>Powered by NVIDIA NIM Cloud (<code>https://integrate.api.nvidia.com/v1</code>). Enter your <code>nvapi-...</code> key from build.nvidia.com.</span>
            )}
            {settings.llmProvider === 'gemini' && (
              <span>Powered by Google Gemini (<code>https://generativelanguage.googleapis.com/v1beta/openai</code>). Enter your Gemini API key.</span>
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
              Primary API Key {isLocalProvider ? '(Optional for Localhost / LM Studio)' : '(Required for Cloud Inference)'}
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
              placeholder={isLocalProvider ? 'Not needed (leave blank or any text)' : 'gsk_... or nvapi-... or sk-proj-...'}
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

        {/* Secondary / Fallback API Key & Failover Controls */}
        <div className="pt-2.5 border-t border-surface-container flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">swap_calls</span>
              <div>
                <span className="font-label text-xs font-semibold text-on-surface">
                  Secondary API &amp; Fallback Model Automatic Failover
                </span>
                <p className="font-body text-[11px] text-on-surface-variant">
                  Seamlessly failover to secondary API / fallback model if primary hits token limits (TPM / 413), rate limits (429), or is unavailable
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => updateSettings({ fallbackEnabled: !settings.fallbackEnabled })}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.fallbackEnabled ? 'bg-primary' : 'bg-surface-container-highest'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                settings.fallbackEnabled ? 'translate-x-4' : 'translate-x-0'
              }`}
              />
            </button>
          </div>

          {settings.fallbackEnabled && (
            <div className="flex flex-col gap-3 pt-2 pl-4 border-l-2 border-primary/30">
              {/* Secondary / Fallback Model Name */}
              <div className="flex flex-col gap-1.5">
                <label className="font-label text-xs font-semibold text-on-surface flex items-center justify-between">
                  <span>Secondary / Fallback Model Name</span>
                  <span className="text-[10px] text-outline font-medium">Activated when primary hits TPM token limits or 404</span>
                </label>
                <input
                  type="text"
                  value={settings.secondaryModel || ''}
                  onChange={(e) => updateSettings({ secondaryModel: e.target.value })}
                  placeholder="e.g. qwen/qwen3.8-27b, meta/llama-3.1-8b-instruct, gemini-2.5-flash..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-mono text-xs outline-none focus:ring-2 focus:ring-primary/20 border border-outline-variant/20"
                />
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-outline font-label">Quick fallback presets:</span>
                  {[
                    'qwen/qwen3.8-27b',
                    'meta/llama-3.1-8b-instruct',
                    'gemini-2.5-flash',
                    'gpt-4o-mini',
                    'llama3.2',
                  ].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => updateSettings({ secondaryModel: sug })}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-mono border transition-all cursor-pointer ${
                        settings.secondaryModel === sug
                          ? 'bg-secondary text-on-secondary border-secondary font-bold'
                          : 'bg-surface-container text-on-surface hover:bg-surface-container-high border-outline-variant/30'
                      }`}
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Secondary Base URL (Optional) */}
              <div className="flex flex-col gap-1.5">
                <label className="font-label text-xs font-semibold text-on-surface flex items-center justify-between">
                  <span>Secondary API Base URL (Optional)</span>
                  <span className="text-[10px] text-outline font-medium">Leave empty to use primary endpoint</span>
                </label>
                <input
                  type="text"
                  value={settings.secondaryBaseUrl || ''}
                  onChange={(e) => updateSettings({ secondaryBaseUrl: e.target.value })}
                  placeholder="e.g. http://localhost:1234/v1 or https://api.groq.com/openai/v1"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-mono text-xs outline-none focus:ring-2 focus:ring-primary/20 border border-outline-variant/20"
                />
              </div>

              {/* Secondary API Key */}
              <div className="flex flex-col gap-1.5">
                <label className="font-label text-xs font-semibold text-on-surface flex items-center justify-between">
                  <span>Secondary API Key</span>
                  <span className="text-[10px] text-outline font-medium">Automatic retry on 429 / 401 / 503 / 413</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showSecondaryKey ? 'text' : 'password'}
                    value={settings.secondaryApiKey || ''}
                    onChange={(e) => updateSettings({ secondaryApiKey: e.target.value })}
                    placeholder="gsk_..., nvapi-..., or backup API key"
                    className="w-full pl-3.5 pr-28 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-mono text-xs outline-none focus:ring-2 focus:ring-primary/20 border border-outline-variant/20"
                  />
                  <div className="absolute right-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowSecondaryKey(!showSecondaryKey)}
                      className="p-1 rounded-lg text-outline hover:text-on-surface"
                      title={showSecondaryKey ? 'Hide key' : 'Show key'}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {showSecondaryKey ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handleTestSecondaryConnection}
                      disabled={isTestingSecondary}
                      className="px-2.5 py-1 rounded-lg bg-secondary text-on-secondary hover:bg-secondary/90 font-label text-[11px] font-semibold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      {isTestingSecondary ? 'Testing...' : 'Test Secondary API'}
                    </button>
                  </div>
                </div>
              </div>

              {secondaryTestResult && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-mono flex items-start gap-2 border mt-1 ${
                    secondaryTestResult.success
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/40 dark:text-emerald-300'
                      : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/20 dark:border-rose-800/40 dark:text-rose-300'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">
                    {secondaryTestResult.success ? 'check_circle' : 'error'}
                  </span>
                  <div className="flex-1">
                    <span>{secondaryTestResult.message}</span>
                    {secondaryTestResult.latencyMs !== undefined && secondaryTestResult.latencyMs > 0 && (
                      <span className="ml-2 font-bold opacity-80">({secondaryTestResult.latencyMs}ms)</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
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
        <div className="flex flex-col gap-2">
          {(() => {
            const activeOptions = PROVIDER_MODEL_OPTIONS[settings.llmProvider] || PROVIDER_MODEL_OPTIONS.groq;
            const isCurrentInOptions = activeOptions.some((m) => m.value === settings.selectedModel);
            const suggestions = POPULAR_CUSTOM_MODEL_SUGGESTIONS[settings.llmProvider] || [];

            return (
              <>
                <div className="flex items-center justify-between">
                  <label className="font-label text-xs font-semibold text-on-surface flex items-center gap-1.5">
                    <span>Target Model Name</span>
                    {customModelInput && (
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                        Custom Input
                      </span>
                    )}
                  </label>
                  <button
                    type="button"
                    onClick={() => setCustomModelInput(!customModelInput)}
                    className="text-xs text-primary hover:underline font-label flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {customModelInput ? 'format_list_bulleted' : 'edit'}
                    </span>
                    <span>{customModelInput ? 'Switch to Preset List' : 'Type custom model name'}</span>
                  </button>
                </div>

                {customModelInput ? (
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      value={settings.selectedModel}
                      onChange={(e) => updateSettings({ selectedModel: e.target.value })}
                      placeholder={
                        settings.llmProvider === 'nvidia'
                          ? 'e.g. meta/llama-3.2-3b-instruct, nvidia/nemotron-4-340b-instruct, mistralai/mistral-large-2407...'
                          : settings.llmProvider === 'ollama'
                          ? 'e.g. llama3.2, deepseek-r1:8b, mistral, phi4...'
                          : settings.llmProvider === 'groq'
                          ? 'e.g. qwen/qwen3.8-27b, openai/gpt-oss-120b, allam-2-7b...'
                          : settings.llmProvider === 'gemini'
                          ? 'e.g. gemini-2.5-flash, gemini-2.5-pro, gemini-1.5-pro...'
                          : 'e.g. my-custom-model, meta-llama/Llama-3-70b-chat-hf...'
                      }
                      className="w-full px-space-md py-2.5 rounded-xl bg-surface-container-low text-on-surface font-mono text-xs outline-none border border-primary/40 focus:ring-2 focus:ring-primary/20"
                    />

                    {/* Quick suggestion chips */}
                    {suggestions.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="text-[10px] text-outline font-label">Popular alternatives:</span>
                        {suggestions.map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => updateSettings({ selectedModel: sug })}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-mono border transition-all cursor-pointer ${
                              settings.selectedModel === sug
                                ? 'bg-primary text-on-primary border-primary font-bold'
                                : 'bg-surface-container text-on-surface hover:bg-surface-container-high border-outline-variant/30'
                            }`}
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <select
                      value={settings.selectedModel}
                      onChange={(e) => {
                        if (e.target.value === '__custom__') {
                          setCustomModelInput(true);
                        } else {
                          updateSettings({ selectedModel: e.target.value });
                        }
                      }}
                      className="w-full px-space-md py-2.5 rounded-xl bg-surface-container-low text-on-surface font-label text-xs outline-none border border-outline-variant/30 cursor-pointer"
                    >
                      {/* If custom model was already typed in and is active */}
                      {!isCurrentInOptions && settings.selectedModel && (
                        <option value={settings.selectedModel}>
                          ✨ Custom: {settings.selectedModel} (Active)
                        </option>
                      )}
                      {activeOptions.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                      <option value="__custom__">
                        ➕ Custom Model (Enter your own model name)...
                      </option>
                    </select>
                  </div>
                )}

                <span className="text-[11px] text-outline font-label">
                  {settings.llmProvider === 'lmstudio'
                    ? 'For LM Studio, use "local-model" or the identifier shown in LM Studio\'s developer tab.'
                    : settings.llmProvider === 'nvidia'
                    ? 'Enter any model from NVIDIA API Catalog (e.g. meta/llama-3.2-3b-instruct, nvidia/nemotron-4-340b-instruct).'
                    : 'Sent directly in the `model` payload field to the provider endpoint.'}
                </span>
              </>
            );
          })()}
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
