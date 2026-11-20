import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { ENV } from '../config/env';
import { authenticate, AuthRequest } from '../middlewares/auth';

const router = Router();

// ===============================
// VALIDATION SCHEMAS
// ===============================

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['PATIENT', 'DONOR', 'PHARMACY', 'ADMIN']).optional().default('PATIENT'),

  fullName: z.string().min(1, 'Full name is required'),
  phone: z.string().min(1, 'Contact phone is required'),

  bloodGroup: z.enum([
    'A_POS',
    'A_NEG',
    'B_POS',
    'B_NEG',
    'AB_POS',
    'AB_NEG',
    'O_POS',
    'O_NEG',
  ]).default('O_POS'),

  organizationName: z.string().optional(),
  licenseNumber: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional().default('New York, NY'),
  latitude: z.number().optional().default(40.7128),
  longitude: z.number().optional().default(-74.006),
  isAvailable: z.boolean().optional().default(true),
  lastDonationDate: z.string().optional().nullable(),
});

const profileUpdateSchema = z.object({
  fullName: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  bloodGroup: z.enum([
    'A_POS',
    'A_NEG',
    'B_POS',
    'B_NEG',
    'AB_POS',
    'AB_NEG',
    'O_POS',
    'O_NEG',
  ]).optional(),
  city: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  isAvailable: z.boolean().optional(),
  lastDonationDate: z.string().optional().nullable(),
  organizationName: z.string().optional().nullable(),
  licenseNumber: z.string().optional().nullable(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ===============================
// JWT GENERATOR
// ===============================

const generateToken = (user: {
  id: string;
  email: string;
  role: string;
  donorId?: string;
  pharmacyId?: string;
}): string => {
  return jwt.sign(
    {
      sub: user.id,
      id: user.id,
      email: user.email,
      role: user.role,
      donorId: user.donorId,
      pharmacyId: user.pharmacyId,
    },
    ENV.JWT_SECRET,
    {
      expiresIn: ENV.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    }
  );
};

// ===============================
// REGISTER
// POST /api/v1/auth/register
// ===============================

router.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({
      where: {
        email: data.email.toLowerCase().trim(),
      },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'An account with this email address already exists.',
        },
      });
    }

    // Validate lastDonationDate is not in the future
    let parsedDonationDate: Date | null = null;
    if (data.lastDonationDate) {
      const d = new Date(data.lastDonationDate);
      if (d > new Date()) {
        return res.status(400).json({
          success: false,
          error: { message: 'Last donation date cannot be in the future.' },
        });
      }
      parsedDonationDate = d;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    // Create unified user, donor, and pharmacy in transaction
    const newUser = await prisma.$transaction(async (tx) => {
      const orgName = data.organizationName?.trim() || `${data.fullName}'s Pharmacy`;
      const licNum = data.licenseNumber?.trim() || `LIC-${Date.now().toString().slice(-6)}`;

      const user = await tx.user.create({
        data: {
          email: data.email.toLowerCase().trim(),
          passwordHash,
          role: data.role || 'PATIENT',
          fullName: data.fullName,
          phone: data.phone,
          bloodGroup: data.bloodGroup,
          city: data.city || null,
          address: data.address || 'New York, NY',
          latitude: data.latitude ?? 40.7128,
          longitude: data.longitude ?? -74.006,
          isAvailable: data.isAvailable ?? true,
          lastDonationDate: parsedDonationDate,
          organizationName: orgName,
          licenseNumber: licNum,
          isVerified: false,
        },
      });

      // Create linked Donor Profile
      const donor = await tx.donor.create({
        data: {
          userId: user.id,
          fullName: data.fullName,
          phone: data.phone,
          bloodGroup: data.bloodGroup,
          city: data.city || null,
          address: data.address || 'New York, NY',
          latitude: data.latitude ?? 40.7128,
          longitude: data.longitude ?? -74.006,
          isAvailable: data.isAvailable ?? true,
          lastDonationDate: parsedDonationDate,
          verificationStatus: 'PENDING',
          preferredRadiusKm: 5.0,
          responseRate: 100.0,
          donationCount: 0,
        },
      });

      // Create linked Pharmacy Profile (Pending verification until official review)
      const pharmacy = await tx.pharmacy.create({
        data: {
          userId: user.id,
          organizationName: orgName,
          licenseNumber: licNum,
          city: data.city || null,
          address: data.address || 'New York, NY',
          latitude: data.latitude ?? 40.7128,
          longitude: data.longitude ?? -74.006,
          phone: data.phone,
          email: data.email.toLowerCase().trim(),
          isVerified: false,
          verificationStatus: 'PENDING',
        },
      });

      // Welcome Notification
      await tx.notification.create({
        data: {
          userId: user.id,
          title: 'Welcome to MedShare Unified Healthcare',
          message:
            'Your unified account has been created with instant access to Emergency Blood Transfusions, Blood Donor Hub, and Medicine Redistribution.',
          type: 'SYSTEM',
        },
      });

      return {
        ...user,
        donor,
        pharmacy,
      };
    });

    // Generate JWT Token with identity claims
    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      donorId: newUser.donor.id,
      pharmacyId: newUser.pharmacy.id,
    });

    return res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
          isVerified: newUser.isVerified,
          fullName: newUser.fullName,
          phone: newUser.phone,
          bloodGroup: newUser.bloodGroup,
          city: newUser.city,
          address: newUser.address,
          latitude: newUser.latitude,
          longitude: newUser.longitude,
          isAvailable: newUser.isAvailable,
          lastDonationDate: newUser.lastDonationDate,
          organizationName: newUser.organizationName,
          licenseNumber: newUser.licenseNumber,
          donor: {
            id: newUser.donor.id,
            fullName: newUser.donor.fullName,
            bloodGroup: newUser.donor.bloodGroup,
            isAvailable: newUser.donor.isAvailable,
            verificationStatus: newUser.donor.verificationStatus,
          },
          pharmacy: {
            id: newUser.pharmacy.id,
            organizationName: newUser.pharmacy.organizationName,
            licenseNumber: newUser.pharmacy.licenseNumber,
            verificationStatus: newUser.pharmacy.verificationStatus,
          },
        },
      },
    });

  } catch (error) {
    next(error);
  }
});

// ===============================
// LOGIN
// POST /api/v1/auth/login
// ===============================

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase(),
      },
      include: {
        donor: true,
        pharmacy: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid email or password.',
        },
      });
    }

    // Verify Password
    const isMatch = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid email or password.',
        },
      });
    }

    // Generate JWT Token with full context
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      donorId: user.donor?.id,
      pharmacyId: user.pharmacy?.id,
    });

    return res.json({
      success: true,
      data: {
        token,

        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          profileImage: user.profileImage,
          fullName: user.fullName || user.donor?.fullName,
          phone: user.phone || user.donor?.phone || user.pharmacy?.phone,
          bloodGroup: user.bloodGroup || user.donor?.bloodGroup,
          city: user.city || user.donor?.city || user.pharmacy?.city,
          address: user.address || user.donor?.address || user.pharmacy?.address,
          latitude: user.latitude ?? user.donor?.latitude ?? user.pharmacy?.latitude,
          longitude: user.longitude ?? user.donor?.longitude ?? user.pharmacy?.longitude,
          isAvailable: user.isAvailable ?? user.donor?.isAvailable ?? true,
          lastDonationDate: user.lastDonationDate || user.donor?.lastDonationDate,
          organizationName: user.organizationName || user.pharmacy?.organizationName,
          licenseNumber: user.licenseNumber || user.pharmacy?.licenseNumber,

          donor: user.donor
            ? {
                id: user.donor.id,
                fullName: user.donor.fullName,
                bloodGroup: user.donor.bloodGroup,
                city: user.donor.city,
                isAvailable: user.donor.isAvailable,
                verificationStatus:
                  user.donor.verificationStatus,
              }
            : null,

          pharmacy: user.pharmacy
            ? {
                id: user.pharmacy.id,
                organizationName:
                  user.pharmacy.organizationName,
                licenseNumber:
                  user.pharmacy.licenseNumber,
                city: user.pharmacy.city,
                verificationStatus:
                  user.pharmacy.verificationStatus,
              }
            : null,
        },
      },
    });

  } catch (error) {
    next(error);
  }
});

// ===============================
// LOGOUT
// POST /api/v1/auth/logout
// ===============================

router.post('/logout', (req, res) => {
  return res.json({
    success: true,
    data: {
      message: 'Successfully logged out.',
    },
  });
});

// ===============================
// GET CURRENT USER
// GET /api/v1/auth/me
// ===============================

router.get(
  '/me',
  authenticate,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const user = await prisma.user.findUnique({
        where: {
          id: req.user!.id,
        },
        include: {
          donor: true,
          pharmacy: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'User not found.',
          },
        });
      }

      return res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          profileImage: user.profileImage,
          fullName: user.fullName || user.donor?.fullName,
          phone: user.phone || user.donor?.phone || user.pharmacy?.phone,
          bloodGroup: user.bloodGroup || user.donor?.bloodGroup,
          city: user.city || user.donor?.city || user.pharmacy?.city,
          address: user.address || user.donor?.address || user.pharmacy?.address,
          latitude: user.latitude ?? user.donor?.latitude ?? user.pharmacy?.latitude,
          longitude: user.longitude ?? user.donor?.longitude ?? user.pharmacy?.longitude,
          isAvailable: user.isAvailable ?? user.donor?.isAvailable ?? true,
          lastDonationDate: user.lastDonationDate || user.donor?.lastDonationDate,
          organizationName: user.organizationName || user.pharmacy?.organizationName,
          licenseNumber: user.licenseNumber || user.pharmacy?.licenseNumber,
          createdAt: user.createdAt,
          donor: user.donor,
          pharmacy: user.pharmacy,
        },
      });

    } catch (error) {
      next(error);
    }
  }
);

// ===============================
// UPDATE PROFILE
// PUT /api/v1/auth/profile
// ===============================

const updateProfileHandler = async (req: AuthRequest, res: Response, next: any) => {
  try {
    const data = profileUpdateSchema.parse(req.body);
    const userId = req.user!.id;

    // Validate donation date cannot be in future
    let parsedDonationDate: Date | null | undefined = undefined;
    if (data.lastDonationDate !== undefined) {
      if (data.lastDonationDate) {
        const d = new Date(data.lastDonationDate);
        if (d > new Date()) {
          return res.status(400).json({
            success: false,
            error: { message: 'Last donation date cannot be in the future.' },
          });
        }
        parsedDonationDate = d;
      } else {
        parsedDonationDate = null;
      }
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: userId },
        data: {
          ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
          ...(data.phone !== undefined ? { phone: data.phone } : {}),
          ...(data.bloodGroup !== undefined ? { bloodGroup: data.bloodGroup } : {}),
          ...(data.city !== undefined ? { city: data.city } : {}),
          ...(data.address !== undefined ? { address: data.address } : {}),
          ...(data.latitude !== undefined && data.latitude !== null ? { latitude: data.latitude } : {}),
          ...(data.longitude !== undefined && data.longitude !== null ? { longitude: data.longitude } : {}),
          ...(data.isAvailable !== undefined ? { isAvailable: data.isAvailable } : {}),
          ...(parsedDonationDate !== undefined ? { lastDonationDate: parsedDonationDate } : {}),
          ...(data.organizationName !== undefined ? { organizationName: data.organizationName } : {}),
          ...(data.licenseNumber !== undefined ? { licenseNumber: data.licenseNumber } : {}),
        },
      });

      // Synchronize linked Donor
      await tx.donor.upsert({
        where: { userId },
        update: {
          ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
          ...(data.phone !== undefined ? { phone: data.phone } : {}),
          ...(data.bloodGroup !== undefined ? { bloodGroup: data.bloodGroup } : {}),
          ...(data.city !== undefined ? { city: data.city } : {}),
          ...(data.address !== undefined ? { address: data.address } : {}),
          ...(data.latitude !== undefined && data.latitude !== null ? { latitude: data.latitude } : {}),
          ...(data.longitude !== undefined && data.longitude !== null ? { longitude: data.longitude } : {}),
          ...(data.isAvailable !== undefined ? { isAvailable: data.isAvailable } : {}),
          ...(parsedDonationDate !== undefined ? { lastDonationDate: parsedDonationDate } : {}),
        },
        create: {
          userId,
          fullName: u.fullName || 'Unified Donor',
          phone: u.phone || '+1 (555) 000-0000',
          bloodGroup: u.bloodGroup || 'O_POS',
          city: u.city,
          address: u.address || 'New York, NY',
          latitude: u.latitude ?? 40.7128,
          longitude: u.longitude ?? -74.006,
          isAvailable: u.isAvailable,
          lastDonationDate: u.lastDonationDate,
          verificationStatus: 'PENDING',
        },
      });

      // Synchronize linked Pharmacy if organization details exist
      const orgName = data.organizationName || u.organizationName;
      const licNum = data.licenseNumber || u.licenseNumber;
      if (orgName || licNum) {
        await tx.pharmacy.upsert({
          where: { userId },
          update: {
            ...(data.organizationName !== undefined && data.organizationName ? { organizationName: data.organizationName } : {}),
            ...(data.licenseNumber !== undefined && data.licenseNumber ? { licenseNumber: data.licenseNumber } : {}),
            ...(data.city !== undefined ? { city: data.city } : {}),
            ...(data.address !== undefined && data.address ? { address: data.address } : {}),
            ...(data.latitude !== undefined && data.latitude !== null ? { latitude: data.latitude } : {}),
            ...(data.longitude !== undefined && data.longitude !== null ? { longitude: data.longitude } : {}),
            ...(data.phone !== undefined ? { phone: data.phone } : {}),
          },
          create: {
            userId,
            organizationName: orgName || `${u.fullName || 'User'}'s Pharmacy`,
            licenseNumber: licNum || `LIC-${Date.now().toString().slice(-6)}`,
            city: u.city,
            address: u.address || 'New York, NY',
            latitude: u.latitude ?? 40.7128,
            longitude: u.longitude ?? -74.006,
            phone: u.phone || '+1 (555) 000-0000',
            email: u.email,
            isVerified: false,
            verificationStatus: 'PENDING',
          },
        });
      }

      return u;
    });

    const refreshed = await prisma.user.findUnique({
      where: { id: userId },
      include: { donor: true, pharmacy: true },
    });

    return res.json({
      success: true,
      data: refreshed,
    });
  } catch (error) {
    next(error);
  }
};

router.put('/profile', authenticate, updateProfileHandler);
router.patch('/profile', authenticate, updateProfileHandler);
router.put('/me', authenticate, updateProfileHandler);

export default router;
