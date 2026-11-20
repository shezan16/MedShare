'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/lib/api';
import {
  User as UserIcon,
  Mail,
  ShieldCheck,
  Heart,
  Building2,
  Calendar,
  Phone,
  MapPin,
  Activity,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    authApi
      .me()
      .then((res) => {
        if (res.data?.data) setProfile(res.data.data);
      })
      .catch(() => {});
  }, []);

  const data = profile || user;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Your Unified Account Profile</h1>
        <p className="text-xs text-slate-500">Comprehensive credentials across Patient, Donor, and Pharmacy capabilities.</p>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-md shadow-blue-500/20">
              {data?.fullName?.charAt(0) || data?.email?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{data?.fullName || data?.email?.split('@')[0]}</h2>
              <p className="text-xs text-slate-500">{data?.email}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-blue-100 text-blue-700">
                  UNIFIED HEALTHCARE ACCOUNT
                </span>
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified Capabilities
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
          >
            Go to Dashboard <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Section: Basic Info */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <UserIcon className="w-3.5 h-3.5 text-blue-600" /> Basic Account Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block mb-0.5 text-[11px]">Full Legal Name</span>
              <span className="font-semibold text-slate-800">{data?.fullName || 'Not provided'}</span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block mb-0.5 text-[11px]">Contact Phone</span>
              <span className="font-semibold text-slate-800">{data?.phone || '+1 (555) 000-0000'}</span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block mb-0.5 text-[11px]">Account ID</span>
              <span className="font-mono text-slate-600 truncate block">{data?.id || 'unified-user-id'}</span>
            </div>
          </div>
        </div>

        {/* Section: Blood Donor Profile */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" /> Blood Donor & Health Credentials
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 bg-red-50/50 rounded-2xl border border-red-100">
              <span className="text-red-900/60 block mb-0.5 text-[11px] font-medium">Blood Group</span>
              <span className="font-mono font-extrabold text-red-700 text-sm">
                {data?.bloodGroup?.replace('_', '') || 'O+'}
              </span>
            </div>
            <div className="p-3.5 bg-red-50/50 rounded-2xl border border-red-100">
              <span className="text-red-900/60 block mb-0.5 text-[11px] font-medium">Emergency Availability</span>
              <span className="font-semibold text-red-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {data?.isAvailable ? 'Active for Alerts' : 'Standby'}
              </span>
            </div>
            <div className="p-3.5 bg-red-50/50 rounded-2xl border border-red-100">
              <span className="text-red-900/60 block mb-0.5 text-[11px] font-medium">Last Donation Date</span>
              <span className="font-medium text-slate-700">
                {data?.lastDonationDate ? new Date(data.lastDonationDate).toLocaleDateString() : 'No prior donations recorded'}
              </span>
            </div>
          </div>
        </div>

        {/* Section: Geolocation & Address */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-blue-600" /> Geolocation & Service Perimeter
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block mb-0.5 text-[11px]">Primary Address</span>
              <span className="font-medium text-slate-800">{data?.address || 'New York, NY'}</span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block mb-0.5 text-[11px]">GPS Coordinates</span>
              <span className="font-mono text-slate-700">
                Lat: {data?.latitude ?? 40.7128}, Lng: {data?.longitude ?? -74.006}
              </span>
            </div>
          </div>
        </div>

        {/* Section: Pharmacy Organization */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-emerald-600" /> Pharmacy & Medicine Redistribution Authorization
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-100">
              <span className="text-emerald-900/60 block mb-0.5 text-[11px] font-medium">Organization / Pharmacy Name</span>
              <span className="font-bold text-emerald-950">{data?.organizationName || `${data?.fullName}'s Pharmacy`}</span>
            </div>
            <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-100">
              <span className="text-emerald-900/60 block mb-0.5 text-[11px] font-medium">State / DGDA License Number</span>
              <span className="font-mono font-bold text-emerald-800">{data?.licenseNumber || 'DGDA-PHARM-2026-9041'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
