import React from 'react';
import Link from 'next/link';
import { Heart, Pill, ShieldCheck, MapPin, Zap, ArrowRight, BrainCircuit, Activity } from 'lucide-react';

export default function HowItWorksPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-16">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
          How MedShare Works
        </h1>
        <p className="text-sm sm:text-base text-slate-600">
          A deep dive into our PostGIS geo-matching engine, AI OCR pipeline, and healthcare audit architecture.
        </p>
      </div>

      {/* Module 1: RapidBlood */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <Heart className="w-5 h-5 text-red-500 fill-red-500" />
          <h2 className="text-xl font-bold text-slate-900">Module 1: RapidBlood Network Architecture</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <h3 className="font-bold text-slate-900 text-sm">PostGIS ST_DWithin Geofence</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              When an emergency request is lodged, hospital GPS coordinates are indexed against all registered donors within selectable radii (1km, 3km, 5km, 10km, 15km).
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Multi-Factor Ranking Algorithm</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Candidate donors are evaluated with weighted factors: Distance (35%), Availability (25%), Verification (20%), Response History (10%), and 90-day Cooldown Eligibility (10%).
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
              3
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Socket.IO Instant Broadcast</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Targeted WebSockets notify matched donors with built-in deduplication. Hospital triage monitors responses live on an interactive Leaflet map.
            </p>
          </div>
        </div>
      </div>

      {/* Module 2: MedShare Medicine */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <Pill className="w-5 h-5 text-emerald-600" />
          <h2 className="text-xl font-bold text-slate-900">Module 2: Regulated Medicine Redistribution</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Pharmacy Verification</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Only verified pharmacies and hospital surplus inventories with valid state license credentials can upload medication batches.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <h3 className="font-bold text-slate-900 text-sm">AI OCR Scanning</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tesseract and computer vision scan medication packages to extract batch numbers, manufacturing dates, and expiry dates with confidence scoring.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm">
              3
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Human-in-the-Loop Validation</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              All OCR readings must be signed off by a pharmacist. Expired or unsealed medicines are rejected automatically by platform safety policies.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 text-white p-8 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-xl font-bold">Ready to Experience MedShare?</h3>
          <p className="text-xs text-slate-400 mt-1">Explore our emergency response network or browse verified medicines.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/blood-requests/new"
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold"
          >
            Emergency Blood Request
          </Link>
          <Link
            href="/medicines"
            className="px-5 py-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-bold"
          >
            Explore Medicines
          </Link>
        </div>
      </div>
    </div>
  );
}
