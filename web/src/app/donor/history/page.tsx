'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Award, Calendar, Heart } from 'lucide-react';

export default function DonorHistoryPage() {
  const sampleHistory = [
    {
      id: 'h1',
      date: 'May 10, 2024',
      hospital: 'Metropolitan Trauma & Surgical Center',
      units: 1,
      certificate: 'CERT-2024-8841',
    },
    {
      id: 'h2',
      date: 'January 15, 2024',
      hospital: 'St. Jude General Hospital',
      units: 1,
      certificate: 'CERT-2024-1029',
    },
    {
      id: 'h3',
      date: 'September 22, 2023',
      hospital: 'Downtown Medical Complex',
      units: 1,
      certificate: 'CERT-2023-7402',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div>
        <Link
          href="/donor/dashboard"
          className="text-xs font-semibold text-slate-500 hover:text-red-600 flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Donor Hub
        </Link>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Your Donation History</h1>
        <p className="text-xs text-slate-500">Verified clinical transfusion records and recognition certificates.</p>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="divide-y divide-slate-100">
          {sampleHistory.map((item) => (
            <div key={item.id} className="py-4 flex items-center justify-between text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Heart className="w-3.5 h-3.5 text-red-600 fill-red-600" />
                  <span className="font-bold text-slate-900 text-sm">{item.hospital}</span>
                </div>
                <p className="text-slate-500">
                  Donated {item.units} unit on {item.date}
                </p>
              </div>

              <div className="text-right">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-mono font-bold text-[11px] border border-emerald-200">
                  {item.certificate}
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">Verified Transfusion</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
