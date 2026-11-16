'use client';

import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, ShieldCheck, HeartHandshake, UserCheck } from 'lucide-react';
import { RequestStatus } from '@/types';

interface TimelineProps {
  status: RequestStatus;
  createdAt: string;
  updatedAt?: string;
}

const TIMELINE_STEPS = [
  { key: 'CREATED', label: 'Request Created', desc: 'Emergency triage initiated' },
  { key: 'VERIFIED', label: 'Request Verified', desc: 'Hospital credentials validated' },
  { key: 'NOTIFIED', label: 'Donors Notified', desc: 'Real-time alerts sent to nearby compatible donors' },
  { key: 'DONOR_ACCEPTED', label: 'Donor Accepted', desc: 'Volunteer matched and en route' },
  { key: 'ARRANGED', label: 'Donation Arranged', desc: 'Hospital intake and preliminary crossmatch' },
  { key: 'COMPLETED', label: 'Donation Completed', desc: 'Transfusion unit fulfilled' },
];

export default function TimelineTracker({ status, createdAt, updatedAt }: TimelineProps) {
  const getStepState = (stepKey: string) => {
    const statusOrder: Record<string, number> = {
      PENDING: 0,
      VERIFIED: 1,
      SEARCHING: 2,
      NOTIFIED: 2,
      DONOR_ACCEPTED: 3,
      DONOR_CONFIRMED: 4,
      COMPLETED: 5,
      CANCELLED: -1,
      EXPIRED: -1,
    };

    const stepOrder: Record<string, number> = {
      CREATED: 0,
      VERIFIED: 1,
      NOTIFIED: 2,
      DONOR_ACCEPTED: 3,
      ARRANGED: 4,
      COMPLETED: 5,
    };

    if (status === 'CANCELLED' || status === 'EXPIRED') {
      return 'failed';
    }

    const currentIdx = statusOrder[status] ?? 0;
    const thisIdx = stepOrder[stepKey] ?? 0;

    if (thisIdx < currentIdx) return 'completed';
    if (thisIdx === currentIdx) return 'current';
    return 'upcoming';
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900">Emergency Progress Timeline</h3>
          <p className="text-xs text-slate-500">Live operational audit trail</p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            status === 'COMPLETED'
              ? 'bg-emerald-100 text-emerald-800'
              : status === 'DONOR_ACCEPTED' || status === 'DONOR_CONFIRMED'
              ? 'bg-blue-100 text-blue-800'
              : status === 'NOTIFIED' || status === 'SEARCHING'
              ? 'bg-amber-100 text-amber-800 animate-pulse'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          {status.replace('_', ' ')}
        </span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {TIMELINE_STEPS.map((step, idx) => {
          const state = getStepState(step.key);

          return (
            <div key={idx} className="relative flex items-start gap-4">
              {/* Dot Icon */}
              <div
                className={`absolute -left-6 mt-0.5 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white ${
                  state === 'completed'
                    ? 'bg-emerald-500 text-white'
                    : state === 'current'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                    : 'bg-slate-200 text-slate-400'
                }`}
              >
                {state === 'completed' ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : state === 'current' ? (
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-slate-400" />
                )}
              </div>

              {/* Step info */}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4
                    className={`text-sm font-semibold ${
                      state === 'current'
                        ? 'text-blue-600'
                        : state === 'completed'
                        ? 'text-slate-800'
                        : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </h4>
                  {idx === 0 && (
                    <span className="text-[11px] text-slate-400">
                      {new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
