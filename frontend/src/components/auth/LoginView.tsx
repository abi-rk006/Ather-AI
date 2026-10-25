import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { signInWithGoogle } from '../../api/firebase';
import { apiClient } from '../../api/client';

export const LoginView: React.FC = () => {
  const { setCurrentView, setUser } = useApp();
  const [loginTab, setLoginTab] = useState<'student' | 'admin'>('student');

  // Student state
  const [studentEmail, setStudentEmail] = useState('alex.mercer@annauniv.edu');
  const [studentPassword, setStudentPassword] = useState('••••••••••••');
  const [showStudentPassword, setShowStudentPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Admin state
  const [adminEmail, setAdminEmail] = useState('admin@annauniv.edu');
  const [adminPasscode, setAdminPasscode] = useState('admin123');
  const [showAdminPasscode, setShowAdminPasscode] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('auth_token', `student_${Date.now()}`);
    localStorage.setItem('user_role', 'student');
    setUser((prev) => ({
      ...prev,
      name: studentEmail.split('@')[0],
      email: studentEmail || prev.email,
      role: 'student',
    }));
    setCurrentView('chat');
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      setErrorMessage(null);
      const authResult = await signInWithGoogle();
      
      localStorage.setItem('user_role', 'student');
      setUser((prev) => ({
        ...prev,
        name: authResult.displayName,
        email: authResult.email,
        role: 'student',
      }));

      setCurrentView('chat');
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      setErrorMessage(err?.message || 'Google Sign-In failed. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsAdminLoading(true);
      setErrorMessage(null);
      const res = await apiClient.adminLogin(adminEmail, adminPasscode);
      
      setUser((prev) => ({
        ...prev,
        name: res.user?.display_name || 'Curriculum Administrator',
        email: res.user?.email || adminEmail,
        role: 'admin',
      }));

      // Admin has full user features + admin curriculum management
      setCurrentView('materials');
    } catch (err: any) {
      console.error('Admin Login Error:', err);
      setErrorMessage(err?.message || 'Invalid administrator credentials or passcode.');
    } finally {
      setIsAdminLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-surface">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/30 p-space-md sm:p-space-xl flex flex-col gap-space-md">
        {/* Brand Icon and Title */}
        <div className="text-center flex flex-col items-center gap-1.5">
          <div className="w-12 h-12 rounded-2xl bg-primary text-on-primary flex items-center justify-center font-headline text-2xl font-bold shadow-md">
            A
          </div>
          <h1 className="font-headline text-xl sm:text-2xl font-bold text-on-surface mt-1">
            Welcome to Aether AI
          </h1>
          <p className="font-body text-xs text-on-surface-variant max-w-xs">
            Anna University AI Study &amp; Curriculum Management Platform
          </p>
        </div>

        {/* Tab Switcher: Student vs Admin */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-surface-container-low border border-outline-variant/30">
          <button
            type="button"
            onClick={() => {
              setLoginTab('student');
              setErrorMessage(null);
            }}
            className={`py-2 px-3 rounded-lg font-label text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              loginTab === 'student'
                ? 'bg-surface-container-lowest text-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">school</span>
            <span>Student Login</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginTab('admin');
              setErrorMessage(null);
            }}
            className={`py-2 px-3 rounded-lg font-label text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              loginTab === 'admin'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">admin_panel_settings</span>
            <span>Admin Portal</span>
          </button>
        </div>

        {/* Error alert if any */}
        {errorMessage && (
          <div className="p-2.5 rounded-xl bg-error-container/20 border border-error/30 text-error text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ADMIN LOGIN FORM */}
        {loginTab === 'admin' ? (
          <form onSubmit={handleAdminSubmit} className="flex flex-col gap-space-md animate-in fade-in duration-200">
            {/* Admin explanation banner */}
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/25 flex flex-col gap-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300 font-bold font-label">
                <span className="material-symbols-outlined text-[16px]">verified_user</span>
                <span>Curriculum Authority Privileges</span>
              </div>
              <p className="text-on-surface-variant text-[11px] leading-relaxed">
                Admins can upload <strong>Predefined Curriculum Textbooks</strong> (PDF, MD, DOCX) visible to all students, manage the knowledge vault, and retain full access to all student AI modes.
              </p>
            </div>

            {/* Admin Email */}
            <div className="flex flex-col gap-1.5">
              <label className="font-label text-xs font-semibold text-on-surface">Administrator Email</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">
                  badge
                </span>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                  placeholder="admin@annauniv.edu"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-body text-xs outline-none focus:ring-2 focus:ring-purple-500/30 border border-outline-variant/30"
                />
              </div>
            </div>

            {/* Admin Passcode */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="font-label text-xs font-semibold text-on-surface">Admin Passcode</label>
                <button
                  type="button"
                  onClick={() => setAdminPasscode('admin123')}
                  className="font-label text-[11px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-0.5"
                >
                  <span className="material-symbols-outlined text-[12px]">key</span>
                  <span>Fill Demo (admin123)</span>
                </button>
              </div>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">
                  lock
                </span>
                <input
                  type={showAdminPasscode ? 'text' : 'password'}
                  value={adminPasscode}
                  onChange={(e) => setAdminPasscode(e.target.value)}
                  required
                  placeholder="Enter administrator passcode"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-body text-xs outline-none focus:ring-2 focus:ring-purple-500/30 border border-outline-variant/30"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPasscode(!showAdminPasscode)}
                  className="absolute right-2.5 text-outline hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showAdminPasscode ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isAdminLoading}
              className="w-full py-3 rounded-xl bg-purple-600 text-white font-label text-xs font-semibold shadow-md hover:bg-purple-700 transition-all flex items-center justify-center gap-2 active:scale-[0.99] mt-1"
            >
              {isAdminLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
              )}
              <span>{isAdminLoading ? 'Authenticating Admin...' : 'Sign in as Administrator'}</span>
            </button>
          </form>
        ) : (
          /* STUDENT LOGIN FORM */
          <>
            {/* Google Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="w-full py-2.5 rounded-xl border border-outline-variant/40 bg-surface-container-lowest hover:bg-surface-container-low text-on-surface font-label text-xs font-semibold flex items-center justify-center gap-2.5 transition-all shadow-xs active:scale-[0.99]"
            >
              {isGoogleLoading ? (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>{isGoogleLoading ? 'Signing in with Google...' : 'Continue with Google'}</span>
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-0.5">
              <div className="border-t border-surface-container w-full" />
              <span className="bg-surface-container-lowest px-3 text-[11px] font-label text-outline uppercase tracking-wider">
                or student email
              </span>
              <div className="border-t border-surface-container w-full" />
            </div>

            {/* Form */}
            <form onSubmit={handleStudentSubmit} className="flex flex-col gap-space-md">
              <div className="flex flex-col gap-1.5">
                <label className="font-label text-xs font-semibold text-on-surface">Student Email</label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">
                    mail
                  </span>
                  <input
                    type="email"
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-body text-xs outline-none focus:ring-2 focus:ring-primary/20 border border-outline-variant/30"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-label text-xs font-semibold text-on-surface">Password</label>
                  <a href="#" className="font-label text-[11px] text-primary hover:underline">
                    Forgot password?
                  </a>
                </div>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">
                    lock
                  </span>
                  <input
                    type={showStudentPassword ? 'text' : 'password'}
                    value={studentPassword}
                    onChange={(e) => setStudentPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-body text-xs outline-none focus:ring-2 focus:ring-primary/20 border border-outline-variant/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowStudentPassword(!showStudentPassword)}
                    className="absolute right-2.5 text-outline hover:text-on-surface"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showStudentPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-primary text-on-primary font-label text-xs font-semibold shadow-md hover:bg-primary-container transition-all flex items-center justify-center gap-1.5 active:scale-[0.99] mt-1"
              >
                <span>Log in to Student Workspace</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>

              {/* Switch to Sign Up */}
              <div className="text-center font-body text-xs text-on-surface-variant mt-1">
                <span>Don't have an account?</span>{' '}
                <button
                  type="button"
                  onClick={() => setCurrentView('signup')}
                  className="font-semibold text-primary hover:underline ml-1"
                >
                  Sign up
                </button>
              </div>
            </form>
          </>
        )}

        {/* Security badges */}
        <div className="pt-2 border-t border-surface-container flex items-center justify-center gap-space-md text-[11px] font-label text-outline flex-wrap">
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-emerald-600">verified</span>
            <span>Role-Based Access Control</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-primary">lock_clock</span>
            <span>Anna Univ Isolated Storage</span>
          </div>
        </div>
      </div>
    </div>
  );
};
