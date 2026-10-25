import React from 'react';
import { useApp } from '../../context/AppContext';
import { useChat } from '../../context/ChatContext';
import { useMaterials } from '../../context/MaterialsContext';

export const Sidebar: React.FC = () => {
  const { currentView, setCurrentView, isSidebarOpen, setIsSidebarOpen, user } = useApp();
  const { threads, currentThread, setCurrentThread, newChat } = useChat();
  const { documents } = useMaterials();

  const handleNavClick = (view: any) => {
    setCurrentView(view);
    // On mobile screens, automatically close sidebar after choosing navigation
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30 lg:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Main Sidebar Drawer */}
      <aside
        className={`fixed left-0 top-16 bottom-0 w-72 bg-surface-container-low border-r border-outline-variant/30 z-30 flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Top Header bar inside sidebar */}
          <div className="h-14 px-space-md flex items-center justify-between border-b border-surface-container">
            <span className="font-label text-xs uppercase tracking-wider text-outline font-semibold">
              Workspace Hub
            </span>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
              title="Close sidebar"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* New Chat Primary Action Button */}
          <div className="px-space-md py-space-sm">
            <button
              onClick={() => {
                newChat();
                handleNavClick('chat');
              }}
              className="w-full flex items-center justify-center gap-space-xs py-2.5 px-space-md rounded-xl bg-primary text-on-primary font-label text-xs font-semibold shadow-sm hover:bg-primary-container hover:text-on-primary-container transition-all active:scale-[0.99]"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>New Chat</span>
            </button>
          </div>

          {/* Navigation Links — Simplified to clean, direct terms */}
          <nav className="flex-1 overflow-y-auto px-space-md py-space-xs space-y-space-md">
            {/* Core Section */}
            <div className="space-y-1">
              {/* 1. Chat */}
              <button
                onClick={() => handleNavClick('chat')}
                className={`w-full flex items-center gap-space-sm px-space-sm py-2 rounded-lg text-xs font-label transition-colors text-left ${
                  currentView === 'chat'
                    ? 'bg-surface-container-high text-primary font-bold shadow-xs'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">chat</span>
                <span className="truncate">Chat</span>
              </button>

              {/* 2. Materials */}
              <button
                onClick={() => handleNavClick('materials')}
                className={`w-full flex items-center justify-between px-space-sm py-2 rounded-lg text-xs font-label transition-colors text-left ${
                  currentView === 'materials'
                    ? 'bg-surface-container-high text-primary font-bold shadow-xs'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <div className="flex items-center gap-space-sm min-w-0">
                  <span className="material-symbols-outlined text-[18px]">folder</span>
                  <span className="truncate">Materials</span>
                </div>
                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-surface-container-lowest text-on-surface-variant font-medium">
                  {documents.length} docs
                </span>
              </button>

              {/* 3. Settings */}
              <button
                onClick={() => handleNavClick('settings')}
                className={`w-full flex items-center gap-space-sm px-space-sm py-2 rounded-lg text-xs font-label transition-colors text-left ${
                  currentView === 'settings'
                    ? 'bg-surface-container-high text-primary font-bold shadow-xs'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">tune</span>
                <span className="truncate">Settings</span>
              </button>

              {/* 4. Profile */}
              <button
                onClick={() => handleNavClick('profile')}
                className={`w-full flex items-center gap-space-sm px-space-sm py-2 rounded-lg text-xs font-label transition-colors text-left ${
                  currentView === 'profile'
                    ? 'bg-surface-container-high text-primary font-bold shadow-xs'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">person</span>
                <span className="truncate">Profile</span>
              </button>
            </div>

            {/* Chat History & Recent Threads */}
            <div className="space-y-1.5 pt-2 border-t border-surface-container">
              <div className="px-space-xs font-label text-[11px] text-outline uppercase tracking-wider font-semibold">
                Recent Threads
              </div>
              <div className="space-y-1">
                {threads.map((thread) => (
                  <button
                    key={thread.id}
                    onClick={() => {
                      setCurrentThread(thread);
                      handleNavClick('chat');
                    }}
                    className={`w-full flex items-center gap-2 px-space-sm py-2 rounded-lg text-xs font-label transition-colors text-left group ${
                      currentThread.id === thread.id && currentView === 'chat'
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px] text-outline group-hover:text-primary transition-colors">
                      chat_bubble
                    </span>
                    <span className="truncate flex-1">{thread.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </nav>
        </div>

        {/* Footer: Security & Role Badge */}
        <div className="p-space-md bg-surface-container-low border-t border-surface-container flex items-center justify-between">
          <div className="flex items-center gap-space-sm min-w-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white shadow-xs ${
              user.role === 'admin' ? 'bg-purple-600' : 'bg-secondary'
            }`}>
              <span className="material-symbols-outlined text-[18px]">
                {user.role === 'admin' ? 'admin_panel_settings' : 'shield'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-label text-xs font-semibold text-on-surface truncate">
                {user.role === 'admin' ? 'Curriculum Admin' : 'Student Tier'}
              </p>
              <p className="font-label text-[11px] text-outline truncate">
                {user.role === 'admin' ? 'Public Source Ingestion' : 'Isolated Vault'}
              </p>
            </div>
          </div>
          <span className="material-symbols-outlined text-emerald-600 text-[18px]" title="Compliant Storage">
            verified
          </span>
        </div>
      </aside>
    </>
  );
};
