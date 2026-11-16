'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { medicineApi } from '@/lib/api';
import { Pill, Upload, ArrowLeft } from 'lucide-react';

export default function PharmacyInventoryPage() {
  const [medicines, setMedicines] = useState<any[]>([]);

  useEffect(() => {
    medicineApi
      .getAll()
      .then((res) => {
        if (res.data?.data) setMedicines(res.data.data);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/pharmacy/dashboard"
            className="text-xs font-semibold text-slate-500 hover:text-emerald-600 flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Pharmacy Terminal
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Medicine Inventory</h1>
          <p className="text-xs text-slate-500">Live catalog of uploaded surplus and redistribution batches.</p>
        </div>

        <Link
          href="/pharmacy/upload"
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
        >
          <Upload className="w-4 h-4" /> AI OCR Upload
        </Link>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Medicine Name</th>
                <th className="py-3 px-4">Batch</th>
                <th className="py-3 px-4">Doses</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {medicines.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-bold text-slate-900">{m.name}</td>
                  <td className="py-3 px-4 font-mono">{m.batchNumber}</td>
                  <td className="py-3 px-4 font-bold text-emerald-600">{m.quantity}</td>
                  <td className="py-3 px-4">{new Date(m.expiryDate).toLocaleDateString()}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {m.verificationStatus}
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
