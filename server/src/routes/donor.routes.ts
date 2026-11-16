import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { authenticate, AuthRequest, requireRole } from '../middlewares/auth';
import {
  rankDonors,
  checkDonationEligibility,
  COMPATIBLE_DONORS_FOR_RECIPIENT,
  calculateDistanceKm,
  obfuscateCoordinates,
  maskDonorName,
} from '../services/donorMatching';
import { BloodGroup } from '../types';

const router = Router();

const donorRegisterSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(6),
  bloodGroup: z.enum(['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG']),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  preferredRadiusKm: z.number().min(1).max(50).default(5.0),
  lastDonationDate: z.string().optional().nullable(),
});

// POST /api/v1/donors/register
router.post('/register', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const data = donorRegisterSchema.parse(req.body);
    const userId = req.user!.id;

    const existing = await prisma.donor.findUnique({
      where: { userId },
    });

    let donor;
    if (existing) {
      donor = await prisma.donor.update({
        where: { userId },
        data: {
          fullName: data.fullName,
          phone: data.phone,
          bloodGroup: data.bloodGroup,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
          gender: data.gender,
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
          preferredRadiusKm: data.preferredRadiusKm,
          lastDonationDate: data.lastDonationDate ? new Date(data.lastDonationDate) : null,
        },
      });
    } else {
      donor = await prisma.donor.create({
        data: {
          userId,
          fullName: data.fullName,
          phone: data.phone,
          bloodGroup: data.bloodGroup,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
          gender: data.gender,
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
          preferredRadiusKm: data.preferredRadiusKm,
          lastDonationDate: data.lastDonationDate ? new Date(data.lastDonationDate) : null,
          verificationStatus: 'PENDING',
        },
      });

      // Update user role to DONOR if not already
      if (req.user!.role !== 'ADMIN') {
        await prisma.user.update({
          where: { id: userId },
          data: { role: 'DONOR' },
        });
      }
    }

    res.status(200).json({
      success: true,
      data: donor,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/donors/profile
router.get('/profile', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const donor = await prisma.donor.findUnique({
      where: { userId: req.user!.id },
      include: {
        donations: {
          orderBy: { donationDate: 'desc' },
          take: 10,
        },
      },
    });

    if (!donor) {
      return res.status(404).json({
        success: false,
        error: { message: 'Donor profile not found.' },
      });
    }

    const eligibility = checkDonationEligibility(donor.lastDonationDate);

    res.json({
      success: true,
      data: {
        ...donor,
        eligibility,
      },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/donors/availability
router.patch('/availability', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { isAvailable, preferredRadiusKm } = z
      .object({
        isAvailable: z.boolean(),
        preferredRadiusKm: z.number().min(1).max(50).optional(),
      })
      .parse(req.body);

    const donor = await prisma.donor.update({
      where: { userId: req.user!.id },
      data: {
        isAvailable,
        ...(preferredRadiusKm !== undefined ? { preferredRadiusKm } : {}),
      },
    });

    res.json({
      success: true,
      data: donor,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/donors/nearby
// Public search with privacy masking
router.get('/nearby', async (req, res, next) => {
  try {
    const lat = parseFloat(req.query.lat as string) || 40.7128;
    const lng = parseFloat(req.query.lng as string) || -74.006;
    const radiusKm = parseFloat(req.query.radius as string) || 5.0;
    const bloodGroup = req.query.bloodGroup as BloodGroup | undefined;

    const allDonors = await prisma.donor.findMany({
      where: {
        isAvailable: true,
        ...(bloodGroup ? { bloodGroup } : {}),
      },
      select: {
        id: true,
        fullName: true,
        bloodGroup: true,
        latitude: true,
        longitude: true,
        isAvailable: true,
        verificationStatus: true,
        lastDonationDate: true,
        preferredRadiusKm: true,
        responseRate: true,
        donationCount: true,
      },
    });

    const results = allDonors
      .map((d) => {
        const dist = calculateDistanceKm(lat, lng, d.latitude, d.longitude);
        const approxCoords = obfuscateCoordinates(d.latitude, d.longitude);
        const elig = checkDonationEligibility(d.lastDonationDate);
        return {
          id: d.id,
          displayName: maskDonorName(d.fullName),
          bloodGroup: d.bloodGroup,
          approxDistanceKm: dist,
          isAvailable: d.isAvailable,
          isVerified: d.verificationStatus === 'VERIFIED',
          donationCount: d.donationCount,
          eligibility: elig,
          approxLocation: approxCoords,
        };
      })
      .filter((d) => d.approxDistanceKm <= radiusKm * 1.5)
      .sort((a, b) => a.approxDistanceKm - b.approxDistanceKm);

    res.json({
      success: true,
      data: {
        count: results.length,
        radiusKm,
        donors: results,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/donors/stats
router.get('/stats', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const donor = await prisma.donor.findUnique({
      where: { userId: req.user!.id },
      include: {
        donations: true,
        responses: true,
      },
    });

    if (!donor) {
      return res.status(404).json({
        success: false,
        error: { message: 'Donor record not found.' },
      });
    }

    const totalDonations = donor.donations.length;
    const acceptedRequests = donor.responses.filter((r) => r.status === 'ACCEPTED' || r.status === 'CONFIRMED' || r.status === 'COMPLETED').length;
    const livesSavedEst = totalDonations * 3; // Standard medical estimation: 1 unit saves up to 3 lives

    res.json({
      success: true,
      data: {
        totalDonations,
        acceptedRequests,
        livesSavedEst,
        responseRate: donor.responseRate,
        isAvailable: donor.isAvailable,
        verificationStatus: donor.verificationStatus,
        lastDonationDate: donor.lastDonationDate,
        eligibility: checkDonationEligibility(donor.lastDonationDate),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/donors/my-requests
// Emergency blood requests dispatched to this donor
router.get('/my-requests', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const donor = await prisma.donor.findUnique({
      where: { userId: req.user!.id },
    });

    if (!donor) {
      return res.status(404).json({
        success: false,
        error: { message: 'Donor profile not found.' },
      });
    }

    // Find donor responses or nearby active requests
    const responses = await prisma.donorResponse.findMany({
      where: { donorId: donor.id },
      include: {
        bloodRequest: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({
      success: true,
      data: responses,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
