import React from 'react';
import Link from 'next/link';
import { Heart, Pill, ShieldCheck, Activity, PhoneCall, Mail, AlertTriangle } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 text-sm border-t border-slate-800">
      {/* Disclaimer Banner */}
      <div className="bg-slate-950/80 border-b border-slate-800/80 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-start sm:items-center gap-3 text-xs text-slate-400">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 sm:mt-0" />
          <p>
            <strong className="text-slate-200">Medical & Legal Disclaimer:</strong> MedShare facilitates donor communication and regulated medicine redistribution among authorized healthcare institutions. MedShare does NOT practice medicine, establish final blood compatibility, or permit unregulated peer-to-peer prescription drug transfers. All clinical crossmatching and medicine verifications must be conducted by licensed professionals.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <Activity className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">
                Med<span className="text-blue-500">Share</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-sm">
              "Every Drop Matters. Every Medicine Counts." Modern, AI-powered healthcare infrastructure bridging critical emergency blood shortages and eliminating pharmaceutical waste through verified redistribution.
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                HIPAA & PostGIS Secure
              </span>
              <span>•</span>
              <span>ISO 9001 Compliant Standards</span>
            </div>
          </div>

          {/* RapidBlood */}
          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-red-500" /> RapidBlood Network
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/blood-requests/new" className="hover:text-white transition-colors">
                  Request Emergency Blood
                </Link>
              </li>
              <li>
                <Link href="/blood-requests/nearby-donors" className="hover:text-white transition-colors">
                  Search Compatible Donors
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-white transition-colors">
                  Register as a Blood Donor
                </Link>
              </li>
              <li>
                <Link href="/blood-info" className="hover:text-white transition-colors">
                  Blood Group Compatibility Chart
                </Link>
              </li>
            </ul>
          </div>

          {/* MedShare Medicine */}
          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Pill className="w-3.5 h-3.5 text-emerald-500" /> Medicine System
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/medicines" className="hover:text-white transition-colors">
                  Verified Medicine Inventory
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-white transition-colors">
                  Pharmacy Organization Sign Up
                </Link>
              </li>
              <li>
                <Link href="/medicine-info" className="hover:text-white transition-colors">
                  Redistribution Safety Policies
                </Link>
              </li>
              <li>
                <Link href="/medicine-info#cold-chain" className="hover:text-white transition-colors">
                  Cold-Chain Protocol
                </Link>
              </li>
            </ul>
          </div>

          {/* Company & Support */}
          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-4">
              Resources & Legal
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  About the Innovation
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-white transition-colors">
                  Platform Architecture
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Emergency Support Hotline
                </Link>
              </li>
              <li>
                <Link href="/about#privacy" className="hover:text-white transition-colors">
                  Location Privacy Framework
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} MedShare – RapidBlood Network. Built for life-saving healthcare innovation.</p>
          <div className="flex items-center gap-6">
            <Link href="/about#terms" className="hover:text-slate-400">Terms of Use</Link>
            <Link href="/about#privacy" className="hover:text-slate-400">Privacy Policy</Link>
            <Link href="/contact" className="hover:text-slate-400">Security Inquiries</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
