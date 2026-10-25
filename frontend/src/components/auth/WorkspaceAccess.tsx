import React from 'react';
import { useApp } from '../../context/AppContext';

export const WorkspaceAccess: React.FC = () => {
  const { workspaces, currentWorkspace, setCurrentWorkspace, setCurrentView } = useApp();

  const handleEnterWorkspace = () => {
    // Flow: Workspace Access -> Chat
    setCurrentView('chat');
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-surface">
      <div className="w-full max-w-xl bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/30 p-space-md sm:p-space-xl flex flex-col gap-space-lg">
        {/* Header */}
        <div className="text-center flex flex-col items-center gap-1.5">
          <div className="w-12 h-12 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-[26px]">domain</span>
          </div>
          <h1 className="font-headline text-xl sm:text-2xl font-bold text-on-surface mt-1">
            Select Your Architecture Workspace
          </h1>
          <p className="font-body text-xs text-on-surface-variant max-w-md">
            Choose the engineering domain or knowledge silo you want to interact with.
          </p>
        </div>

        {/* Workspaces list */}
        <div className="flex flex-col gap-space-sm">
          {workspaces.map((ws) => {
            const isSelected = currentWorkspace.id === ws.id;

            return (
              <div
                key={ws.id}
                onClick={() => setCurrentWorkspace(ws)}
                className={`p-space-md rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-space-sm sm:gap-space-md ${
                  isSelected
                    ? 'bg-surface-container-low border-primary ring-2 ring-primary/20 shadow-md'
                    : 'bg-surface-container-lowest hover:bg-surface-container-low border-outline-variant/30'
                }`}
              >
                <div className="flex items-center gap-space-sm sm:gap-space-md min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                      isSelected
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {ws.id === 'ws-prod' ? 'hub' : ws.id === 'ws-fin' ? 'account_balance' : 'shield'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-headline text-xs sm:text-sm font-bold text-on-surface truncate">
                        {ws.name}
                      </h3>
                      <span className="px-2 py-0.2 rounded-full bg-surface-container text-on-surface-variant font-label text-[10px] font-semibold">
                        {ws.role}
                      </span>
                    </div>
                    <p className="font-label text-[11px] text-outline mt-0.5 truncate">
                      {ws.membersCount} Engineers • {ws.documentsCount} Grounded Docs
                    </p>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? 'border-primary bg-primary' : 'border-outline-variant'
                    }`}
                  >
                    {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        <button
          onClick={handleEnterWorkspace}
          className="w-full py-3 rounded-xl bg-primary text-on-primary font-label text-xs font-semibold shadow-md hover:bg-primary-container transition-all flex items-center justify-center gap-1.5 active:scale-[0.99]"
        >
          <span>Enter Workspace</span>
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </button>
      </div>
    </div>
  );
};
