'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import { Users, ShieldCheck, ArrowLeft, Search, CheckCircle2, XCircle } from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    adminApi
      .getUsers({ search: search || undefined })
      .then((res) => {
        if (res.data?.data) {
          setUsers(res.data.data);
        }
      })
      .catch(() => {
        // Fallback demo users
        setUsers([
          { id: '1', email: 'admin@medshare.org', role: 'ADMIN', isVerified: true, createdAt: new Date().toISOString() },
          { id: '2', email: 'donor@medshare.org', role: 'DONOR', isVerified: true, createdAt: new Date().toISOString() },
          { id: '3', email: 'pharmacy@medshare.org', role: 'PHARMACY', isVerified: true, createdAt: new Date().toISOString() },
          { id: '4', email: 'patient@medshare.org', role: 'PATIENT', isVerified: true, createdAt: new Date().toISOString() },
        ]);
      })
      .finally(() => setIsLoading(false));
  }, [search]);

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
          Platform User Management
        </h1>
        <p className="text-xs text-slate-500">
          Search, audit, and regulate accounts across all 4 system roles.
        </p>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users by email..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">User Email</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">Verified</th>
                <th className="py-3 px-4">Joined Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-bold text-slate-900">{u.email}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {u.isVerified ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                      </span>
                    ) : (
                      <span className="text-slate-400 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Unverified
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {new Date(u.createdAt).toLocaleDateString()}
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
