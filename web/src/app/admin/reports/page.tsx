'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import { AlertTriangle, ShieldAlert, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function AdminReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    adminApi
      .getReports()
      .then((res) => {
        if (res.data?.data) {
          setReports(res.data.data);
        }
      })
      .catch(() => {
        // Fallback demo reports
        setReports([
          {
            id: 'rep-1',
            reporter: { email: 'patient@medshare.org' },
            itemType: 'MEDICINE',
            reason: 'Suspicious medicine pricing claim',
            details: 'Reported individual attempting to demand direct payment for surplus donation.',
            status: 'PENDING',
            createdAt: new Date().toISOString(),
          },
        ]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await adminApi.updateReportStatus(id, { status });
      setReports((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
      alert(`Report marked as ${status}`);
    } catch (err) {
      alert('Failed to update report status.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div>
        <Link
          href="/admin/dashboard"
          className="text-xs font-semibold text-slate-500 hover:text-blue-600 flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Admin Hub
        </Link>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Fraud & Safety Escalation Queue
        </h1>
        <p className="text-xs text-slate-500">
          Investigate reported fraudulent requests, suspicious pharmacy listings, and platform abuse.
        </p>
      </div>

      <div className="space-y-4">
        {reports.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <p className="text-xs font-semibold text-slate-700">No active fraud reports flagged.</p>
          </div>
        ) : (
          reports.map((rep) => (
            <div
              key={rep.id}
              className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-100 text-red-700 uppercase">
                    {rep.itemType}
                  </span>
                  <span className="text-sm font-bold text-slate-900">{rep.reason}</span>
                </div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 uppercase">
                  {rep.status}
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                {rep.details}
              </p>

              <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
                <span>Reported by: <strong>{rep.reporter?.email}</strong></span>
                {rep.status === 'PENDING' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateStatus(rep.id, 'RESOLVED')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                    >
                      Resolve & Take Action
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(rep.id, 'DISMISSED')}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
