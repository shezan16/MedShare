'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { pharmacyApi } from '@/lib/api';
import { Building2, ShieldCheck, Check, X, ArrowLeft } from 'lucide-react';

export default function AdminPharmaciesPage() {
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    pharmacyApi
      .getAll()
      .then((res) => {
        if (res.data?.data) {
          setPharmacies(res.data.data);
        }
      })
      .catch(() => {
        // Fallback demo
        setPharmacies([
          {
            id: 'ph-1',
            organizationName: 'HealthCare Plus Community Pharmacy',
            licenseNumber: 'NY-PHARM-882194',
            address: '550 5th Ave, New York, NY 10036',
            phone: '+1 (212) 555-0321',
            email: 'pharmacy@medshare.org',
            isVerified: true,
            verificationStatus: 'VERIFIED',
          },
          {
            id: 'ph-2',
            organizationName: 'Apex Care Institutional Pharmacy',
            licenseNumber: 'NY-PHARM-991042',
            address: '320 W 42nd St, New York, NY 10036',
            phone: '+1 (212) 555-0765',
            email: 'apex.rx@medshare.org',
            isVerified: false,
            verificationStatus: 'PENDING',
          },
        ]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleVerify = async (id: string, status: 'VERIFIED' | 'REJECTED') => {
    try {
      await pharmacyApi.verify(id, { status, notes: `Approved by admin team.` });
      setPharmacies((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, verificationStatus: status, isVerified: status === 'VERIFIED' } : p
        )
      );
      alert(`Pharmacy marked as ${status}`);
    } catch (err) {
      alert('Failed to update pharmacy verification.');
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
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Pharmacy & Institution Verification
        </h1>
        <p className="text-xs text-slate-500">
          Verify state healthcare licenses to authorize medicine surplus listings.
        </p>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
          Healthcare Organizations ({pharmacies.length})
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Organization Name</th>
                <th className="py-3 px-4">License Number</th>
                <th className="py-3 px-4">Contact Phone</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {pharmacies.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-bold text-slate-900">{p.organizationName}</td>
                  <td className="py-3 px-4 font-mono font-bold text-blue-600">{p.licenseNumber}</td>
                  <td className="py-3 px-4 text-slate-600">{p.phone}</td>
                  <td className="py-3 px-4 text-slate-600">{p.email}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        p.verificationStatus === 'VERIFIED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : p.verificationStatus === 'REJECTED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {p.verificationStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {p.verificationStatus === 'PENDING' && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleVerify(p.id, 'VERIFIED')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold"
                        >
                          Verify Org
                        </button>
                        <button
                          onClick={() => handleVerify(p.id, 'REJECTED')}
                          className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-bold"
                        >
                          Reject
                        </button>
                      </div>
                    )}
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
