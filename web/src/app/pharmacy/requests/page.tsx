'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { medicineApi } from '@/lib/api';
import { Pill, FileCheck, CheckCircle2, XCircle, ArrowLeft, ExternalLink, Clock } from 'lucide-react';

export default function PharmacyRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    medicineApi
      .getRequests()
      .then((res) => {
        if (res.data?.data) {
          setRequests(res.data.data);
        }
      })
      .catch(() => {
        // Fallback demo requests
        setRequests([
          {
            id: 'req-1',
            quantityRequested: 20,
            prescriptionUrl: 'https://storage.medshare.org/prescriptions/sample-rx-verified.pdf',
            reason: 'Chronic hypertensive patient assistance program support.',
            status: 'PENDING',
            createdAt: new Date().toISOString(),
            medicine: {
              id: 'm1',
              name: 'Metformin Hydrochloride 500mg Prolonged Release',
              strength: '500 mg',
              quantity: 250,
            },
            requester: { email: 'patient@medshare.org' },
          },
        ]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await medicineApi.updateRequestStatus(id, {
        status: newStatus,
        pharmacyNotes: `Status updated to ${newStatus} by licensed pharmacist.`,
      });
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      );
      alert(`Request marked as ${newStatus}`);
    } catch (err) {
      alert('Failed to update request status.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/pharmacy/dashboard"
            className="text-xs font-semibold text-slate-500 hover:text-emerald-600 flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Pharmacy Terminal
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Medicine Redistribution Assistance Requests
          </h1>
          <p className="text-xs text-slate-500">
            Review prescriptions, verify patient clinical needs, and approve dispensing.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {requests.map((req) => (
          <div
            key={req.id}
            className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <span className="text-base font-bold text-slate-900">{req.medicine?.name}</span>
                <p className="text-xs text-slate-500">
                  Requested by: <strong>{req.requester?.email}</strong> • Quantity: <strong>{req.quantityRequested} Units</strong>
                </p>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  req.status === 'APPROVED' || req.status === 'DISPENSED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : req.status === 'REJECTED'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {req.status}
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-700 space-y-2">
              <p>
                <strong>Clinical Need Statement:</strong> {req.reason}
              </p>
              {req.prescriptionUrl && (
                <div className="flex items-center gap-2 pt-1 text-blue-600 font-semibold">
                  <FileCheck className="w-4 h-4 text-blue-500" />
                  <a
                    href={req.prescriptionUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline flex items-center gap-1"
                  >
                    View Uploaded Doctor Prescription <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {req.status === 'PENDING' && (
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => handleUpdateStatus(req.id, 'APPROVED')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Approve Request
                </button>
                <button
                  onClick={() => handleUpdateStatus(req.id, 'REJECTED')}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Reject
                </button>
              </div>
            )}

            {req.status === 'APPROVED' && (
              <div className="pt-2">
                <button
                  onClick={() => handleUpdateStatus(req.id, 'DISPENSED')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Mark Dispensed & Deduct Stock
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
