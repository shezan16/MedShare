'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { bloodRequestApi, medicineApi } from '@/lib/api';
import { BloodRequest, MedicineRequest } from '@/types';
import {
  Heart,
  Pill,
  Clock,
  Plus,
  ArrowRight,
  Activity,
  AlertCircle,
  FileText,
  CheckCircle2,
} from 'lucide-react';

export default function UserDashboard() {
  const { user } = useAuth();
  const [bloodRequests, setBloodRequests] = useState<BloodRequest[]>([]);
  const [medicineRequests, setMedicineRequests] = useState<MedicineRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      bloodRequestApi.getAll(),
      medicineApi.getRequests().catch(() => ({ data: { data: [] } })),
    ])
      .then(([bloodRes, medRes]) => {
        if (bloodRes.data?.data) {
          setBloodRequests(bloodRes.data.data);
        }
        if (medRes.data?.data) {
          setMedicineRequests(medRes.data.data);
        }
      })
      .catch(() => {
        // Fallback demo requests
        setBloodRequests([
          {
            id: 'br-demo-1',
            requestNumber: 'BR-2026-1049',
            requesterId: user?.id || 'u1',
            patientName: 'Robert Martinez',
            bloodGroup: 'O_NEG',
            unitsRequired: 2,
            hospitalName: 'Metropolitan Trauma Center',
            hospitalAddress: '450 Lexington Ave, NY',
            hospitalLat: 40.7516,
            hospitalLng: -73.9754,
            requiredDate: new Date().toISOString(),
            priority: 'CRITICAL',
            contactPerson: 'Dr. Katherine Evans',
            contactPhone: '+1 (212) 555-9011',
            status: 'SEARCHING',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]);
      })
      .finally(() => setIsLoading(false));
  }, [user]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
              Patient / Requester Workspace
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome back, {user?.email.split('@')[0]}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Monitor your emergency transfusion broadcasts and regulated medicine assistance requests.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/blood-requests/new"
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> New Blood Request
          </Link>
          <Link
            href="/medicines"
            className="px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
          >
            <Pill className="w-4 h-4 text-emerald-600" /> Browse Medicines
          </Link>
        </div>
      </div>

      {/* Grid: Blood Requests & Medicine Assistance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* RapidBlood Emergency Requests */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500 fill-red-500" />
              <h2 className="text-base font-bold text-slate-900">Your Blood Requests</h2>
            </div>
            <Link
              href="/blood-requests/nearby-donors"
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              View Donors Map →
            </Link>
          </div>

          {bloodRequests.length === 0 ? (
            <div className="text-center py-10 text-slate-400 space-y-3">
              <Activity className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs">No active blood requests lodged yet.</p>
              <Link
                href="/blood-requests/new"
                className="inline-block text-xs font-bold text-red-600 hover:underline"
              >
                Create your first request
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {bloodRequests.map((req) => (
                <Link
                  key={req.id}
                  href={`/blood-requests/${req.id}`}
                  className="block p-4 rounded-2xl bg-slate-50 border border-slate-200/70 hover:border-red-300 hover:bg-red-50/20 transition-all group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold text-slate-500">
                      {req.requestNumber}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        req.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : req.status === 'DONOR_ACCEPTED'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-700 animate-pulse'
                      }`}
                    >
                      {req.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-red-600 transition-colors">
                        {req.patientName}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {req.hospitalName} • {req.unitsRequired} Units
                      </p>
                    </div>

                    <div className="w-9 h-9 rounded-xl bg-red-100 text-red-700 font-mono font-extrabold flex items-center justify-center text-xs">
                      {req.bloodGroup.replace('_', '')}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Medicine Assistance Requests */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Pill className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">Medicine Assistance</h2>
            </div>
            <Link href="/medicines" className="text-xs font-semibold text-blue-600 hover:underline">
              Search Catalog →
            </Link>
          </div>

          {medicineRequests.length === 0 ? (
            <div className="text-center py-10 text-slate-400 space-y-3">
              <FileText className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs">No medicine requests submitted yet.</p>
              <Link href="/medicines" className="inline-block text-xs font-bold text-emerald-600 hover:underline">
                Explore available surplus medicines
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {medicineRequests.map((req) => (
                <div key={req.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900">{req.medicine?.name || 'Requested Medicine'}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 uppercase">
                      {req.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Quantity: {req.quantityRequested} • Reason: {req.reason}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
