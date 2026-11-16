'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { bloodRequestApi } from '@/lib/api';
import { BloodRequest } from '@/types';
import { Heart, ArrowLeft, Clock, ArrowRight } from 'lucide-react';

export default function BloodRequestsHistoryPage() {
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    bloodRequestApi
      .getAll()
      .then((res) => {
        if (res.data?.data) setRequests(res.data.data);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div>
        <Link
          href="/dashboard"
          className="text-xs font-semibold text-slate-500 hover:text-blue-600 flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Blood Request History</h1>
        <p className="text-xs text-slate-500">Track all past and active emergency blood broadcasts.</p>
      </div>

      <div className="space-y-3">
        {requests.map((r) => (
          <div
            key={r.id}
            className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs font-bold text-slate-500">{r.requestNumber}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                  {r.status.replace('_', ' ')}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-sm">{r.patientName}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{r.hospitalName} • {r.unitsRequired} Units</p>
            </div>

            <Link
              href={`/blood-requests/${r.id}`}
              className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              View Live Tracker <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
