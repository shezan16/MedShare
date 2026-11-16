'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { donorApi, bloodRequestApi } from '@/lib/api';
import { Heart, ArrowLeft, MapPin, Check, AlertCircle } from 'lucide-react';

export default function DonorRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    donorApi
      .getMyRequests()
      .then((res) => {
        if (res.data?.data) setRequests(res.data.data);
      })
      .catch(() => {});
  }, []);

  const handleRespond = async (requestId: string, action: 'ACCEPT' | 'DECLINE') => {
    try {
      await bloodRequestApi.respond(requestId, { action });
      setRequests((prev) =>
        prev.map((r) =>
          r.bloodRequest.id === requestId ? { ...r, status: action === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED' } : r
        )
      );
      alert(action === 'ACCEPT' ? 'Donation accepted!' : 'Response recorded.');
    } catch (err) {
      alert('Failed to respond.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div>
        <Link
          href="/donor/dashboard"
          className="text-xs font-semibold text-slate-500 hover:text-red-600 flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Donor Hub
        </Link>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Nearby Emergency Blood Broadcasts
        </h1>
        <p className="text-xs text-slate-500">Urgent transfusion needs within your active service perimeter.</p>
      </div>

      <div className="space-y-4">
        {requests.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400">
            <Heart className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No pending emergency broadcasts right now.</p>
          </div>
        ) : (
          requests.map((item) => (
            <div
              key={item.id}
              className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-slate-500">
                    {item.bloodRequest.requestNumber}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase">
                    {item.bloodRequest.priority}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-base">
                  Emergency {item.bloodRequest.bloodGroup.replace('_', '')} for {item.bloodRequest.patientName}
                </h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-500" />
                  {item.bloodRequest.hospitalName} ({item.bloodRequest.hospitalAddress})
                </p>
              </div>

              <div className="flex items-center gap-3">
                {item.status === 'ACCEPTED' ? (
                  <span className="px-3.5 py-1.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl">
                    Accepted
                  </span>
                ) : (
                  <>
                    <button
                      onClick={() => handleRespond(item.bloodRequest.id, 'ACCEPT')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors"
                    >
                      Accept & Donate
                    </button>
                    <button
                      onClick={() => handleRespond(item.bloodRequest.id, 'DECLINE')}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                    >
                      Decline
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
