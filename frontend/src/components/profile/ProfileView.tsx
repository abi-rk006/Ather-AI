import React from 'react';
import { useApp } from '../../context/AppContext';
import { useMaterials } from '../../context/MaterialsContext';

export const ProfileView: React.FC = () => {
  const { user, isSidebarOpen, setCurrentView, currentWorkspace } = useApp();
  const { documents } = useMaterials();

  return (
    <div
      className={`min-h-[calc(100vh-64px)] p-3 sm:p-space-lg max-w-4xl mx-auto flex flex-col gap-space-md sm:gap-space-lg transition-all duration-300 ${
        isSidebarOpen ? 'lg:pl-72' : 'pl-0'
      }`}
    >
      {/* Title */}
      <div>
        <h1 className="font-headline text-2xl sm:text-3xl font-bold text-on-surface">
          Account Profile &amp; Knowledge Quota
        </h1>
        <p className="font-body text-xs sm:text-sm text-on-surface-variant mt-1">
          Review your enterprise identity, active Chroma vectors, and uploaded materials.
        </p>
      </div>

      {/* Profile Card */}
      <section className="p-space-md sm:p-space-lg rounded-2xl bg-surface-container-lowest shadow-sm border border-outline-variant/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-md min-w-0">
          <div className="w-16 h-16 rounded-2xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-headline text-2xl font-bold shadow-sm">
            {user.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-headline text-lg font-bold text-on-surface truncate">
                {user.name}
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-label text-[11px] font-semibold">
                {user.role}
              </span>
            </div>
            <p className="font-body text-xs text-on-surface-variant mt-0.5">{user.email}</p>
            <p className="font-label text-xs text-outline mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-primary">domain</span>
              <span>{currentWorkspace.name}</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => setCurrentView('settings')}
          className="px-space-md py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label text-xs font-semibold transition-colors flex items-center gap-1 self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[16px]">tune</span>
          <span>Edit Config</span>
        </button>
      </section>

      {/* Quota & Vector Metrics */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
        <div className="p-space-md rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-xs flex flex-col gap-1">
          <span className="font-label text-xs text-outline uppercase tracking-wider font-semibold">
            Knowledge Base Quota
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="font-headline text-xl font-bold text-on-surface">
              {user.quotaUsedMb} MB
            </span>
            <span className="text-xs text-outline">/ {user.quotaLimitMb} MB</span>
          </div>
          <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-primary"
              style={{ width: `${(user.quotaUsedMb / user.quotaLimitMb) * 100}%` }}
            />
          </div>
        </div>

        <div className="p-space-md rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-xs flex flex-col gap-1">
          <span className="font-label text-xs text-outline uppercase tracking-wider font-semibold">
            Chroma Vector Records
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="font-headline text-xl font-bold text-secondary">
              {user.activeVectorsCount.toLocaleString()}
            </span>
            <span className="text-xs text-outline">active chunks</span>
          </div>
          <span className="text-[11px] font-label text-emerald-600 mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            100% Inverted Index Synced
          </span>
        </div>

        <div className="p-space-md rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-xs flex flex-col gap-1">
          <span className="font-label text-xs text-outline uppercase tracking-wider font-semibold">
            Indexed Materials
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="font-headline text-xl font-bold text-tertiary">
              {documents.length} Files
            </span>
            <span className="text-xs text-outline">SQLite Catalog</span>
          </div>
          <button
            onClick={() => setCurrentView('materials')}
            className="text-primary hover:underline text-[11px] font-label font-semibold mt-2 text-left"
          >
            Manage in Knowledge Vault →
          </button>
        </div>
      </section>

      {/* Materials List Quick Overview */}
      <section className="p-space-md sm:p-space-lg rounded-2xl bg-surface-container-lowest shadow-sm border border-outline-variant/20 flex flex-col gap-space-md">
        <div className="flex items-center justify-between pb-space-xs border-b border-surface-container">
          <h3 className="font-headline text-base font-bold text-on-surface">
            Recently Grounded Engineering Documents
          </h3>
          <button
            onClick={() => setCurrentView('materials')}
            className="text-primary hover:underline font-label text-xs font-semibold"
          >
            View All ({documents.length})
          </button>
        </div>

        <div className="flex flex-col divide-y divide-surface-container">
          {documents.slice(0, 5).map((doc) => (
            <div key={doc.id} className="py-2.5 flex items-center justify-between gap-space-md">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  description
                </span>
                <div className="min-w-0">
                  <p className="font-label text-xs font-semibold text-on-surface truncate">
                    {doc.title}
                  </p>
                  <p className="font-body text-[11px] text-outline">
                    {doc.uploadedAt} • {doc.chunkCount} chunks
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-mono font-bold flex-shrink-0">
                Chroma Indexed
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
