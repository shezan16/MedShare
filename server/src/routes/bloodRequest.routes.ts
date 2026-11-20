import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { authenticate, AuthRequest } from '../middlewares/auth';
import {
  rankDonors,
  isBloodCompatible,
  calculateDistanceKm,
} from '../services/donorMatching';
import { socketService } from '../services/socketService';
import { BloodGroup, Priority, RequestStatus } from '../types';

const router = Router();

const createBloodRequestSchema = z.object({
  patientName: z.string().min(2),
  bloodGroup: z.enum(['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG']),
  unitsRequired: z.number().int().min(1).max(20).default(1),
  hospitalName: z.string().min(2),
  hospitalAddress: z.string().min(2),
  hospitalLat: z.number(),
  hospitalLng: z.number(),
  requiredDate: z.string(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('HIGH'),
  contactPerson: z.string().min(2),
  contactPhone: z.string().min(6),
  additionalNotes: z.string().optional(),
  searchRadiusKm: z.number().min(1).max(50).default(5.0),
});

// POST /api/v1/blood-requests
router.post('/', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const data = createBloodRequestSchema.parse(req.body);
    const requesterId = req.user!.id;

    // Generate unique human-readable request ID: BR-2026-XXXX
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const requestNumber = `BR-${new Date().getFullYear()}-${randomSuffix}`;

    const bloodRequest = await prisma.$transaction(async (tx) => {
      const created = await tx.bloodRequest.create({
        data: {
          requestNumber,
          requesterId,
          patientName: data.patientName,
          bloodGroup: data.bloodGroup,
          unitsRequired: data.unitsRequired,
          hospitalName: data.hospitalName,
          hospitalAddress: data.hospitalAddress,
          hospitalLat: data.hospitalLat,
          hospitalLng: data.hospitalLng,
          requiredDate: new Date(data.requiredDate),
          priority: data.priority,
          contactPerson: data.contactPerson,
          contactPhone: data.contactPhone,
          additionalNotes: data.additionalNotes,
          status: 'SEARCHING',
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: requesterId,
          action: 'CREATE_BLOOD_REQUEST',
          entity: 'BloodRequest',
          entityId: created.id,
          details: JSON.stringify({ requestNumber, bloodGroup: data.bloodGroup, priority: data.priority }),
        },
      });

      return created;
    });

    // 1. Find all available donors in DB
    const candidateDonors = await prisma.donor.findMany({
      where: {
        isAvailable: true,
      },
      include: {
        user: { select: { id: true, email: true } },
      },
    });

    // 2. Rank candidates using multi-factor algorithm
    const rankedDonors = rankDonors(
      data.hospitalLat,
      data.hospitalLng,
      data.bloodGroup,
      data.searchRadiusKm,
      candidateDonors.map((d) => ({
        id: d.id,
        fullName: d.fullName,
        bloodGroup: d.bloodGroup,
        latitude: d.latitude,
        longitude: d.longitude,
        isAvailable: d.isAvailable,
        isVerified: d.verificationStatus === 'VERIFIED',
        responseRate: d.responseRate,
        lastDonationDate: d.lastDonationDate,
        preferredRadiusKm: d.preferredRadiusKm,
      }))
    );

    // 3. Create DonorResponse records & dispatch real-time Socket.IO notifications
    let notifiedCount = 0;
    for (const match of rankedDonors.slice(0, 15)) {
      const donorRecord = candidateDonors.find((c) => c.id === match.donorId);
      if (!donorRecord) continue;

      try {
        await prisma.donorResponse.create({
          data: {
            bloodRequestId: bloodRequest.id,
            donorId: match.donorId,
            status: 'NOTIFIED',
          },
        });

        // Create in-app notification
        await prisma.notification.create({
          data: {
            userId: donorRecord.userId,
            title: `URGENT: ${bloodRequest.bloodGroup.replace('_', '')} Blood Needed`,
            message: `Emergency blood request for ${bloodRequest.patientName} at ${bloodRequest.hospitalName} (${match.approxDistanceKm} km away).`,
            type: 'EMERGENCY_BLOOD',
            data: JSON.stringify({ requestId: bloodRequest.id, requestNumber: bloodRequest.requestNumber }),
          },
        });

        // Dispatch real-time socket
        const dispatched = socketService.emitEmergencyNotificationToDonor(
          donorRecord.userId,
          donorRecord.id,
          bloodRequest
        );
        if (dispatched) notifiedCount++;
      } catch (err) {
        // Continue if duplicate response record
      }
    }

    // Update status to NOTIFIED if any donor notified
    if (notifiedCount > 0) {
      await prisma.bloodRequest.update({
        where: { id: bloodRequest.id },
        data: { status: 'NOTIFIED' },
      });
    }

    res.status(201).json({
      success: true,
      data: {
        request: bloodRequest,
        matchingDonorsCount: rankedDonors.length,
        notifiedCount,
        matchedDonors: rankedDonors.slice(0, 10),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/blood-requests
router.get('/', async (req, res, next) => {
  try {
    const status = req.query.status as RequestStatus | undefined;
    const bloodGroup = req.query.bloodGroup as BloodGroup | undefined;
    const priority = req.query.priority as Priority | undefined;
    const requesterId = req.query.requesterId as string | undefined;

    const requests = await prisma.bloodRequest.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(bloodGroup ? { bloodGroup } : {}),
        ...(priority ? { priority } : {}),
        ...(requesterId ? { requesterId } : {}),
      },
      include: {
        requester: {
          select: { id: true, email: true },
        },
        _count: {
          select: { donorResponses: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/blood-requests/:id
router.get('/:id', async (req, res, next) => {
  try {
    const request = await prisma.bloodRequest.findUnique({
      where: { id: req.params.id },
      include: {
        requester: {
          select: { id: true, email: true },
        },
        donorResponses: {
          include: {
            donor: {
              select: {
                id: true,
                fullName: true,
                bloodGroup: true,
                verificationStatus: true,
                donationCount: true,
              },
            },
          },
        },
      },
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        error: { message: 'Blood request not found.' },
      });
    }

    res.json({
      success: true,
      data: request,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/blood-requests/:id/status
router.patch('/:id/status', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { status, notes } = z
      .object({
        status: z.enum([
          'PENDING',
          'VERIFIED',
          'SEARCHING',
          'NOTIFIED',
          'DONOR_ACCEPTED',
          'DONOR_CONFIRMED',
          'COMPLETED',
          'CANCELLED',
          'EXPIRED',
        ]),
        notes: z.string().optional(),
      })
      .parse(req.body);

    const existing = await prisma.bloodRequest.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { message: 'Blood request not found.' },
      });
    }

    // Permission check: Requester or Admin can change status
    if (existing.requesterId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: { message: 'Not authorized to change this request status.' },
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const br = await tx.bloodRequest.update({
        where: { id: req.params.id },
        data: { status },
      });

      await tx.auditLog.create({
        data: {
          userId: req.user!.id,
          action: 'UPDATE_BLOOD_REQUEST_STATUS',
          entity: 'BloodRequest',
          entityId: br.id,
          details: JSON.stringify({ from: existing.status, to: status, notes }),
        },
      });

      return br;
    });

    // Notify listeners via socket
    socketService.emitRequestStatusUpdate(updated.id, status, { notes });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/blood-requests/:id/respond
// Donor accepts or declines an emergency request
router.post('/:id/respond', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { action, notes } = z
      .object({
        action: z.enum(['ACCEPT', 'DECLINE', 'CONFIRM_ARRIVED']),
        notes: z.string().optional(),
      })
      .parse(req.body);

    let donor = await prisma.donor.findUnique({
      where: { userId: req.user!.id },
    });

    if (!donor) {
      const u = await prisma.user.findUnique({ where: { id: req.user!.id } });
      if (u) {
        donor = await prisma.donor.create({
          data: {
            userId: u.id,
            fullName: u.fullName || 'Unified Donor',
            phone: u.phone || '+1 (555) 000-0000',
            bloodGroup: u.bloodGroup || 'O_POS',
            address: u.address || 'New York, NY',
            latitude: u.latitude ?? 40.7128,
            longitude: u.longitude ?? -74.006,
            isAvailable: u.isAvailable ?? true,
            lastDonationDate: u.lastDonationDate,
            verificationStatus: 'VERIFIED',
          },
        });
      }
    }

    if (!donor) {
      return res.status(403).json({
        success: false,
        error: { message: 'Must be a registered donor to respond.' },
      });
    }

    const bloodRequest = await prisma.bloodRequest.findUnique({
      where: { id: req.params.id },
    });

    if (!bloodRequest) {
      return res.status(404).json({
        success: false,
        error: { message: 'Blood request not found.' },
      });
    }

    const responseStatus =
      action === 'ACCEPT' ? 'ACCEPTED' : action === 'CONFIRM_ARRIVED' ? 'CONFIRMED' : 'DECLINED';

    const responseRecord = await prisma.donorResponse.upsert({
      where: {
        bloodRequestId_donorId: {
          bloodRequestId: bloodRequest.id,
          donorId: donor.id,
        },
      },
      update: {
        status: responseStatus,
        notes,
      },
      create: {
        bloodRequestId: bloodRequest.id,
        donorId: donor.id,
        status: responseStatus,
        notes,
      },
    });

    if (action === 'ACCEPT') {
      // Advance blood request status to DONOR_ACCEPTED
      await prisma.bloodRequest.update({
        where: { id: bloodRequest.id },
        data: { status: 'DONOR_ACCEPTED' },
      });

      // Notify requester
      await prisma.notification.create({
        data: {
          userId: bloodRequest.requesterId,
          title: 'Donor Accepted Your Request!',
          message: `A compatible donor (${donor.bloodGroup.replace('_', '')}) has accepted request ${bloodRequest.requestNumber}.`,
          type: 'DONOR_ACCEPT',
          data: JSON.stringify({ requestId: bloodRequest.id, donorId: donor.id }),
        },
      });

      socketService.emitDonorResponseToRequester(bloodRequest.requesterId, {
        requestId: bloodRequest.id,
        status: 'DONOR_ACCEPTED',
        donorName: donor.fullName,
        bloodGroup: donor.bloodGroup,
        message: 'A donor has accepted the emergency request and is arranging donation.',
      });

      socketService.emitRequestStatusUpdate(bloodRequest.id, 'DONOR_ACCEPTED');
    }

    res.json({
      success: true,
      data: {
        response: responseRecord,
        requestStatus: action === 'ACCEPT' ? 'DONOR_ACCEPTED' : bloodRequest.status,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/blood-requests/:id/matches
// Returns smart ranked donors for this request
router.get('/:id/matches', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const bloodRequest = await prisma.bloodRequest.findUnique({
      where: { id: req.params.id },
    });

    if (!bloodRequest) {
      return res.status(404).json({
        success: false,
        error: { message: 'Blood request not found.' },
      });
    }

    const candidateDonors = await prisma.donor.findMany({
      where: { isAvailable: true },
    });

    const ranked = rankDonors(
      bloodRequest.hospitalLat,
      bloodRequest.hospitalLng,
      bloodRequest.bloodGroup,
      10.0,
      candidateDonors.map((d) => ({
        id: d.id,
        fullName: d.fullName,
        bloodGroup: d.bloodGroup,
        latitude: d.latitude,
        longitude: d.longitude,
        isAvailable: d.isAvailable,
        isVerified: d.verificationStatus === 'VERIFIED',
        responseRate: d.responseRate,
        lastDonationDate: d.lastDonationDate,
        preferredRadiusKm: d.preferredRadiusKm,
      }))
    );

    res.json({
      success: true,
      data: {
        requestId: bloodRequest.id,
        requiredBloodGroup: bloodRequest.bloodGroup,
        totalMatches: ranked.length,
        rankedDonors: ranked,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
