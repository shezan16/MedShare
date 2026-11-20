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
  address: z.string().optional().default('New York, NY'),
  latitude: z.number().optional().default(40.7128),
  longitude: z.number().optional().default(-74.006),
  isAvailable: z.boolean().optional().default(true),
  lastDonationDate: z.string().optional().nullable(),
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
        email: data.email.toLowerCase(),
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

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    // Create unified user, donor, and pharmacy in transaction
    const newUser = await prisma.$transaction(async (tx) => {
      const orgName = data.organizationName?.trim() || `${data.fullName}'s Pharmacy`;
      const licNum = data.licenseNumber?.trim() || `LIC-${Date.now().toString().slice(-6)}`;
      const parsedDonationDate = data.lastDonationDate ? new Date(data.lastDonationDate) : null;

      const user = await tx.user.create({
        data: {
          email: data.email.toLowerCase(),
          passwordHash,
          role: data.role || 'PATIENT',
          fullName: data.fullName,
          phone: data.phone,
          bloodGroup: data.bloodGroup,
          address: data.address || 'New York, NY',
          latitude: data.latitude ?? 40.7128,
          longitude: data.longitude ?? -74.006,
          isAvailable: data.isAvailable ?? true,
          lastDonationDate: parsedDonationDate,
          organizationName: orgName,
          licenseNumber: licNum,
          isVerified: true,
        },
      });

      // Always create linked Donor Profile for matching & alerts
      const donor = await tx.donor.create({
        data: {
          userId: user.id,
          fullName: data.fullName,
          phone: data.phone,
          bloodGroup: data.bloodGroup,
          address: data.address || 'New York, NY',
          latitude: data.latitude ?? 40.7128,
          longitude: data.longitude ?? -74.006,
          isAvailable: data.isAvailable ?? true,
          lastDonationDate: parsedDonationDate,
          verificationStatus: 'VERIFIED',
          preferredRadiusKm: 5.0,
          responseRate: 100.0,
          donationCount: 0,
        },
      });

      // Always create linked Pharmacy Profile for medicine redistribution & verification
      const pharmacy = await tx.pharmacy.create({
        data: {
          userId: user.id,
          organizationName: orgName,
          licenseNumber: licNum,
          address: data.address || 'New York, NY',
          latitude: data.latitude ?? 40.7128,
          longitude: data.longitude ?? -74.006,
          phone: data.phone,
          email: data.email.toLowerCase(),
          isVerified: true,
          verificationStatus: 'VERIFIED',
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

    // Generate JWT Token with full context
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

export default router;
