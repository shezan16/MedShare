'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { bloodRequestApi } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';
import { BloodRequest, RankedDonor } from '@/types';
import TimelineTracker from '@/components/blood/TimelineTracker';
import DonorMap from '@/components/blood/DonorMap';
import {
  Heart,
  Hospital,
  Phone,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Share2,
  Users,
  ShieldCheck,
  Check,
} from 'lucide-react';

export default function BloodRequestDetailPage() {
  const { id } = useParams() as { id: string };
  const { user } = useAuth();
  const router = useRouter();

  const [request, setRequest] = useState<BloodRequest | null>(null);
  const [rankedDonors, setRankedDonors] = useState<RankedDonor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!id) return;

    // Fetch blood request details
    bloodRequestApi
      .getById(id)
      .then((res) => {
        if (res.data?.data) {
          setRequest(res.data.data);
        }
      })
      .catch((err) => {
        console.error(err);
        setError('Could not load blood request details.');
      })
      .finally(() => setIsLoading(false));

    // Fetch smart matches
    bloodRequestApi
      .getMatches(id)
      .then((res) => {
        if (res.data?.data?.rankedDonors) {
          setRankedDonors(res.data.data.rankedDonors);
        }
      })
      .catch(() => {});

    // Join Socket.IO room for real-time live updates
    const socket = getSocket();
    socket.emit('join_request', id);

    socket.on('request_status_updated', (data) => {
      if (data.requestId === id) {
        setRequest((prev) => (prev ? { ...prev, status: data.status } : null));
      }
    });

    socket.on('donor_response_received', (data) => {
      if (data.requestId === id) {
        // Refresh request data to include response
        bloodRequestApi.getById(id).then((res) => {
          if (res.data?.data) setRequest(res.data.data);
        });
      }
    });

    return () => {
      socket.emit('leave_request', id);
      socket.off('request_status_updated');
      socket.off('donor_response_received');
    };
  }, [id]);

  const handleUpdateStatus = async (newStatus: string) => {
    setActionLoading(true);
    try {
      const res = await bloodRequestApi.updateStatus(id, { status: newStatus });
      if (res.data?.data) {
        setRequest(res.data.data);
      }
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || 'Failed to update status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDonorRespond = async (action: 'ACCEPT' | 'DECLINE') => {
    setActionLoading(true);
    try {
      const res = await bloodRequestApi.respond(id, { action });
      if (res.data?.data) {
        setRequest((prev) => (prev ? { ...prev, status: res.data.data.requestStatus } : null));
        alert(action === 'ACCEPT' ? 'Thank you! Your donation response has been confirmed.' : 'Response noted.');
      }
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || 'Failed to submit donor response.');
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center text-slate-500 text-sm">
        Loading live emergency request...
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Request Not Found</h2>
        <p className="text-xs text-slate-500">{error || 'This blood request does not exist or was removed.'}</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const isRequester = user?.id === request.requesterId || user?.role === 'ADMIN';
  const isDonor = user?.role === 'DONOR';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-bold text-slate-500 uppercase">
              {request.requestNumber}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                request.priority === 'CRITICAL'
                  ? 'bg-red-100 text-red-700 animate-pulse'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {request.priority} Priority
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Emergency {request.bloodGroup.replace('_', '')} Blood Transfusion
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Patient: <strong>{request.patientName}</strong> • {request.unitsRequired} Units Required
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {isDonor && request.status !== 'COMPLETED' && (
            <button
              onClick={() => handleDonorRespond('ACCEPT')}
              disabled={actionLoading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" /> Accept & Donate
            </button>
          )}

          {isRequester && request.status === 'DONOR_ACCEPTED' && (
            <button
              onClick={() => handleUpdateStatus('DONOR_CONFIRMED')}
              disabled={actionLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm"
            >
              Confirm Donor Arrived at Hospital
            </button>
          )}

          {isRequester && (request.status === 'DONOR_CONFIRMED' || request.status === 'DONOR_ACCEPTED') && (
            <button
              onClick={() => handleUpdateStatus('COMPLETED')}
              disabled={actionLoading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm"
            >
              Mark Donation Completed
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Details & Map */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hospital & Triage Info */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <Hospital className="w-4 h-4 text-blue-600" /> Hospital Center & Triage
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500">Hospital</span>
                <p className="font-semibold text-slate-900 mt-0.5">{request.hospitalName}</p>
                <p className="text-slate-600 mt-0.5">{request.hospitalAddress}</p>
              </div>

              <div>
                <span className="text-slate-500">Triage Attendant</span>
                <p className="font-semibold text-slate-900 mt-0.5">{request.contactPerson}</p>
                <p className="font-semibold text-blue-600 mt-0.5 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> {request.contactPhone}
                </p>
              </div>
            </div>

            {request.additionalNotes && (
              <div className="pt-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <strong className="text-slate-800">Clinical Crossmatch Notes:</strong> {request.additionalNotes}
              </div>
            )}
          </div>

          {/* Interactive Leaflet Geofence Map */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-4 h-4 text-red-600" /> PostGIS Geofence & Matched Donors
              </h3>
              <span className="text-xs text-slate-500 font-medium">5 KM Search Radius</span>
            </div>

            <DonorMap
              hospitalLat={request.hospitalLat}
              hospitalLng={request.hospitalLng}
              hospitalName={request.hospitalName}
              radiusKm={5.0}
              donors={rankedDonors}
            />
          </div>

          {/* Responded Donors List */}
          {request.donorResponses && request.donorResponses.length > 0 && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                <Users className="w-4 h-4 text-emerald-600" /> Volunteer Donor Responses ({request.donorResponses.length})
              </h3>

              <div className="divide-y divide-slate-100">
                {request.donorResponses.map((resp) => (
                  <div key={resp.id} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center">
                        {resp.donor.bloodGroup.replace('_', '')}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{resp.donor.fullName}</p>
                        <p className="text-slate-500">
                          {resp.donor.donationCount} past donations • {resp.donor.verificationStatus}
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] uppercase">
                      {resp.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Timeline Tracker */}
        <div className="space-y-6">
          <TimelineTracker
            status={request.status}
            createdAt={request.createdAt}
            updatedAt={request.updatedAt}
          />

          {/* Medical Notice */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <ShieldCheck className="w-4 h-4 text-blue-600" /> Medical Verification Protocol
            </div>
            <p>
              A donor accepting this broadcast does not constitute medical eligibility. Final blood compatibility, infectious disease screening, and serological crossmatching must be conducted by the hospital laboratory prior to transfusion.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
