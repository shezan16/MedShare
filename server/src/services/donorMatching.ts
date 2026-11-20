import type { BloodGroup } from '../types/index.ts';

export const COMPATIBLE_DONORS_FOR_RECIPIENT: Record<BloodGroup, BloodGroup[]> = {
  A_POS: ['A_POS', 'A_NEG', 'O_POS', 'O_NEG'],
  A_NEG: ['A_NEG', 'O_NEG'],
  B_POS: ['B_POS', 'B_NEG', 'O_POS', 'O_NEG'],
  B_NEG: ['B_NEG', 'O_NEG'],
  AB_POS: ['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG'],
  AB_NEG: ['AB_NEG', 'A_NEG', 'B_NEG', 'O_NEG'],
  O_POS: ['O_POS', 'O_NEG'],
  O_NEG: ['O_NEG'],
};

/**
 * Calculates Great-Circle Distance between two coordinates in Kilometers using the Haversine Formula.
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
 * Checks if a donor blood group is medically compatible with recipient
 */
export function isBloodCompatible(donorGroup: BloodGroup, recipientGroup: BloodGroup): boolean {
  const allowed = COMPATIBLE_DONORS_FOR_RECIPIENT[recipientGroup] || [];
  return allowed.includes(donorGroup);
}

/**
 * Checks donor cooldown period (90 days for whole blood donation)
 */
export function checkDonationEligibility(lastDonationDate?: Date | null): {
  isEligible: boolean;
  message: string;
  daysRemaining: number;
} {
  if (!lastDonationDate) {
    return {
      isEligible: true,
      message: 'Eligible for donation (no previous donation recorded)',
      daysRemaining: 0,
    };
  }

  const today = new Date();
  const diffTime = Math.abs(today.getTime() - new Date(lastDonationDate).getTime());
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  const COOLDOWN_DAYS = 90;

  if (diffDays < COOLDOWN_DAYS) {
    const daysRemaining = COOLDOWN_DAYS - diffDays;
    return {
      isEligible: false,
      message: `Cooldown active: ${daysRemaining} days remaining before next donation.`,
      daysRemaining,
    };
  }

  return {
    isEligible: true,
    message: `Eligible: Last donated ${diffDays} days ago.`,
    daysRemaining: 0,
  };
}

export interface DonorRankingInput {
  id: string;
  fullName: string;
  bloodGroup: BloodGroup;
  latitude: number;
  longitude: number;
  isAvailable: boolean;
  isVerified: boolean;
  responseRate?: number;
  lastDonationDate?: Date | null;
  preferredRadiusKm?: number;
}

export interface DonorRankOutput {
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
  // Approximate coordinates for privacy protection (perturbed slightly)
  approxLocation: {
    lat: number;
    lng: number;
  };
}

/**
 * Perturbs coordinates slightly (~300-500 meters) to protect donor privacy on public maps
 */
export function obfuscateCoordinates(lat: number, lng: number): { lat: number; lng: number } {
  // 0.003 degrees is approx 330 meters
  const deltaLat = (Math.sin(lat * 1000) * 0.003);
  const deltaLng = (Math.cos(lng * 1000) * 0.003);
  return {
    lat: Math.round((lat + deltaLat) * 10000) / 10000,
    lng: Math.round((lng + deltaLng) * 10000) / 10000,
  };
}

/**
 * Mask full name for public requester view (e.g. "John Doe" -> "John D.")
 */
export function maskDonorName(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
}

/**
 * Smart Multi-Factor Donor Ranking Algorithm:
 * - Distance: 35%
 * - Availability: 25%
 * - Verification: 20%
 * - Response History: 10%
 * - Donation Eligibility: 10%
 */
export function rankDonors(
  hospitalLat: number,
  hospitalLng: number,
  requiredBloodGroup: BloodGroup,
  searchRadiusKm: number,
  donors: DonorRankingInput[]
): DonorRankOutput[] {
  const ranked: DonorRankOutput[] = [];

  for (const donor of donors) {
    // 1. Compatibility check
    if (!isBloodCompatible(donor.bloodGroup, requiredBloodGroup)) {
      continue;
    }

    // 2. Distance check
    const dist = calculateDistanceKm(hospitalLat, hospitalLng, donor.latitude, donor.longitude);
    const donorMaxRadius = Math.max(searchRadiusKm, donor.preferredRadiusKm || searchRadiusKm);
    
    // Only consider donors within max search radius * 1.5
    if (dist > donorMaxRadius * 1.5) {
      continue;
    }

    // Distance Score (0-100): 100 if at 0km, decreasing linearly
    const distScore = Math.max(0, Math.min(100, (1 - dist / (donorMaxRadius * 1.5)) * 100));

    // Availability Score (0-100)
    const availScore = donor.isAvailable ? 100 : 0;

    // Verification Score (0-100)
    const verifScore = donor.isVerified ? 100 : 35;

    // Response History (0-100)
    const respScore = donor.responseRate !== undefined ? donor.responseRate : 85;

    // Eligibility Score (0-100)
    const eligCheck = checkDonationEligibility(donor.lastDonationDate);
    const eligScore = eligCheck.isEligible ? 100 : 15;

    // Weighted Score
    const matchScore =
      distScore * 0.35 +
      availScore * 0.25 +
      verifScore * 0.20 +
      respScore * 0.10 +
      eligScore * 0.10;

    ranked.push({
      donorId: donor.id,
      displayName: maskDonorName(donor.fullName),
      bloodGroup: donor.bloodGroup,
      approxDistanceKm: dist,
      isAvailable: donor.isAvailable,
      isVerified: donor.isVerified,
      matchScore: Math.round(matchScore * 10) / 10,
      eligibility: {
        isEligible: eligCheck.isEligible,
        statusText: eligCheck.message,
      },
      scoreBreakdown: {
        distanceScore: Math.round(distScore * 10) / 10,
        availabilityScore: Math.round(availScore * 10) / 10,
        verificationScore: Math.round(verifScore * 10) / 10,
        responseHistoryScore: Math.round(respScore * 10) / 10,
        eligibilityScore: Math.round(eligScore * 10) / 10,
      },
      approxLocation: obfuscateCoordinates(donor.latitude, donor.longitude),
    });
  }

  // Sort descending by matchScore
  return ranked.sort((a, b) => b.matchScore - a.matchScore);
}
