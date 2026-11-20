'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/lib/api';
import { BloodGroup } from '@/types';
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
  Edit3,
  X,
  Check,
  LocateFixed,
  AlertCircle,
  Clock,
} from 'lucide-react';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  // Form edit states
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    bloodGroup: 'O_POS' as BloodGroup,
    city: 'New York',
    address: 'New York, NY',
    latitude: 40.7128,
    longitude: -74.006,
    isAvailable: true,
    lastDonationDate: '',
    organizationName: '',
    licenseNumber: '',
  });

  const todayStr = new Date().toISOString().split('T')[0];

  const syncFormState = (src: any) => {
    if (!src) return;
    setFormData({
      fullName: src.fullName || '',
      phone: src.phone || '',
      bloodGroup: (src.bloodGroup as BloodGroup) || 'O_POS',
      city: src.city || 'New York',
      address: src.address || 'New York, NY',
      latitude: src.latitude ?? 40.7128,
      longitude: src.longitude ?? -74.006,
      isAvailable: src.isAvailable ?? true,
      lastDonationDate: src.lastDonationDate
        ? new Date(src.lastDonationDate).toISOString().split('T')[0]
        : '',
      organizationName: src.organizationName || src.pharmacy?.organizationName || '',
      licenseNumber: src.licenseNumber || src.pharmacy?.licenseNumber || '',
    });
  };

  useEffect(() => {
    authApi
      .me()
      .then((res) => {
        if (res.data?.data) {
          setProfile(res.data.data);
          syncFormState(res.data.data);
        }
      })
      .catch(() => {
        if (user) syncFormState(user);
      });
  }, [user]);

  const data = profile || user;

  const handleAutoDetectLocation = () => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      setIsDetectingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFormData((prev) => ({
            ...prev,
            latitude: Number(pos.coords.latitude.toFixed(6)),
            longitude: Number(pos.coords.longitude.toFixed(6)),
          }));
          setIsDetectingLocation(false);
        },
        () => {
          alert('Could not auto-detect location. Retaining existing coordinates.');
          setIsDetectingLocation(false);
        },
        { timeout: 8000 }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');
    setSaveSuccess('');

    if (formData.lastDonationDate && formData.lastDonationDate > todayStr) {
      setSaveError('Last donation date cannot be in the future.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        bloodGroup: formData.bloodGroup,
        city: formData.city.trim() || 'New York',
        address: formData.address.trim() || 'New York, NY',
        latitude: Number(formData.latitude) || 40.7128,
        longitude: Number(formData.longitude) || -74.006,
        isAvailable: formData.isAvailable,
        lastDonationDate: formData.lastDonationDate
          ? new Date(formData.lastDonationDate).toISOString()
          : null,
        organizationName: formData.organizationName.trim(),
        licenseNumber: formData.licenseNumber.trim(),
      };

      const res = await authApi.updateProfile(payload);
      if (res.data?.data) {
        setProfile(res.data.data);
        if (user) {
          setUser({ ...user, ...res.data.data });
        }
        setSaveSuccess('Profile successfully updated across all modules.');
        setIsEditing(false);
      }
    } catch (err: any) {
      setSaveError(err?.response?.data?.error?.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const pharmacyStatus =
    data?.pharmacy?.verificationStatus || (data?.isVerified ? 'VERIFIED' : 'PENDING');

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Your Unified Account Profile</h1>
          <p className="text-xs text-slate-500">
            Comprehensive credentials across Emergency Requester, Blood Donor, and Pharmacy Redistribution.
          </p>
        </div>
        {!isEditing && (
          <button
            type="button"
            onClick={() => {
              syncFormState(data);
              setIsEditing(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
          >
            <Edit3 className="w-3.5 h-3.5" /> Edit Profile
          </button>
        )}
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
          <button type="button" onClick={() => setSaveSuccess('')} className="text-emerald-600 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {saveError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{saveError}</span>
          </div>
          <button type="button" onClick={() => setSaveError('')} className="text-red-600 hover:text-red-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        {/* Banner with Avatar & Identity */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-md shadow-blue-500/20">
              {data?.fullName?.charAt(0) || data?.email?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{data?.fullName || data?.email?.split('@')[0]}</h2>
              <p className="text-xs text-slate-500">{data?.email}</p>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-blue-100 text-blue-700">
                  UNIFIED HEALTHCARE ACCOUNT
                </span>
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> All Features Active
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

        {isEditing ? (
          /* ========================================================= */
          /* EDIT MODE FORM                                            */
          /* ========================================================= */
          <form onSubmit={handleSaveProfile} className="space-y-6">
            {/* Section 1: Basic Information */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <UserIcon className="w-4 h-4 text-blue-600" /> Basic Account Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Blood Donor Profile */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <Heart className="w-4 h-4 text-red-500 fill-red-500" /> Blood Donor & Health Credentials
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Group *</label>
                  <select
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value as BloodGroup })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-mono font-bold"
                  >
                    <option value="A_POS">A+ (A Positive)</option>
                    <option value="A_NEG">A- (A Negative)</option>
                    <option value="B_POS">B+ (B Positive)</option>
                    <option value="B_NEG">B- (B Negative)</option>
                    <option value="AB_POS">AB+ (AB Positive)</option>
                    <option value="AB_NEG">AB- (AB Negative)</option>
                    <option value="O_POS">O+ (O Positive)</option>
                    <option value="O_NEG">O- (O Negative)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Last Donation Date</label>
                  <input
                    type="date"
                    max={todayStr}
                    value={formData.lastDonationDate}
                    onChange={(e) => setFormData({ ...formData, lastDonationDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  />
                </div>
              </div>

              {/* Donor Availability Toggle */}
              <div className="p-3.5 rounded-2xl bg-red-50/50 border border-red-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Emergency Blood Donor Availability</span>
                  <span className="text-[11px] text-slate-500">
                    {formData.isAvailable ? 'Active for emergency hospital broadcast alerts' : 'Paused / Inactive'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isAvailable: !formData.isAvailable })}
                  className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    formData.isAvailable ? 'bg-red-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                      formData.isAvailable ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Section 3: Location & Coordinates */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-blue-600" /> City & Geolocation Coordinates
                </h3>
                <button
                  type="button"
                  onClick={handleAutoDetectLocation}
                  disabled={isDetectingLocation}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <LocateFixed className="w-3.5 h-3.5" />
                  {isDetectingLocation ? 'Detecting GPS...' : 'Auto-detect Location'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block mb-1">City *</span>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[10px] text-slate-500 font-semibold block mb-1">Street Address *</span>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block mb-1">Latitude</span>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block mb-1">Longitude</span>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Pharmacy / Organization Details */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <Building2 className="w-4 h-4 text-emerald-600" /> Pharmacy & Medicine Redistribution Authorization
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Organization / Pharmacy Name</label>
                  <input
                    type="text"
                    value={formData.organizationName}
                    onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                    placeholder="e.g. Community Health Pharmacy"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">State / DGDA License Number</label>
                  <input
                    type="text"
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    placeholder="e.g. DGDA-PHARM-2026-9041"
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Form Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  syncFormState(data);
                  setIsEditing(false);
                }}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/25 flex items-center gap-1.5"
              >
                {isSaving ? 'Saving Changes...' : 'Save Profile Changes'}
                <Check className="w-4 h-4" />
              </button>
            </div>
          </form>
        ) : (
          /* ========================================================= */
          /* VIEW MODE                                                 */
          /* ========================================================= */
          <div className="space-y-6">
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
                    {data?.lastDonationDate
                      ? new Date(data.lastDonationDate).toLocaleDateString()
                      : 'No prior donations recorded'}
                  </span>
                </div>
              </div>
            </div>

            {/* Section: Geolocation & Address */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" /> Geolocation & Service Perimeter
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 block mb-0.5 text-[11px]">City</span>
                  <span className="font-medium text-slate-800">{data?.city || 'New York'}</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 block mb-0.5 text-[11px]">Primary Address</span>
                  <span className="font-medium text-slate-800 truncate block">{data?.address || 'New York, NY'}</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 block mb-0.5 text-[11px]">GPS Coordinates</span>
                  <span className="font-mono text-slate-700">
                    {data?.latitude ?? 40.7128}, {data?.longitude ?? -74.006}
                  </span>
                </div>
              </div>
            </div>

            {/* Section: Pharmacy Organization */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" /> Pharmacy & Medicine Redistribution Credentials
                </h3>
                {pharmacyStatus === 'VERIFIED' ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified Pharmacist / Organization
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-600" /> Verification Pending Regulatory Review
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                  <span className="text-emerald-900/60 block mb-0.5 text-[11px] font-medium">Organization / Pharmacy Name</span>
                  <span className="font-bold text-emerald-950">
                    {data?.organizationName || `${data?.fullName}'s Pharmacy`}
                  </span>
                </div>
                <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                  <span className="text-emerald-900/60 block mb-0.5 text-[11px] font-medium">State / DGDA License Number</span>
                  <span className="font-mono font-bold text-emerald-800">
                    {data?.licenseNumber || 'DGDA-PHARM-2026-9041'}
                  </span>
                </div>
              </div>

              {pharmacyStatus !== 'VERIFIED' && (
                <p className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <em>Note:</em> You can upload medicines for AI OCR verification at any time. Official pharmacist verification sign-off is unlocked once your license credentials have completed official regulatory audit.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
