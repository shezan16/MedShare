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

export type ResponseStatus = 'NOTIFIED' | 'ACCEPTED' | 'DECLINED' | 'CONFIRMED' | 'COMPLETED';

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export type MedicineRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISPENSED' | 'CANCELLED';

export type NotificationType = 'EMERGENCY_BLOOD' | 'DONOR_ACCEPT' | 'MEDICINE_UPDATE' | 'VERIFICATION' | 'SYSTEM';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
  donorId?: string;
  pharmacyId?: string;
}

export interface DonorCandidate {
  id: string;
  fullName: string;
  bloodGroup: BloodGroup;
  latitude: number;
  longitude: number;
  isAvailable: boolean;
  isVerified: boolean;
  responseRate?: number;
  lastDonationDate?: string | null;
  donationCount?: number;
}

export interface DonorRankResult {
  id: string;
  fullName: string;
  bloodGroup: BloodGroup;
  approxDistanceKm: number;
  isAvailable: boolean;
  isVerified: boolean;
  matchScore: number;
  eligibilityStatus: string;
  scoreBreakdown: {
    distanceScore: number;
    availabilityScore: number;
    verificationScore: number;
    responseHistoryScore: number;
    eligibilityScore: number;
  };
}

export interface OCRResult {
  medicineName: string;
  genericName?: string;
  brandName?: string;
  batchNumber: string;
  mfgDate: string;
  expiryDate: string;
  strength: string;
  dosageForm: string;
  manufacturer?: string;
  confidence: number;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  extractedTextRaw?: string;
  safetyWarnings: string[];
}
