'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { medicineApi } from '@/lib/api';
import {
  Pill,
  Upload,
  Building2,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Package,
  Layers,
} from 'lucide-react';

export default function PharmacyDashboardPage() {
  const { user } = useAuth();
  const [medicines, setMedicines] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      medicineApi.getAll().catch(() => ({ data: { data: [] } })),
      medicineApi.getRequests().catch(() => ({ data: { data: [] } })),
    ])
      .then(([medRes, reqRes]) => {
        if (medRes.data?.data) setMedicines(medRes.data.data);
        if (reqRes.data?.data) setRequests(reqRes.data.data);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const totalUnits = medicines.reduce((acc, m) => acc + (m.quantity || 0), 0);
  const nearExpiryCount = medicines.filter((m) => m.isExpiringSoon).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> Licensed Pharmacy Hub
            </span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              License: NY-PHARM-882194
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Institutional Medicine Terminal
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Regulated redistribution inventory, AI OCR intake, and assistance request verification.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/pharmacy/upload"
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2"
          >
            <Upload className="w-4 h-4" /> AI OCR Upload Medicine
          </Link>
          <Link
            href="/pharmacy/requests"
            className="px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all"
          >
            Review Assistance Requests ({requests.length})
          </Link>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Listed Medicine Lines</span>
          <p className="text-3xl font-extrabold text-slate-900">{medicines.length}</p>
          <span className="text-[10px] text-emerald-600 font-medium">Verified items</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Total Stock (Doses)</span>
          <p className="text-3xl font-extrabold text-emerald-600">{totalUnits}</p>
          <span className="text-[10px] text-slate-400">Available for patients</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Expiring within 30 Days</span>
          <p className="text-3xl font-extrabold text-amber-600">{nearExpiryCount}</p>
          <span className="text-[10px] text-amber-600 font-medium">Prioritized for redistribution</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Assistance Requests</span>
          <p className="text-3xl font-extrabold text-blue-600">{requests.length}</p>
          <span className="text-[10px] text-blue-500">Pending review</span>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900">Current Surplus Inventory</h2>
          <Link href="/pharmacy/upload" className="text-xs font-bold text-emerald-600 hover:underline">
            + Upload New Batch
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Medicine & Formula</th>
                <th className="py-3 px-4">Batch No.</th>
                <th className="py-3 px-4">Quantity</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4">Rx Requirement</th>
                <th className="py-3 px-4">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {medicines.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {m.name}
                    <span className="block text-[10px] text-slate-400 font-normal">
                      {m.strength} • {m.dosageForm}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono">{m.batchNumber}</td>
                  <td className="py-3 px-4 font-bold text-emerald-700">{m.quantity}</td>
                  <td className="py-3 px-4">
                    <span className={m.isExpiringSoon ? 'text-amber-600 font-bold' : 'text-slate-600'}>
                      {new Date(m.expiryDate).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700">
                      {m.requiresPrescription ? 'Rx Required' : 'OTC'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      VERIFIED
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
