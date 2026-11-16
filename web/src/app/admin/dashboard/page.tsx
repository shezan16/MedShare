'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { adminApi } from '@/lib/api';
import {
  ShieldCheck,
  Users,
  Heart,
  Pill,
  Building2,
  AlertTriangle,
  Activity,
  ArrowRight,
  CheckCircle2,
  FileText,
  TrendingUp,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>({
    totalUsers: 24,
    totalDonors: 14,
    activeDonors: 11,
    verifiedDonors: 9,
    totalBloodRequests: 18,
    activeBloodRequests: 6,
    completedBloodRequests: 12,
    verifiedPharmacies: 5,
    pendingPharmacies: 2,
    totalMedicines: 48,
    pendingMedicines: 4,
    pendingReports: 1,
  });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [bloodGroups, setBloodGroups] = useState<any[]>([
    { group: 'O+', count: 8 },
    { group: 'O-', count: 6 },
    { group: 'A+', count: 7 },
    { group: 'A-', count: 3 },
    { group: 'B+', count: 4 },
    { group: 'B-', count: 2 },
    { group: 'AB+', count: 2 },
    { group: 'AB-', count: 1 },
  ]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    adminApi
      .getDashboard()
      .then((res) => {
        if (res.data?.data) {
          if (res.data.data.stats) setStats(res.data.data.stats);
          if (res.data.data.recentActivity) setRecentLogs(res.data.data.recentActivity);
          if (res.data.data.bloodGroupDistribution?.length) {
            setBloodGroups(
              res.data.data.bloodGroupDistribution.map((b: any) => ({
                group: b.group.replace('_', ''),
                count: b.count,
              }))
            );
          }
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Platform Governance Terminal
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            MedShare Global Administration
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Real-time platform metrics, user access controls, healthcare partner verifications, and fraud reports.
          </p>
        </div>

        {/* Quick Nav Links */}
        <div className="flex flex-wrap gap-2 text-xs">
          <Link
            href="/admin/users"
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold transition-colors"
          >
            User Controls
          </Link>
          <Link
            href="/admin/donors"
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold transition-colors"
          >
            Donor Verification
          </Link>
          <Link
            href="/admin/pharmacies"
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold transition-colors"
          >
            Pharmacy Verification
          </Link>
          <Link
            href="/admin/reports"
            className="px-3.5 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors flex items-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Fraud Reports ({stats.pendingReports})
          </Link>
        </div>
      </div>

      {/* Primary 8 Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Total Users</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{stats.totalUsers}</p>
          <span className="text-[10px] text-slate-400">All registered roles</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Active / Verified Donors</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-red-600">
            {stats.activeDonors} <span className="text-xs text-slate-400 font-normal">/ {stats.verifiedDonors} verif</span>
          </p>
          <span className="text-[10px] text-red-500 font-medium">Ready for dispatch</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Total Blood Requests</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-blue-600">
            {stats.totalBloodRequests}
          </p>
          <span className="text-[10px] text-blue-500 font-medium">{stats.activeBloodRequests} active searching</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Completed Transfusions</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
            {stats.completedBloodRequests}
          </p>
          <span className="text-[10px] text-emerald-600 font-medium">Fulfilled emergency requests</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Verified Pharmacies</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {stats.verifiedPharmacies}
          </p>
          <span className="text-[10px] text-amber-600 font-medium">{stats.pendingPharmacies} pending review</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Listed Medicines</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {stats.totalMedicines}
          </p>
          <span className="text-[10px] text-emerald-600 font-medium">{stats.pendingMedicines} pending OCR sign</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Verification Queue</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-amber-600">
            {stats.pendingPharmacies + stats.pendingMedicines}
          </p>
          <span className="text-[10px] text-slate-400">Institutional items</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Fraud Reports</span>
          <p className="text-2xl sm:text-3xl font-extrabold text-red-600">
            {stats.pendingReports}
          </p>
          <span className="text-[10px] text-red-500 font-medium">Flagged for investigation</span>
        </div>
      </div>

      {/* Visual Distribution Chart: Blood Groups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-600 fill-red-600" /> Blood Group Emergency Demand Index
            </h3>
            <span className="text-xs text-slate-400">Requests by Blood Type</span>
          </div>

          <div className="space-y-3 pt-2">
            {bloodGroups.map((b) => {
              const maxCount = Math.max(...bloodGroups.map((i) => i.count), 10);
              const percentage = Math.round((b.count / maxCount) * 100);
              return (
                <div key={b.group} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="font-mono text-slate-900">{b.group}</span>
                    <span className="text-slate-500">{b.count} Requests</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Audit Activity Stream */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" /> System Audit Trail
            </h3>
            <span className="text-xs text-slate-400">Immutable Log</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {recentLogs.length === 0 ? (
              <div className="py-6 text-slate-400 text-center">
                System activities and operations will appear here in real-time.
              </div>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800">{log.action.replace(/_/g, ' ')}</span>
                    <p className="text-[11px] text-slate-500">
                      Entity: {log.entity} • User: {log.user?.email || 'System'}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
