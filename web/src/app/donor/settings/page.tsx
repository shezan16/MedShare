'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Sliders, ShieldCheck } from 'lucide-react';
import { donorApi } from '@/lib/api';

export default function DonorSettingsPage() {
  const [radiusKm, setRadiusKm] = useState(5);
  const [isAvailable, setIsAvailable] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await donorApi.updateAvailability({
        isAvailable,
        preferredRadiusKm: radiusKm,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      alert('Failed to save settings.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div>
        <Link
          href="/donor/dashboard"
          className="text-xs font-semibold text-slate-500 hover:text-red-600 flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Donor Hub
        </Link>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Availability & Radius Settings</h1>
        <p className="text-xs text-slate-500">Configure how and when you receive RapidBlood emergency alerts.</p>
      </div>

      <form onSubmit={handleSave} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-900 block">
            Emergency Dispatch Radius: <span className="text-blue-600 font-extrabold">{radiusKm} KM</span>
          </label>
          <input
            type="range"
            min="1"
            max="30"
            step="1"
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            className="w-full accent-blue-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>1 KM</span>
            <span>5 KM</span>
            <span>15 KM</span>
            <span>30 KM</span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-900 block">Availability Switch</span>
            <span className="text-[11px] text-slate-500">Temporarily pause alerts when unavailable</span>
          </div>
          <input
            type="checkbox"
            checked={isAvailable}
            onChange={(e) => setIsAvailable(e.target.checked)}
            className="w-5 h-5 accent-emerald-600 rounded"
          />
        </div>

        <button
          type="submit"
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors"
        >
          {saved ? 'Preferences Saved!' : 'Save Preferences'}
        </button>
      </form>
    </div>
  );
}
