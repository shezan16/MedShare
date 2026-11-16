'use client';

import React from 'react';
import Link from 'next/link';
import { Heart, ShieldCheck, AlertCircle, ArrowRight, Check, X } from 'lucide-react';

const COMPATIBILITY_TABLE = [
  { recipient: 'A+', canReceive: ['A+', 'A-', 'O+', 'O-'], canDonateTo: ['A+', 'AB+'] },
  { recipient: 'O+', canReceive: ['O+', 'O-'], canDonateTo: ['O+', 'A+', 'B+', 'AB+'] },
  { recipient: 'B+', canReceive: ['B+', 'B-', 'O+', 'O-'], canDonateTo: ['B+', 'AB+'] },
  { recipient: 'AB+', canReceive: ['All Blood Types (Universal Recipient)'], canDonateTo: ['AB+ Only'] },
  { recipient: 'A-', canReceive: ['A-', 'O-'], canDonateTo: ['A+', 'A-', 'AB+', 'AB-'] },
  { recipient: 'O-', canReceive: ['O- Only'], canDonateTo: ['All Blood Types (Universal Donor)'] },
  { recipient: 'B-', canReceive: ['B-', 'O-'], canDonateTo: ['B+', 'B-', 'AB+', 'AB-'] },
  { recipient: 'AB-', canReceive: ['AB-', 'A-', 'B-', 'O-'], canDonateTo: ['AB+', 'AB-'] },
];

export default function BloodInfoPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-12">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
          <Heart className="w-3.5 h-3.5 fill-red-600" />
          RapidBlood Medical Reference
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Blood Donation & Compatibility Standards
        </h1>
        <p className="text-sm text-slate-600">
          Medically verified compatibility rules and eligibility requirements governing the RapidBlood Network.
        </p>
      </div>

      {/* Compatibility Matrix Card */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">ABO & Rh Compatibility Table</h2>
            <p className="text-xs text-slate-400">Used by the MedShare PostGIS Geo-Matching Algorithm</p>
          </div>
          <Link
            href="/blood-requests/new"
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold"
          >
            Create Emergency Request
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Blood Group</th>
                <th className="py-3 px-4">Compatible Donors (Can Receive From)</th>
                <th className="py-3 px-4">Can Donate To</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {COMPATIBILITY_TABLE.map((row) => (
                <tr key={row.recipient} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-sm text-slate-900">
                    <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                      {row.recipient}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    {row.canReceive.join(', ')}
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    {row.canDonateTo.join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Donor Eligibility Rules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-base">
            <Check className="w-5 h-5" /> Who Can Donate?
          </div>
          <ul className="space-y-2.5 text-xs text-slate-600">
            <li>• Age between 18 and 65 years old.</li>
            <li>• Minimum body weight of 50 kg (110 lbs).</li>
            <li>• Pulse rate between 50 and 100 beats/minute.</li>
            <li>• Blood pressure within healthy medical baseline.</li>
            <li>• Hemoglobin level of at least 12.5 g/dL.</li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-red-600 font-bold text-base">
            <X className="w-5 h-5" /> Critical Exclusions & Cooldowns
          </div>
          <ul className="space-y-2.5 text-xs text-slate-600">
            <li>• <strong>90-Day Cooldown:</strong> Minimum 3 months required between whole blood donations.</li>
            <li>• Active acute respiratory or infectious illnesses.</li>
            <li>• Pregnancy or lactation within the last 6 months.</li>
            <li>• Major surgery or tattoo application within past 6 months.</li>
            <li>• Final crossmatching must ALWAYS be performed by hospital lab technicians.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
