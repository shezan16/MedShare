import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { authenticate, AuthRequest, requireRole } from '../middlewares/auth';

const router = Router();

const pharmacyRegisterSchema = z.object({
  organizationName: z.string().min(2),
  licenseNumber: z.string().min(3),
  address: z.string().min(5),
  latitude: z.number(),
  longitude: z.number(),
  phone: z.string().min(6),
  email: z.string().email(),
  documentUrls: z.array(z.string()).default([]),
});

// POST /api/v1/pharmacies/register
router.post('/register', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const data = pharmacyRegisterSchema.parse(req.body);
    const userId = req.user!.id;

    const existing = await prisma.pharmacy.findUnique({
      where: { userId },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: { message: 'Pharmacy profile already registered for this user account.' },
      });
    }

    const pharmacy = await prisma.$transaction(async (tx) => {
      const ph = await tx.pharmacy.create({
        data: {
          userId,
          organizationName: data.organizationName,
          licenseNumber: data.licenseNumber,
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
          phone: data.phone,
          email: data.email,
          verificationStatus: 'PENDING',
          isVerified: false,
        },
      });

      if (data.documentUrls.length > 0) {
        await tx.pharmacyVerification.create({
          data: {
            pharmacyId: ph.id,
            documentUrls: JSON.stringify(data.documentUrls),
            status: 'PENDING',
          },
        });
      }

      await tx.user.update({
        where: { id: userId },
        data: { role: 'PHARMACY' },
      });

      return ph;
    });

    res.status(201).json({
      success: true,
      data: pharmacy,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/pharmacies
router.get('/', async (req, res, next) => {
  try {
    const isVerifiedOnly = req.query.verified === 'true';

    const pharmacies = await prisma.pharmacy.findMany({
      where: isVerifiedOnly ? { isVerified: true } : {},
      include: {
        _count: {
          select: { medicines: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: pharmacies,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/pharmacies/:id
router.get('/:id', async (req, res, next) => {
  try {
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id: req.params.id },
      include: {
        medicines: {
          where: { verificationStatus: 'VERIFIED' },
        },
        verifications: true,
      },
    });

    if (!pharmacy) {
      return res.status(404).json({
        success: false,
        error: { message: 'Pharmacy not found.' },
      });
    }

    res.json({
      success: true,
      data: pharmacy,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/pharmacies/:id/verify (Admin action)
router.post('/:id/verify', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const { status, notes } = z
      .object({
        status: z.enum(['VERIFIED', 'REJECTED']),
        notes: z.string().optional(),
      })
      .parse(req.body);

    const isVerified = status === 'VERIFIED';

    const updated = await prisma.$transaction(async (tx) => {
      const ph = await tx.pharmacy.update({
        where: { id: req.params.id },
        data: {
          verificationStatus: status,
          isVerified,
        },
      });

      await tx.pharmacyVerification.create({
        data: {
          pharmacyId: ph.id,
          documentUrls: '[]',
          verifiedBy: req.user!.email,
          notes,
          status,
          verifiedAt: new Date(),
        },
      });

      // Update user verification status as well
      await tx.user.update({
        where: { id: ph.userId },
        data: { isVerified },
      });

      // Notify pharmacy
      await tx.notification.create({
        data: {
          userId: ph.userId,
          title: `Pharmacy Verification ${status}`,
          message: isVerified
            ? 'Your pharmacy organization has been verified. You can now list eligible medicine inventory.'
            : `Verification was not approved: ${notes || 'Please check submitted documents.'}`,
          type: 'VERIFICATION',
        },
      });

      return ph;
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
