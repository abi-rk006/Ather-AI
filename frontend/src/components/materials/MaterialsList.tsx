import React, { useState } from 'react';
import { useMaterials } from '../../context/MaterialsContext';
import { useApp } from '../../context/AppContext';
import { useChat } from '../../context/ChatContext';
import { UploadModal } from './UploadModal';

export const MaterialsList: React.FC = () => {
  const {
    filteredDocuments,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    layoutMode,
    setLayoutMode,
    inspectedDoc,
    setInspectedDoc,
    deleteDocument,
  } = useMaterials();
  const { setIsUploadModalOpen, isSidebarOpen, setCurrentView, user } = useApp();
  const { sendMessage } = useChat();

  const isAdmin = user.role === 'admin';
  const [scopeFilter, setScopeFilter] = useState<'all' | 'textbooks' | 'personal'>('all');

  const categories = [
    { key: 'all', label: 'All Domains' },
    { key: 'distributed', label: 'Distributed Systems' },
    { key: 'bigdata', label: 'Big Data & DBMS' },
    { key: 'deeplearning', label: 'Deep Learning & AI' },
    { key: 'security', label: 'Security & Networks' },
    { key: 'uiux', label: 'UI/UX Design' },
    { key: 'testing', label: 'Testing & QA' },
  ];

  const getFormatBadge = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return <span className="w-10 h-10 rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 flex items-center justify-center font-bold text-xs uppercase shadow-xs">PDF</span>;
      case 'md':
      case 'markdown':
        return <span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center font-bold text-xs uppercase shadow-xs">MD</span>;
      case 'csv':
        return <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center justify-center font-bold text-xs uppercase shadow-xs">CSV</span>;
      case 'docx':
      case 'doc':
        return <span className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 flex items-center justify-center font-bold text-xs uppercase shadow-xs">DOC</span>;
      default:
        return <span className="w-10 h-10 rounded-xl bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 flex items-center justify-center font-bold text-xs uppercase shadow-xs">TXT</span>;
    }
  };

  const handleAskInChat = (title: string) => {
    sendMessage(`Analyze syllabus concepts and extract key questions from ${title}`);
    setCurrentView('chat');
  };

  // Filter documents by category, search query, and scopeFilter
  const displayedDocuments = filteredDocuments.filter((doc) => {
    if (scopeFilter === 'textbooks') {
      return doc.sourceType === 'primary_textbook';
    }
    if (scopeFilter === 'personal') {
      return doc.sourceType !== 'primary_textbook';
    }
    return true;
  });

  const totalPublicCount = filteredDocuments.filter((d) => d.sourceType === 'primary_textbook').length;
  const totalPersonalCount = filteredDocuments.filter((d) => d.sourceType !== 'primary_textbook').length;

  return (
    <div
      className={`min-h-[calc(100vh-64px)] p-3 sm:p-space-lg max-w-[1720px] mx-auto flex flex-col gap-space-md sm:gap-space-lg transition-all duration-300 ${
        isSidebarOpen ? 'lg:pl-72' : 'pl-0'
      }`}
    >
      {/* Top Header Section */}
      <section className="flex flex-col gap-space-md">
        {/* Breadcrumb + Title Block */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
          <div>
            <div className="flex items-center gap-space-xs text-on-surface-variant font-label text-xs uppercase tracking-wider mb-1">
              <span>Anna University</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-primary font-semibold">Knowledge Vault &amp; Textbooks</span>
            </div>
            <div className="flex items-baseline gap-space-sm flex-wrap">
              <h1 className="font-headline text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
                Curriculum Sources &amp; Materials
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-low text-on-surface-variant font-label text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Indexed in Chroma Cloud (1024-dim Jina)
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && (
              <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/25 text-xs font-label font-bold">
                <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
                Admin Authority
              </span>
            )}

            <button
              onClick={() => setIsUploadModalOpen(true)}
              className={`flex items-center gap-space-xs px-space-md py-2.5 rounded-xl text-white font-label text-xs font-semibold shadow-md transition-all active:scale-[0.99] ${
                isAdmin
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-primary hover:bg-primary-container text-on-primary'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {isAdmin ? 'menu_book' : 'upload_file'}
              </span>
              <span>{isAdmin ? '+ Add Source / Textbook' : '+ Upload Personal Material'}</span>
            </button>
          </div>
        </div>

        {/* Administrator Authority Notification Banner */}
        {isAdmin && (
          <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <span className="material-symbols-outlined text-purple-700 dark:text-purple-300 text-[20px] flex-shrink-0 mt-0.5">
                verified_user
              </span>
              <div>
                <p className="font-label font-bold text-purple-800 dark:text-purple-200">
                  Administrator Curriculum Management
                </p>
                <p className="text-on-surface-variant text-[11px] leading-relaxed mt-0.5">
                  You can upload predefined source textbooks (PDF, MD, DOCX) visible to all students, as well as private personal study documents. You also have full access to student AI study modes.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-label text-[11px] font-semibold whitespace-nowrap self-start sm:self-auto shadow-xs"
            >
              Publish Official Textbook
            </button>
          </div>
        )}
      </section>

      {/* Scope Filter Tabs (All / Public Textbooks / Private Materials) */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2 border-b border-surface-container pb-2 flex-wrap">
          <button
            onClick={() => setScopeFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-label font-semibold flex items-center gap-1.5 transition-all ${
              scopeFilter === 'all'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">folder_copy</span>
            <span>All Materials</span>
            <span className="ml-1 opacity-80 text-[10px] font-mono">({filteredDocuments.length})</span>
          </button>

          <button
            onClick={() => setScopeFilter('textbooks')}
            className={`px-3 py-1.5 rounded-xl text-xs font-label font-semibold flex items-center gap-1.5 transition-all ${
              scopeFilter === 'textbooks'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">menu_book</span>
            <span>Predefined Textbooks (Public to All)</span>
            <span className="ml-1 opacity-80 text-[10px] font-mono">({totalPublicCount})</span>
          </button>

          <button
            onClick={() => setScopeFilter('personal')}
            className={`px-3 py-1.5 rounded-xl text-xs font-label font-semibold flex items-center gap-1.5 transition-all ${
              scopeFilter === 'personal'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">lock</span>
            <span>Personal Uploads (Private to Me)</span>
            <span className="ml-1 opacity-80 text-[10px] font-mono">({totalPersonalCount})</span>
          </button>
        </div>

        {/* Filter Bar, Topic Pills & Search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-sm bg-surface-container-lowest p-space-sm rounded-2xl shadow-sm border border-outline-variant/20">
          {/* Topic Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-label transition-all whitespace-nowrap ${
                  selectedCategory === cat.key
                    ? 'bg-primary text-on-primary font-semibold shadow-xs'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Search & Layout toggle */}
          <div className="flex items-center gap-space-sm flex-shrink-0">
            <div className="relative w-full sm:w-64">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-outline">
                <span className="material-symbols-outlined text-[17px]">search</span>
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search textbooks, topics, chunks..."
                className="w-full pl-9 pr-3 py-1.5 bg-surface-container-low text-on-surface font-body text-xs rounded-xl placeholder:text-outline focus:outline-none focus:bg-surface-container transition-all"
              />
            </div>

            <div className="flex items-center bg-surface-container-low p-0.5 rounded-xl border border-outline-variant/20">
              <button
                onClick={() => setLayoutMode('grid')}
                className={`p-1 rounded-lg transition-colors ${
                  layoutMode === 'grid'
                    ? 'text-primary bg-surface-container-lowest shadow-xs'
                    : 'text-outline hover:text-on-surface'
                }`}
                title="Grid View"
              >
                <span className="material-symbols-outlined text-[18px]">grid_view</span>
              </button>
              <button
                onClick={() => setLayoutMode('list')}
                className={`p-1 rounded-lg transition-colors ${
                  layoutMode === 'list'
                    ? 'text-primary bg-surface-container-lowest shadow-xs'
                    : 'text-outline hover:text-on-surface'
                }`}
                title="List View"
              >
                <span className="material-symbols-outlined text-[18px]">view_list</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Split Work Area: Documents Grid/List + Inspector Drawer */}
      <div className="grid grid-cols-1 2xl:grid-cols-12 gap-space-lg items-start">
        {/* Left: Documents Grid or List */}
        <section
          className={`transition-all duration-300 ${
            inspectedDoc ? '2xl:col-span-8' : '2xl:col-span-12'
          } ${
            layoutMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 gap-space-md'
              : 'flex flex-col gap-space-sm'
          }`}
        >
          {displayedDocuments.length === 0 ? (
            <div className="col-span-full p-8 text-center bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/40 flex flex-col items-center justify-center gap-2">
              <span className="material-symbols-outlined text-4xl text-outline">library_books</span>
              <p className="font-headline font-bold text-on-surface text-sm">No documents found</p>
              <p className="font-body text-xs text-on-surface-variant max-w-sm">
                {scopeFilter === 'textbooks'
                  ? 'No predefined authorized textbooks matching this filter. Admins can upload official curriculum books.'
                  : 'No personal materials uploaded yet. Upload your syllabus notes or study guides.'}
              </p>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="mt-2 px-4 py-2 rounded-xl bg-primary text-on-primary font-label text-xs font-semibold"
              >
                Upload Document Now
              </button>
            </div>
          ) : (
            displayedDocuments.map((doc) => {
              const isSelected = inspectedDoc?.id === doc.id;
              const isPredefined = doc.sourceType === 'primary_textbook';
              const canDelete = isAdmin || !isPredefined;

              return (
                <article
                  key={doc.id}
                  onClick={() => setInspectedDoc(doc)}
                  className={`group relative bg-surface-container-lowest rounded-2xl p-space-md shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer border ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary/20 shadow-md'
                      : isPredefined
                      ? 'border-amber-500/30 hover:border-amber-500/60'
                      : 'border-outline-variant/20 hover:border-primary/40'
                  }`}
                >
                  <div>
                    {/* Top row: Badge for Visibility Scope */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      {isPredefined ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-[10px] font-label font-bold">
                          <span className="material-symbols-outlined text-[13px]">public</span>
                          Authorized Textbook (Public to All)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-label font-bold">
                          <span className="material-symbols-outlined text-[13px]">lock</span>
                          Personal Material (Private to Me)
                        </span>
                      )}

                      {/* Delete button (Admin can delete all, students only personal) */}
                      {canDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Delete "${doc.title}"?`)) {
                              deleteDocument(doc.id);
                            }
                          }}
                          className="w-7 h-7 rounded-lg text-outline hover:text-error hover:bg-error-container/20 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                          title={isPredefined ? 'Admin: Delete predefined textbook' : 'Delete personal document'}
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      )}
                    </div>

                    {/* Top file format and info */}
                    <div className="flex items-start gap-2.5 mb-2.5">
                      {getFormatBadge(doc.fileType)}
                      <div className="min-w-0 flex-1">
                        <h3
                          className="font-headline text-xs sm:text-sm font-bold text-on-surface truncate group-hover:text-primary transition-colors"
                          title={doc.title}
                        >
                          {doc.title}
                        </h3>
                        <div className="flex items-center gap-2 text-[11px] font-label text-outline mt-0.5">
                          <span>{(doc.sizeBytes / 1024 / 1024).toFixed(1)} MB</span>
                          <span>•</span>
                          <span>{doc.uploadedAt}</span>
                          <span>•</span>
                          <span className="capitalize">{doc.category}</span>
                        </div>
                      </div>
                    </div>

                    {/* Summary */}
                    <p className="font-body text-xs text-on-surface-variant line-clamp-2 leading-relaxed mb-3">
                      {doc.summary}
                    </p>
                  </div>

                  {/* Bottom line: Parent-Child metrics + Ask button */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-surface-container gap-2 text-xs font-label">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant text-[11px] font-mono">
                        {doc.chunkCount} Chunks
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-secondary-fixed text-on-secondary-fixed text-[11px] font-mono font-medium">
                        {doc.parentChunkCount} Parents
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAskInChat(doc.title);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-surface-container hover:bg-primary hover:text-on-primary text-on-surface text-[11px] font-semibold transition-colors shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[13px]">chat</span>
                      <span>Query in Chat</span>
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </section>

        {/* Right: Persistent Chunks & Embeddings Inspector Drawer */}
        {inspectedDoc && (
          <aside className="2xl:col-span-4 bg-surface-container-lowest rounded-2xl p-space-md sm:p-space-lg shadow-sm border border-outline-variant/30 flex flex-col gap-space-md sticky top-24">
            <div className="flex items-center justify-between pb-space-xs border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">account_tree</span>
                <div>
                  <h3 className="font-headline text-sm font-bold text-on-surface">
                    Vector &amp; Chunk Inspector
                  </h3>
                  <p className="font-label text-[11px] text-outline">
                    Parent-Child Chroma Embeddings
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectedDoc(null)}
                className="w-7 h-7 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            {/* Document stats */}
            <div className="flex flex-col gap-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    inspectedDoc.fileType === 'csv'
                      ? 'bg-emerald-100 text-emerald-800'
                      : inspectedDoc.fileType === 'md' || inspectedDoc.fileType === 'markdown'
                      ? 'bg-blue-100 text-blue-800'
                      : inspectedDoc.fileType === 'docx' || inspectedDoc.fileType === 'doc'
                      ? 'bg-indigo-100 text-indigo-800'
                      : inspectedDoc.fileType === 'pdf'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-surface-container text-on-surface'
                  }`}
                >
                  {inspectedDoc.fileType}
                </span>
                <span className="font-label font-bold text-on-surface truncate">
                  {inspectedDoc.title}
                </span>
              </div>

              {/* Source Scope in Inspector */}
              <div className="mt-1">
                {inspectedDoc.sourceType === 'primary_textbook' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-300 text-[10px] font-label font-bold">
                    <span className="material-symbols-outlined text-[12px]">public</span>
                    Public Authorized Curriculum Textbook
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-label font-bold">
                    <span className="material-symbols-outlined text-[12px]">lock</span>
                    Private Personal Document (User Isolated)
                  </span>
                )}
              </div>

              <p className="font-body text-xs text-on-surface-variant mt-2 leading-relaxed">
                {inspectedDoc.summary}
              </p>
            </div>

            {/* Architecture Details */}
            <div className="p-3 rounded-xl bg-surface-container-low text-xs flex flex-col gap-2 border border-outline-variant/20">
              <div className="flex justify-between items-center text-[11px] font-label">
                <span className="text-outline">Parent Sections:</span>
                <span className="font-mono font-bold text-on-surface">
                  {inspectedDoc.parentChunkCount} sections
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px] font-label">
                <span className="text-outline">Child Passages:</span>
                <span className="font-mono font-bold text-on-surface">
                  {inspectedDoc.chunkCount} vectors (1024-dim)
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px] font-label">
                <span className="text-outline">Storage Strategy:</span>
                <span className="font-mono text-primary font-semibold">
                  {inspectedDoc.sourceType === 'primary_textbook' ? 'Parent-Child H-Tree' : 'Recursive Split'}
                </span>
              </div>
            </div>

            <button
              onClick={() => handleAskInChat(inspectedDoc.title)}
              className="w-full py-2.5 rounded-xl bg-primary text-on-primary font-label text-xs font-semibold shadow-sm hover:bg-primary-container transition-all flex items-center justify-center gap-1.5 active:scale-[0.99]"
            >
              <span className="material-symbols-outlined text-[16px]">chat</span>
              <span>Query Document in Chat</span>
            </button>
          </aside>
        )}
      </div>

      <UploadModal />
    </div>
  );
};
