import { Router, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { authenticate, AuthRequest, requireRole } from '../middlewares/auth';
import { AIProxyService } from '../services/aiProxy';

const router = Router();
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  storage: multer.memoryStorage(),
});

const createMedicineSchema = z.object({
  name: z.string().min(2),
  genericName: z.string().min(2),
  brandName: z.string().optional(),
  strength: z.string().min(1),
  dosageForm: z.string().min(1),
  manufacturer: z.string().min(2),
  batchNumber: z.string().min(2),
  mfgDate: z.string(),
  expiryDate: z.string(),
  quantity: z.number().int().min(1),
  packagingCondition: z.enum(['INTACT_SEALED', 'BLISTER_PACK', 'BOTTLE_UNOPENED', 'OPENED_OR_PARTIAL', 'DAMAGED']),
  storageCondition: z.enum(['ROOM_TEMPERATURE', 'REFRIGERATED_2_8C', 'COOL_DRY', 'UNKNOWN']),
  requiresPrescription: z.boolean().default(true),
  requiresColdChain: z.boolean().default(false),
  source: z.enum(['PHARMACY_STOCK', 'DONATED_SURPLUS', 'HOSPITAL_SURPLUS', 'UNKNOWN_INDIVIDUAL']),
  imageUrl: z.string().optional(),
  safetyNotes: z.string().optional(),
});

// Strict medicine safety verification helper
function validateMedicineSafety(data: z.infer<typeof createMedicineSchema>): { isValid: boolean; reason?: string } {
  const expiry = new Date(data.expiryDate);
  const now = new Date();

  // Rule 1: Reject expired medicines
  if (expiry <= now) {
    return { isValid: false, reason: 'EXPIRED_MEDICINE: Expired medications are legally prohibited from redistribution.' };
  }

  // Rule 2: Reject opened or partially used medicines
  if (data.packagingCondition === 'OPENED_OR_PARTIAL' || data.packagingCondition === 'DAMAGED') {
    return {
      isValid: false,
      reason: 'SAFETY_VIOLATION: Opened, partial, or damaged packages cannot be accepted for redistribution.',
    };
  }

  // Rule 3: Reject unknown storage condition
  if (data.storageCondition === 'UNKNOWN') {
    return {
      isValid: false,
      reason: 'STORAGE_UNVERIFIABLE: Medications with unknown storage conditions cannot be redistributed.',
    };
  }

  // Rule 4: Reject unverified individual sources (only verified institutions/surplus allowed)
  if (data.source === 'UNKNOWN_INDIVIDUAL') {
    return {
      isValid: false,
      reason: 'UNVERIFIED_SOURCE: Direct peer-to-peer or unverified individual medication transfers are strictly prohibited.',
    };
  }

  return { isValid: true };
}

// POST /api/v1/medicines/scan
// AI OCR extraction endpoint
router.post('/scan', upload.single('image'), async (req, res, next) => {
  try {
    const file = req.file;
    const filename = file?.originalname || 'medicine-box.jpg';
    const buffer = file?.buffer;

    const ocrResult = await AIProxyService.scanMedicineImage(buffer, filename);

    res.json({
      success: true,
      data: ocrResult,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/medicines
// Upload/Add medicine to inventory (All authenticated unified users can submit for verification)
router.post('/', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const data = createMedicineSchema.parse(req.body);

    // Enforce safety rules
    const safetyCheck = validateMedicineSafety(data);
    if (!safetyCheck.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'SAFETY_POLICY_REJECTION',
          message: safetyCheck.reason,
        },
      });
    }

    let pharmacyId = req.user!.pharmacyId;
    if (!pharmacyId) {
      let ph = await prisma.pharmacy.findUnique({ where: { userId: req.user!.id } });
      if (!ph) {
        // Auto-create pharmacy record for unified user using their unified profile details
        const u = await prisma.user.findUnique({ where: { id: req.user!.id } });
        if (u) {
          ph = await prisma.pharmacy.create({
            data: {
              userId: u.id,
              organizationName: u.organizationName || `${u.fullName || 'User'}'s Pharmacy`,
              licenseNumber: u.licenseNumber || `LIC-${Date.now().toString().slice(-6)}`,
              address: u.address || 'New York, NY',
              latitude: u.latitude ?? 40.7128,
              longitude: u.longitude ?? -74.006,
              phone: u.phone || '+1 (555) 000-0000',
              email: u.email || `${u.id}@medshare.local`,
              isVerified: false,
              verificationStatus: 'PENDING',
            },
          });
        }
      }
      pharmacyId = ph?.id;
    }

    if (!pharmacyId && req.user!.role === 'ADMIN') {
      // For admin demo, find first verified pharmacy
      const firstPh = await prisma.pharmacy.findFirst();
      pharmacyId = firstPh?.id;
    }

    if (!pharmacyId) {
      return res.status(400).json({
        success: false,
        error: { message: 'No valid pharmacy ID found to attach this inventory item.' },
      });
    }

    const medicine = await prisma.medicine.create({
      data: {
        pharmacyId,
        name: data.name,
        genericName: data.genericName,
        brandName: data.brandName,
        strength: data.strength,
        dosageForm: data.dosageForm,
        manufacturer: data.manufacturer,
        batchNumber: data.batchNumber,
        mfgDate: new Date(data.mfgDate),
        expiryDate: new Date(data.expiryDate),
        quantity: data.quantity,
        packagingCondition: data.packagingCondition,
        storageCondition: data.storageCondition,
        requiresPrescription: data.requiresPrescription,
        requiresColdChain: data.requiresColdChain,
        source: data.source,
        imageUrl: data.imageUrl,
        verificationStatus: 'PENDING',
        safetyNotes: data.safetyNotes,
      },
    });

    res.status(201).json({
      success: true,
      data: medicine,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/medicines
// Search eligible inventory
router.get('/', async (req, res, next) => {
  try {
    const search = (req.query.search as string) || '';
    const dosageForm = req.query.dosageForm as string | undefined;
    const requiresPrescription = req.query.requiresPrescription !== undefined ? req.query.requiresPrescription === 'true' : undefined;
    const pharmacyId = req.query.pharmacyId as string | undefined;

    const medicines = await prisma.medicine.findMany({
      where: {
        ...(pharmacyId ? { pharmacyId } : { verificationStatus: 'VERIFIED' }),
        ...(dosageForm ? { dosageForm } : {}),
        ...(requiresPrescription !== undefined ? { requiresPrescription } : {}),
        quantity: { gt: 0 },
        expiryDate: { gt: new Date() }, // filter out expired listings
        OR: search
          ? [
              { name: { contains: search, mode: 'insensitive' } },
              { genericName: { contains: search, mode: 'insensitive' } },
              { brandName: { contains: search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      include: {
        pharmacy: {
          select: {
            id: true,
            organizationName: true,
            address: true,
            phone: true,
            isVerified: true,
          },
        },
      },
      orderBy: { expiryDate: 'asc' }, // soonest to expire first for optimal redistribution
      take: 60,
    });

    // Add expiry countdown and warning tags
    const enriched = medicines.map((m) => {
      const today = new Date();
      const exp = new Date(m.expiryDate);
      const daysUntilExpiry = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return {
        ...m,
        daysUntilExpiry,
        isExpiringSoon: daysUntilExpiry <= 30,
        isUrgentRedistribution: daysUntilExpiry <= 14,
      };
    });

    res.json({
      success: true,
      data: enriched,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/medicines/:id
router.get('/:id', async (req, res, next) => {
  try {
    const medicine = await prisma.medicine.findUnique({
      where: { id: req.params.id },
      include: {
        pharmacy: true,
        images: true,
      },
    });

    if (!medicine) {
      return res.status(404).json({
        success: false,
        error: { message: 'Medicine item not found.' },
      });
    }

    const today = new Date();
    const exp = new Date(medicine.expiryDate);
    const daysUntilExpiry = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    res.json({
      success: true,
      data: {
        ...medicine,
        daysUntilExpiry,
        isExpiringSoon: daysUntilExpiry <= 30,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/medicines/:id/verify
// Pharmacist or Admin verifies medicine safety & authenticity
router.post('/:id/verify', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { status, notes } = z
      .object({
        status: z.enum(['VERIFIED', 'REJECTED']),
        notes: z.string().optional(),
      })
      .parse(req.body);

    const medicine = await prisma.medicine.findUnique({
      where: { id: req.params.id },
      include: { pharmacy: true },
    });

    if (!medicine) {
      return res.status(404).json({
        success: false,
        error: { message: 'Medicine listing not found.' },
      });
    }

    // Official verification requires verified institutional pharmacy credentials or Admin authority
    const userPharmacy = await prisma.pharmacy.findUnique({ where: { userId: req.user!.id } });
    const isVerifiedPharmacist =
      req.user!.role === 'ADMIN' ||
      req.user!.role === 'PHARMACY' ||
      (userPharmacy && userPharmacy.isVerified && userPharmacy.verificationStatus === 'VERIFIED');

    if (!isVerifiedPharmacist) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Official pharmacist verification requires an active, verified institutional pharmacy credential or administrative authority.',
        },
      });
    }

    // Anti-Self-Approval: Users cannot approve their own medicine listings
    if (medicine.pharmacy?.userId === req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Conflict of interest: You are legally prohibited from approving your own submitted medicine listings.',
        },
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const med = await tx.medicine.update({
        where: { id: req.params.id },
        data: {
          verificationStatus: status,
          safetyNotes: notes,
        },
      });

      await tx.medicineVerification.create({
        data: {
          medicineId: med.id,
          verifiedBy: req.user!.email,
          status,
          notes,
          verifiedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          userId: req.user!.id,
          action: 'VERIFY_MEDICINE',
          entity: 'Medicine',
          entityId: med.id,
          details: JSON.stringify({ status, notes, verifiedBy: req.user!.email }),
        },
      });

      return med;
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/medicine-requests
// Patient requests medicine redistribution assistance
router.post('/requests', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { medicineId, quantityRequested, prescriptionUrl, reason } = z
      .object({
        medicineId: z.string().uuid(),
        quantityRequested: z.number().int().min(1).default(1),
        prescriptionUrl: z.string().optional(),
        reason: z.string().min(5),
      })
      .parse(req.body);

    const medicine = await prisma.medicine.findUnique({
      where: { id: medicineId },
      include: { pharmacy: true },
    });

    if (!medicine) {
      return res.status(404).json({
        success: false,
        error: { message: 'Medicine not found.' },
      });
    }

    if (medicine.quantity < quantityRequested) {
      return res.status(400).json({
        success: false,
        error: { message: `Requested quantity exceeds available stock (${medicine.quantity} available).` },
      });
    }

    if (medicine.requiresPrescription && !prescriptionUrl) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PRESCRIPTION_REQUIRED',
          message: 'This medication requires a valid doctor prescription. Please upload your prescription document.',
        },
      });
    }

    const medRequest = await prisma.$transaction(async (tx) => {
      const created = await tx.medicineRequest.create({
        data: {
          requesterId: req.user!.id,
          medicineId,
          quantityRequested,
          prescriptionUrl,
          reason,
          status: 'PENDING',
        },
      });

      // Notify pharmacy user
      await tx.notification.create({
        data: {
          userId: medicine.pharmacy.userId,
          title: 'New Medicine Assistance Request',
          message: `Request received for ${quantityRequested}x ${medicine.name}. Review prescription and approve distribution.`,
          type: 'MEDICINE_UPDATE',
          data: JSON.stringify({ requestId: created.id, medicineId }),
        },
      });

      return created;
    });

    res.status(201).json({
      success: true,
      data: medRequest,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/medicine-requests
router.get('/requests/list', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    let requests;
    if (req.user!.role === 'ADMIN') {
      requests = await prisma.medicineRequest.findMany({
        include: {
          requester: { select: { id: true, email: true } },
          medicine: { include: { pharmacy: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Unified account model: Retrieve assistance requests targeting user's pharmacy OR submitted by user
      const ph = await prisma.pharmacy.findUnique({ where: { userId: req.user!.id } });
      requests = await prisma.medicineRequest.findMany({
        where: ph
          ? {
              OR: [
                { requesterId: req.user!.id },
                { medicine: { pharmacyId: ph.id } },
              ],
            }
          : { requesterId: req.user!.id },
        include: {
          requester: { select: { id: true, email: true } },
          medicine: { include: { pharmacy: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    res.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/medicine-requests/:id/status
router.patch('/requests/:id/status', authenticate, requireRole('PHARMACY', 'ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const { status, pharmacyNotes } = z
      .object({
        status: z.enum(['APPROVED', 'REJECTED', 'DISPENSED', 'CANCELLED']),
        pharmacyNotes: z.string().optional(),
      })
      .parse(req.body);

    const medRequest = await prisma.medicineRequest.findUnique({
      where: { id: req.params.id },
      include: { medicine: true },
    });

    if (!medRequest) {
      return res.status(404).json({
        success: false,
        error: { message: 'Medicine request not found.' },
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedReq = await tx.medicineRequest.update({
        where: { id: req.params.id },
        data: {
          status,
          pharmacyNotes,
        },
      });

      // Deduct quantity if dispensed
      if (status === 'DISPENSED') {
        await tx.medicine.update({
          where: { id: medRequest.medicineId },
          data: {
            quantity: { decrement: medRequest.quantityRequested },
          },
        });
      }

      // Notify patient
      await tx.notification.create({
        data: {
          userId: medRequest.requesterId,
          title: `Medicine Request ${status}`,
          message: `Your request for ${medRequest.medicine.name} has been ${status.toLowerCase()}. ${pharmacyNotes || ''}`,
          type: 'MEDICINE_UPDATE',
          data: JSON.stringify({ requestId: updatedReq.id, status }),
        },
      });

      return updatedReq;
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
