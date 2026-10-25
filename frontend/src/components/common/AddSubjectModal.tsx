import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { apiClient } from '../../api/client';

export const AddSubjectModal: React.FC = () => {
  const { isAddSubjectModalOpen, setIsAddSubjectModalOpen, user, reloadSubjects, setCurrentSubject, showError } = useApp();

  const isAdmin = user.role === 'admin';

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('CSE');
  const [semester, setSemester] = useState(6);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isAddSubjectModalOpen) return null;

  const handleQuickPreset = (presetCode: string, presetName: string, dept: string, sem: number, desc: string) => {
    setCode(presetCode);
    setName(presetName);
    setDepartment(dept);
    setSemester(sem);
    setDescription(desc);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showError('Permission Denied', 'Only administrators can add curriculum subjects.');
      setIsAddSubjectModalOpen(false);
      return;
    }

    if (!code.trim() || !name.trim()) {
      setErrorMsg('Please enter both subject code and subject name.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      const created = await apiClient.createSubject({
        code: code.trim(),
        name: name.trim(),
        department,
        semester,
        description: description.trim() || `Anna University Regulation 2021: ${name.trim()}`,
      });

      await reloadSubjects();
      setCurrentSubject(created);
      setIsAddSubjectModalOpen(false);
      setCode('');
      setName('');
      setDescription('');
    } catch (err: any) {
      console.error('Failed to create subject:', err);
      setErrorMsg(err?.message || 'Failed to add curriculum subject. Administrator rights required.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/30 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-space-md sm:p-space-lg flex items-center justify-between border-b border-surface-container bg-purple-500/5">
          <div className="flex items-center gap-space-sm">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">library_add</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="font-headline text-lg font-bold text-on-surface">
                  Add Curriculum Subject
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
                  Admin Only
                </span>
              </div>
              <p className="font-label text-xs text-on-surface-variant">
                Define an official Anna University course (Regulation 2021)
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAddSubjectModalOpen(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content */}
        {!isAdmin ? (
          <div className="p-space-lg flex flex-col items-center text-center gap-space-md">
            <div className="w-12 h-12 rounded-full bg-error-container/20 text-error flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">lock</span>
            </div>
            <div>
              <h3 className="font-headline text-base font-bold text-on-surface">Restricted Authority</h3>
              <p className="font-body text-xs text-on-surface-variant mt-1 max-w-sm">
                Curriculum subject creation is restricted to <strong>Administrators</strong> only. Students cannot add or modify syllabus subjects.
              </p>
            </div>
            <button
              onClick={() => setIsAddSubjectModalOpen(false)}
              className="px-space-lg py-2 rounded-xl bg-surface-container text-on-surface font-label text-xs font-semibold"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-space-md sm:p-space-lg flex flex-col gap-space-md">
            {/* Quick Presets for UI/UX, BDA */}
            <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30">
              <span className="font-label text-[11px] font-bold text-outline uppercase tracking-wider">
                Quick Curriculum Presets
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() =>
                    handleQuickPreset(
                      'CS3001',
                      'UI/UX Design',
                      'CSE',
                      6,
                      'User interface architecture, design heuristics, user research, wireframing, and Figma design systems.'
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-surface-container-lowest hover:bg-primary/10 hover:text-primary text-on-surface font-label text-xs border border-outline-variant/30 transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">palette</span>
                  <span>+ UI/UX Design (CS3001)</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleQuickPreset(
                      'CCS334',
                      'Big Data Analytics (BDA)',
                      'IT',
                      7,
                      'Apache Hadoop, Spark RDDs, MapReduce ecosystem, distributed stream analytics, and NoSQL architecture.'
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-surface-container-lowest hover:bg-primary/10 hover:text-primary text-on-surface font-label text-xs border border-outline-variant/30 transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">analytics</span>
                  <span>+ Big Data Analytics (BDA)</span>
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-error-container/20 border border-error/30 text-error text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Code and Name */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-label text-xs font-semibold text-on-surface">Subject Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. CS3001"
                  required
                  className="px-3 py-2 rounded-xl bg-surface-container-low text-on-surface font-mono text-xs outline-none border border-outline-variant/30 focus:ring-2 focus:ring-purple-500/30"
                />
              </div>

              <div className="sm:col-span-2 flex flex-col gap-1">
                <label className="font-label text-xs font-semibold text-on-surface">Subject Title</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. UI/UX Design or Big Data Analytics (BDA)"
                  required
                  className="px-3 py-2 rounded-xl bg-surface-container-low text-on-surface font-body text-xs outline-none border border-outline-variant/30 focus:ring-2 focus:ring-purple-500/30"
                />
              </div>
            </div>

            {/* Department and Semester */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-label text-xs font-semibold text-on-surface">Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-surface-container-low text-on-surface font-label text-xs outline-none border border-outline-variant/30 cursor-pointer"
                >
                  <option value="CSE">CSE — Computer Science</option>
                  <option value="IT">IT — Information Technology</option>
                  <option value="AIDS">AIDS — Artificial Intelligence &amp; Data Science</option>
                  <option value="ECE">ECE — Electronics &amp; Communication</option>
                  <option value="MECH">MECH — Mechanical Engineering</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label text-xs font-semibold text-on-surface">Semester</label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl bg-surface-container-low text-on-surface font-label text-xs outline-none border border-outline-variant/30 cursor-pointer"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1">
              <label className="font-label text-xs font-semibold text-on-surface">
                Syllabus Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Key units, topics, and prescribed textbooks (e.g. Unit 1: Principles of Interaction, Wireframing...)"
                className="px-3 py-2 rounded-xl bg-surface-container-low text-on-surface font-body text-xs outline-none border border-outline-variant/30 focus:ring-2 focus:ring-purple-500/30 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-container mt-1">
              <button
                type="button"
                onClick={() => setIsAddSubjectModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-surface-container text-on-surface font-label text-xs hover:bg-surface-container-high transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !code || !name}
                className={`px-4 py-2 rounded-xl font-label text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 ${
                  isSubmitting || !code || !name
                    ? 'bg-surface-container-high text-outline cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                <span>{isSubmitting ? 'Creating Subject...' : 'Create Curriculum Subject'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
