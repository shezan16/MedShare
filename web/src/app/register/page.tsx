'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/lib/api';
import {
  Activity,
  Lock,
  Mail,
  User,
  Heart,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Clock,
  RotateCcw,
  ArrowLeft,
} from 'lucide-react';
import { BloodGroup } from '@/types';

export default function RegisterPage() {
  const router = useRouter();
  const { setAuthSession } = useAuth();

  // Step state: 'FORM' or 'OTP'
  const [step, setStep] = useState<'FORM' | 'OTP'>('FORM');

  // Exactly 5 user-facing form inputs
  const [fullName, setFullName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('O_POS');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validation & Loading states
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // OTP Verification state
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resendSuccess, setResendSuccess] = useState('');
  const [destinationType, setDestinationType] = useState<'email' | 'phone'>('email');

  // Input refs for 6-box OTP auto-focus and auto-advance
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer countdown effect for OTP resend
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

  // Auto-focus first OTP input when switching to OTP step
  useEffect(() => {
    if (step === 'OTP') {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    }
  }, [step]);

  // Validation helper
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!fullName.trim()) {
      errors.fullName = 'Full legal name is required.';
    }

    const trimmedId = identifier.trim();
    if (!trimmedId) {
      errors.identifier = 'Email address or phone number is required.';
    } else if (trimmedId.includes('@')) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedId)) {
        errors.identifier = 'Please enter a valid email address.';
      }
    } else {
      const digits = trimmedId.replace(/\D/g, '');
      if (digits.length < 7) {
        errors.identifier = 'Please enter a valid phone number with area code.';
      }
    }

    if (!bloodGroup) {
      errors.bloodGroup = 'Please select your blood group.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Mask identifier for UI display
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

  // Handle Form Submission -> Request OTP
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const res = await authApi.registerRequest({
        fullName: fullName.trim(),
        identifier: identifier.trim(),
        bloodGroup,
        password,
        confirmPassword,
      });

      if (res.data?.success) {
        const dest = res.data.data?.destinationType || (identifier.includes('@') ? 'email' : 'phone');
        setDestinationType(dest);
        setStep('OTP');
        setTimerSeconds(res.data.data?.resendCooldown || 60);
        setCanResend(false);
        setOtpDigits(['', '', '', '', '', '']);
        setOtpError('');
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message || 'Registration failed. Please check your credentials.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP digit changes
  const handleOtpDigitChange = (index: number, val: string) => {
    // Only accept numeric digit
    const cleaned = val.replace(/\D/g, '');
    if (!cleaned && val !== '') return;

    const char = cleaned.slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = char;
    setOtpDigits(newDigits);
    setOtpError('');

    // Auto-advance to next input
    if (char && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace navigation between OTP inputs
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
        otpInputRefs.current[index - 1]?.focus();
      }
    }
  };

  // Support pasting the entire 6-digit OTP
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setOtpDigits(newDigits);
    setOtpError('');

    // Focus last filled or next input
    const nextIndex = Math.min(pasted.length, 5);
    otpInputRefs.current[nextIndex]?.focus();
  };

  // Handle OTP Verification Submission
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otpDigits.join('');
    if (otpCode.length !== 6) {
      setOtpError('Please enter all 6 digits of your verification code.');
      return;
    }

    setOtpError('');
    setIsVerifying(true);

    try {
      const res = await authApi.verifyOtp({
        identifier: identifier.trim(),
        otp: otpCode,
      });

      if (res.data?.success) {
        const { token, user } = res.data.data;
        setAuthSession(token, user);
        router.push('/dashboard');
      }
    } catch (err: any) {
      setOtpError(
        err?.response?.data?.error?.message || 'Invalid or expired verification code. Please try again.'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (!canResend) return;

    setOtpError('');
    setResendSuccess('');
    try {
      const res = await authApi.resendOtp({
        identifier: identifier.trim(),
        type: 'REGISTRATION',
      });

      if (res.data?.success) {
        setResendSuccess('A fresh verification code has been dispatched.');
        setTimerSeconds(60);
        setCanResend(false);
        setOtpDigits(['', '', '', '', '', '']);
        otpInputRefs.current[0]?.focus();
      }
    } catch (err: any) {
      setOtpError(err?.response?.data?.error?.message || 'Could not resend verification code. Please wait.');
    }
  };

  return (
    <div className="min-h-[82vh] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        {step === 'FORM' ? (
          /* ======================================================== */
          /* 1. SIMPLE 5-FIELD SIGN-UP FORM                            */
          /* ======================================================== */
          <>
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 mb-1">
                <Activity className="w-6 h-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Create Account
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                Join MedShare and access healthcare services from a single account.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3.5 rounded-2xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form
              onSubmit={handleSubmitForm}
              className="space-y-4 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm"
            >
              {/* 1. Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (fieldErrors.fullName) setFieldErrors((prev) => ({ ...prev, fullName: '' }));
                    }}
                    placeholder="e.g. Dr. Alex Vance"
                    className={`w-full pl-9 pr-3 py-2.5 text-xs border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                      fieldErrors.fullName ? 'border-red-400 bg-red-50/20' : 'border-slate-200'
                    }`}
                  />
                </div>
                {fieldErrors.fullName && (
                  <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" /> {fieldErrors.fullName}
                  </p>
                )}
              </div>

              {/* 2. Email Address / Phone Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address / Phone Number *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (fieldErrors.identifier) setFieldErrors((prev) => ({ ...prev, identifier: '' }));
                    }}
                    placeholder="alex@example.com or +1 (555) 019-2834"
                    className={`w-full pl-9 pr-3 py-2.5 text-xs border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                      fieldErrors.identifier ? 'border-red-400 bg-red-50/20' : 'border-slate-200'
                    }`}
                  />
                </div>
                {fieldErrors.identifier ? (
                  <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" /> {fieldErrors.identifier}
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    We will send a 6-digit verification code to this contact.
                  </p>
                )}
              </div>

              {/* 3. Blood Group Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Blood Group *
                </label>
                <div className="relative">
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
                    className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-mono font-bold text-slate-900"
                  >
                    <option value="A_POS">A+ (A Positive)</option>
                    <option value="A_NEG">A- (A Negative)</option>
                    <option value="B_POS">B+ (B Positive)</option>
                    <option value="B_NEG">B- (B Negative)</option>
                    <option value="AB_POS">AB+ (AB Positive - Universal Recipient)</option>
                    <option value="AB_NEG">AB- (AB Negative)</option>
                    <option value="O_POS">O+ (O Positive)</option>
                    <option value="O_NEG">O- (O Negative - Universal Donor)</option>
                  </select>
                </div>
                {fieldErrors.bloodGroup && (
                  <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" /> {fieldErrors.bloodGroup}
                  </p>
                )}
              </div>

              {/* 4. Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                    }}
                    placeholder="•••••••• (min 6 chars)"
                    className={`w-full pl-9 pr-9 py-2.5 text-xs border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                      fieldErrors.password ? 'border-red-400 bg-red-50/20' : 'border-slate-200'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" /> {fieldErrors.password}
                  </p>
                )}
              </div>

              {/* 5. Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm Password *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (fieldErrors.confirmPassword)
                        setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
                    }}
                    placeholder="•••••••• (re-enter password)"
                    className={`w-full pl-9 pr-9 py-2.5 text-xs border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                      fieldErrors.confirmPassword ? 'border-red-400 bg-red-50/20' : 'border-slate-200'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" /> {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 hover:scale-[1.01] active:scale-[0.99]"
              >
                {isLoading ? 'Sending Verification Code...' : 'Create Account'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <p className="text-center text-xs text-slate-500">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-600 font-semibold hover:underline">
                Sign In here
              </Link>
            </p>
          </>
        ) : (
          /* ======================================================== */
          /* 2. DEDICATED OTP VERIFICATION SCREEN                     */
          /* ======================================================== */
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25 mb-1">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Verify Your Account
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                We've sent a 6-digit verification code to your{' '}
                {destinationType === 'email' ? 'email address' : 'phone number'}:
                <br />
                <span className="font-semibold text-slate-800 font-mono">
                  {getMaskedIdentifier(identifier)}
                </span>
              </p>
            </div>

            {resendSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-2xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{resendSuccess}</span>
              </div>
            )}

            {otpError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3.5 rounded-2xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{otpError}</span>
              </div>
            )}

            {/* OTP Form */}
            <form
              onSubmit={handleVerifyOtp}
              className="space-y-6 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm"
            >
              {/* 6-digit OTP Box Input */}
              <div className="space-y-2">
                <label className="block text-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Enter 6-Digit Code
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

              {/* Countdown & Resend */}
              <div className="flex items-center justify-between text-xs pt-1 px-1">
                <div className="text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {timerSeconds > 0 ? (
                    <span>
                      Resend code in <strong className="font-mono text-slate-700">{timerSeconds}s</strong>
                    </span>
                  ) : (
                    <span className="text-amber-600 font-semibold">Code expired</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={!canResend}
                  className="font-bold text-blue-600 hover:text-blue-800 disabled:opacity-40 disabled:hover:text-blue-600 transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Resend Code
                </button>
              </div>

              {/* Verification Button */}
              <button
                type="submit"
                disabled={isVerifying || otpDigits.join('').length !== 6}
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-500/25 hover:scale-[1.01] active:scale-[0.99]"
              >
                {isVerifying ? 'Verifying Code...' : 'Verify & Activate Account'}
                <ShieldCheck className="w-4 h-4" />
              </button>

              {/* Back to Edit Info */}
              <div className="text-center pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setStep('FORM');
                    setError('');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium inline-flex items-center gap-1 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Wrong email or phone? Edit details
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
