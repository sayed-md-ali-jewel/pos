import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '@/types';

/** Short-lived access token (15 minutes) */
export const generateAccessToken = (user: User): string => {
  return jwt.sign(
    {
      _id: user._id,
      email: user.email,
      role: user.role,
      branchId: (user as any).branchId,
      branchRoles: (user as any).branchRoles,
    },
    process.env.JWT_SECRET!,
    {
      expiresIn: '15m',
    }
  );
};

/** Opaque refresh token — stored in DB, rotated on each use */
export const generateRefreshToken = (): string => {
  return crypto.randomBytes(64).toString('hex');
};

/** Legacy access token (for backward-compatibility during migration) */
export const generateToken = (user: User): string => {
  return jwt.sign(
    {
      _id: user._id,
      email: user.email,
      role: user.role,
      branchId: (user as any).branchId,
      branchRoles: (user as any).branchRoles,
    },
    process.env.JWT_SECRET!,
    {
      expiresIn: process.env.JWT_EXPIRE || '7d',
    }
  );
};

export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

export const decodeToken = (token: string): any => {
  return jwt.decode(token);
};
