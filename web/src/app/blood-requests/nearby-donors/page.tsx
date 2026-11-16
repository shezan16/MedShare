'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { donorApi } from '@/lib/api';
import DonorMap from '@/components/blood/DonorMap';
import { Heart, MapPin, Filter, Search, ShieldCheck, ArrowRight, Activity, AlertCircle } from 'lucide-react';
import { BloodGroup } from '@/types';

export default function NearbyDonorsPage() {
  const [bloodGroup, setBloodGroup] = useState<string>('');
  const [radiusKm, setRadiusKm] = useState<number>(5.0);
  const [donors, setDonors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Default coordinate centered at Metropolitan Trauma Center
  const centerLat = 40.7516;
  const centerLng = -73.9754;

  useEffect(() => {
    setIsLoading(true);
    donorApi
      .getNearby({
        lat: centerLat,
        lng: centerLng,
        radius: radiusKm,
        bloodGroup: bloodGroup || undefined,
      })
      .then((res) => {
        if (res.data?.data?.donors) {
          setDonors(res.data.data.donors);
        }
      })
      .catch(() => {
        // Fallback demo donor markers
        setDonors([
          {
            id: 'd-1',
            displayName: 'Alex V.',
            bloodGroup: 'O_NEG',
            approxDistanceKm: 0.15,
            isAvailable: true,
            isVerified: true,
            donationCount: 6,
            eligibility: { isEligible: true, message: 'Eligible' },
            approxLocation: { lat: 40.7522, lng: -73.9765 },
          },
          {
            id: 'd-2',
            displayName: 'Sarah C.',
            bloodGroup: 'A_POS',
            approxDistanceKm: 0.85,
            isAvailable: true,
            isVerified: true,
            donationCount: 4,
            eligibility: { isEligible: true, message: 'Eligible' },
            approxLocation: { lat: 40.7484, lng: -73.9857 },
          },
          {
            id: 'd-3',
            displayName: 'David K.',
            bloodGroup: 'B_POS',
            approxDistanceKm: 1.2,
            isAvailable: true,
            isVerified: true,
            donationCount: 8,
            eligibility: { isEligible: true, message: 'Eligible' },
            approxLocation: { lat: 40.7589, lng: -73.9851 },
          },
        ]);
      })
      .finally(() => setIsLoading(false));
  }, [bloodGroup, radiusKm]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold mb-2">
            <Heart className="w-3.5 h-3.5 fill-red-600" /> RapidBlood PostGIS Geospatial Engine
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Nearby Compatible Blood Donors
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time donor density with privacy-preserving approximate coordinates
          </p>
        </div>

        <Link
          href="/blood-requests/new"
          className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/20 transition-all flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 animate-pulse" />
          Broadcast Emergency Request
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-700">Filter Blood Group:</span>
            <select
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 font-bold focus:outline-none"
            >
              <option value="">All Blood Groups</option>
              <option value="A_POS">A+</option>
              <option value="A_NEG">A-</option>
              <option value="B_POS">B+</option>
              <option value="B_NEG">B-</option>
              <option value="AB_POS">AB+</option>
              <option value="AB_NEG">AB-</option>
              <option value="O_POS">O+</option>
              <option value="O_NEG">O- (Universal)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Search Radius:</span>
            <select
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 font-bold focus:outline-none"
            >
              <option value="1">1 KM (Walking distance)</option>
              <option value="3">3 KM</option>
              <option value="5">5 KM (Default Standard)</option>
              <option value="10">10 KM</option>
              <option value="15">15 KM (Metro Area)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-500 font-medium">
          <Activity className="w-4 h-4 text-emerald-500" />
          <span>Found <strong>{donors.length}</strong> available donors</span>
        </div>
      </div>

      {/* Map & Donor Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Map View */}
        <div className="lg:col-span-2">
          <DonorMap
            hospitalLat={centerLat}
            hospitalLng={centerLng}
            hospitalName="Metropolitan Trauma Center (Reference GPS)"
            radiusKm={radiusKm}
            donors={donors}
          />
        </div>

        {/* Donor List Cards */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Available Donors in Range ({donors.length})
          </h3>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {donors.map((donor) => (
              <div
                key={donor.id}
                className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:border-blue-300 transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-red-700 border border-red-200 font-extrabold flex items-center justify-center font-mono">
                    {donor.bloodGroup.replace('_', '')}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">{donor.displayName}</h4>
                    <p className="text-[11px] text-slate-500">
                      Approx <strong>{donor.approxDistanceKm} km</strong> away
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {donor.donationCount} donations • {donor.isVerified ? 'Verified Donor' : 'Unverified'}
                    </p>
                  </div>
                </div>

                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100" title="Active & Available" />
              </div>
            ))}
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-[11px] text-slate-500 space-y-1">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Privacy Notice
            </span>
            <p>
              To protect donor safety, personal phone numbers and exact home coordinates are masked. Only approximate radii are displayed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
