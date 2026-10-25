import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { signInWithGoogle } from '../../api/firebase';

export const SignUpView: React.FC = () => {
  const { setCurrentView, setUser } = useApp();
  const [fullName, setFullName] = useState('Alex Mercer');
  const [email, setEmail] = useState('alex.mercer@enterprise.internal');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUser((prev) => ({
      ...prev,
      name: fullName || prev.name,
      email: email || prev.email,
    }));
    // Flow: Sign Up -> Workspace Setup
    setCurrentView('setup');
  };

  const handleGoogleSignUp = async () => {
    try {
      setIsGoogleLoading(true);
      setErrorMessage(null);
      const authResult = await signInWithGoogle();
      
      setUser((prev) => ({
        ...prev,
        name: authResult.displayName,
        email: authResult.email,
      }));

      // Redirect to course/workspace setup after sign-up
      setCurrentView('setup');
    } catch (err: any) {
      console.error('Google Sign-Up Error:', err);
      setErrorMessage(err?.message || 'Google Sign-Up failed. Please try again.');
    } finally {
      setIsGoogleLoading(false);
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
            Create Your Account
          </h1>
          <p className="font-body text-xs text-on-surface-variant max-w-xs">
            Join Aether AI to deploy and query grounded Anna University knowledge bases.
          </p>
        </div>

        {/* Error alert if any */}
        {errorMessage && (
          <div className="p-2.5 rounded-xl bg-error-container/20 border border-error/30 text-error text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Google Sign-In Button */}
        <button
          type="button"
          onClick={handleGoogleSignUp}
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
            or with email
          </span>
          <div className="border-t border-surface-container w-full" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-space-md">
          {/* Full Name */}
          <div className="flex flex-col gap-1.5">
            <label className="font-label text-xs font-semibold text-on-surface">Full Name</label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">
                person
              </span>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Alex Mercer"
                required
                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-body text-xs outline-none focus:ring-2 focus:ring-primary/20 border border-outline-variant/30"
              />
            </div>
          </div>

          {/* Work Email */}
          <div className="flex flex-col gap-1.5">
            <label className="font-label text-xs font-semibold text-on-surface">Work Email</label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">
                mail
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex.mercer@enterprise.internal"
                required
                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-body text-xs outline-none focus:ring-2 focus:ring-primary/20 border border-outline-variant/30"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="font-label text-xs font-semibold text-on-surface">Password</label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">
                lock
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-body text-xs outline-none focus:ring-2 focus:ring-primary/20 border border-outline-variant/30"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="remember-device"
              defaultChecked
              className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
            />
            <label htmlFor="remember-device" className="font-label text-xs text-on-surface-variant cursor-pointer select-none">
              Remember this trusted device
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-primary text-on-primary font-label text-xs font-semibold shadow-md hover:bg-primary-container transition-all flex items-center justify-center gap-1.5 active:scale-[0.99] mt-1"
          >
            <span>Sign Up to Workspace Setup</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>

          {/* Switch to Login */}
          <div className="text-center font-body text-xs text-on-surface-variant mt-1">
            <span>Already have an account?</span>{' '}
            <button
              type="button"
              onClick={() => setCurrentView('login')}
              className="font-semibold text-primary hover:underline ml-1"
            >
              Log in
            </button>
          </div>
        </form>

        {/* Security badges */}
        <div className="pt-2 border-t border-surface-container flex items-center justify-center gap-space-md text-[11px] font-label text-outline flex-wrap">
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-emerald-600">verified</span>
            <span>Firebase Auth Protected</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-primary">lock_clock</span>
            <span>256-Bit SSL Secured</span>
          </div>
        </div>
      </div>
    </div>
  );
};
