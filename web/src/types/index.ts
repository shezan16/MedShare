export type UserRole = 'PATIENT' | 'DONOR' | 'PHARMACY' | 'ADMIN';

export type BloodGroup = 'A_POS' | 'A_NEG' | 'B_POS' | 'B_NEG' | 'AB_POS' | 'AB_NEG' | 'O_POS' | 'O_NEG';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RequestStatus = 
  | 'PENDING'
  | 'VERIFIED'
  | 'SEARCHING'
  | 'NOTIFIED'
  | 'DONOR_ACCEPTED'
  | 'DONOR_CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface User {
  id: string;
  email?: string | null;
  phone?: string | null;
  role: UserRole;
  isVerified: boolean;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  profileImage?: string;
  fullName?: string;
  bloodGroup?: BloodGroup;
  city?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  isAvailable?: boolean;
  lastDonationDate?: string | null;
  organizationName?: string;
  licenseNumber?: string;
  donor?: {
    id: string;
    fullName: string;
    bloodGroup: BloodGroup;
    isAvailable: boolean;
    verificationStatus: VerificationStatus;
  } | null;
  pharmacy?: {
    id: string;
    organizationName: string;
    licenseNumber: string;
    verificationStatus: VerificationStatus;
  } | null;
}

export interface BloodRequest {
  id: string;
  requestNumber: string;
  requesterId: string;
  patientName: string;
  bloodGroup: BloodGroup;
  unitsRequired: number;
  hospitalName: string;
  hospitalAddress: string;
  hospitalLat: number;
  hospitalLng: number;
  requiredDate: string;
  priority: Priority;
  contactPerson: string;
  contactPhone: string;
  additionalNotes?: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  donorResponses?: Array<{
    id: string;
    status: string;
    donor: {
      id: string;
      fullName: string;
      bloodGroup: BloodGroup;
      verificationStatus: VerificationStatus;
      donationCount: number;
    };
  }>;
}

export interface RankedDonor {
  donorId: string;
  displayName: string;
  bloodGroup: BloodGroup;
  approxDistanceKm: number;
  isAvailable: boolean;
  isVerified: boolean;
  matchScore: number;
  eligibility: {
    isEligible: boolean;
    statusText: string;
  };
  scoreBreakdown: {
    distanceScore: number;
    availabilityScore: number;
    verificationScore: number;
    responseHistoryScore: number;
    eligibilityScore: number;
  };
  approxLocation: {
    lat: number;
    lng: number;
  };
}

export interface Medicine {
  id: string;
  pharmacyId: string;
  name: string;
  genericName: string;
  brandName?: string;
  strength: string;
  dosageForm: string;
  manufacturer: string;
  batchNumber: string;
  mfgDate: string;
  expiryDate: string;
  quantity: number;
  packagingCondition: string;
  storageCondition: string;
  requiresPrescription: boolean;
  requiresColdChain: boolean;
  source: string;
  imageUrl?: string;
  verificationStatus: VerificationStatus;
  safetyNotes?: string;
  daysUntilExpiry?: number;
  isExpiringSoon?: boolean;
  pharmacy?: {
    id: string;
    organizationName: string;
    address: string;
    phone: string;
    isVerified: boolean;
  };
}

export interface MedicineRequest {
  id: string;
  requesterId: string;
  medicineId: string;
  quantityRequested: number;
  prescriptionUrl?: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISPENSED' | 'CANCELLED';
  pharmacyNotes?: string;
  createdAt: string;
  medicine?: Medicine;
  requester?: { id: string; email: string };
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'EMERGENCY_BLOOD' | 'DONOR_ACCEPT' | 'MEDICINE_UPDATE' | 'VERIFICATION' | 'SYSTEM';
  isRead: boolean;
  createdAt: string;
  data?: any;
}
