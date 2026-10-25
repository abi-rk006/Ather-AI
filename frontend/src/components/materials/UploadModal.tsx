import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useMaterials } from '../../context/MaterialsContext';
import type { MaterialDocument } from '../../types';

export const UploadModal: React.FC = () => {
  const { isUploadModalOpen, setIsUploadModalOpen, user, subjects, currentSubject } = useApp();
  const { uploadDocument } = useMaterials();

  const isAdmin = user.role === 'admin';

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState<MaterialDocument['category']>('distributed');
  const [sourceType, setSourceType] = useState<'primary_textbook' | 'student_document'>(
    isAdmin ? 'primary_textbook' : 'student_document'
  );
  const [bookTitle, setBookTitle] = useState('');
  const [subjectId, setSubjectId] = useState(currentSubject?.subject_id || (subjects[0]?.subject_id ?? 'cs8591'));
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isUploadModalOpen) return null;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const f = e.dataTransfer.files[0];
      setSelectedFile(f);
      if (!bookTitle) {
        setBookTitle(f.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setSelectedFile(f);
      if (!bookTitle) {
        setBookTitle(f.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setProgress(20);

    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 85) {
          clearInterval(interval);
          return 85;
        }
        return p + 20;
      });
    }, 200);

    try {
      const effectiveSourceType = isAdmin ? sourceType : 'student_document';
      await uploadDocument(
        selectedFile,
        category,
        subjectId,
        effectiveSourceType,
        effectiveSourceType === 'primary_textbook' ? bookTitle : undefined
      );
      setProgress(100);
      setTimeout(() => {
        setIsUploading(false);
        setIsUploadModalOpen(false);
        setSelectedFile(null);
        setBookTitle('');
        setProgress(0);
      }, 500);
    } catch {
      setIsUploading(false);
      setProgress(0);
    } finally {
      clearInterval(interval);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/30 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-space-md sm:p-space-lg flex items-center justify-between border-b border-surface-container">
          <div className="flex items-center gap-space-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isAdmin && sourceType === 'primary_textbook'
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                : 'bg-primary-fixed text-primary'
            }`}>
              <span className="material-symbols-outlined text-[22px]">
                {isAdmin && sourceType === 'primary_textbook' ? 'menu_book' : 'upload_file'}
              </span>
            </div>
            <div>
              <h2 className="font-headline text-lg font-bold text-on-surface">
                {isAdmin && sourceType === 'primary_textbook'
                  ? 'Add Predefined Curriculum Source'
                  : 'Upload Study Material'}
              </h2>
              <p className="font-label text-xs text-on-surface-variant">
                {isAdmin && sourceType === 'primary_textbook'
                  ? 'Predefined textbooks are visible and indexed for ALL users'
                  : 'Personal study documents are private and visible ONLY to you'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsUploadModalOpen(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-space-md sm:p-space-lg flex flex-col gap-space-md overflow-y-auto">
          {/* Admin Role Document Type Selector */}
          {isAdmin ? (
            <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-purple-500/10 border border-purple-500/25">
              <div className="flex items-center justify-between">
                <span className="font-label text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px]">admin_panel_settings</span>
                  Administrator Ingestion Mode
                </span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-purple-200 dark:bg-purple-900/60 text-purple-900 dark:text-purple-200">
                  Curriculum Authority
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setSourceType('primary_textbook')}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all ${
                    sourceType === 'primary_textbook'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                      : 'bg-surface-container-low text-on-surface border-outline-variant/30 hover:border-purple-400'
                  }`}
                >
                  <div className="flex items-center gap-1 font-semibold text-xs">
                    <span className="material-symbols-outlined text-[16px]">public</span>
                    <span>Predefined Source</span>
                  </div>
                  <span className={`text-[10px] leading-tight ${sourceType === 'primary_textbook' ? 'text-purple-100' : 'text-on-surface-variant'}`}>
                    Visible to ALL students across subjects
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSourceType('student_document')}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all ${
                    sourceType === 'student_document'
                      ? 'bg-primary text-on-primary border-primary shadow-sm'
                      : 'bg-surface-container-low text-on-surface border-outline-variant/30 hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-center gap-1 font-semibold text-xs">
                    <span className="material-symbols-outlined text-[16px]">lock</span>
                    <span>Personal Material</span>
                  </div>
                  <span className={`text-[10px] leading-tight ${sourceType === 'student_document' ? 'text-primary-100' : 'text-on-surface-variant'}`}>
                    Private to administrator only
                  </span>
                </button>
              </div>
            </div>
          ) : (
            /* Student info notice */
            <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs flex items-center justify-between text-on-surface-variant">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">lock</span>
                <span>Personal Document: Visible and searchable <strong>only by you</strong>.</span>
              </div>
              <span className="text-[10px] font-mono text-outline">Private Vault</span>
            </div>
          )}

          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`p-space-lg rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-primary bg-primary/5'
                : selectedFile
                ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                : 'border-outline-variant hover:border-primary/50 bg-surface-container-low'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".pdf,.md,.markdown,.csv,.docx,.doc,.txt"
              onChange={handleFileChange}
            />
            <span
              className={`material-symbols-outlined text-4xl mb-2 ${
                selectedFile ? 'text-emerald-600' : 'text-primary'
              }`}
            >
              {selectedFile ? 'check_circle' : 'cloud_upload'}
            </span>
            {selectedFile ? (
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      selectedFile.name.endsWith('.csv')
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedFile.name.endsWith('.md') || selectedFile.name.endsWith('.markdown')
                        ? 'bg-blue-100 text-blue-800'
                        : selectedFile.name.endsWith('.docx') || selectedFile.name.endsWith('.doc')
                        ? 'bg-indigo-100 text-indigo-800'
                        : selectedFile.name.endsWith('.pdf')
                        ? 'bg-red-100 text-red-800'
                        : 'bg-surface-container text-on-surface'
                    }`}
                  >
                    {selectedFile.name.split('.').pop()}
                  </span>
                  <p className="font-label text-sm font-bold text-on-surface">{selectedFile.name}</p>
                </div>
                <p className="font-mono text-xs text-outline mt-0.5">
                  {(selectedFile.size / 1024).toFixed(1)} KB • Ready for structure-aware indexing
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <p className="font-label text-sm font-semibold text-on-surface">
                  Drag and drop your engineering document or textbook here
                </p>
                <p className="font-label text-xs text-outline mt-1 mb-2">
                  Supports PDF, Markdown (.md), Word (.docx/.doc), and CSV datasets
                </p>
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-red-700 text-[11px] font-mono font-semibold border border-red-200">
                    <span className="material-symbols-outlined text-[12px]">picture_as_pdf</span> PDF
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-mono font-semibold border border-blue-200">
                    <span className="material-symbols-outlined text-[12px]">description</span> Markdown (.md)
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-mono font-semibold border border-indigo-200">
                    <span className="material-symbols-outlined text-[12px]">article</span> Word (.docx)
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-mono font-semibold border border-emerald-200">
                    <span className="material-symbols-outlined text-[12px]">table_chart</span> CSV (.csv)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Book Title field for Predefined Textbook */}
          {isAdmin && sourceType === 'primary_textbook' && (
            <div className="flex flex-col gap-1.5">
              <label className="font-label text-xs font-semibold text-on-surface">
                Official Textbook / Source Title
              </label>
              <input
                type="text"
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                placeholder="e.g. Computer Networks - Andrew Tanenbaum (5th Edition)"
                className="px-space-md py-2.5 rounded-xl bg-surface-container-low text-on-surface font-body text-xs outline-none border border-outline-variant/30 focus:ring-2 focus:ring-purple-500/30"
              />
            </div>
          )}

          {/* Subject Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="font-label text-xs font-semibold text-on-surface">
                Curriculum Subject
              </label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="px-space-md py-2.5 rounded-xl bg-surface-container-low text-on-surface font-label text-xs outline-none border border-outline-variant/30 cursor-pointer"
              >
                {subjects.map((s) => (
                  <option key={s.subject_id} value={s.subject_id}>
                    {s.code} - {s.name} (Sem {s.semester})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-label text-xs font-semibold text-on-surface">
                Domain Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="px-space-md py-2.5 rounded-xl bg-surface-container-low text-on-surface font-label text-xs outline-none border border-outline-variant/30 cursor-pointer"
              >
                <option value="distributed">Distributed computing &amp; Microservices</option>
                <option value="bigdata">Big Data &amp; Event Streaming</option>
                <option value="deeplearning">Deep Learning &amp; AI Algorithms</option>
                <option value="security">Data &amp; Information Security</option>
                <option value="uiux">UI/UX Design Systems</option>
                <option value="testing">Software Testing &amp; Automation</option>
              </select>
            </div>
          </div>

          {/* Pipeline Strategy Details */}
          <div className="p-3 rounded-xl bg-surface-container-low text-xs border border-outline-variant/20 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] font-label font-bold text-primary">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">account_tree</span>
                {isAdmin && sourceType === 'primary_textbook'
                  ? 'Parent-Child Structure-Aware Chunker (Predefined Source)'
                  : 'Recursive Character Chunker (Personal Document)'}
              </span>
              <span className="text-[10px] font-mono text-outline">Jina 1024d + Chroma</span>
            </div>
            <p className="text-[11px] text-on-surface-variant font-body">
              {isAdmin && sourceType === 'primary_textbook'
                ? 'Extracts chapter/unit headings into 1,000–2,000 token parent blocks and 400 token semantic child chunks. Retrievable by all students.'
                : 'Extracts text into 400 token child chunks with 65-token overlaps. Isolated strictly to your user profile.'}
            </p>
          </div>

          {/* Progress Bar */}
          {isUploading && (
            <div className="flex flex-col gap-1 mt-1">
              <div className="flex justify-between text-xs font-label">
                <span className="text-on-surface font-medium">Extracting tokens &amp; embedding vectors...</span>
                <span className="text-primary font-bold">{progress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-space-md bg-surface-container-low flex items-center justify-end gap-space-sm border-t border-surface-container">
          <button
            onClick={() => setIsUploadModalOpen(false)}
            className="px-space-md py-2 rounded-xl bg-surface-container text-on-surface font-label text-xs hover:bg-surface-container-high transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className={`px-space-md py-2 rounded-xl font-label text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 ${
              !selectedFile || isUploading
                ? 'bg-surface-container-high text-outline cursor-not-allowed'
                : isAdmin && sourceType === 'primary_textbook'
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-primary text-on-primary hover:bg-primary-container'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">upload</span>
            <span>
              {isUploading
                ? 'Indexing...'
                : isAdmin && sourceType === 'primary_textbook'
                ? 'Publish Authorized Textbook'
                : 'Index to Private Vault'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
