'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { medicineApi } from '@/lib/api';
import { Medicine } from '@/types';
import {
  Pill,
  Search,
  Filter,
  AlertTriangle,
  Building2,
  Clock,
  ShieldCheck,
  Snowflake,
  FileCheck,
  ArrowRight,
} from 'lucide-react';

export default function MedicinesPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [search, setSearch] = useState('');
  const [dosageFilter, setDosageFilter] = useState('');
  const [prescriptionFilter, setPrescriptionFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    medicineApi
      .getAll({
        search: search || undefined,
        dosageForm: dosageFilter || undefined,
        requiresPrescription: prescriptionFilter !== '' ? prescriptionFilter === 'true' : undefined,
      })
      .then((res) => {
        if (res.data?.data) {
          setMedicines(res.data.data);
        }
      })
      .catch(() => {
        // Fallback demo inventory
        setMedicines([
          {
            id: 'm1',
            pharmacyId: 'p1',
            name: 'Amoxicillin Trihydrate BP 500mg',
            genericName: 'Amoxicillin',
            brandName: 'Amoxil',
            strength: '500 mg',
            dosageForm: 'Capsule',
            manufacturer: 'Sandoz Pharmaceuticals',
            batchNumber: 'AX2024-884B',
            mfgDate: '2024-03-01',
            expiryDate: '2026-03-01',
            quantity: 120,
            packagingCondition: 'BLISTER_PACK',
            storageCondition: 'ROOM_TEMPERATURE',
            requiresPrescription: true,
            requiresColdChain: false,
            source: 'PHARMACY_STOCK',
            verificationStatus: 'VERIFIED',
            daysUntilExpiry: 360,
            pharmacy: {
              id: 'p1',
              organizationName: 'HealthCare Plus Community Pharmacy',
              address: '550 5th Ave, NY',
              phone: '+1 (212) 555-0321',
              isVerified: true,
            },
          },
          {
            id: 'm2',
            pharmacyId: 'p1',
            name: 'Metformin Hydrochloride 500mg XR',
            genericName: 'Metformin HCl',
            brandName: 'Glucophage XR',
            strength: '500 mg',
            dosageForm: 'Tablet',
            manufacturer: 'Merck S.A.',
            batchNumber: 'MET-4109',
            mfgDate: '2023-11-15',
            expiryDate: '2026-11-15',
            quantity: 250,
            packagingCondition: 'BLISTER_PACK',
            storageCondition: 'ROOM_TEMPERATURE',
            requiresPrescription: true,
            requiresColdChain: false,
            source: 'DONATED_SURPLUS',
            verificationStatus: 'VERIFIED',
            daysUntilExpiry: 420,
            pharmacy: {
              id: 'p1',
              organizationName: 'HealthCare Plus Community Pharmacy',
              address: '550 5th Ave, NY',
              phone: '+1 (212) 555-0321',
              isVerified: true,
            },
          },
          {
            id: 'm3',
            pharmacyId: 'p1',
            name: 'Paracetamol IP 650mg Tablets',
            genericName: 'Paracetamol',
            brandName: 'Calpol',
            strength: '650 mg',
            dosageForm: 'Tablet',
            manufacturer: 'GlaxoSmithKline',
            batchNumber: 'GSK-9921',
            mfgDate: '2024-05-01',
            expiryDate: '2027-05-01',
            quantity: 500,
            packagingCondition: 'INTACT_SEALED',
            storageCondition: 'ROOM_TEMPERATURE',
            requiresPrescription: false,
            requiresColdChain: false,
            source: 'PHARMACY_STOCK',
            verificationStatus: 'VERIFIED',
            daysUntilExpiry: 720,
            pharmacy: {
              id: 'p1',
              organizationName: 'HealthCare Plus Community Pharmacy',
              address: '550 5th Ave, NY',
              phone: '+1 (212) 555-0321',
              isVerified: true,
            },
          },
          {
            id: 'm4',
            pharmacyId: 'p1',
            name: 'Azithromycin Tablets USP 250mg',
            genericName: 'Azithromycin',
            brandName: 'Zithromax',
            strength: '250 mg',
            dosageForm: 'Tablet',
            manufacturer: 'Pfizer Inc.',
            batchNumber: 'PZ-7712A',
            mfgDate: '2024-01-10',
            expiryDate: '2025-01-10',
            quantity: 40,
            packagingCondition: 'BLISTER_PACK',
            storageCondition: 'COOL_DRY',
            requiresPrescription: true,
            requiresColdChain: false,
            source: 'HOSPITAL_SURPLUS',
            verificationStatus: 'VERIFIED',
            daysUntilExpiry: 28,
            isExpiringSoon: true,
            pharmacy: {
              id: 'p1',
              organizationName: 'Apex Care Institutional Pharmacy',
              address: '320 W 42nd St, NY',
              phone: '+1 (212) 555-0765',
              isVerified: true,
            },
          },
        ]);
      })
      .finally(() => setIsLoading(false));
  }, [search, dosageFilter, prescriptionFilter]);

  const filteredMedicines = medicines.filter((med) => {
    const matchesSearch =
      !search ||
      med.name.toLowerCase().includes(search.toLowerCase()) ||
      med.genericName.toLowerCase().includes(search.toLowerCase()) ||
      (med.brandName && med.brandName.toLowerCase().includes(search.toLowerCase()));

    const matchesDosage = !dosageFilter || med.dosageForm === dosageFilter;

    const matchesPrescription =
      prescriptionFilter === '' ||
      (prescriptionFilter === 'true' ? med.requiresPrescription : !med.requiresPrescription);

    return matchesSearch && matchesDosage && matchesPrescription;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold mb-2">
            <Pill className="w-3.5 h-3.5" /> Regulated Redistribution Catalog
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Verified Medicine Inventory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Available surplus pharmaceuticals from licensed healthcare institutions.
          </p>
        </div>

        <Link
          href="/medicine-info"
          className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5"
        >
          <ShieldCheck className="w-4 h-4" /> Safety Rules & Policy
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by generic name, brand, or active formula (e.g. Amoxicillin, Metformin)..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={dosageFilter}
            onChange={(e) => setDosageFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
          >
            <option value="">All Dosage Forms</option>
            <option value="Tablet">Tablet</option>
            <option value="Capsule">Capsule</option>
            <option value="Vial">Vial / Injection</option>
          </select>

          <select
            value={prescriptionFilter}
            onChange={(e) => setPrescriptionFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
          >
            <option value="">All Prescription Types</option>
            <option value="false">Over the Counter (OTC)</option>
            <option value="true">Prescription Required</option>
          </select>
        </div>
      </div>

      {/* Medicine Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMedicines.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400 space-y-2">
            <Pill className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-700">No matching medicines found in verified inventory.</p>
            <p className="text-[11px] text-slate-400">Try adjusting your search query or dosage filters.</p>
          </div>
        ) : (
          filteredMedicines.map((med) => (
          <div
            key={med.id}
            className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all p-6 flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              {/* Badges */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {med.dosageForm} • {med.strength}
                </span>

                {med.isExpiringSoon && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Expiring in {med.daysUntilExpiry}d
                  </span>
                )}
              </div>

              {/* Title */}
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {med.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Generic: <strong>{med.genericName}</strong> • {med.manufacturer}
                </p>
              </div>

              {/* Verification & Conditions */}
              <div className="space-y-1.5 text-[11px] text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Batch Number:</span>
                  <span className="font-mono font-bold">{med.batchNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Expiry Date:</span>
                  <span>{new Date(med.expiryDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Available Stock:</span>
                  <span className="font-bold text-emerald-600">{med.quantity} Units</span>
                </div>
              </div>

              {/* Badges footer */}
              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                {med.requiresPrescription ? (
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold flex items-center gap-1">
                    <FileCheck className="w-3 h-3" /> Rx Required
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                    OTC Eligible
                  </span>
                )}

                {med.requiresColdChain && (
                  <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 font-semibold flex items-center gap-1">
                    <Snowflake className="w-3 h-3" /> Cold-Chain
                  </span>
                )}
              </div>
            </div>

            {/* Action */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 truncate max-w-[150px]">
                {med.pharmacy?.organizationName}
              </span>
              <Link
                href={`/medicines/${med.id}`}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                Request Assistance <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )))}
      </div>
    </div>
  );
}
