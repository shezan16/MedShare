import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting MedShare Database Seeding...');

  const passwordHash = await bcrypt.hash('MedShare123!', 10);

  // 1. Create Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@medshare.org' },
    update: {},
    create: {
      email: 'admin@medshare.org',
      passwordHash,
      role: 'ADMIN',
      isVerified: true,
    },
  });

  // 2. Create Patient / Requester User
  const patientUser = await prisma.user.upsert({
    where: { email: 'patient@medshare.org' },
    update: {},
    create: {
      email: 'patient@medshare.org',
      passwordHash,
      role: 'PATIENT',
      isVerified: true,
    },
  });

  // 3. Create Hospitals
  const hospitalsData = [
    {
      name: 'Metropolitan Trauma & Surgical Center',
      address: '450 Lexington Ave, New York, NY 10017',
      latitude: 40.7516,
      longitude: -73.9754,
      phone: '+1 (212) 555-0199',
      email: 'emergency@metrotrauma.org',
      isVerified: true,
    },
    {
      name: 'St. Jude General Hospital & Blood Bank',
      address: '120 W 106th St, New York, NY 10025',
      latitude: 40.7997,
      longitude: -73.9678,
      phone: '+1 (212) 555-0144',
      email: 'bloodbank@stjudegeneral.org',
      isVerified: true,
    },
    {
      name: 'Downtown Medical Complex',
      address: '170 William St, New York, NY 10038',
      latitude: 40.7099,
      longitude: -74.0048,
      phone: '+1 (212) 555-0182',
      email: 'triage@downtownmed.org',
      isVerified: true,
    },
  ];

  const hospitals: any[] = [];
  for (const h of hospitalsData) {
    const createdH = await prisma.hospital.create({
      data: h,
    });
    hospitals.push(createdH);
  }

  // 4. Create Donors
  const sampleDonors = [
    {
      email: 'donor@medshare.org',
      fullName: 'Alex Vance',
      bloodGroup: 'O_NEG' as const,
      phone: '+1 (555) 234-5678',
      latitude: 40.7522,
      longitude: -73.9765,
      isAvailable: true,
      verificationStatus: 'VERIFIED' as const,
      lastDonationDate: new Date('2024-05-10'),
      donationCount: 6,
      responseRate: 98.0,
      preferredRadiusKm: 10.0,
    },
    {
      email: 'sarah.connor@medshare.org',
      fullName: 'Sarah Connor',
      bloodGroup: 'A_POS' as const,
      phone: '+1 (555) 345-6789',
      latitude: 40.7484,
      longitude: -73.9857,
      isAvailable: true,
      verificationStatus: 'VERIFIED' as const,
      lastDonationDate: new Date('2024-03-15'),
      donationCount: 4,
      responseRate: 95.0,
      preferredRadiusKm: 5.0,
    },
    {
      email: 'david.kim@medshare.org',
      fullName: 'David Kim',
      bloodGroup: 'B_POS' as const,
      phone: '+1 (555) 456-7890',
      latitude: 40.7589,
      longitude: -73.9851,
      isAvailable: true,
      verificationStatus: 'VERIFIED' as const,
      lastDonationDate: new Date('2024-01-20'),
      donationCount: 8,
      responseRate: 92.0,
      preferredRadiusKm: 7.0,
    },
    {
      email: 'elena.rostova@medshare.org',
      fullName: 'Elena Rostova',
      bloodGroup: 'AB_POS' as const,
      phone: '+1 (555) 567-8901',
      latitude: 40.7412,
      longitude: -73.9897,
      isAvailable: true,
      verificationStatus: 'VERIFIED' as const,
      lastDonationDate: new Date('2024-04-01'),
      donationCount: 3,
      responseRate: 90.0,
      preferredRadiusKm: 5.0,
    },
    {
      email: 'marcus.brody@medshare.org',
      fullName: 'Marcus Brody',
      bloodGroup: 'O_POS' as const,
      phone: '+1 (555) 678-9012',
      latitude: 40.7614,
      longitude: -73.9776,
      isAvailable: false, // Currently on cooldown / unavailable
      verificationStatus: 'VERIFIED' as const,
      lastDonationDate: new Date('2024-10-25'), // Recent donation (within 90 days)
      donationCount: 12,
      responseRate: 96.0,
      preferredRadiusKm: 15.0,
    },
    {
      email: 'priya.sharma@medshare.org',
      fullName: 'Priya Sharma',
      bloodGroup: 'A_NEG' as const,
      phone: '+1 (555) 789-0123',
      latitude: 40.7308,
      longitude: -73.9973,
      isAvailable: true,
      verificationStatus: 'PENDING' as const,
      lastDonationDate: null,
      donationCount: 0,
      responseRate: 100.0,
      preferredRadiusKm: 5.0,
    },
  ];

  const createdDonors: any[] = [];
  for (const d of sampleDonors) {
    const u = await prisma.user.upsert({
      where: { email: d.email },
      update: {},
      create: {
        email: d.email,
        passwordHash,
        role: 'DONOR',
        isVerified: d.verificationStatus === 'VERIFIED',
      },
    });

    const donor = await prisma.donor.upsert({
      where: { userId: u.id },
      update: {},
      create: {
        userId: u.id,
        fullName: d.fullName,
        phone: d.phone,
        bloodGroup: d.bloodGroup,
        latitude: d.latitude,
        longitude: d.longitude,
        isAvailable: d.isAvailable,
        verificationStatus: d.verificationStatus,
        lastDonationDate: d.lastDonationDate,
        donationCount: d.donationCount,
        responseRate: d.responseRate,
        preferredRadiusKm: d.preferredRadiusKm,
      },
    });
    createdDonors.push(donor);
  }

  // 5. Create Verified Pharmacies
  const samplePharmacies = [
    {
      email: 'pharmacy@medshare.org',
      orgName: 'HealthCare Plus Community Pharmacy',
      license: 'NY-PHARM-882194',
      address: '550 5th Ave, New York, NY 10036',
      latitude: 40.7559,
      longitude: -73.9792,
      phone: '+1 (212) 555-0321',
    },
    {
      email: 'apex.rx@medshare.org',
      orgName: 'Apex Care Institutional Pharmacy',
      license: 'NY-PHARM-991042',
      address: '320 W 42nd St, New York, NY 10036',
      latitude: 40.7584,
      longitude: -73.9912,
      phone: '+1 (212) 555-0765',
    },
  ];

  const createdPharmacies: any[] = [];
  for (const p of samplePharmacies) {
    const u = await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: {
        email: p.email,
        passwordHash,
        role: 'PHARMACY',
        isVerified: true,
      },
    });

    const ph = await prisma.pharmacy.upsert({
      where: { userId: u.id },
      update: {},
      create: {
        userId: u.id,
        organizationName: p.orgName,
        licenseNumber: p.license,
        address: p.address,
        latitude: p.latitude,
        longitude: p.longitude,
        phone: p.phone,
        email: p.email,
        isVerified: true,
        verificationStatus: 'VERIFIED',
      },
    });
    createdPharmacies.push(ph);
  }

  // 6. Create Medicines in Inventory
  const primaryPharmacy = createdPharmacies[0];
  const medicinesData = [
    {
      pharmacyId: primaryPharmacy.id,
      name: 'Amoxicillin Trihydrate BP 500mg',
      genericName: 'Amoxicillin',
      brandName: 'Amoxil',
      strength: '500 mg',
      dosageForm: 'Capsule',
      manufacturer: 'Sandoz Pharmaceuticals',
      batchNumber: 'AX2024-884B',
      mfgDate: new Date('2024-03-01'),
      expiryDate: new Date('2026-03-01'),
      quantity: 120,
      packagingCondition: 'BLISTER_PACK',
      storageCondition: 'ROOM_TEMPERATURE',
      requiresPrescription: true,
      requiresColdChain: false,
      source: 'PHARMACY_STOCK',
      verificationStatus: 'VERIFIED' as const,
      safetyNotes: 'Packaging intact and verified by licensed pharmacist.',
    },
    {
      pharmacyId: primaryPharmacy.id,
      name: 'Metformin Hydrochloride 500mg Prolonged Release',
      genericName: 'Metformin HCl',
      brandName: 'Glucophage XR',
      strength: '500 mg',
      dosageForm: 'Tablet',
      manufacturer: 'Merck S.A.',
      batchNumber: 'MET-4109',
      mfgDate: new Date('2023-11-15'),
      expiryDate: new Date('2026-11-15'),
      quantity: 250,
      packagingCondition: 'BLISTER_PACK',
      storageCondition: 'ROOM_TEMPERATURE',
      requiresPrescription: true,
      requiresColdChain: false,
      source: 'DONATED_SURPLUS',
      verificationStatus: 'VERIFIED' as const,
      safetyNotes: 'Factory sealed blister pack, verified temperature history.',
    },
    {
      pharmacyId: primaryPharmacy.id,
      name: 'Paracetamol IP 650mg Tablets',
      genericName: 'Paracetamol',
      brandName: 'Calpol / Panadol',
      strength: '650 mg',
      dosageForm: 'Tablet',
      manufacturer: 'GlaxoSmithKline',
      batchNumber: 'GSK-9921',
      mfgDate: new Date('2024-05-01'),
      expiryDate: new Date('2027-05-01'),
      quantity: 500,
      packagingCondition: 'INTACT_SEALED',
      storageCondition: 'ROOM_TEMPERATURE',
      requiresPrescription: false,
      requiresColdChain: false,
      source: 'PHARMACY_STOCK',
      verificationStatus: 'VERIFIED' as const,
      safetyNotes: 'OTC antipyretic. Sealed box verified.',
    },
    {
      pharmacyId: primaryPharmacy.id,
      name: 'Azithromycin Tablets USP 250mg',
      genericName: 'Azithromycin',
      brandName: 'Zithromax',
      strength: '250 mg',
      dosageForm: 'Tablet',
      manufacturer: 'Pfizer Inc.',
      batchNumber: 'PZ-7712A',
      mfgDate: new Date('2024-01-10'),
      // Set near expiry (within 45 days) to demo expiry alert
      expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 35),
      quantity: 40,
      packagingCondition: 'BLISTER_PACK',
      storageCondition: 'COOL_DRY',
      requiresPrescription: true,
      requiresColdChain: false,
      source: 'HOSPITAL_SURPLUS',
      verificationStatus: 'VERIFIED' as const,
      safetyNotes: 'Near-expiry surplus prioritized for immediate clinic redistribution.',
    },
    {
      pharmacyId: primaryPharmacy.id,
      name: 'Human Insulin Regular 100 IU/ml',
      genericName: 'Human Regular Insulin',
      brandName: 'Humulin R',
      strength: '100 IU/ml',
      dosageForm: 'Vial / Injection',
      manufacturer: 'Eli Lilly & Company',
      batchNumber: 'EL-90214',
      mfgDate: new Date('2024-06-15'),
      expiryDate: new Date('2025-12-15'),
      quantity: 30,
      packagingCondition: 'INTACT_SEALED',
      storageCondition: 'REFRIGERATED_2_8C',
      requiresPrescription: true,
      requiresColdChain: true,
      source: 'HOSPITAL_SURPLUS',
      verificationStatus: 'VERIFIED' as const,
      safetyNotes: 'Strict cold-chain monitored (2°C-8°C data logger attached).',
    },
  ];

  for (const m of medicinesData) {
    await prisma.medicine.create({
      data: m,
    });
  }

  // 7. Create Sample Blood Requests
  const bloodRequestsData = [
    {
      requestNumber: 'BR-2026-1049',
      requesterId: patientUser.id,
      patientName: 'Robert Martinez (Trauma Surgery)',
      bloodGroup: 'O_NEG' as const,
      unitsRequired: 2,
      hospitalName: hospitals[0].name,
      hospitalAddress: hospitals[0].address,
      hospitalLat: hospitals[0].latitude,
      hospitalLng: hospitals[0].longitude,
      requiredDate: new Date(),
      priority: 'CRITICAL' as const,
      contactPerson: 'Dr. Katherine Evans (Chief Triage)',
      contactPhone: '+1 (212) 555-9011',
      additionalNotes: 'Emergency thoracic surgery required after MVC trauma.',
      status: 'SEARCHING' as const,
    },
    {
      requestNumber: 'BR-2026-1048',
      requesterId: patientUser.id,
      patientName: 'Emma Wilson (Severe Anemia)',
      bloodGroup: 'A_POS' as const,
      unitsRequired: 1,
      hospitalName: hospitals[1].name,
      hospitalAddress: hospitals[1].address,
      hospitalLat: hospitals[1].latitude,
      hospitalLng: hospitals[1].longitude,
      requiredDate: new Date(Date.now() + 1000 * 60 * 60 * 24),
      priority: 'HIGH' as const,
      contactPerson: 'Nurse Jenkins',
      contactPhone: '+1 (212) 555-8822',
      additionalNotes: 'Scheduled transfusion for oncology patient.',
      status: 'DONOR_ACCEPTED' as const,
    },
  ];

  for (const br of bloodRequestsData) {
    const createdBR = await prisma.bloodRequest.upsert({
      where: { requestNumber: br.requestNumber },
      update: {},
      create: br,
    });

    // If accepted, add response record
    if (br.status === 'DONOR_ACCEPTED' && createdDonors.length > 0) {
      await prisma.donorResponse.upsert({
        where: {
          bloodRequestId_donorId: {
            bloodRequestId: createdBR.id,
            donorId: createdDonors[1].id,
          },
        },
        update: {},
        create: {
          bloodRequestId: createdBR.id,
          donorId: createdDonors[1].id,
          status: 'ACCEPTED',
          notes: 'Donor confirmed arrival at hospital by 10:00 AM.',
        },
      });
    }
  }

  // 8. Create Demo Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: createdDonors[0].userId,
        title: 'URGENT: O- Blood Needed Near You',
        message: 'Critical emergency at Metropolitan Trauma Center. Distance: 0.15 km.',
        type: 'EMERGENCY_BLOOD',
        isRead: false,
      },
      {
        userId: patientUser.id,
        title: 'Donor Matched & Dispatched',
        message: 'Sarah Connor (A+) accepted request BR-2026-1048 and is en route.',
        type: 'DONOR_ACCEPT',
        isRead: false,
      },
    ],
  });

  console.log('✅ MedShare database seeded successfully with realistic demo data!');
  console.log('-------------------------------------------------------');
  console.log('🔑 Credentials for quick demo testing:');
  console.log('   Admin:     admin@medshare.org     / MedShare123!');
  console.log('   Requester: patient@medshare.org   / MedShare123!');
  console.log('   Donor:     donor@medshare.org     / MedShare123!');
  console.log('   Pharmacy:  pharmacy@medshare.org  / MedShare123!');
  console.log('-------------------------------------------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
