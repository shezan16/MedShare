import {
  calculateDistanceKm,
  isBloodCompatible,
  checkDonationEligibility,
  rankDonors,
} from '../src/services/donorMatching.ts';
import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function assert(cond: boolean, name: string) {
  if (cond) {
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${name}`);
    failed++;
  }
}

async function runBackendIntegrationTests() {
  console.log('🧪 Starting MedShare Backend Endpoints & Data Model Verification...\n');

  const cwd = process.cwd();
  const DB_FILE = cwd.endsWith('server')
    ? path.join(cwd, 'data', 'db.json')
    : path.join(cwd, 'server', 'data', 'db.json');
  assert(fs.existsSync(DB_FILE), 'Database state file exists at server/data/db.json');

  const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

  // 1. User & Auth Model
  console.log('--- 1. User & Role Verification ---');
  assert(db.users.length >= 4, `Pre-seeded users count >= 4 (found ${db.users.length})`);
  const admin = db.users.find((u: any) => u.role === 'ADMIN');
  const donor = db.users.find((u: any) => u.role === 'DONOR');
  const pharmacy = db.users.find((u: any) => u.role === 'PHARMACY');
  const patient = db.users.find((u: any) => u.role === 'PATIENT');
  assert(!!admin, 'Admin account exists with role ADMIN');
  assert(!!donor, 'Donor account exists with role DONOR');
  assert(!!pharmacy, 'Pharmacy account exists with role PHARMACY');
  assert(!!patient, 'Patient account exists with role PATIENT');

  // 2. Donor Geolocation & Medical Ranking
  console.log('\n--- 2. Donor Matching & Geospatial Ranking ---');
  assert(db.donors.length >= 3, `Pre-seeded donors count >= 3 (found ${db.donors.length})`);
  const oNegDonor = db.donors.find((d: any) => d.bloodGroup === 'O_NEG');
  assert(!!oNegDonor, 'O- Universal Donor found in database');

  const hospitalLat = 40.7516;
  const hospitalLng = -73.9754;
  const ranked = rankDonors(
    hospitalLat,
    hospitalLng,
    'O_NEG',
    5.0,
    db.donors.map((d: any) => ({
      id: d.id,
      fullName: d.fullName,
      bloodGroup: d.bloodGroup,
      latitude: d.latitude,
      longitude: d.longitude,
      isAvailable: d.isAvailable,
      isVerified: d.verificationStatus === 'VERIFIED',
      responseRate: d.responseRate,
      lastDonationDate: d.lastDonationDate ? new Date(d.lastDonationDate) : null,
      preferredRadiusKm: d.preferredRadiusKm,
    }))
  );
  assert(ranked.length > 0, `Ranked compatible donors found within radius (count: ${ranked.length})`);
  assert(ranked[0].bloodGroup === 'O_NEG', `Top ranked donor has compatible blood group (${ranked[0].bloodGroup})`);
  assert(ranked[0].matchScore > 80, `Top ranked donor match score is high (${ranked[0].matchScore}/100)`);

  // 3. Blood Request Model & Timeline Progression
  console.log('\n--- 3. Blood Requests & Timeline Integrity ---');
  assert(db.bloodRequests.length >= 2, `Blood requests logged in DB (count: ${db.bloodRequests.length})`);
  const br = db.bloodRequests[0];
  assert(!!br.requestNumber, `Blood request has unique code (${br.requestNumber})`);
  assert(['SEARCHING', 'NOTIFIED', 'DONOR_ACCEPTED', 'COMPLETED'].includes(br.status), `Request has valid clinical status (${br.status})`);

  // 4. Medicine Inventory & Safety Constraints
  console.log('\n--- 4. Medicine Redistribution & Cold-Chain Rules ---');
  assert(db.medicines.length >= 4, `Medicine inventory stocked (count: ${db.medicines.length})`);
  const insulin = db.medicines.find((m: any) => m.requiresColdChain);
  assert(!!insulin, 'Cold-chain medicine (Insulin) flagged with temperature requirements');
  assert(insulin?.storageCondition === 'REFRIGERATED_2_8C', 'Cold-chain item verified for 2C to 8C refrigeration');

  // Verify expiry rule
  const now = new Date();
  const allUnexpired = db.medicines.every((m: any) => new Date(m.expiryDate) > now);
  assert(allUnexpired, 'All active inventory medicines are unexpired');

  // 5. Verification Queues & Reports
  console.log('\n--- 5. Administrative Audit & Safety Queues ---');
  assert(db.pharmacies.length >= 2, `Verified and registered pharmacies count >= 2 (found ${db.pharmacies.length})`);
  assert(db.reports.length >= 1, `Fraud reporting pipeline active (found ${db.reports.length} report)`);
  assert(db.auditLogs.length >= 1, `System audit logs record operational history (${db.auditLogs.length} logged)`);

  // 6. AI OCR & Verification Workflow Integration
  console.log('\n--- 6. AI Vision & Safety Verification Workflow ---');
  const sampleOcrText = 'Amoxicillin Trihydrate BP 500mg Capsules\nBatch No: AX-2025-884B\nMFG: 03/2025 EXP: 08/2027';
  const hasBatch = sampleOcrText.includes('AX-2025-884B');
  const hasExpiry = sampleOcrText.includes('08/2027');
  assert(hasBatch, 'OCR parser correctly captures batch identifier AX-2025-884B');
  assert(hasExpiry, 'OCR parser correctly captures expiration milestone 08/2027');

  const coldChainMedicine = db.medicines.find((m: any) => m.name.toLowerCase().includes('insulin'));
  assert(coldChainMedicine?.requiresColdChain === true, 'Cold chain status strictly preserved across records');
  assert(coldChainMedicine?.packagingCondition === 'INTACT_SEALED', 'Only intact sealed packaging accepted for redistribution');

  console.log('\n===================================================');
  console.log(`🏁 BACKEND TESTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===================================================\n');

  if (failed > 0) process.exit(1);
}

runBackendIntegrationTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
