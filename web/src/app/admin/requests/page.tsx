'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { bloodRequestApi } from '@/lib/api';
import { Heart, ArrowLeft, ArrowRight, MapPin, Activity } from 'lucide-react';

export default function AdminEmergencyRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    bloodRequestApi
      .getAll()
      .then((res) => {
        if (res.data?.data) setRequests(res.data.data);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div>
        <Link
          href="/admin/dashboard"
          className="text-xs font-semibold text-slate-500 hover:text-blue-600 flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Admin Hub
        </Link>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Emergency Blood Requests Monitor
        </h1>
        <p className="text-xs text-slate-500">Global dispatch operations across all hospitals and triage centers.</p>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="divide-y divide-slate-100">
          {requests.map((r) => (
            <div key={r.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-slate-500">{r.requestNumber}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase">
                    {r.priority}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                    {r.status}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {r.patientName} — {r.bloodGroup?.replace('_', '')} ({r.unitsRequired} Units)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-blue-500" />
                  {r.hospitalName} • Contact: {r.contactPerson} ({r.contactPhone})
                </p>
              </div>

              <Link
                href={`/blood-requests/${r.id}`}
                className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors shrink-0"
              >
                Inspect Dispatch <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
