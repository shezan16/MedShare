import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { authenticate, AuthRequest, requireRole } from '../middlewares/auth';

const router = Router();

// GET /api/v1/admin/dashboard
// Real database statistics
router.get('/dashboard', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const [
      totalUsers,
      totalDonors,
      activeDonors,
      verifiedDonors,
      totalBloodRequests,
      activeBloodRequests,
      completedBloodRequests,
      verifiedPharmacies,
      pendingPharmacies,
      totalMedicines,
      pendingMedicines,
      totalReports,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.donor.count(),
      prisma.donor.count({ where: { isAvailable: true } }),
      prisma.donor.count({ where: { verificationStatus: 'VERIFIED' } }),
      prisma.bloodRequest.count(),
      prisma.bloodRequest.count({
        where: { status: { in: ['SEARCHING', 'NOTIFIED', 'DONOR_ACCEPTED', 'DONOR_CONFIRMED'] } },
      }),
      prisma.bloodRequest.count({ where: { status: 'COMPLETED' } }),
      prisma.pharmacy.count({ where: { isVerified: true } }),
      prisma.pharmacy.count({ where: { verificationStatus: 'PENDING' } }),
      prisma.medicine.count(),
      prisma.medicine.count({ where: { verificationStatus: 'PENDING' } }),
      prisma.userReport.count({ where: { status: 'PENDING' } }),
    ]);

    // Blood requests grouped by blood group
    const bloodGroupCounts = await prisma.bloodRequest.groupBy({
      by: ['bloodGroup'],
      _count: { id: true },
    });

    // Recent activity log
    const recentLogs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: { select: { email: true, role: true } },
      },
    });

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalDonors,
          activeDonors,
          verifiedDonors,
          totalBloodRequests,
          activeBloodRequests,
          completedBloodRequests,
          verifiedPharmacies,
          pendingPharmacies,
          totalMedicines,
          pendingMedicines,
          pendingReports: totalReports,
        },
        bloodGroupDistribution: bloodGroupCounts.map((g) => ({
          group: g.bloodGroup,
          count: g._count.id,
        })),
        recentActivity: recentLogs,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/admin/users
router.get('/users', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const role = req.query.role as any;
    const search = req.query.search as string;

    const users = await prisma.user.findMany({
      where: {
        ...(role ? { role } : {}),
        ...(search ? { email: { contains: search, mode: 'insensitive' } } : {}),
      },
      select: {
        id: true,
        email: true,
        role: true,
        isVerified: true,
        createdAt: true,
        donor: {
          select: {
            id: true,
            fullName: true,
            bloodGroup: true,
            verificationStatus: true,
            isAvailable: true,
          },
        },
        pharmacy: {
          select: {
            id: true,
            organizationName: true,
            licenseNumber: true,
            verificationStatus: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/admin/users/:id/status
router.patch('/users/:id/status', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const { isVerified, role } = z
      .object({
        isVerified: z.boolean().optional(),
        role: z.enum(['PATIENT', 'DONOR', 'PHARMACY', 'ADMIN']).optional(),
      })
      .parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(isVerified !== undefined ? { isVerified } : {}),
        ...(role ? { role } : {}),
      },
    });

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/admin/donors
router.get('/donors', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const status = req.query.status as any;

    const donors = await prisma.donor.findMany({
      where: status ? { verificationStatus: status } : {},
      include: {
        user: { select: { email: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: donors,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/admin/donors/:id/verify
router.patch('/donors/:id/verify', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const { status } = z
      .object({
        status: z.enum(['VERIFIED', 'REJECTED']),
      })
      .parse(req.body);

    const donor = await prisma.donor.update({
      where: { id: req.params.id },
      data: { verificationStatus: status },
    });

    await prisma.user.update({
      where: { id: donor.userId },
      data: { isVerified: status === 'VERIFIED' },
    });

    await prisma.notification.create({
      data: {
        userId: donor.userId,
        title: `Donor Profile ${status}`,
        message:
          status === 'VERIFIED'
            ? 'Your blood donor profile has been verified by the MedShare administration team.'
            : 'Your blood donor verification request was not approved.',
        type: 'VERIFICATION',
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

// GET /api/v1/admin/reports
router.get('/reports', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const reports = await prisma.userReport.findMany({
      include: {
        reporter: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: reports,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/admin/reports (User submits fraud/suspicious report)
router.post('/reports', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const data = z
      .object({
        reportedUserId: z.string().optional(),
        reportedItemId: z.string().optional(),
        itemType: z.enum(['USER', 'DONOR', 'PHARMACY', 'MEDICINE', 'BLOOD_REQUEST']),
        reason: z.string().min(3),
        details: z.string().min(5),
      })
      .parse(req.body);

    const report = await prisma.userReport.create({
      data: {
        reporterId: req.user!.id,
        reportedUserId: data.reportedUserId,
        reportedItemId: data.reportedItemId,
        itemType: data.itemType,
        reason: data.reason,
        details: data.details,
        status: 'PENDING',
      },
    });

    res.status(201).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/admin/reports/:id/status
router.patch('/reports/:id/status', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const { status } = z
      .object({
        status: z.enum(['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED']),
      })
      .parse(req.body);

    const report = await prisma.userReport.update({
      where: { id: req.params.id },
      data: { status },
    });

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/admin/analytics
router.get('/analytics', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res: Response, next) => {
  try {
    const bloodRequests = await prisma.bloodRequest.findMany({
      select: {
        createdAt: true,
        priority: true,
        status: true,
        bloodGroup: true,
      },
    });

    const totalMedicines = await prisma.medicine.count();
    const verifiedMedicines = await prisma.medicine.count({ where: { verificationStatus: 'VERIFIED' } });

    res.json({
      success: true,
      data: {
        bloodRequestsCount: bloodRequests.length,
        medicineInventoryStats: {
          total: totalMedicines,
          verified: verifiedMedicines,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
