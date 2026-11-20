'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import {
  KeyRound,
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Clock,
  RotateCcw,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();

  // Wizard steps: 'IDENTIFIER' | 'OTP' | 'NEW_PASSWORD' | 'SUCCESS'
  const [step, setStep] = useState<'IDENTIFIER' | 'OTP' | 'NEW_PASSWORD' | 'SUCCESS'>('IDENTIFIER');

  const [identifier, setIdentifier] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Timers & loading
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendSuccess, setResendSuccess] = useState('');

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for OTP
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (step === 'OTP' && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, timerSeconds]);

  // Auto-focus OTP inputs
  useEffect(() => {
    if (step === 'OTP') {
      setTimeout(() => otpInputRefs.current[0]?.focus(), 150);
    }
  }, [step]);

  // Mask identifier for display
  const getMaskedIdentifier = (id: string) => {
    const trimmed = id.trim();
    if (trimmed.includes('@')) {
      const [local, domain] = trimmed.split('@');
      if (local.length <= 2) return `${local.charAt(0)}*@${domain}`;
      return `${local.charAt(0)}${'*'.repeat(Math.min(local.length - 2, 4))}${local.slice(-1)}@${domain}`;
    }
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length <= 4) return '***' + digits;
    return `${trimmed.slice(0, 3)} ***-***-${digits.slice(-4)}`;
  };

  // Step 1: Request Password Reset Code
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = identifier.trim();
    if (!trimmed) {
      setError('Please enter your email address or phone number.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const res = await authApi.forgotPassword({ identifier: trimmed });
      if (res.data?.success) {
        setStep('OTP');
        setTimerSeconds(60);
        setCanResend(false);
        setOtpDigits(['', '', '', '', '', '']);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Could not send verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Handle OTP input
  const handleOtpDigitChange = (index: number, val: string) => {
    const cleaned = val.replace(/\D/g, '');
    if (!cleaned && val !== '') return;

    const char = cleaned.slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = char;
    setOtpDigits(newDigits);
    setError('');

    if (char && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      const newDigits = [...otpDigits];
      newDigits[index - 1] = '';
      setOtpDigits(newDigits);
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setOtpDigits(newDigits);
    setError('');
    const nextIndex = Math.min(pasted.length, 5);
    otpInputRefs.current[nextIndex]?.focus();
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otpDigits.join('');
    if (code.length !== 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const res = await authApi.verifyResetOtp({
        identifier: identifier.trim(),
        otp: code,
      });

      if (res.data?.success) {
        setStep('NEW_PASSWORD');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Invalid or expired verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (!canResend) return;

    setError('');
    setResendSuccess('');
    try {
      const res = await authApi.forgotPassword({ identifier: identifier.trim() });
      if (res.data?.success) {
        setResendSuccess('A new verification code was dispatched.');
        setTimerSeconds(60);
        setCanResend(false);
        setOtpDigits(['', '', '', '', '', '']);
        otpInputRefs.current[0]?.focus();
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Could not resend verification code.');
    }
  };

  // Step 3: Submit New Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const res = await authApi.resetPassword({
        identifier: identifier.trim(),
        otp: otpDigits.join(''),
        newPassword,
        confirmPassword,
      });

      if (res.data?.success) {
        setStep('SUCCESS');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        {step === 'IDENTIFIER' && (
          <>
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 mb-1">
                <KeyRound className="w-6 h-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Reset Your Password
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                Enter your registered email address or phone number to receive a verification code.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3.5 rounded-2xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form
              onSubmit={handleRequestCode}
              className="space-y-4 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address or Phone Number *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="alex@example.com or +1 (555) 019-2834"
                    className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 hover:scale-[1.01] active:scale-[0.99]"
              >
                {isLoading ? 'Sending Code...' : 'Send Verification Code'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <p className="text-center text-xs text-slate-500">
              Remembered your password?{' '}
              <Link href="/login" className="text-blue-600 font-semibold hover:underline">
                Sign In
              </Link>
            </p>
          </>
        )}

        {step === 'OTP' && (
          <>
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25 mb-1">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Enter Verification Code
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                We've sent a 6-digit code to{' '}
                <strong className="text-slate-800 font-mono">
                  {getMaskedIdentifier(identifier)}
                </strong>
              </p>
            </div>

            {resendSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-2xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{resendSuccess}</span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3.5 rounded-2xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form
              onSubmit={handleVerifyOtp}
              className="space-y-6 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm"
            >
              <div className="space-y-2">
                <label className="block text-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                  6-Digit Reset Code
                </label>
                <div className="flex items-center justify-center gap-2 sm:gap-2.5">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        otpInputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onPaste={handleOtpPaste}
                      className="w-11 h-13 sm:w-12 sm:h-14 text-center font-mono font-extrabold text-lg sm:text-xl border-2 border-slate-200 rounded-2xl focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all bg-slate-50/50"
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 px-1">
                <div className="text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {timerSeconds > 0 ? (
                    <span>
                      Resend in <strong className="font-mono text-slate-700">{timerSeconds}s</strong>
                    </span>
                  ) : (
                    <span className="text-amber-600 font-semibold">Code expired</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={!canResend}
                  className="font-bold text-blue-600 hover:text-blue-800 disabled:opacity-40 transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Resend Code
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading || otpDigits.join('').length !== 6}
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-500/25 hover:scale-[1.01] active:scale-[0.99]"
              >
                {isLoading ? 'Verifying Code...' : 'Verify Code'}
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setStep('IDENTIFIER');
                    setError('');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium inline-flex items-center gap-1 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to email/phone entry
                </button>
              </div>
            </form>
          </>
        )}

        {step === 'NEW_PASSWORD' && (
          <>
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 mb-1">
                <Lock className="w-6 h-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Set New Password
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                Create a new secure password for your MedShare account.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3.5 rounded-2xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form
              onSubmit={handleResetPassword}
              className="space-y-4 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Password *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="•••••••• (min 6 chars)"
                    className="w-full pl-9 pr-9 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="•••••••• (re-enter password)"
                    className="w-full pl-9 pr-9 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 hover:scale-[1.01] active:scale-[0.99]"
              >
                {isLoading ? 'Updating Password...' : 'Save New Password'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </>
        )}

        {step === 'SUCCESS' && (
          <div className="text-center space-y-5 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mb-2">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">Password Reset Successfully!</h2>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              Your password has been securely updated. You can now sign in to your MedShare account with your new credentials.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-blue-500/25 gap-2"
            >
              Proceed to Sign In <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
