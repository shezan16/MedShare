'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Building2, CheckCircle2 } from 'lucide-react';

export default function PharmacyVerificationStatusPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div>
        <Link
          href="/pharmacy/dashboard"
          className="text-xs font-semibold text-slate-500 hover:text-emerald-600 flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Pharmacy Terminal
        </Link>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Organization Verification Status</h1>
        <p className="text-xs text-slate-500">Legal accreditation and distribution licensing credentials.</p>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Verified Healthcare Institution</h3>
            <p className="text-xs text-slate-500">Authorized for surplus pharmaceutical redistribution</p>
          </div>
        </div>

        <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div className="flex justify-between">
            <span className="text-slate-500">License Number:</span>
            <span className="font-mono font-bold text-slate-900">NY-PHARM-882194</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">State Authority:</span>
            <span className="font-semibold text-slate-900">New York State Board of Pharmacy</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Expiration:</span>
            <span className="font-semibold text-slate-900">December 31, 2026</span>
          </div>
        </div>
      </div>
    </div>
  );
}
