'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import { ShieldCheck, Check, X, ArrowLeft, Heart, Filter } from 'lucide-react';

export default function AdminDonorsPage() {
  const [donors, setDonors] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    adminApi
      .getDonors({ status: statusFilter || undefined })
      .then((res) => {
        if (res.data?.data) {
          setDonors(res.data.data);
        }
      })
      .catch(() => {
        // Fallback demo donors
        setDonors([
          {
            id: 'd1',
            fullName: 'Alex Vance',
            bloodGroup: 'O_NEG',
            verificationStatus: 'VERIFIED',
            phone: '+1 (555) 234-5678',
            donationCount: 6,
            isAvailable: true,
            user: { email: 'donor@medshare.org', createdAt: new Date().toISOString() },
          },
          {
            id: 'd2',
            fullName: 'Priya Sharma',
            bloodGroup: 'A_NEG',
            verificationStatus: 'PENDING',
            phone: '+1 (555) 789-0123',
            donationCount: 0,
            isAvailable: true,
            user: { email: 'priya.sharma@medshare.org', createdAt: new Date().toISOString() },
          },
        ]);
      })
      .finally(() => setIsLoading(false));
  }, [statusFilter]);

  const handleVerify = async (donorId: string, status: 'VERIFIED' | 'REJECTED') => {
    try {
      await adminApi.verifyDonor(donorId, { status });
      setDonors((prev) =>
        prev.map((d) => (d.id === donorId ? { ...d, verificationStatus: status } : d))
      );
      alert(`Donor marked as ${status}`);
    } catch (err) {
      alert('Failed to update donor verification.');
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
          Blood Donor Verification Queue
        </h1>
        <p className="text-xs text-slate-500">
          Review donor identification credentials and authorize emergency broadcast dispatch eligibility.
        </p>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Registered Donors ({donors.length})
          </h2>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending Review</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Donor Name</th>
                <th className="py-3 px-4">Blood Group</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Past Donations</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {donors.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-bold text-slate-900">{d.fullName}</td>
                  <td className="py-3 px-4 font-mono font-bold text-red-600">{d.bloodGroup.replace('_', '')}</td>
                  <td className="py-3 px-4 text-slate-600">{d.user?.email}</td>
                  <td className="py-3 px-4 text-slate-600">{d.donationCount} units</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        d.verificationStatus === 'VERIFIED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : d.verificationStatus === 'REJECTED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {d.verificationStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {d.verificationStatus === 'PENDING' && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleVerify(d.id, 'VERIFIED')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold"
                        >
                          Verify
                        </button>
                        <button
                          onClick={() => handleVerify(d.id, 'REJECTED')}
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
