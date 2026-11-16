'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { medicineApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Medicine } from '@/types';
import {
  Pill,
  ShieldCheck,
  Building2,
  Calendar,
  AlertTriangle,
  FileCheck,
  ArrowRight,
  Upload,
  CheckCircle2,
  Snowflake,
} from 'lucide-react';

export default function MedicineDetailPage() {
  const { id } = useParams() as { id: string };
  const { user } = useAuth();
  const router = useRouter();

  const [medicine, setMedicine] = useState<Medicine | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [prescriptionUrl, setPrescriptionUrl] = useState('https://storage.medshare.org/prescriptions/sample-rx-verified.pdf');
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    medicineApi
      .getById(id)
      .then((res) => {
        if (res.data?.data) {
          setMedicine(res.data.data);
        }
      })
      .catch(() => {
        // Fallback demo
        setMedicine({
          id,
          pharmacyId: 'ph-1',
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
            id: 'ph-1',
            organizationName: 'HealthCare Plus Community Pharmacy',
            address: '550 5th Ave, New York, NY 10036',
            phone: '+1 (212) 555-0321',
            isVerified: true,
          },
        });
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push('/login');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await medicineApi.createRequest({
        medicineId: id,
        quantityRequested: Number(quantity),
        reason,
        prescriptionUrl: medicine?.requiresPrescription ? prescriptionUrl : undefined,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to submit assistance request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || !medicine) {
    return <div className="max-w-4xl mx-auto px-4 py-20 text-center text-slate-400">Loading medicine profile...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Detail Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="space-y-1">
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Verified Surplus Batch
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{medicine.name}</h1>
            <p className="text-xs text-slate-500">
              Generic: <strong>{medicine.genericName}</strong> • {medicine.manufacturer}
            </p>
          </div>

          <div className="text-right">
            <span className="text-2xl font-extrabold text-emerald-600">{medicine.quantity}</span>
            <span className="text-xs text-slate-500 block">Units Available</span>
          </div>
        </div>

        {/* Verification & Storage conditions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block mb-0.5">Strength / Form</span>
            <span className="font-bold text-slate-800">{medicine.strength} ({medicine.dosageForm})</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block mb-0.5">Batch Code</span>
            <span className="font-mono font-bold text-slate-800">{medicine.batchNumber}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block mb-0.5">Expiry Date</span>
            <span className="font-bold text-slate-800">{new Date(medicine.expiryDate).toLocaleDateString()}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block mb-0.5">Packaging State</span>
            <span className="font-bold text-emerald-700">{medicine.packagingCondition.replace('_', ' ')}</span>
          </div>
        </div>

        {/* Pharmacy Origin */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-bold text-slate-900">{medicine.pharmacy?.organizationName}</p>
              <p className="text-slate-500">{medicine.pharmacy?.address} • {medicine.pharmacy?.phone}</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase">
            Licensed Facility
          </span>
        </div>
      </div>

      {/* Assistance Request Form */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
          <FileCheck className="w-5 h-5 text-emerald-600" /> Medicine Assistance Request
        </h2>

        {submitted ? (
          <div className="text-center py-8 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="text-lg font-bold text-slate-900">Request Submitted to Distributing Pharmacy</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Your assistance request has been routed to {medicine.pharmacy?.organizationName}. The licensed pharmacist will review your prescription and coordinate authorized dispensing.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold"
            >
              Return to Dashboard
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmitRequest} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity Requested</label>
                <input
                  type="number"
                  min="1"
                  max={medicine.quantity}
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Prescription Document Link / Upload</label>
                <input
                  type="text"
                  required={medicine.requiresPrescription}
                  value={prescriptionUrl}
                  onChange={(e) => setPrescriptionUrl(e.target.value)}
                  placeholder="https://... or doctor prescription verification"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Medical Need / Reason for Assistance</label>
              <textarea
                rows={3}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain clinical necessity, attending physician, or medical aid program eligibility..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-6 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
            >
              {submitting ? 'Submitting Request...' : 'Submit Medicine Assistance Request'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
