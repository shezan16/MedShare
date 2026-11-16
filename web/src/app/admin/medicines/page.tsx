'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { medicineApi } from '@/lib/api';
import { ArrowLeft, Pill, ShieldCheck, Check, X } from 'lucide-react';

export default function AdminMedicinesPage() {
  const [medicines, setMedicines] = useState<any[]>([]);

  useEffect(() => {
    medicineApi
      .getAll()
      .then((res) => {
        if (res.data?.data) setMedicines(res.data.data);
      })
      .catch(() => {});
  }, []);

  const handleVerify = async (id: string, status: 'VERIFIED' | 'REJECTED') => {
    try {
      await medicineApi.verify(id, { status, notes: `Reviewed by admin.` });
      setMedicines((prev) =>
        prev.map((m) => (m.id === id ? { ...m, verificationStatus: status } : m))
      );
      alert(`Medicine marked as ${status}`);
    } catch (err) {
      alert('Verification update failed.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div>
        <Link
          href="/admin/dashboard"
          className="text-xs font-semibold text-slate-500 hover:text-blue-600 flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Admin Hub
        </Link>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Medicine Verification Terminal</h1>
        <p className="text-xs text-slate-500">Audit surplus medicine uploads for safety and regulatory compliance.</p>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Medicine</th>
                <th className="py-3 px-4">Batch Number</th>
                <th className="py-3 px-4">Expiry</th>
                <th className="py-3 px-4">Packaging</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {medicines.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-bold text-slate-900">{m.name}</td>
                  <td className="py-3 px-4 font-mono">{m.batchNumber}</td>
                  <td className="py-3 px-4">{new Date(m.expiryDate).toLocaleDateString()}</td>
                  <td className="py-3 px-4">{m.packagingCondition}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                      {m.verificationStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleVerify(m.id, 'VERIFIED')}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => handleVerify(m.id, 'REJECTED')}
                        className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-bold"
                      >
                        Reject
                      </button>
                    </div>
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
