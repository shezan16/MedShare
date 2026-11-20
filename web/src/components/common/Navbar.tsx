'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Heart,
  Pill,
  Bell,
  User as UserIcon,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  AlertCircle,
  Activity,
  Upload,
  CheckCircle2,
  LayoutDashboard,
} from 'lucide-react';
import { notificationApi } from '@/lib/api';

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      notificationApi
        .getAll()
        .then((res) => {
          if (res.data?.data) {
            setUnreadCount(res.data.data.unreadCount || 0);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const getDashboardUrl = () => {
    if (!user) return '/login';
    if (user.role === 'ADMIN') return '/admin/dashboard';
    return '/dashboard';
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold tracking-tight text-slate-900">
                  Med<span className="text-blue-600">Share</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                  Unified
                </span>
              </div>
              <p className="text-[10px] text-slate-500 hidden sm:block">
                RapidBlood & Medicine Redistribution
              </p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-5 lg:gap-6">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className={`text-xs font-semibold transition-colors hover:text-blue-600 flex items-center gap-1.5 ${
                    pathname === '/dashboard' ? 'text-blue-600 font-bold' : 'text-slate-600'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  Dashboard
                </Link>

                <Link
                  href="/donor/dashboard"
                  className={`text-xs font-semibold transition-colors hover:text-red-600 flex items-center gap-1.5 ${
                    pathname.startsWith('/donor') ? 'text-red-600 font-bold' : 'text-slate-600'
                  }`}
                >
                  <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                  Donor Hub
                </Link>

                <Link
                  href="/medicines"
                  className={`text-xs font-semibold transition-colors hover:text-blue-600 flex items-center gap-1.5 ${
                    pathname === '/medicines' ? 'text-blue-600 font-bold' : 'text-slate-600'
                  }`}
                >
                  <Pill className="w-3.5 h-3.5 text-emerald-500" />
                  Browse Medicines
                </Link>

                <Link
                  href="/pharmacy/upload"
                  className={`text-xs font-semibold transition-colors hover:text-emerald-600 flex items-center gap-1.5 ${
                    pathname === '/pharmacy/upload' ? 'text-emerald-600 font-bold' : 'text-slate-600'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-600" />
                  AI OCR Upload
                </Link>

                <Link
                  href="/pharmacy/requests"
                  className={`text-xs font-semibold transition-colors hover:text-emerald-600 flex items-center gap-1.5 ${
                    pathname === '/pharmacy/requests' ? 'text-emerald-600 font-bold' : 'text-slate-600'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Verification
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/blood-requests/nearby-donors"
                  className={`text-sm font-medium transition-colors hover:text-blue-600 flex items-center gap-1.5 ${
                    pathname.includes('/blood-requests') ? 'text-blue-600 font-semibold' : 'text-slate-600'
                  }`}
                >
                  <Heart className="w-4 h-4 text-red-500" />
                  RapidBlood
                </Link>

                <Link
                  href="/medicines"
                  className={`text-sm font-medium transition-colors hover:text-blue-600 flex items-center gap-1.5 ${
                    pathname.includes('/medicines') ? 'text-blue-600 font-semibold' : 'text-slate-600'
                  }`}
                >
                  <Pill className="w-4 h-4 text-emerald-500" />
                  MedShare Medicine
                </Link>

                <Link
                  href="/how-it-works"
                  className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                    pathname === '/how-it-works' ? 'text-blue-600 font-semibold' : 'text-slate-600'
                  }`}
                >
                  How It Works
                </Link>

                <Link
                  href="/about"
                  className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                    pathname === '/about' ? 'text-blue-600 font-semibold' : 'text-slate-600'
                  }`}
                >
                  About
                </Link>
              </>
            )}
          </div>

          {/* Action CTAs */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Emergency CTA */}
            <Link
              href="/blood-requests/new"
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm shadow-red-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <AlertCircle className="w-4 h-4 animate-pulse" />
              Emergency Blood Request
            </Link>

            {user ? (
              <div className="flex items-center gap-3 ml-2 border-l border-slate-200 pl-3">
                <Link
                  href="/notifications"
                  className="relative p-2 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
                  )}
                </Link>

                <Link
                  href={getDashboardUrl()}
                  className="flex items-center gap-2 py-1.5 px-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-xs font-semibold text-slate-800"
                >
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
                    {user.email.charAt(0).toUpperCase()}
                  </div>
                  <span className="max-w-[110px] truncate">{user.fullName || user.email.split('@')[0]}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 uppercase font-mono font-bold">
                    {user.role === 'ADMIN' ? 'ADMIN' : 'UNIFIED'}
                  </span>
                </Link>

                <button
                  onClick={() => {
                    logout();
                    router.push('/');
                  }}
                  className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-500/20 transition-all"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href="/blood-requests/new"
              className="p-2 text-white bg-red-600 rounded-lg"
              title="Emergency"
            >
              <AlertCircle className="w-4 h-4" />
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-3">
          {user ? (
            <>
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 py-2 text-sm font-semibold text-blue-600"
              >
                <LayoutDashboard className="w-4 h-4" />
                Unified Dashboard
              </Link>
              <Link
                href="/donor/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 py-2 text-sm font-medium text-slate-800"
              >
                <Heart className="w-4 h-4 text-red-500" />
                Donor Hub & Matching
              </Link>
              <Link
                href="/medicines"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 py-2 text-sm font-medium text-slate-800"
              >
                <Pill className="w-4 h-4 text-emerald-500" />
                Browse Medicines
              </Link>
              <Link
                href="/pharmacy/upload"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 py-2 text-sm font-medium text-slate-800"
              >
                <Upload className="w-4 h-4 text-emerald-600" />
                AI OCR Medicine Upload
              </Link>
              <Link
                href="/pharmacy/requests"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 py-2 text-sm font-medium text-slate-800"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Pharmacist Verification
              </Link>
              <Link
                href="/blood-requests/new"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full py-2.5 text-center text-sm font-semibold text-white bg-red-600 rounded-lg shadow-sm"
              >
                Emergency Blood Request
              </Link>
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">
                  Signed in as <strong>{user.fullName || user.email}</strong>
                </span>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                    router.push('/');
                  }}
                  className="text-xs font-semibold text-red-600 hover:underline"
                >
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <>
              <Link
                href="/blood-requests/nearby-donors"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 py-2 text-sm font-medium text-slate-800"
              >
                <Heart className="w-4 h-4 text-red-500" />
                RapidBlood Donors
              </Link>
              <Link
                href="/medicines"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 py-2 text-sm font-medium text-slate-800"
              >
                <Pill className="w-4 h-4 text-emerald-500" />
                Medicine Redistribution
              </Link>
              <Link
                href="/how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm font-medium text-slate-800"
              >
                How It Works
              </Link>
              <Link
                href="/blood-requests/new"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full py-2.5 text-center text-sm font-semibold text-white bg-red-600 rounded-lg shadow-sm"
              >
                Create Emergency Blood Request
              </Link>
              <div className="pt-3 border-t border-slate-200 grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 text-center text-sm font-semibold border border-slate-200 rounded-lg"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 text-center text-sm font-semibold text-white bg-blue-600 rounded-lg"
                >
                  Register
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
