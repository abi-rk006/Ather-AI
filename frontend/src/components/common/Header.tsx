import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useSettings } from '../../context/SettingsContext';
import { useChat } from '../../context/ChatContext';

export const Header: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    user,
    subjects,
    currentSubject,
    setCurrentSubject,
    setIsAddSubjectModalOpen,
    isDocDrawerOpen,
    setIsDocDrawerOpen,
    isSidebarOpen,
    setIsSidebarOpen,
  } = useApp();
  const { settings, updateSettings } = useSettings();
  const { messages } = useChat();

  const [isSubjectMenuOpen, setIsSubjectMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const isAuthView = currentView === 'signup' || currentView === 'login' || currentView === 'setup' || currentView === 'workspace';

  // Count active citations in the latest assistant message
  const latestAssistantMsg = [...messages].reverse().find((m) => m.sender === 'assistant');
  const citationCount = latestAssistantMsg?.citations?.length || 0;

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-surface/90 backdrop-blur-xl border-b border-surface-container-high z-40 px-3 sm:px-space-lg flex items-center justify-between gap-2 transition-all duration-300">
      {/* Left section: Hamburger (on mobile / collapsed) + App Brand + Subject Switcher */}
      <div className="flex items-center gap-2 sm:gap-space-md min-w-0">
        {/* Mobile / Toggle Hamburger button for sidebar (only when logged in) */}
        {!isAuthView && (
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors flex-shrink-0"
            title="Toggle Menu"
          >
            <span className="material-symbols-outlined text-[22px]">
              {isSidebarOpen ? 'menu_open' : 'menu'}
            </span>
          </button>
        )}

        {/* Brand */}
        <div
          className="flex items-center gap-2 cursor-pointer select-none flex-shrink-0"
          onClick={() => setCurrentView(isAuthView ? 'signup' : 'chat')}
        >
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-on-primary font-headline text-base font-bold shadow-sm">
            A
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="font-headline text-[15px] font-bold leading-tight text-on-surface">
              Aether AI
            </span>
            <span className="text-[11px] font-label text-on-surface-variant leading-none">
              Anna Univ Study Assistant
            </span>
          </div>
        </div>

        {/* Divider */}
        {!isAuthView && <span className="hidden sm:inline w-px h-5 bg-outline-variant/40" />}

        {/* Curriculum Subject Switcher (Replaces Active Workspace) */}
        {!isAuthView && (
          <div className="relative">
            <button
              onClick={() => setIsSubjectMenuOpen(!isSubjectMenuOpen)}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label text-xs font-semibold transition-colors max-w-[160px] sm:max-w-[260px] border border-outline-variant/30"
              title="Change Curriculum Subject"
            >
              <span className="material-symbols-outlined text-[17px] text-primary flex-shrink-0">school</span>
              <span className="truncate">{currentSubject ? `${currentSubject.code} — ${currentSubject.name}` : 'Select Subject'}</span>
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant flex-shrink-0">
                expand_more
              </span>
            </button>

            {isSubjectMenuOpen && (
              <div className="absolute left-0 mt-1.5 w-72 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/30 py-1 z-50 animate-in fade-in slide-in-from-top-1">
                <div className="px-3 py-1.5 text-[10px] font-label uppercase tracking-wider text-outline border-b border-surface-container flex items-center justify-between">
                  <span>Curriculum Subject (Reg 2021)</span>
                  <span className="font-mono text-[9px]">{subjects.length} courses</span>
                </div>
                <div className="max-h-60 overflow-y-auto py-1">
                  {subjects.map((subj) => (
                    <button
                      key={subj.subject_id}
                      onClick={() => {
                        setCurrentSubject(subj);
                        setIsSubjectMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs font-label hover:bg-surface-container transition-colors ${
                        currentSubject?.subject_id === subj.subject_id
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-on-surface'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-bold truncate">{subj.code} — {subj.name}</div>
                        <div className="text-[10px] text-outline truncate">{subj.department} • Semester {subj.semester}</div>
                      </div>
                      {currentSubject?.subject_id === subj.subject_id && (
                        <span className="material-symbols-outlined text-[16px] text-primary flex-shrink-0">check</span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Admin Add Subject Button (Strictly Restricted to Admin) */}
                {user.role === 'admin' && (
                  <div className="border-t border-surface-container p-1">
                    <button
                      onClick={() => {
                        setIsSubjectMenuOpen(false);
                        setIsAddSubjectModalOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-label text-purple-700 dark:text-purple-300 font-bold bg-purple-500/10 hover:bg-purple-500/20 rounded-lg transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">add_circle</span>
                      <span>+ Add Subject (UI/UX, BDA...)</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Direct Admin Quick-Add Subject Button */}
        {user.role === 'admin' && !isAuthView && (
          <button
            onClick={() => setIsAddSubjectModalOpen(true)}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-xs font-label font-bold transition-all"
            title="Admin: Add Curriculum Subject"
          >
            <span className="material-symbols-outlined text-[15px]">add</span>
            <span>Subject</span>
          </button>
        )}
      </div>

      {/* Middle section: Active Model Selector Pill (desktop only) */}
      {!isAuthView && (
        <div className="hidden lg:flex items-center gap-space-xs px-space-sm py-1 rounded-xl bg-surface-container-low border border-outline-variant/20">
          <span className="material-symbols-outlined text-primary text-[18px]">smart_toy</span>
          <select
            value={settings.selectedModel}
            onChange={(e) => updateSettings({ selectedModel: e.target.value })}
            className="bg-transparent font-label text-xs font-medium text-on-surface focus:outline-none cursor-pointer pr-1"
          >
            <option value="gpt-4o">GPT-4o (Omni) — 128k</option>
            <option value="claude-3-5-sonnet">Claude 3.5 Sonnet — 200k</option>
            <option value="gemini-1-5-pro">Gemini 1.5 Pro — 1M+</option>
            <option value="llama-3-3-70b">Llama 3.3 70B (Local / Self-Hosted)</option>
          </select>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-1" title="API Ready" />
        </div>
      )}

      {/* Right section: Citations Drawer Toggle, Settings, User Profile */}
      <div className="flex items-center gap-1 sm:gap-space-sm">
        {/* Grounded Documents Drawer Trigger (Visible when in Chat view) */}
        {!isAuthView && currentView === 'chat' && (
          <button
            onClick={() => setIsDocDrawerOpen(!isDocDrawerOpen)}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-space-sm py-1.5 rounded-xl font-label text-xs font-medium transition-all ${
              isDocDrawerOpen
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container-low hover:bg-surface-container text-on-surface'
            }`}
            title="Toggle Grounding Citations Drawer"
          >
            <span className="material-symbols-outlined text-[17px]">auto_stories</span>
            <span className="hidden md:inline">Grounding Docs</span>
            {citationCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-primary-fixed text-on-primary-fixed text-[10px] font-mono font-bold">
                {citationCount}
              </span>
            )}
          </button>
        )}

        {/* Settings button */}
        {!isAuthView && (
          <button
            onClick={() => setCurrentView('settings')}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-colors ${
              currentView === 'settings'
                ? 'bg-surface-container-high text-primary font-bold'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
            title="Settings"
          >
            <span className="material-symbols-outlined text-[19px]">tune</span>
          </button>
        )}

        {/* User Profile Avatar & Menu */}
        {!isAuthView ? (
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-surface-container transition-colors"
            >
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-headline text-xs font-bold ring-2 ${
                user.role === 'admin'
                  ? 'bg-purple-600 text-white ring-purple-500/30'
                  : 'bg-primary-fixed text-on-primary-fixed ring-primary/20'
              }`}>
                {user.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden xl:flex items-center gap-1.5">
                <span className="font-label text-xs font-medium text-on-surface max-w-[100px] truncate">
                  {user.name}
                </span>
                {user.role === 'admin' && (
                  <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 text-[9px] font-mono font-bold uppercase">
                    Admin
                  </span>
                )}
              </div>
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/30 py-1.5 z-50">
                <div className="px-3 py-2 border-b border-surface-container">
                  <div className="flex items-center justify-between gap-1">
                    <p className="font-label text-xs font-semibold text-on-surface truncate">{user.name}</p>
                    {user.role === 'admin' && (
                      <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 text-[9px] font-mono font-bold uppercase">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="font-body text-[11px] text-on-surface-variant truncate">{user.email}</p>
                  <div className="mt-1 flex items-center gap-1 text-[10px] font-mono text-emerald-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {user.role === 'admin' ? 'Admin Full Access' : 'Student Session'}
                  </div>
                </div>
                {/* Simple term words as requested */}
                <button
                  onClick={() => {
                    setCurrentView('chat');
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-label text-on-surface hover:bg-surface-container transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px] text-outline">chat</span>
                  Chat
                </button>
                <button
                  onClick={() => {
                    setCurrentView('materials');
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-label text-on-surface hover:bg-surface-container transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px] text-outline">folder</span>
                  Materials
                </button>
                <button
                  onClick={() => {
                    setCurrentView('settings');
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-label text-on-surface hover:bg-surface-container transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px] text-outline">tune</span>
                  Settings
                </button>
                <button
                  onClick={() => {
                    setCurrentView('profile');
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-label text-on-surface hover:bg-surface-container transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px] text-outline">person</span>
                  Profile
                </button>
                <div className="border-t border-surface-container my-1" />
                <button
                  onClick={() => {
                    setCurrentView('login');
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-label text-error hover:bg-error-container/20 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">logout</span>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentView('login')}
              className={`px-3 py-1.5 rounded-xl font-label text-xs font-semibold transition-colors ${
                currentView === 'login' ? 'bg-primary text-on-primary' : 'text-on-surface hover:bg-surface-container'
              }`}
            >
              Log in
            </button>
            <button
              onClick={() => setCurrentView('signup')}
              className={`px-3 py-1.5 rounded-xl font-label text-xs font-semibold transition-colors ${
                currentView === 'signup' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
              }`}
            >
              Sign up
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
