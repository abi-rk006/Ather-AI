import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useSettings } from '../../context/SettingsContext';

export const SetupProfileWizard: React.FC = () => {
  const { setCurrentView, user, setUser } = useApp();
  const { settings, updateSettings, testConnection } = useSettings();

  const [fullName, setFullName] = useState(user.name);
  const [handle, setHandle] = useState('alexmercer');
  const [role, setRole] = useState(user.role);
  const [apiKey, setApiKey] = useState(settings.primaryApiKey);
  const [testingKey, setTestingKey] = useState(false);
  const [testSuccess, setTestSuccess] = useState(true);

  const handleTestKey = async () => {
    setTestingKey(true);
    const res = await testConnection(apiKey, settings.selectedModel);
    setTestSuccess(res.success);
    setTestingKey(false);
  };

  const handleFinish = (e: React.FormEvent) => {
    e.preventDefault();
    setUser((prev) => ({
      ...prev,
      name: fullName || prev.name,
      role: role || prev.role,
    }));
    updateSettings({ primaryApiKey: apiKey });
    // Flow: Setup -> Direct to Chat
    setCurrentView('chat');
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-surface">
      <div className="w-full max-w-2xl bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/30 p-space-md sm:p-space-xl flex flex-col gap-space-lg">
        {/* Header */}
        <div className="text-center flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center font-headline text-2xl font-bold shadow-sm">
            <span className="material-symbols-outlined text-[26px]">manage_accounts</span>
          </div>
          <h1 className="font-headline text-xl sm:text-2xl font-bold text-on-surface mt-1">
            Complete Your Workspace Setup
          </h1>
          <p className="font-body text-xs text-on-surface-variant max-w-md">
            Configure your professional identity and inference credentials for grounded RAG generation.
          </p>
        </div>

        {/* Multi-Section Form */}
        <form onSubmit={handleFinish} className="flex flex-col gap-space-md">
          {/* Section 1: User & Identity Profile */}
          <section className="flex flex-col gap-space-sm bg-surface-container-low/70 p-space-md rounded-xl border border-outline-variant/20">
            <div className="flex items-center justify-between pb-1 border-b border-surface-container">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-3.5 bg-primary rounded-full" />
                <h2 className="font-headline text-xs font-bold text-on-surface uppercase tracking-wide">
                  Step 1: User &amp; Identity Profile
                </h2>
              </div>
              <span className="font-label text-[10px] text-outline">Step 1 of 2</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm pt-1">
              <div className="flex flex-col gap-1">
                <label className="font-label text-[11px] font-semibold text-on-surface">Full Name *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-surface-container-lowest rounded-lg font-body text-xs text-on-surface outline-none border border-outline-variant/30 focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label text-[11px] font-semibold text-on-surface">Handle *</label>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-surface-container-lowest rounded-lg font-body text-xs text-on-surface outline-none border border-outline-variant/30 focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label text-[11px] font-semibold text-on-surface">Role *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-lowest rounded-lg font-label text-xs text-on-surface outline-none border border-outline-variant/30 cursor-pointer"
                >
                  <option value="Principal Architect">Principal Architect</option>
                  <option value="Staff Systems Engineer">Staff Systems Engineer</option>
                  <option value="AI / ML Engineer">AI / ML Engineer</option>
                  <option value="Security / Compliance Officer">Security Officer</option>
                </select>
              </div>
            </div>
          </section>

          {/* Section 2: Inference & API Key */}
          <section className="flex flex-col gap-space-sm bg-surface-container-low/70 p-space-md rounded-xl border border-outline-variant/20">
            <div className="flex items-center justify-between pb-1 border-b border-surface-container">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-3.5 bg-primary rounded-full" />
                <h2 className="font-headline text-xs font-bold text-on-surface uppercase tracking-wide">
                  Step 2: Inference &amp; API Key
                </h2>
              </div>
              <span className="font-label text-[10px] text-outline">Step 2 of 2</span>
            </div>

            <div className="flex flex-col gap-1 pt-1">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <label className="font-label text-[11px] font-semibold text-on-surface">
                  Primary AI API Key (OpenAI / Anthropic / Gemini)
                </label>
                {testSuccess && (
                  <span className="text-[10px] font-mono text-emerald-600 flex items-center gap-1 font-semibold">
                    <span className="material-symbols-outlined text-[13px]">check_circle</span>
                    Verified &amp; Connected
                  </span>
                )}
              </div>
              <div className="relative flex items-center">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-proj-..."
                  className="w-full pl-3 pr-20 py-2 bg-surface-container-lowest rounded-lg font-mono text-xs text-on-surface outline-none border border-outline-variant/30 focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={handleTestKey}
                  disabled={testingKey}
                  className="absolute right-1.5 px-2.5 py-1 bg-surface-container text-on-surface hover:text-primary rounded-md font-label text-[11px] font-semibold transition-colors"
                >
                  {testingKey ? 'Pinging...' : 'Verify'}
                </button>
              </div>
              <p className="text-[10px] font-label text-outline mt-0.5">
                Stored client-side with enterprise encryption. Can also be updated later in Settings.
              </p>
            </div>
          </section>

          {/* Submit Actions */}
          <div className="flex items-center justify-between pt-1 gap-space-sm flex-wrap">
            <button
              type="button"
              onClick={() => setCurrentView('chat')}
              className="text-xs font-label text-outline hover:text-on-surface transition-colors"
            >
              Skip setup for now →
            </button>

            <button
              type="submit"
              className="px-space-lg py-2.5 rounded-xl bg-primary text-on-primary font-label text-xs font-semibold shadow-md hover:bg-primary-container transition-all flex items-center gap-1.5 active:scale-[0.99]"
            >
              <span>Launch Chat</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
