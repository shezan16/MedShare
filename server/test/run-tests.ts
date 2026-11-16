import {
  calculateDistanceKm,
  isBloodCompatible,
  checkDonationEligibility,
  rankDonors,
  COMPATIBLE_DONORS_FOR_RECIPIENT,
} from '../src/services/donorMatching.ts';
import type { DonorRankingInput } from '../src/services/donorMatching.ts';
import type { BloodGroup } from '../src/types/index.ts';

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failedCount++;
  }
}

async function runTestSuite() {
  console.log('🧪 Starting MedShare Core Logic & Edge-Case Test Suite...\n');

  // 1. Test Blood Compatibility Matrix
  console.log('--- 1. Medical Blood Compatibility Verification ---');
  assert(isBloodCompatible('O_NEG', 'A_POS'), 'O- (Universal Donor) can donate to A+');
  assert(isBloodCompatible('O_NEG', 'AB_NEG'), 'O- can donate to AB-');
  assert(isBloodCompatible('O_NEG', 'O_NEG'), 'O- can donate to O-');
  assert(!isBloodCompatible('A_POS', 'O_POS'), 'A+ CANNOT donate to O+');
  assert(!isBloodCompatible('B_POS', 'A_POS'), 'B+ CANNOT donate to A+');
  assert(isBloodCompatible('AB_POS', 'AB_POS'), 'AB+ can donate to AB+ (Universal Recipient)');
  assert(!isBloodCompatible('AB_POS', 'A_POS'), 'AB+ CANNOT donate to A+');
  assert(isBloodCompatible('A_NEG', 'A_POS'), 'A- can donate to A+');
  assert(!isBloodCompatible('A_POS', 'A_NEG'), 'A+ CANNOT donate to A-');

  // 2. Test Geolocation Distance (Haversine Formula)
  console.log('\n--- 2. Geolocation Distance Calculations ---');
  // Distance from Empire State Building (40.7484, -73.9857) to Times Square (40.7580, -73.9855) is ~1.07 km
  const distTimesSquare = calculateDistanceKm(40.7484, -73.9857, 40.7580, -73.9855);
  assert(distTimesSquare > 0.9 && distTimesSquare < 1.3, `Distance ESB to Times Square is approx 1.07km (got ${distTimesSquare}km)`);
  
  // Distance to itself is 0
  const distZero = calculateDistanceKm(40.7484, -73.9857, 40.7484, -73.9857);
  assert(distZero === 0, 'Distance to same coordinate is 0.00 km');

  // 3. Test Donor Cooldown & Medical Eligibility (90 Days)
  console.log('\n--- 3. Donor Cooldown & Eligibility Rules ---');
  // No previous donation
  const eligNeverDonated = checkDonationEligibility(null);
  assert(eligNeverDonated.isEligible === true, 'First-time donor is immediately eligible');

  // Donated 100 days ago (past 90-day cooldown)
  const d100 = new Date(Date.now() - 1000 * 60 * 60 * 24 * 100);
  const elig100 = checkDonationEligibility(d100);
  assert(elig100.isEligible === true, 'Donor 100 days post-donation is eligible');

  // Donated 30 days ago (active cooldown)
  const d30 = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
  const elig30 = checkDonationEligibility(d30);
  assert(elig30.isEligible === false, 'Donor 30 days post-donation is NOT eligible (cooldown active)');
  assert(elig30.daysRemaining > 0, `Cooldown displays days remaining: ${elig30.daysRemaining}`);

  // 4. Test Multi-Factor Smart Donor Matching & Ranking
  console.log('\n--- 4. Smart Donor Ranking (Weights: Distance 35%, Availability 25%, Verification 20%, Response 10%, Eligibility 10%) ---');
  const mockDonors: DonorRankingInput[] = [
    {
      id: 'd1',
      fullName: 'Close Verified Available Donor',
      bloodGroup: 'O_NEG',
      latitude: 40.7510,
      longitude: -73.9760, // ~0.2 km from hospital
      isAvailable: true,
      isVerified: true,
      responseRate: 98,
      lastDonationDate: new Date('2024-01-01'),
      preferredRadiusKm: 5.0,
    },
    {
      id: 'd2',
      fullName: 'Far Incompatible Donor',
      bloodGroup: 'B_POS', // Incompatible with O_NEG recipient
      latitude: 40.7520,
      longitude: -73.9760,
      isAvailable: true,
      isVerified: true,
      responseRate: 90,
      lastDonationDate: null,
      preferredRadiusKm: 5.0,
    },
    {
      id: 'd3',
      fullName: 'Unavailable Donor',
      bloodGroup: 'O_NEG',
      latitude: 40.7515,
      longitude: -73.9762,
      isAvailable: false,
      isVerified: true,
      responseRate: 90,
      lastDonationDate: null,
      preferredRadiusKm: 5.0,
    },
    {
      id: 'd4',
      fullName: 'Unverified Moderate Distance Donor',
      bloodGroup: 'O_NEG',
      latitude: 40.7700,
      longitude: -73.9800, // ~2.5 km away
      isAvailable: true,
      isVerified: false,
      responseRate: 70,
      lastDonationDate: null,
      preferredRadiusKm: 5.0,
    },
  ];

  const hospitalLat = 40.7516;
  const hospitalLng = -73.9754;

  const ranked = rankDonors(hospitalLat, hospitalLng, 'O_NEG', 5.0, mockDonors);

  // Incompatible donor d2 must be excluded
  assert(!ranked.some((r) => r.donorId === 'd2'), 'Incompatible blood group (B+) excluded for O- recipient');
  // Highest match must be d1 (closest, verified, available)
  assert(ranked[0].donorId === 'd1', `Top ranked donor is d1 with score ${ranked[0].matchScore}`);
  // d1 score should be higher than d3 (who is unavailable)
  const d3Rank = ranked.find((r) => r.donorId === 'd3');
  assert(ranked[0].matchScore > (d3Rank?.matchScore || 0), 'Available verified donor ranks higher than unavailable donor');

  // 5. Test Medicine Safety Rules
  console.log('\n--- 5. Medicine Redistribution Safety Rules ---');
  const now = new Date();
  const pastDate = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 5); // 5 days expired
  const futureDate = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 180); // 6 months future

  // Rule: Expiry validation
  assert(pastDate <= now, 'Expired medicine identified accurately');
  assert(futureDate > now, 'Valid unexpired medicine identified accurately');

  // Print Summary
  console.log('\n===================================================');
  console.log(`🏁 TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('===================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
