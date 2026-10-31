import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types';
import { Mail, Key, User, GraduationCap, ArrowRight, RefreshCw, ShieldCheck, Lock, AtSign } from 'lucide-react';
import { api } from '../api';

interface AuthSectionProps {
  onLogin: (user: UserProfile) => void;
  darkMode: boolean;
  initialMode?: Mode;
  onBackToLanding?: () => void;
}

type Step = 'form' | 'otp' | 'new-password';
type Mode = 'login' | 'register' | 'forgot' | 'update-email';

export default function AuthSection({ onLogin, darkMode, initialMode, onBackToLanding }: AuthSectionProps) {
  const [mode, setMode] = useState<Mode>(initialMode ?? 'login');
  const [step, setStep] = useState<Step>('form');

  // Read referral codes from both ?ref=XXXXXXXX and /invite/XXXXXXXX links.
  const [referralCode] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const invitePathMatch = window.location.pathname.match(/^\/invite\/([^/]+)/i);
    return params.get('ref') || (invitePathMatch ? decodeURIComponent(invitePathMatch[1]) : '') || '';
  });

  // Auto-open register tab when a referral link is used
  useEffect(() => {
    if (referralCode) setMode('register');
  }, [referralCode]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const switchMode = (m: Mode) => {
    setMode(m); setStep('form'); setError(''); setSuccess('');
    setOtp(['', '', '', '', '', '']);
    setNewPassword(''); setConfirmPassword('');
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs.current[5]?.focus();
    }
  };

  const sendOtp = async (isResend = false) => {
    setError(''); setSuccess('');
    // OTP is never used for login — login uses email + password directly
    if (mode === 'login') return;
    if (!email) { setError('Please enter your email first.'); return; }
    if (mode === 'register' && !fullName) {
      setError('Please enter your full name first.'); return;
    }
    if (mode === 'register' && !email.includes('@')) {
      setError('Please use an email address so we can send your verification code.'); return;
    }
    setLoading(true);
    try {
      const purpose = mode === 'forgot' ? 'forgot-password' : 'register';
      const data = mode === 'register'
        ? { fullName, password, referralCode: referralCode || undefined }
        : undefined;
      await api.auth.sendOtp(email, purpose, data);
      setStep('otp');
      setResendCooldown(60);
      if (isResend) setOtp(['', '', '', '', '', '']);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendEmailChangeOtp = async () => {
    setError(''); setSuccess('');
    if (!currentEmail || !newEmail) { setError('Please fill in both emails.'); return; }
    if (!newEmail.includes('@gmail.com') && !newEmail.includes('@')) { setError('Please enter a valid email.'); return; }
    setLoading(true);
    try {
      await api.auth.sendEmailChangeOtp(currentEmail, newEmail);
      setStep('otp');
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) { setError('Please enter the 6-digit code.'); return; }
    setLoading(true); setError('');
    try {
      const { email: updated } = await api.auth.confirmEmailChange(currentEmail, code);
      setSuccess(`Email updated to ${updated}! You can now sign in with your new email.`);
      setTimeout(() => switchMode('login'), 2500);
    } catch (err: any) {
      setError(err.message);
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) { setError('Please enter the 6-digit code.'); return; }

    if (mode === 'update-email') {
      confirmEmailChange(e);
      return;
    }

    if (mode === 'forgot') {
      setStep('new-password');
      setError('');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { user } = await api.auth.verifyOtp(email, code);
      onLogin(user);
    } catch (err: any) {
      setError(err.message);
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true); setError('');
    try {
      await api.auth.resetPassword(email, otp.join(''), newPassword);
      setSuccess('Password reset! You can now sign in with your new password.');
      setTimeout(() => switchMode('login'), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'login') {
      if (!email) { setError('Enter your email.'); return; }
      if (!password) { setError('Enter your password.'); return; }
      setLoading(true); setError('');
      try {
        const { user } = await api.auth.login(email, password);
        onLogin(user);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
      return;
    }
    if (mode === 'register') {
      if (!fullName) { setError('Enter your full name.'); return; }
      if (!email) { setError('Enter your email.'); return; }
      if (!password || password.length < 8) { setError('Password must be at least 8 characters.'); return; }
      // Send OTP first — account is created only after email is verified
      sendOtp();
      return;
    }
    sendOtp();
  };

  const card = `w-full max-w-md rounded-2xl border border-neutral-200 dark:border-white/10 p-8 shadow-md transition-all ${darkMode ? 'bg-[#121217]' : 'bg-white'}`;
  const input = `w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-neutral-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${darkMode ? 'bg-[#09090C] text-white placeholder:text-slate-600' : 'bg-white text-slate-800 placeholder:text-slate-400'}`;

  return (
    <div className={`min-h-[100dvh] overflow-y-auto flex flex-col items-center justify-center px-6 py-8 transition-all ${darkMode ? 'bg-[#09090C] text-slate-100' : 'bg-neutral-50 text-slate-900'}`}>
      <div className={card}>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3 bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-sm">
            <GraduationCap size={22} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-wide uppercase text-indigo-500">The Network</h1>
          {(mode === 'register' || mode === 'login') && step === 'form' ? (
            <p className={`mx-auto mt-2 max-w-sm text-sm font-bold leading-relaxed ${
              darkMode
                ? 'text-indigo-200'
                : 'text-indigo-700'
            }`}>
              {mode === 'register'
                ? "Because talent shouldn't be limited by your college, city, or background."
                : 'Connect with students from across India — no matter your college, city, or background.'}
            </p>
          ) : (
            <p className="text-xs mt-1.5 max-w-xs mx-auto text-slate-400">
              {mode === 'forgot'
                ? 'Reset your password'
                : mode === 'update-email'
                  ? 'Switch to your personal email'
                  : mode === 'register'
                    ? 'Verify your email to continue.'
                    : ''}
            </p>
          )}
        </div>

        {/* Tab switcher — hide on forgot / update-email mode */}
        {step === 'form' && mode !== 'forgot' && mode !== 'update-email' && (
          <div className={`flex rounded-xl p-1 mb-6 text-xs font-bold uppercase tracking-wider border border-neutral-200 dark:border-white/5 ${darkMode ? 'bg-[#09090C]' : 'bg-neutral-100'}`}>
            <button onClick={() => switchMode('login')} className={`py-2 flex-1 rounded-lg transition-all cursor-pointer ${mode === 'login' ? 'bg-indigo-500 text-white shadow-sm' : 'opacity-40 hover:opacity-80 text-slate-400'}`}>
              Sign In
            </button>
            <button onClick={() => switchMode('register')} className={`py-2 flex-1 rounded-lg transition-all cursor-pointer ${mode === 'register' ? 'bg-indigo-500 text-white shadow-sm' : 'opacity-40 hover:opacity-80 text-slate-400'}`}>
              Register
            </button>
          </div>
        )}

        {/* Error / success banners */}
        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className={`p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-center font-semibold ${
              error.toLowerCase().includes('suspended')
                ? 'text-xs leading-relaxed'
                : 'text-[10.5px] font-mono uppercase tracking-wide'
            }`}
          >
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10.5px] text-center font-semibold font-mono uppercase tracking-wide">
            {success}
          </div>
        )}

        {/* ── FORGOT PASSWORD — email form ── */}
        {mode === 'forgot' && step === 'form' && (
          <form onSubmit={e => { e.preventDefault(); sendOtp(); }} className="space-y-4 text-left">
            <p className="text-xs text-slate-400 text-center mb-2">
              Enter the email you registered with and we'll send you an OTP to reset your password.
            </p>
            <div>
              <label className="block text-[8.5px] uppercase tracking-wider font-extrabold text-slate-400 mb-1">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"><Mail size={15} /></span>
               <input data-testid="input-forgot-email" type="email" required placeholder="you@gmail.com" value={email} onChange={e => setEmail(e.target.value)} className={input} />
              </div>
            </div>
             <button data-testid="button-send-reset-otp" type="submit" disabled={loading} className="w-full mt-2 py-2.5 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white font-extrabold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer">
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending OTP...</>
              ) : (
                <>Send Reset OTP <ArrowRight size={14} /></>
              )}
            </button>
            <p className="text-center text-[10px] text-slate-400 pt-1">
              <button type="button" onClick={() => switchMode('login')} className="text-indigo-500 font-bold underline cursor-pointer">
                ← Back to Sign In
              </button>
            </p>
          </form>
        )}

        {/* ── LOGIN / REGISTER form ── */}
        {mode !== 'forgot' && step === 'form' && (
          <form onSubmit={handleFormSubmit} className="space-y-4 text-left">

            {mode === 'register' && (
              <div>
                <label className="block text-[8.5px] uppercase tracking-wider font-extrabold text-slate-400 mb-1">Full Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"><User size={15} /></span>
                   <input data-testid="input-signup-full-name" type="text" required autoComplete="name" placeholder="Your Full Name" value={fullName} onChange={e => setFullName(e.target.value)} className={input} />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[8.5px] uppercase tracking-wider font-extrabold text-slate-400 mb-1">{mode === 'register' ? 'Email / Phone' : 'Email Address'}</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"><Mail size={15} /></span>
                 <input data-testid={mode === 'register' ? 'input-signup-email' : 'input-login-email'} type={mode === 'register' ? 'text' : 'email'} inputMode={mode === 'register' ? 'email' : undefined} required autoComplete={mode === 'register' ? 'email' : 'username'} placeholder={mode === 'register' ? 'you@gmail.com or +91...' : 'you@gmail.com'} value={email} onChange={e => setEmail(e.target.value)} className={input} />
              </div>
              {mode === 'register' && <p className="mt-1 text-[9px] text-slate-400">Use an email address for verification. You can add more contact details later.</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[8.5px] uppercase tracking-wider font-extrabold text-slate-400">
                   Password
                </label>
                {mode === 'login' && (
                  <button type="button" onClick={() => switchMode('forgot')} className="text-[9px] text-indigo-500 hover:text-indigo-600 font-semibold cursor-pointer">
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"><Key size={15} /></span>
                  <input data-testid={mode === 'register' ? 'input-signup-password' : 'input-login-password'} type="password" required minLength={mode === 'register' ? 8 : undefined} placeholder={mode === 'register' ? 'At least 8 characters' : '••••••••'} value={password} onChange={e => setPassword(e.target.value)} className={input} />
              </div>
            </div>

             <button data-testid={mode === 'register' ? 'button-create-account' : 'button-sign-in'} type="submit" disabled={loading} className="w-full mt-2 py-2.5 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white font-extrabold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer">
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {mode === 'login' ? 'Signing in...' : 'Creating Account...'}</>
              ) : (
                <>{mode === 'login' ? 'Sign In' : 'Create Account'} <ArrowRight size={14} /></>
              )}
            </button>

            <p className="text-center text-[10px] text-slate-400 pt-1">
              {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
              <button type="button" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')} className="text-indigo-500 font-bold underline cursor-pointer">
                {mode === 'login' ? 'Register here' : 'Sign in'}
              </button>
            </p>
            {mode === 'login' && (
              <p className="text-center text-[10px] text-slate-400">
                Registered with institute email?{' '}
                <button type="button" onClick={() => switchMode('update-email')} className="text-indigo-500 font-bold underline cursor-pointer">
                  Switch to Gmail
                </button>
              </p>
            )}
          </form>
        )}

        {/* ── UPDATE EMAIL form ── */}
        {mode === 'update-email' && step === 'form' && (
          <form onSubmit={e => { e.preventDefault(); sendEmailChangeOtp(); }} className="space-y-4 text-left">
            <div className={`p-3 rounded-xl text-[10.5px] text-center border ${darkMode ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-700'}`}>
              Enter your current institute email and the Gmail you want to use instead. We'll verify your Gmail with an OTP.
            </div>
            <div>
              <label className="block text-[8.5px] uppercase tracking-wider font-extrabold text-slate-400 mb-1">Current Institute Email</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"><Mail size={15} /></span>
               <input data-testid="input-current-email" type="email" required placeholder="you@nitt.edu" value={currentEmail} onChange={e => setCurrentEmail(e.target.value)} className={input} />
              </div>
            </div>
            <div>
              <label className="block text-[8.5px] uppercase tracking-wider font-extrabold text-slate-400 mb-1">Your Personal Gmail</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"><AtSign size={15} /></span>
               <input data-testid="input-new-email" type="email" required placeholder="you@gmail.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} className={input} />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full mt-2 py-2.5 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white font-extrabold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer">
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending OTP...</>
              ) : (
                <>Send Verification OTP <ArrowRight size={14} /></>
              )}
            </button>
            <p className="text-center text-[10px] text-slate-400 pt-1">
              <button type="button" onClick={() => switchMode('login')} className="text-indigo-500 font-bold underline cursor-pointer">
                ← Back to Sign In
              </button>
            </p>
          </form>
        )}

        {/* ── OTP STEP ── */}
        {step === 'otp' && (
          <form onSubmit={verifyOtp} className="space-y-6 text-center">
            <div>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-500 mb-4">
                <ShieldCheck size={22} />
              </div>
              <h2 className="font-bold text-base mb-1">Check your email</h2>
              <p className="text-xs text-slate-400">
                {mode === 'update-email'
                  ? <>We sent a verification code to your Gmail<br /><strong className="text-slate-700 dark:text-slate-200">{newEmail}</strong></>
                  : <>We sent a 6-digit code to<br /><strong className="text-slate-700 dark:text-slate-200">{mode === 'forgot' ? email : email}</strong></>
                }
              </p>
            </div>

            {/* 6-box OTP input */}
            <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  className={`shrink-0 w-11 text-center text-xl font-black rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all ${
                    digit
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-800 dark:text-white'
                  }`}
                  style={{
                    width: '44px',
                    minWidth: '44px',
                    height: '52px',
                    flex: '0 0 44px',
                    border: `2px solid ${digit ? '#6366f1' : darkMode ? 'rgba(255,255,255,0.28)' : '#cbd5e1'}`,
                    borderRadius: '12px',
                    backgroundColor: darkMode ? '#09090C' : '#ffffff',
                    color: darkMode ? '#ffffff' : digit ? '#4f46e5' : '#1e293b',
                    opacity: 1,
                    WebkitAppearance: 'none',
                  }}
                  autoFocus={i === 0}
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || otp.join('').length < 6}
              className="w-full py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Verifying...</>
              ) : mode === 'forgot' ? (
                <><Lock size={14} /> Continue to Reset Password</>
              ) : (
                <><ShieldCheck size={14} /> Verify & Continue</>
              )}
            </button>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setOtp(['', '', '', '', '', '']);
                  if (mode === 'update-email') sendEmailChangeOtp();
                  else sendOtp(true);
                }}
                disabled={resendCooldown > 0 || loading}
                className="text-xs text-indigo-500 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 mx-auto transition-colors"
              >
                <RefreshCw size={11} />
                {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('form'); setOtp(['', '', '', '', '', '']); setError(''); }}
                className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer block mx-auto"
              >
                ← Change email
              </button>
            </div>
          </form>
        )}

        {/* ── NEW PASSWORD STEP (forgot only) ── */}
        {mode === 'forgot' && step === 'new-password' && (
          <form onSubmit={handleResetPassword} className="space-y-4 text-left">
            <div className="text-center mb-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-500 mb-3">
                <Lock size={22} />
              </div>
              <h2 className="font-bold text-base">Set New Password</h2>
              <p className="text-xs text-slate-400 mt-1">Choose a strong password for your account.</p>
            </div>

            <div>
              <label className="block text-[8.5px] uppercase tracking-wider font-extrabold text-slate-400 mb-1">New Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"><Key size={15} /></span>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className={input}
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-[8.5px] uppercase tracking-wider font-extrabold text-slate-400 mb-1">Confirm Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"><Key size={15} /></span>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className={input}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white font-extrabold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
              ) : (
                <><Lock size={14} /> Reset Password</>
              )}
            </button>
          </form>
        )}

        {/* Promo video link */}
        {step === 'form' && (mode === 'login' || mode === 'register') && (
          <div className="mt-5 pt-4 border-t border-neutral-200 dark:border-white/5 text-center">
            <a
              href="/video"
              className="inline-flex items-center gap-2 text-[11px] font-semibold text-indigo-500 hover:text-indigo-400 transition-colors group"
            >
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/15 group-hover:bg-indigo-500/25 transition-colors">
                <svg width="8" height="9" viewBox="0 0 8 9" fill="currentColor">
                  <path d="M1 1.5L7 4.5L1 7.5V1.5Z"/>
                </svg>
              </span>
              Watch the product video
            </a>
          </div>
        )}

      </div>
    </div>
  );
}
