import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { ENV } from '../config/env';
import { authenticate, AuthRequest } from '../middlewares/auth';

const router = Router();

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['PATIENT', 'DONOR', 'PHARMACY', 'ADMIN']).default('PATIENT'),
  // Optional profile info depending on role
  fullName: z.string().optional(),
  phone: z.string().optional(),
  bloodGroup: z.enum(['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG']).optional(),
  organizationName: z.string().optional(),
  licenseNumber: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/v1/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: { message: 'An account with this email address already exists.' },
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    // Create user and profile in transaction
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email.toLowerCase(),
          passwordHash,
          role: data.role,
          isVerified: data.role === 'ADMIN', // auto-verify admin demo
        },
      });

      if (data.role === 'DONOR' && data.fullName && data.bloodGroup) {
        await tx.donor.create({
          data: {
            userId: user.id,
            fullName: data.fullName,
            phone: data.phone || '0000000000',
            bloodGroup: data.bloodGroup,
            address: data.address || '',
            latitude: data.latitude || 40.7128,
            longitude: data.longitude || -74.006,
            verificationStatus: 'PENDING',
          },
        });
      } else if (data.role === 'PHARMACY' && data.organizationName && data.licenseNumber) {
        await tx.pharmacy.create({
          data: {
            userId: user.id,
            organizationName: data.organizationName,
            licenseNumber: data.licenseNumber,
            address: data.address || 'Address pending',
            latitude: data.latitude || 40.7128,
            longitude: data.longitude || -74.006,
            phone: data.phone || '0000000000',
            email: data.email.toLowerCase(),
            verificationStatus: 'PENDING',
          },
        });
      }

      // Create welcome notification
      await tx.notification.create({
        data: {
          userId: user.id,
          title: 'Welcome to MedShare',
          message: 'Your account has been created successfully. Welcome to the RapidBlood Network & Medicine Redistribution community.',
          type: 'SYSTEM',
        },
      });

      return user;
    });

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      ENV.JWT_SECRET,
      { expiresIn: ENV.JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
          isVerified: newUser.isVerified,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        donor: true,
        pharmacy: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid email or password.' },
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid email or password.' },
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      ENV.JWT_SECRET,
      { expiresIn: ENV.JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          profileImage: user.profileImage,
          donor: user.donor
            ? {
                id: user.donor.id,
                fullName: user.donor.fullName,
                bloodGroup: user.donor.bloodGroup,
                isAvailable: user.donor.isAvailable,
                verificationStatus: user.donor.verificationStatus,
              }
            : null,
          pharmacy: user.pharmacy
            ? {
                id: user.pharmacy.id,
                organizationName: user.pharmacy.organizationName,
                licenseNumber: user.pharmacy.licenseNumber,
                verificationStatus: user.pharmacy.verificationStatus,
              }
            : null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/logout
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    data: { message: 'Successfully logged out.' },
  });
});

// GET /api/v1/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        donor: true,
        pharmacy: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found.' },
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        profileImage: user.profileImage,
        createdAt: user.createdAt,
        donor: user.donor,
        pharmacy: user.pharmacy,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
