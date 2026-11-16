import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { AuthenticatedUser, UserRole } from '../types';
import { prisma } from '../db/prisma';

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required. No Bearer token provided.' },
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as {
      id: string;
      email: string;
      role: UserRole;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        donor: { select: { id: true, verificationStatus: true } },
        pharmacy: { select: { id: true, verificationStatus: true } },
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'User belonging to this token no longer exists.' },
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      donorId: user.donor?.id,
      pharmacyId: user.pharmacy?.id,
    };

    next();
  } catch (error: any) {
    return res.status(401).json({
      success: false,
      error: { message: 'Invalid or expired authentication token.' },
    });
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Unauthorized. Please log in.' },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          message: `Access denied. Requires one of [${allowedRoles.join(', ')}] roles. Your role is ${req.user.role}.`,
        },
      });
    }

    next();
  };
}
