'use client';

import React from 'react';
import Link from 'next/link';
import { Pill, ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Snowflake, FileCheck } from 'lucide-react';

export default function MedicineInfoPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-12">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          MedShare Regulatory Safety Framework
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Medicine Redistribution Safety Policies
        </h1>
        <p className="text-sm text-slate-600">
          MedShare operates strictly within healthcare regulatory frameworks. Peer-to-peer distribution is barred; only verified institutions manage eligible inventory.
        </p>
      </div>

      {/* Safety Policy Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-emerald-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-lg">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Eligible Medicines
          </div>
          <ul className="space-y-3 text-xs text-slate-600">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
              <span><strong>Factory-Sealed Packaging:</strong> Blister packs, unbroken foil seals, and original tamper-evident bottles only.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
              <span><strong>Valid Expiry Dates:</strong> Must have at least 30 days of shelf life remaining before redistribution.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
              <span><strong>Institutional Origins:</strong> Only verified pharmacies, licensed clinics, and surplus medical programs.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
              <span><strong>AI OCR Validation:</strong> Machine batch identification cross-checked and signed by licensed pharmacist.</span>
            </li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-red-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-red-700 font-bold text-lg">
            <XCircle className="w-5 h-5 text-red-600" /> Strictly Prohibited Items
          </div>
          <ul className="space-y-3 text-xs text-slate-600">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1 shrink-0" />
              <span><strong>Expired Medications:</strong> Automatically rejected by our intake rules engine.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1 shrink-0" />
              <span><strong>Opened or Loose Doses:</strong> Any broken seal or unverified container is immediately declined.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1 shrink-0" />
              <span><strong>Uncontrolled Peer-to-Peer Transfers:</strong> Direct transfers between private individuals are strictly prohibited.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1 shrink-0" />
              <span><strong>Compromised Cold-Chain:</strong> Any temperature-sensitive medication lacking continuous data logging.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Cold Chain Protocol */}
      <div id="cold-chain" className="bg-slate-900 text-white p-8 rounded-3xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
            <Snowflake className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Cold-Chain Temperature Control Protocol (2°C – 8°C)</h3>
            <p className="text-xs text-slate-400">Mandatory for insulin, biologics, and specialized vaccines</p>
          </div>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Biologics and temperature-sensitive products must be equipped with active digital temperature tracking logs from hospital surplus to dispensing clinic. Any temperature excursion exceeding 30 minutes outside certified ranges will result in automated listing revocation.
        </p>
      </div>

      {/* Prescription Requirement */}
      <div className="bg-blue-50 border border-blue-200 p-6 rounded-2xl flex items-start gap-4">
        <FileCheck className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-blue-900">Mandatory Doctor Prescription Upload</h4>
          <p className="text-xs text-blue-800 leading-relaxed">
            Prescription-only medicines require requesters to upload a verified doctor prescription. The distributing pharmacist verifies the prescription legality, dosage, and identity before approving medicine release.
          </p>
        </div>
      </div>
    </div>
  );
}
