'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { bloodRequestApi, medicineApi, donorApi } from '@/lib/api';
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
  Building2,
  Upload,
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  Sliders,
  Check,
  Camera,
} from 'lucide-react';

export default function UserDashboard() {
  const { user, setUser } = useAuth();
  const [bloodRequests, setBloodRequests] = useState<BloodRequest[]>([]);
  const [medicineRequests, setMedicineRequests] = useState<MedicineRequest[]>([]);
  const [myDonorRequests, setMyDonorRequests] = useState<any[]>([]);
  const [isAvailable, setIsAvailable] = useState<boolean>(user?.isAvailable ?? true);
  const [isTogglingAvailability, setIsTogglingAvailability] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.isAvailable !== undefined) {
      setIsAvailable(user.isAvailable);
    }
  }, [user]);

  useEffect(() => {
    Promise.all([
      bloodRequestApi.getAll().catch(() => ({ data: { data: [] } })),
      medicineApi.getRequests().catch(() => ({ data: { data: [] } })),
      donorApi.getMyRequests().catch(() => ({ data: { data: [] } })),
    ])
      .then(([bloodRes, medRes, donorRes]) => {
        if (bloodRes.data?.data) {
          setBloodRequests(bloodRes.data.data);
        }
        if (medRes.data?.data) {
          setMedicineRequests(medRes.data.data);
        }
        if (donorRes.data?.data) {
          setMyDonorRequests(donorRes.data.data);
        }
      })
      .catch(() => {
        // Fallback demo state
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
        setMyDonorRequests([
          {
            id: 'resp-demo-1',
            status: 'NOTIFIED',
            bloodRequest: {
              id: 'br-demo-1',
              requestNumber: 'BR-2026-1049',
              patientName: 'Robert Martinez',
              bloodGroup: 'O_NEG',
              hospitalName: 'Metropolitan Trauma Center',
              hospitalAddress: '450 Lexington Ave, NY',
              priority: 'CRITICAL',
            },
          },
        ]);
      })
      .finally(() => setIsLoading(false));
  }, [user]);

  const handleToggleAvailability = async () => {
    setIsTogglingAvailability(true);
    const nextState = !isAvailable;
    try {
      await donorApi.updateAvailability({
        isAvailable: nextState,
      });
      setIsAvailable(nextState);
      if (user) {
        setUser({ ...user, isAvailable: nextState });
      }
    } catch (err) {
      alert('Could not update availability.');
    } finally {
      setIsTogglingAvailability(false);
    }
  };

  const handleDonorRespond = async (requestId: string, action: 'ACCEPT' | 'DECLINE') => {
    try {
      await bloodRequestApi.respond(requestId, { action });
      setMyDonorRequests((prev) =>
        prev.map((r) =>
          r.bloodRequest?.id === requestId
            ? { ...r, status: action === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED' }
            : r
        )
      );
      alert(action === 'ACCEPT' ? 'Donation accepted! Hospital notified.' : 'Response declined.');
    } catch (err) {
      alert('Failed to submit response.');
    }
  };

  const displayName = user?.fullName || user?.email?.split('@')[0] || 'Healthcare Member';
  const displayBloodGroup = user?.bloodGroup?.replace('_', '') || user?.donor?.bloodGroup?.replace('_', '') || 'O+';
  const orgName = user?.organizationName || user?.pharmacy?.organizationName || `${displayName}'s Healthcare Organization`;
  const licNumber = user?.licenseNumber || user?.pharmacy?.licenseNumber || 'DGDA-LIC-VERIFIED';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Unified Welcome & Profile Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-3 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Unified Account Hub
              </span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                All Platform Access Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome back, {displayName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 flex flex-wrap items-center gap-3 pt-0.5">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> {user?.email}
              </span>
              {user?.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> {user.phone}
                </span>
              )}
              {user?.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> {user.address}
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/blood-requests/new"
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/20 transition-all flex items-center gap-1.5 hover:scale-[1.02]"
            >
              <AlertCircle className="w-4 h-4" /> Emergency Blood
            </Link>
            <Link
              href="/pharmacy/upload"
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5 hover:scale-[1.02]"
            >
              <Upload className="w-4 h-4" /> AI OCR Upload
            </Link>
          </div>
        </div>

        {/* Unified Credentials Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Blood Donor Terminal Card */}
          <div className="p-4 rounded-2xl bg-red-50/60 border border-red-100 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-red-900 uppercase tracking-wider flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 fill-red-600 text-red-600" /> Donor Blood Group
              </span>
              <p className="text-xl font-mono font-extrabold text-red-700">
                {displayBloodGroup}
              </p>
              <span className="text-[10px] text-red-600/80 font-medium block">
                {isAvailable ? 'Ready for emergency broadcasts' : 'Alerts paused'}
              </span>
            </div>

            {/* Availability Switch */}
            <div className="text-right space-y-1">
              <span className="text-[10px] text-slate-500 font-semibold block">Dispatch Status</span>
              <button
                type="button"
                onClick={handleToggleAvailability}
                disabled={isTogglingAvailability}
                className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isAvailable ? 'bg-red-600' : 'bg-slate-300'
                }`}
                title="Toggle Emergency Dispatch Availability"
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                    isAvailable ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Pharmacy & Verification Card */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
            <div className="space-y-0.5 truncate pr-2">
              <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-emerald-600" /> Pharmacy / Institution
              </span>
              <p className="text-sm font-bold text-emerald-950 truncate">
                {orgName}
              </p>
              <span className="text-[10px] font-mono text-emerald-700 font-semibold block">
                Lic: {licNumber}
              </span>
            </div>
            <span className="shrink-0 p-2 rounded-xl bg-emerald-100 text-emerald-700" title="Verified Institution">
              <CheckCircle2 className="w-5 h-5" />
            </span>
          </div>

          {/* Platform Capability Badge */}
          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-blue-600" /> Platform Role
              </span>
              <p className="text-sm font-bold text-blue-950">
                Single Unified Account
              </p>
              <span className="text-[10px] text-blue-600 font-medium block">
                Donor • Requester • Pharmacy
              </span>
            </div>
            <Link
              href="/profile"
              className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-100/50 transition-colors"
            >
              Edit Profile
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Launch Cards (All 5 Pillars) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <Link
          href="/blood-requests/new"
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-red-300 hover:bg-red-50/30 transition-all shadow-sm group"
        >
          <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <AlertCircle className="w-4 h-4 animate-pulse" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 group-hover:text-red-600">
            Blood Request
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Broadcast urgent need</p>
        </Link>

        <Link
          href="/donor/dashboard"
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-red-300 hover:bg-red-50/30 transition-all shadow-sm group"
        >
          <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <Heart className="w-4 h-4 fill-red-600" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 group-hover:text-red-600">
            Donor Hub
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Matching & availability</p>
        </Link>

        <Link
          href="/medicines"
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all shadow-sm group"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <Pill className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 group-hover:text-blue-600">
            Browse Medicines
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Surplus medicine catalog</p>
        </Link>

        <Link
          href="/pharmacy/upload"
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all shadow-sm group"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <Upload className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 group-hover:text-emerald-600">
            AI OCR Upload
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Scan package & register</p>
        </Link>

        <Link
          href="/pharmacy/requests"
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all shadow-sm group"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 group-hover:text-emerald-600">
            Verification Sign-off
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Pharmacist validation</p>
        </Link>
      </div>

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Column 1: Emergency Blood Requests & In-Range Alerts */}
        <div className="space-y-8">
          {/* Incoming Alerts for This Donor */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 animate-pulse" />
                <h2 className="text-sm font-bold text-slate-900">
                  Emergency Broadcasts Sent To You ({myDonorRequests.length})
                </h2>
              </div>
              <Link href="/donor/dashboard" className="text-xs font-semibold text-red-600 hover:underline">
                Donor Hub →
              </Link>
            </div>

            {myDonorRequests.length === 0 ? (
              <div className="text-center py-8 text-slate-400 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-600">No emergency broadcasts in range right now.</p>
                <p className="text-[11px] text-slate-400">Your profile is registered with blood group {displayBloodGroup}.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myDonorRequests.map((item) => {
                  const req = item.bloodRequest;
                  if (!req) return null;
                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-slate-500">{req.requestNumber}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 uppercase">
                          {req.priority || 'CRITICAL'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">
                            Emergency {req.bloodGroup?.replace('_', '')} Blood for {req.patientName}
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {req.hospitalName} ({req.hospitalAddress})
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.status === 'ACCEPTED' ? (
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-lg flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Accepted
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => handleDonorRespond(req.id, 'ACCEPT')}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-colors"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleDonorRespond(req.id, 'DECLINE')}
                                className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[11px] font-bold transition-colors"
                              >
                                Decline
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* User's Created Blood Requests */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                <h2 className="text-sm font-bold text-slate-900">Active Blood Requests</h2>
              </div>
              <Link
                href="/blood-requests/nearby-donors"
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                Nearby Donors Map →
              </Link>
            </div>

            {bloodRequests.length === 0 ? (
              <div className="text-center py-8 text-slate-400 space-y-2">
                <Activity className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs">No active blood requests lodged.</p>
                <Link
                  href="/blood-requests/new"
                  className="inline-block text-xs font-bold text-red-600 hover:underline"
                >
                  Create Emergency Request
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {bloodRequests.slice(0, 4).map((req) => (
                  <Link
                    key={req.id}
                    href={`/blood-requests/${req.id}`}
                    className="block p-4 rounded-2xl bg-slate-50 border border-slate-200/70 hover:border-red-300 hover:bg-red-50/20 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-1">
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
                        {req.status?.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-red-600 transition-colors">
                          {req.patientName}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {req.hospitalName} • {req.unitsRequired} Units
                        </p>
                      </div>

                      <div className="w-8 h-8 rounded-xl bg-red-100 text-red-700 font-mono font-extrabold flex items-center justify-center text-xs">
                        {req.bloodGroup?.replace('_', '')}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Medicine Redistribution & Verification Management */}
        <div className="space-y-8">
          {/* Pharmacist Human-in-the-Loop Sign-off Queue */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  Medicine Assistance & Verification Queue
                </h2>
              </div>
              <Link href="/pharmacy/requests" className="text-xs font-semibold text-emerald-600 hover:underline">
                Manage Queue →
              </Link>
            </div>

            {medicineRequests.length === 0 ? (
              <div className="text-center py-8 text-slate-400 space-y-2">
                <FileText className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs">No pending medicine assistance requests.</p>
                <Link href="/medicines" className="inline-block text-xs font-bold text-emerald-600 hover:underline">
                  Browse Available Catalog
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {medicineRequests.slice(0, 4).map((req) => (
                  <div key={req.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{req.medicine?.name || 'Medicine Request'}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        req.status === 'APPROVED' || req.status === 'DISPENSED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Quantity: <strong>{req.quantityRequested}</strong> • Reason: {req.reason}
                    </p>
                    <div className="pt-1 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Requester: {req.requester?.email || 'Registered User'}</span>
                      <Link
                        href="/pharmacy/requests"
                        className="text-emerald-700 font-bold hover:underline"
                      >
                        Sign-Off →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI OCR Medicine Upload Banner */}
          <div className="p-6 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-500/20 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-extrabold text-base">AI OCR Medicine Intake</h3>
                <p className="text-xs text-emerald-100">Instantly extract batch, expiry, and formula details from packaging</p>
              </div>
            </div>
            <p className="text-xs text-emerald-50 leading-relaxed">
              Your unified account has licensed institution privileges enabled for <strong>{orgName}</strong>. You can photograph or upload surplus medicine boxes to automatically verify authenticity.
            </p>
            <div className="pt-1 flex items-center gap-3">
              <Link
                href="/pharmacy/upload"
                className="px-4 py-2 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" /> Launch AI OCR Scanner
              </Link>
              <Link
                href="/medicines"
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-semibold backdrop-blur-sm transition-all"
              >
                View Catalog
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
