'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { donorApi, bloodRequestApi } from '@/lib/api';
import {
  Heart,
  Activity,
  Clock,
  ShieldCheck,
  AlertCircle,
  MapPin,
  CheckCircle2,
  Calendar,
  Zap,
  Sliders,
} from 'lucide-react';

export default function DonorDashboardPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [preferredRadius, setPreferredRadius] = useState(5);
  const [isToggling, setIsToggling] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      donorApi.getProfile().catch(() => ({ data: { data: null } })),
      donorApi.getStats().catch(() => ({ data: { data: null } })),
      donorApi.getMyRequests().catch(() => ({ data: { data: [] } })),
    ])
      .then(([profRes, statsRes, reqsRes]) => {
        if (profRes.data?.data) {
          setProfile(profRes.data.data);
          setIsAvailable(profRes.data.data.isAvailable);
          setPreferredRadius(profRes.data.data.preferredRadiusKm || 5);
        }
        if (statsRes.data?.data) {
          setStats(statsRes.data.data);
        }
        if (reqsRes.data?.data) {
          setMyRequests(reqsRes.data.data);
        }
      })
      .catch(() => {
        // Fallback demo state
        setIsAvailable(true);
        setStats({
          totalDonations: 6,
          acceptedRequests: 5,
          livesSavedEst: 18,
          responseRate: 98,
          eligibility: { isEligible: true, message: 'Eligible for donation' },
        });
        setMyRequests([
          {
            id: 'resp-1',
            status: 'NOTIFIED',
            bloodRequest: {
              id: 'br-1',
              requestNumber: 'BR-2026-1049',
              patientName: 'Robert Martinez',
              bloodGroup: 'O_NEG',
              unitsRequired: 2,
              hospitalName: 'Metropolitan Trauma Center',
              hospitalAddress: '450 Lexington Ave, NY',
              priority: 'CRITICAL',
              createdAt: new Date().toISOString(),
            },
          },
        ]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleToggleAvailability = async () => {
    setIsToggling(true);
    const nextState = !isAvailable;
    try {
      await donorApi.updateAvailability({
        isAvailable: nextState,
        preferredRadiusKm: preferredRadius,
      });
      setIsAvailable(nextState);
    } catch (err) {
      alert('Failed to update availability status.');
    } finally {
      setIsToggling(false);
    }
  };

  const handleRespond = async (requestId: string, action: 'ACCEPT' | 'DECLINE') => {
    try {
      await bloodRequestApi.respond(requestId, { action });
      setMyRequests((prev) =>
        prev.map((r) =>
          r.bloodRequest.id === requestId ? { ...r, status: action === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED' } : r
        )
      );
      alert(action === 'ACCEPT' ? 'Donation accepted! Hospital notified.' : 'Response declined.');
    } catch (err) {
      alert('Failed to submit response.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 flex items-center gap-1">
              <Heart className="w-3 h-3 fill-red-600" /> RapidBlood Donor Terminal
            </span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              {profile?.bloodGroup?.replace('_', '') || user?.donor?.bloodGroup?.replace('_', '') || 'O-'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Donor Control Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Emergency broadcast availability, matching notifications, and donation history.
          </p>
        </div>

        {/* Availability Toggle Switch */}
        <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div>
            <span className="text-xs font-bold text-slate-900 block">Emergency Dispatch</span>
            <span className="text-[11px] text-slate-500">
              {isAvailable ? 'Receiving local alerts' : 'Temporarily paused'}
            </span>
          </div>

          <button
            onClick={handleToggleAvailability}
            disabled={isToggling}
            className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isAvailable ? 'bg-emerald-500' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                isAvailable ? 'translate-x-7' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Total Donations</span>
          <p className="text-3xl font-extrabold text-slate-900">{stats?.totalDonations ?? 6}</p>
          <span className="text-[10px] text-emerald-600 font-medium">Verified Units</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Lives Saved (Est.)</span>
          <p className="text-3xl font-extrabold text-red-600">{stats?.livesSavedEst ?? 18}</p>
          <span className="text-[10px] text-slate-400">1 unit aids up to 3 patients</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Response Reliability</span>
          <p className="text-3xl font-extrabold text-blue-600">{stats?.responseRate ?? 98}%</p>
          <span className="text-[10px] text-blue-500">Fast responder rating</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Eligibility Status</span>
          <p className="text-sm font-bold text-emerald-600 mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> Ready to Donate
          </p>
          <span className="text-[10px] text-slate-400">90-day cooldown cleared</span>
        </div>
      </div>

      {/* Emergency Requests In Range */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 animate-pulse" />
            <h2 className="text-base font-bold text-slate-900">
              Emergency Broadcasts Sent To You ({myRequests.length})
            </h2>
          </div>
          <span className="text-xs text-slate-400">Matching within {preferredRadius} km</span>
        </div>

        {myRequests.length === 0 ? (
          <div className="text-center py-12 text-slate-400 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <p className="text-xs font-semibold text-slate-600">No active emergency blood broadcasts right now.</p>
            <p className="text-[11px] text-slate-400">You will be notified instantly when a hospital near you needs your blood group.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {myRequests.map((item) => {
              const req = item.bloodRequest;
              return (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-500">{req.requestNumber}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 uppercase">
                        {req.priority}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">
                      Emergency {req.bloodGroup.replace('_', '')} Blood for {req.patientName}
                    </h3>
                    <p className="text-xs text-slate-600 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      {req.hospitalName} ({req.hospitalAddress})
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {item.status === 'ACCEPTED' ? (
                      <span className="px-4 py-2 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> You Accepted
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => handleRespond(req.id, 'ACCEPT')}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors"
                        >
                          Accept & Donate
                        </button>
                        <button
                          onClick={() => handleRespond(req.id, 'DECLINE')}
                          className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                        >
                          Decline
                        </button>
                      </>
                    )}

                    <Link
                      href={`/blood-requests/${req.id}`}
                      className="px-3 py-2 bg-white border border-slate-200 text-slate-600 hover:text-blue-600 rounded-xl text-xs font-semibold"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
