import React from 'react';
import Link from 'next/link';
import { Activity, ShieldCheck, Heart, Pill, Award, CheckCircle2 } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-16">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
          <Activity className="w-3.5 h-3.5 text-blue-600" />
          Mission & Architecture
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
          About MedShare – RapidBlood Network
        </h1>
        <p className="text-sm sm:text-base text-slate-600">
          "Every Drop Matters. Every Medicine Counts." Built as a hackathon innovation bridging critical healthcare gaps through technology.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
          <h2 className="text-xl font-bold text-slate-900">The Problem We Are Solving</h2>
          <p>
            During severe trauma, surgeries, and obstetric emergencies, finding compatible blood within the critical "Golden Hour" often fails due to fragmented donor registries and lack of real-time geospatial dispatch.
          </p>
          <p>
            Simultaneously, billions of dollars of unexpired, high-quality pharmaceuticals are incinerated annually due to institutional overstock, while underprivileged clinics face severe shortages.
          </p>
          <p>
            <strong>MedShare solves both challenges</strong> with one unified, secure platform: RapidBlood for sub-minute donor dispatch, and MedShare Medicine for audited, regulated redistribution.
          </p>
        </div>

        <div className="bg-slate-900 text-white p-8 rounded-3xl space-y-4">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
            <Award className="w-5 h-5" /> Production-Grade Standards
          </div>
          <ul className="space-y-3 text-xs text-slate-300">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Full Next.js App Router + TypeScript + Tailwind</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Express.js REST APIs with Socket.IO WebSockets</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>PostgreSQL + PostGIS Geospatial Indexing</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Python FastAPI Computer Vision & OCR Microservice</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
