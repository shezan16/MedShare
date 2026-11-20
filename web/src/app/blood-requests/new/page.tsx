'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { bloodRequestApi } from '@/lib/api';
import { Heart, AlertCircle, MapPin, Calendar, Phone, User, Hospital, ShieldAlert, ArrowRight, Check } from 'lucide-react';
import { BloodGroup, Priority } from '@/types';

export default function NewBloodRequestPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [patientName, setPatientName] = useState('');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('O_NEG');
  const [unitsRequired, setUnitsRequired] = useState(2);
  const [hospitalName, setHospitalName] = useState('Metropolitan Trauma Center');
  const [hospitalAddress, setHospitalAddress] = useState('450 Lexington Ave, New York, NY 10017');
  const [hospitalLat, setHospitalLat] = useState(40.7516);
  const [hospitalLng, setHospitalLng] = useState(-73.9754);
  const [requiredDate, setRequiredDate] = useState(new Date().toISOString().split('T')[0]);
  const [priority, setPriority] = useState<Priority>('CRITICAL');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [searchRadiusKm, setSearchRadiusKm] = useState(5.0);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill fields from unified user profile
  React.useEffect(() => {
    if (user) {
      if (user.fullName && !contactPerson) setContactPerson(user.fullName);
      if (user.phone && !contactPhone) setContactPhone(user.phone);
      if (user.bloodGroup) setBloodGroup(user.bloodGroup);
      if (user.latitude && user.latitude !== 40.7128) setHospitalLat(user.latitude);
      if (user.longitude && user.longitude !== -74.006) setHospitalLng(user.longitude);
    }
  }, [user]);

  const handleUseCurrentLocation = () => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setHospitalLat(pos.coords.latitude);
          setHospitalLng(pos.coords.longitude);
        },
        () => {
          alert('Could not retrieve current location. Using default hospital coordinates.');
        }
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!user) {
      router.push('/login');
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        patientName,
        bloodGroup,
        unitsRequired: Number(unitsRequired),
        hospitalName,
        hospitalAddress,
        hospitalLat: Number(hospitalLat),
        hospitalLng: Number(hospitalLng),
        requiredDate: new Date(requiredDate).toISOString(),
        priority,
        contactPerson,
        contactPhone,
        additionalNotes,
        searchRadiusKm: Number(searchRadiusKm),
      };

      const res = await bloodRequestApi.create(payload);
      if (res.data?.success && res.data?.data?.request?.id) {
        router.push(`/blood-requests/${res.data.data.request.id}`);
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error?.message || 'Failed to lodge blood request. Please check inputs.');
      // Demo fallback redirect
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white p-6 rounded-3xl shadow-lg shadow-red-500/20 space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
          <AlertCircle className="w-3.5 h-3.5" /> RapidBlood Emergency Broadcast
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Create Emergency Blood Request
        </h1>
        <p className="text-xs sm:text-sm text-red-100 max-w-xl">
          Broadcast an urgent request to compatible, available blood donors within your selected hospital radius.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
        {/* Patient & Blood Info */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
            <User className="w-4 h-4 text-red-600" /> Patient & Transfusion Requirements
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Patient Full Name</label>
              <input
                type="text"
                required
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="e.g. Robert Martinez"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Required Blood Group</label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none bg-white font-mono font-bold text-slate-900"
              >
                <option value="A_POS">A+</option>
                <option value="A_NEG">A-</option>
                <option value="B_POS">B+</option>
                <option value="B_NEG">B-</option>
                <option value="AB_POS">AB+</option>
                <option value="AB_NEG">AB-</option>
                <option value="O_POS">O+</option>
                <option value="O_NEG">O- (Universal Donor)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Units Required</label>
              <input
                type="number"
                min="1"
                max="15"
                required
                value={unitsRequired}
                onChange={(e) => setUnitsRequired(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Emergency Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none bg-white font-bold"
              >
                <option value="CRITICAL" className="text-red-600">🚨 CRITICAL (Immediate Surgery/Trauma)</option>
                <option value="HIGH" className="text-amber-600">⚠️ HIGH (Needed within 6 Hours)</option>
                <option value="MEDIUM" className="text-blue-600">ℹ️ MEDIUM (Scheduled within 24 Hours)</option>
                <option value="LOW">LOW (Planned Procedure)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Required By Date</label>
              <input
                type="date"
                required
                value={requiredDate}
                onChange={(e) => setRequiredDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Hospital & Location */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Hospital className="w-4 h-4 text-red-600" /> Hospital & Geolocation Target
            </h2>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <MapPin className="w-3.5 h-3.5" /> Use Current GPS
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Hospital Name</label>
              <input
                type="text"
                required
                value={hospitalName}
                onChange={(e) => setHospitalName(e.target.value)}
                placeholder="e.g. Metropolitan Trauma & Surgical Center"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Hospital Address / Floor / Ward</label>
              <input
                type="text"
                required
                value={hospitalAddress}
                onChange={(e) => setHospitalAddress(e.target.value)}
                placeholder="450 Lexington Ave, ICU Ward 4B"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Search Radius */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-700">
                PostGIS Geo-Search Radius: <span className="text-red-600 font-bold">{searchRadiusKm} KM</span>
              </label>
              <span className="text-[11px] text-slate-400">Default: 5 KM</span>
            </div>
            <input
              type="range"
              min="1"
              max="20"
              step="1"
              value={searchRadiusKm}
              onChange={(e) => setSearchRadiusKm(Number(e.target.value))}
              className="w-full accent-red-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>1 KM</span>
              <span>3 KM</span>
              <span>5 KM</span>
              <span>10 KM</span>
              <span>20 KM</span>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-4 pt-2">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
            <Phone className="w-4 h-4 text-red-600" /> Triage Contact Person
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Doctor / Triage Nurse / Attendant</label>
              <input
                type="text"
                required
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="Dr. Katherine Evans"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Direct Emergency Phone</label>
              <input
                type="tel"
                required
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+1 (555) 901-2244"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Clinical Notes / Special Crossmatch Instructions (Optional)</label>
            <textarea
              rows={3}
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="e.g. Patient is undergoing thoracic bypass. Cold antibody screening completed."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 px-6 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-500/25 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
        >
          {isLoading ? (
            <span>Broadcasting Emergency Request via PostGIS...</span>
          ) : (
            <>
              <span>Broadcast Emergency Blood Request</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
