import React from 'react';
import { useApp } from '../../context/AppContext';

export const ErrorModal: React.FC = () => {
  const { isErrorModalOpen, setIsErrorModalOpen, errorInfo, setCurrentView } = useApp();

  if (!isErrorModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/30 overflow-hidden">
        {/* Header with error badge */}
        <div className="p-space-lg flex items-start gap-space-md border-b border-surface-container">
          <div className="w-12 h-12 rounded-xl bg-error-container text-on-error-container flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="material-symbols-outlined text-[28px] text-error">error</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-headline text-lg font-bold text-on-surface leading-snug">
              {errorInfo.title}
            </h3>
            <p className="font-body text-xs text-on-surface-variant mt-1 leading-relaxed">
              {errorInfo.message}
            </p>
          </div>
          <button
            onClick={() => setIsErrorModalOpen(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Technical diagnostics snippet */}
        {errorInfo.details && (
          <div className="p-space-md bg-surface-container-low/70">
            <div className="flex items-center gap-1.5 text-[11px] font-label font-semibold text-outline uppercase tracking-wider mb-1.5">
              <span className="material-symbols-outlined text-[14px]">terminal</span>
              Diagnostic Logs
            </div>
            <pre className="p-3 rounded-lg bg-surface-container text-on-surface font-mono text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed border border-outline-variant/20">
              {errorInfo.details}
            </pre>
          </div>
        )}

        {/* Actions footer */}
        <div className="p-space-md bg-surface-container-low flex items-center justify-end gap-space-sm border-t border-surface-container">
          <button
            onClick={() => setIsErrorModalOpen(false)}
            className="px-space-md py-2 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high font-label text-xs font-medium transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={() => {
              setIsErrorModalOpen(false);
              setCurrentView('settings');
            }}
            className="px-space-md py-2 rounded-xl bg-primary text-on-primary hover:bg-primary-container font-label text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">tune</span>
            Review Inference Settings
          </button>
        </div>
      </div>
    </div>
  );
};
