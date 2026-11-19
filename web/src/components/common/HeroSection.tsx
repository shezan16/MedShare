'use client';

import React from 'react';
import Link from 'next/link';
import {
  Heart,
  Pill,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  Lock,
  Sparkles,
  Bot,
} from 'lucide-react';

export default function HeroSection() {
  return (
    <section className="hero-section relative w-full min-h-screen flex items-center justify-center overflow-hidden">
      {/* ───── Background Video ───── */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src="/hero-bg.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      />

      {/* ───── Radial Vignette Overlay ───── */}
      <div className="hero-vignette absolute inset-0 pointer-events-none" />

      {/* ───── Dark tint for readability ───── */}
      <div className="absolute inset-0 bg-[#060b14]/60 pointer-events-none" />

      {/* ───── Content ───── */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center gap-6 py-20">

        {/* ─ Main Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-[4.5rem] font-extrabold leading-[1.1] tracking-tight">
          <span className="text-white">One Platform. </span>
          <span className="text-blue-500">Two</span>
          <br />
          <span className="hero-gradient-text">Lifesaving </span>
          <span className="text-white">Solutions.</span>
        </h1>

        {/* 3 ─ Subtitle */}
        <p className="text-[#cbd5e1] text-base sm:text-lg max-w-2xl leading-relaxed">
          Connecting emergency blood donors within minutes and enabling regulated,
          safe medicine redistribution through intelligent technology.
        </p>

        {/* 4 ─ CTA Button Row */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
          {/* Find Blood Donors */}
          <Link
            href="/blood-requests/nearby-donors"
            className="hero-cta-btn group w-full sm:w-auto"
          >
            <Heart className="w-4 h-4 text-red-400 group-hover:text-red-300 transition-colors" />
            <span>Find Blood Donors</span>
            <ArrowRight className="w-4 h-4 opacity-70 group-hover:translate-x-0.5 transition-transform" />
          </Link>

          {/* Explore MedShare Inventory */}
          <Link
            href="/medicines"
            className="hero-cta-btn group w-full sm:w-auto"
          >
            <Pill className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
            <span>Explore MedShare Inventory</span>
          </Link>

          {/* Emergency Request */}
          <Link
            href="/blood-requests/new"
            className="hero-cta-btn hero-cta-emergency group w-full sm:w-auto"
          >
            <AlertCircle className="w-4 h-4 animate-pulse" />
            <span>Emergency Request</span>
          </Link>
        </div>

        {/* 5 ─ Trust Strip */}
        <div className="hero-glass-pill mt-2 inline-flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-6 py-2.5 rounded-full text-xs font-medium text-slate-300 select-none">
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            PostGIS Geo-fenced
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <Lock className="w-4 h-4 text-blue-400" />
            Donor Privacy Protected
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            AI OCR Verification
          </span>
        </div>
      </div>

      {/* 6 ─ Bottom-Right Floating Widget */}
      <div className="absolute bottom-6 right-6 z-20">
        <button className="hero-glass-pill flex items-center gap-2.5 px-4 py-2.5 rounded-full text-sm font-semibold text-white/90 hover:text-white transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg shadow-cyan-500/10">
          <span className="relative">
            <Bot className="w-5 h-5 text-cyan-400" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full ring-2 ring-[#060b14]" />
          </span>
          <span>MedShare AI</span>
        </button>
      </div>
    </section>
  );
}
