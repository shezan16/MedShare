import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { ENV } from '../config/env';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { otpService, isEmailIdentifier } from '../services/otpService';

const router = Router();

// ===============================
// VALIDATION SCHEMAS
// ===============================

const registerRequestSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  identifier: z.string().min(3, 'Email or phone number is required'),
  bloodGroup: z.enum([
    'A_POS',
    'A_NEG',
    'B_POS',
    'B_NEG',
    'AB_POS',
    'AB_NEG',
    'O_POS',
    'O_NEG',
  ]),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Confirm password must be at least 6 characters'),
});

const verifyOtpSchema = z.object({
  identifier: z.string().min(1, 'Email or phone number is required'),
  otp: z.string().min(4, 'Verification code is required'),
});

const resendOtpSchema = z.object({
  identifier: z.string().min(1, 'Email or phone number is required'),
  type: z.enum(['REGISTRATION', 'PASSWORD_RESET']).optional().default('REGISTRATION'),
});

const forgotPasswordSchema = z.object({
  identifier: z.string().min(1, 'Email or phone number is required'),
});

const resetPasswordSchema = z.object({
  identifier: z.string().min(1, 'Email or phone number is required'),
  otp: z.string().min(4, 'Verification code is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Confirm password must match'),
});

const registerSchema = z.object({
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['PATIENT', 'DONOR', 'PHARMACY', 'ADMIN']).optional().default('PATIENT'),

  fullName: z.string().min(1, 'Full name is required'),

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
  identifier: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  password: z.string().min(1, 'Password is required'),
});

// ===============================
// JWT GENERATOR
// ===============================

const generateToken = (user: {
  id: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  donorId?: string;
  pharmacyId?: string;
}): string => {
  return jwt.sign(
    {
      sub: user.id,
      id: user.id,
      email: user.email || undefined,
      phone: user.phone || undefined,
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
// 1. SIMPLE REGISTRATION INITIATION
// POST /api/v1/auth/register-request
// ===============================

router.post('/register-request', async (req, res, next) => {
  try {
    const data = registerRequestSchema.parse(req.body);

    if (data.password !== data.confirmPassword) {
      return res.status(400).json({
        success: false,
        error: { message: 'Passwords do not match.' },
      });
    }

    const rawId = data.identifier.trim();
    const isEmail = isEmailIdentifier(rawId);

    if (!isEmail) {
      // Validate phone format
      const digits = rawId.replace(/\D/g, '');
      if (digits.length < 7) {
        return res.status(400).json({
          success: false,
          error: { message: 'Please enter a valid email address or phone number.' },
        });
      }
    }

    const normalized = isEmail ? rawId.toLowerCase() : rawId;

    // Check if account already exists
    let existingUser = null;
    try {
      if (isEmail) {
        existingUser = await prisma.user.findFirst({ where: { email: normalized } });
      } else {
        existingUser = await prisma.user.findFirst({ where: { phone: normalized } });
      }
    } catch {
      // DB check fallback
    }

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          message: isEmail
            ? 'An account with this email address already exists.'
            : 'An account with this phone number already exists.',
        },
      });
    }

    // Pre-hash password for secure payload storage
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const pendingPayload = {
      fullName: data.fullName.trim(),
      identifier: normalized,
      isEmail,
      email: isEmail ? normalized : null,
      phone: isEmail ? null : normalized,
      bloodGroup: data.bloodGroup,
      passwordHash,
    };

    // Create and dispatch OTP
    const otpResult = await otpService.createAndSendOtp({
      identifier: normalized,
      type: 'REGISTRATION',
      payload: pendingPayload,
    });

    return res.status(200).json({
      success: true,
      message: otpResult.message,
      data: {
        identifier: normalized,
        destinationType: otpResult.destinationType,
        resendCooldown: otpResult.resendCooldown,
        devCode: otpResult.devCode,
      },
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: { message: error.errors[0]?.message || 'Invalid input data.' },
      });
    }
    if (error.message && error.message.includes('seconds')) {
      return res.status(429).json({
        success: false,
        error: { message: error.message },
      });
    }
    next(error);
  }
});

// ===============================
// 2. VERIFY OTP & CREATE ACCOUNT
// POST /api/v1/auth/verify-otp
// ===============================

router.post('/verify-otp', async (req, res, next) => {
  try {
    const { identifier, otp } = verifyOtpSchema.parse(req.body);
    const normalized = identifier.trim().toLowerCase();

    const verification = await otpService.verifyOtp(normalized, 'REGISTRATION', otp);

    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        error: {
          message: verification.message,
          attemptsRemaining: verification.attemptsRemaining,
        },
      });
    }

    const payload = verification.payload;
    if (!payload) {
      return res.status(400).json({
        success: false,
        error: { message: 'Registration session expired. Please re-enter your details.' },
      });
    }

    // Provision Unified User, Donor, and Pharmacy in Transaction
    let createdUser: any = null;
    try {
      createdUser = await prisma.$transaction(async (tx) => {
        const orgName = `${payload.fullName}'s Healthcare`;
        const licNum = `DGDA-${Date.now().toString().slice(-6)}`;

        const user = await tx.user.create({
          data: {
            email: payload.email,
            phone: payload.phone,
            passwordHash: payload.passwordHash,
            role: 'PATIENT',
            fullName: payload.fullName,
            bloodGroup: payload.bloodGroup,
            city: 'New York',
            address: 'New York, NY',
            latitude: 40.7128,
            longitude: -74.006,
            isAvailable: true,
            organizationName: orgName,
            licenseNumber: licNum,
            isVerified: false,
            isEmailVerified: Boolean(payload.email),
            isPhoneVerified: Boolean(payload.phone),
          },
        });

        const donor = await tx.donor.create({
          data: {
            userId: user.id,
            fullName: payload.fullName,
            phone: payload.phone || '+1 (555) 000-0000',
            bloodGroup: payload.bloodGroup,
            city: 'New York',
            address: 'New York, NY',
            latitude: 40.7128,
            longitude: -74.006,
            isAvailable: true,
            verificationStatus: 'VERIFIED',
            preferredRadiusKm: 5.0,
            responseRate: 100.0,
            donationCount: 0,
          },
        });

        const pharmacy = await tx.pharmacy.create({
          data: {
            userId: user.id,
            organizationName: orgName,
            licenseNumber: licNum,
            city: 'New York',
            address: 'New York, NY',
            latitude: 40.7128,
            longitude: -74.006,
            phone: payload.phone || '+1 (555) 000-0000',
            email: payload.email || `${user.id}@medshare.local`,
            isVerified: false,
            verificationStatus: 'PENDING',
          },
        });

        await tx.notification.create({
          data: {
            userId: user.id,
            title: 'Welcome to MedShare',
            message:
              'Your unified account is active with instant access to Emergency Blood Requests, Donor Hub, and Medicine Redistribution.',
            type: 'SYSTEM',
          },
        });

        return { ...user, donor, pharmacy };
      });
    } catch (err: any) {
      // Fallback in case of unique constraint conflict
      if (err.code === 'P2002') {
        return res.status(409).json({
          success: false,
          error: { message: 'An account with these details is already registered.' },
        });
      }
      throw err;
    }

    const token = generateToken({
      id: createdUser.id,
      email: createdUser.email,
      phone: createdUser.phone,
      role: createdUser.role,
      donorId: createdUser.donor?.id,
      pharmacyId: createdUser.pharmacy?.id,
    });

    return res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: createdUser.id,
          email: createdUser.email,
          phone: createdUser.phone,
          role: createdUser.role,
          isVerified: createdUser.isVerified,
          isEmailVerified: createdUser.isEmailVerified,
          isPhoneVerified: createdUser.isPhoneVerified,
          fullName: createdUser.fullName,
          bloodGroup: createdUser.bloodGroup,
          city: createdUser.city,
          address: createdUser.address,
          latitude: createdUser.latitude,
          longitude: createdUser.longitude,
          isAvailable: createdUser.isAvailable,
          organizationName: createdUser.organizationName,
          licenseNumber: createdUser.licenseNumber,
          donor: createdUser.donor,
          pharmacy: createdUser.pharmacy,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// ===============================
// 3. RESEND OTP
// POST /api/v1/auth/resend-otp
// ===============================

router.post('/resend-otp', async (req, res, next) => {
  try {
    const { identifier, type } = resendOtpSchema.parse(req.body);
    const normalized = identifier.trim().toLowerCase();

    const otpResult = await otpService.createAndSendOtp({
      identifier: normalized,
      type: type || 'REGISTRATION',
    });

    return res.json({
      success: true,
      message: otpResult.message,
      data: {
        resendCooldown: otpResult.resendCooldown,
        devCode: otpResult.devCode,
      },
    });
  } catch (error: any) {
    if (error.message && error.message.includes('seconds')) {
      return res.status(429).json({
        success: false,
        error: { message: error.message },
      });
    }
    next(error);
  }
});

// ===============================
// 4. FORGOT PASSWORD (STEP 1 & 2)
// POST /api/v1/auth/forgot-password
// ===============================

router.post('/forgot-password', async (req, res, next) => {
  try {
    const { identifier } = forgotPasswordSchema.parse(req.body);
    const rawId = identifier.trim();
    const isEmail = isEmailIdentifier(rawId);
    const normalized = isEmail ? rawId.toLowerCase() : rawId;

    let user = null;
    try {
      if (isEmail) {
        user = await prisma.user.findFirst({ where: { email: normalized } });
      } else {
        user = await prisma.user.findFirst({ where: { phone: normalized } });
      }
    } catch {}

    // Security practice: prevent account enumeration, return generic success
    let devCode: string | undefined = undefined;
    if (user) {
      const otpResult = await otpService.createAndSendOtp({
        identifier: normalized,
        type: 'PASSWORD_RESET',
      });
      devCode = otpResult.devCode;
    }

    return res.json({
      success: true,
      message: 'If an account exists with this contact method, a verification code has been dispatched.',
      data: {
        identifier: normalized,
        resendCooldown: 60,
        devCode,
      },
    });
  } catch (error: any) {
    if (error.message && error.message.includes('seconds')) {
      return res.status(429).json({
        success: false,
        error: { message: error.message },
      });
    }
    next(error);
  }
});

// ===============================
// 5. VERIFY RESET OTP (STEP 3)
// POST /api/v1/auth/verify-reset-otp
// ===============================

router.post('/verify-reset-otp', async (req, res, next) => {
  try {
    const { identifier, otp } = verifyOtpSchema.parse(req.body);
    const normalized = identifier.trim().toLowerCase();

    const verification = await otpService.verifyOtp(normalized, 'PASSWORD_RESET', otp);

    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        error: {
          message: verification.message,
          attemptsRemaining: verification.attemptsRemaining,
        },
      });
    }

    return res.json({
      success: true,
      data: {
        verified: true,
        message: 'Verification code confirmed. You may now enter your new password.',
      },
    });
  } catch (error) {
    next(error);
  }
});

// ===============================
// 6. RESET PASSWORD (STEP 4 & 5)
// POST /api/v1/auth/reset-password
// ===============================

router.post('/reset-password', async (req, res, next) => {
  try {
    const { identifier, otp, newPassword, confirmPassword } = resetPasswordSchema.parse(req.body);

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: { message: 'Passwords do not match.' },
      });
    }

    const rawId = identifier.trim();
    const isEmail = isEmailIdentifier(rawId);
    const normalized = isEmail ? rawId.toLowerCase() : rawId;

    // Verify OTP if not already consumed
    const verification = await otpService.verifyOtp(normalized, 'PASSWORD_RESET', otp);
    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        error: { message: verification.message || 'Invalid or expired verification code.' },
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    if (isEmail) {
      await prisma.user.updateMany({
        where: { email: normalized },
        data: { passwordHash },
      });
    } else {
      await prisma.user.updateMany({
        where: { phone: normalized },
        data: { passwordHash },
      });
    }

    return res.json({
      success: true,
      message: 'Password successfully reset. You may now sign in with your new credentials.',
    });
  } catch (error) {
    next(error);
  }
});

// ===============================
// 7. SIMPLE LOGIN (EMAIL OR PHONE)
// POST /api/v1/auth/login
// ===============================

router.post('/login', async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const rawId = (body.identifier || body.email || body.phone || '').trim();
    const password = body.password;

    if (!rawId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Please enter your email address or phone number.' },
      });
    }

    const isEmail = isEmailIdentifier(rawId);
    const normalized = isEmail ? rawId.toLowerCase() : rawId;

    let user = null;
    if (isEmail) {
      user = await prisma.user.findFirst({
        where: { email: normalized },
        include: { donor: true, pharmacy: true },
      });
    } else {
      user = await prisma.user.findFirst({
        where: { phone: normalized },
        include: { donor: true, pharmacy: true },
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid credentials. Please verify your email/phone and password.',
        },
      });
    }

    // Verify Password
    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid credentials. Please verify your email/phone and password.',
        },
      });
    }

    // Generate JWT Token
    const token = generateToken({
      id: user.id,
      email: user.email,
      phone: user.phone,
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
          phone: user.phone,
          role: user.role,
          isVerified: user.isVerified,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          profileImage: user.profileImage,
          fullName: user.fullName || user.donor?.fullName,
          bloodGroup: user.bloodGroup || user.donor?.bloodGroup,
          city: user.city || user.donor?.city || user.pharmacy?.city,
          address: user.address || user.donor?.address || user.pharmacy?.address,
          latitude: user.latitude ?? user.donor?.latitude ?? user.pharmacy?.latitude,
          longitude: user.longitude ?? user.donor?.longitude ?? user.pharmacy?.longitude,
          isAvailable: user.isAvailable ?? user.donor?.isAvailable ?? true,
          lastDonationDate: user.lastDonationDate || user.donor?.lastDonationDate,
          organizationName: user.organizationName || user.pharmacy?.organizationName,
          licenseNumber: user.licenseNumber || user.pharmacy?.licenseNumber,
          donor: user.donor,
          pharmacy: user.pharmacy,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// ===============================
// LEGACY / DIRECT REGISTER FALLBACK
// POST /api/v1/auth/register
// ===============================

router.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const email = data.email?.toLowerCase().trim() || null;
    const phone = data.phone?.trim() || null;

    if (email) {
      const existing = await prisma.user.findFirst({ where: { email } });
      if (existing) {
        return res.status(409).json({
          success: false,
          error: { message: 'An account with this email address already exists.' },
        });
      }
    }

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

    const newUser = await prisma.$transaction(async (tx) => {
      const orgName = data.organizationName?.trim() || `${data.fullName}'s Pharmacy`;
      const licNum = data.licenseNumber?.trim() || `LIC-${Date.now().toString().slice(-6)}`;

      const user = await tx.user.create({
        data: {
          email,
          phone,
          passwordHash,
          role: data.role || 'PATIENT',
          fullName: data.fullName,
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
          isEmailVerified: Boolean(email),
          isPhoneVerified: Boolean(phone),
        },
      });

      const donor = await tx.donor.create({
        data: {
          userId: user.id,
          fullName: data.fullName,
          phone: phone || '+1 (555) 000-0000',
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

      const pharmacy = await tx.pharmacy.create({
        data: {
          userId: user.id,
          organizationName: orgName,
          licenseNumber: licNum,
          city: data.city || null,
          address: data.address || 'New York, NY',
          latitude: data.latitude ?? 40.7128,
          longitude: data.longitude ?? -74.006,
          phone: phone || '+1 (555) 000-0000',
          email: email || `${user.id}@medshare.local`,
          isVerified: false,
          verificationStatus: 'PENDING',
        },
      });

      await tx.notification.create({
        data: {
          userId: user.id,
          title: 'Welcome to MedShare',
          message:
            'Your unified account is active with instant access to Emergency Blood Requests, Donor Hub, and Medicine Redistribution.',
          type: 'SYSTEM',
        },
      });

      return { ...user, donor, pharmacy };
    });

    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      phone: newUser.phone,
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
          phone: newUser.phone,
          role: newUser.role,
          isVerified: newUser.isVerified,
          fullName: newUser.fullName,
          bloodGroup: newUser.bloodGroup,
          city: newUser.city,
          address: newUser.address,
          latitude: newUser.latitude,
          longitude: newUser.longitude,
          isAvailable: newUser.isAvailable,
          lastDonationDate: newUser.lastDonationDate,
          organizationName: newUser.organizationName,
          licenseNumber: newUser.licenseNumber,
          donor: newUser.donor,
          pharmacy: newUser.pharmacy,
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
            email: u.email || `${u.id}@medshare.local`,
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
