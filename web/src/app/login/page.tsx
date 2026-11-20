'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Activity,
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  // Exactly 2 user-facing inputs: Identifier (Email/Phone) and Password
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedId = identifier.trim();
    if (!trimmedId) {
      setError('Please enter your email address or phone number.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);

    try {
      const ok = await login(trimmedId, password);
      if (ok) {
        if (trimmedId.includes('admin')) {
          router.push('/admin/dashboard');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message ||
          'Invalid credentials. Please verify your email/phone and password.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = (demoId: string, demoPass: string = 'MedShare123!') => {
    setIdentifier(demoId);
    setPassword(demoPass);
    setError('');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 mb-1">
            <Activity className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Sign in to MedShare
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
            Access your RapidBlood and medicine redistribution workspace
          </p>
        </div>

        {/* Demo Quick-Fill Buttons */}
        <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4">
          <p className="text-[11px] font-bold text-blue-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> One-Click Demo Role Accounts:
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickDemo('admin@medshare.org')}
              className="px-2.5 py-1.5 bg-white hover:bg-blue-100/50 border border-blue-200 rounded-lg text-slate-700 font-medium text-left transition-colors"
            >
              👑 <strong>Admin</strong> (Review & Ops)
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('donor@medshare.org')}
              className="px-2.5 py-1.5 bg-white hover:bg-blue-100/50 border border-blue-200 rounded-lg text-slate-700 font-medium text-left transition-colors"
            >
              🩸 <strong>Donor</strong> (Alex Vance)
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('pharmacy@medshare.org')}
              className="px-2.5 py-1.5 bg-white hover:bg-blue-100/50 border border-blue-200 rounded-lg text-slate-700 font-medium text-left transition-colors"
            >
              💊 <strong>Pharmacy</strong> (Verified)
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('patient@medshare.org')}
              className="px-2.5 py-1.5 bg-white hover:bg-blue-100/50 border border-blue-200 rounded-lg text-slate-700 font-medium text-left transition-colors"
            >
              🏥 <strong>Requester</strong> (Patient)
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3.5 rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form with exactly 2 inputs */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm"
        >
          {/* 1. Email Address or Phone Number */}
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

          {/* 2. Password */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">Password *</label>
              <Link
                href="/forgot-password"
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 hover:scale-[1.01] active:scale-[0.99]"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-xs text-slate-500">
          Don't have an account?{' '}
          <Link href="/register" className="text-blue-600 font-semibold hover:underline">
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
}
