'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Activity, Lock, Mail, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const ok = await login(email, password);
      if (ok) {
        if (email.includes('admin')) {
          router.push('/admin/dashboard');
        } else if (email.includes('donor')) {
          router.push('/donor/dashboard');
        } else if (email.includes('pharmacy')) {
          router.push('/pharmacy/dashboard');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = (demoEmail: string, demoPass: string = 'MedShare123!') => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/30 mb-4">
            <Activity className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Sign in to MedShare
          </h2>
          <p className="mt-1.5 text-xs text-slate-500">
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
              🩸 <strong>Donor</strong> (O- Alex Vance)
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
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm shadow-blue-500/30"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-xs text-slate-500">
          Don't have an account?{' '}
          <Link href="/register" className="text-blue-600 font-semibold hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
