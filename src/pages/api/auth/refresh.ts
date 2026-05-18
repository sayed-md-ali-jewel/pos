import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/config/database';
import User from '@/models/User';
import RefreshToken from '@/models/RefreshToken';
import { generateAccessToken, generateRefreshToken, verifyToken } from '@/utils/jwt';
import { errorResponse, successResponse } from '@/utils/response';
import logger from '@/utils/logger';
import { ApiResponse } from '@/types';

const REFRESH_TOKEN_TTL_DAYS = 30;

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    await dbConnect();

    const { refreshToken } = req.body;

    if (!refreshToken || typeof refreshToken !== 'string') {
      return res
        .status(400)
        .json(errorResponse('refreshToken is required', undefined, 400).response);
    }

    // Find the refresh token record in DB
    const tokenRecord = await RefreshToken.findOne({ token: refreshToken, isRevoked: false });

    if (!tokenRecord) {
      logger.warn(
        { refreshToken: refreshToken.slice(0, 8) },
        'Invalid or already-used refresh token'
      );
      return res
        .status(401)
        .json(
          errorResponse('Invalid or expired refresh token. Please log in again.', undefined, 401)
            .response
        );
    }

    // Check expiry
    if (tokenRecord.expiresAt < new Date()) {
      await RefreshToken.findByIdAndUpdate(tokenRecord._id, { isRevoked: true });
      return res
        .status(401)
        .json(
          errorResponse('Refresh token expired. Please log in again.', undefined, 401).response
        );
    }

    // Fetch the user
    const user = await User.findById(tokenRecord.userId);
    if (!user || !user.isActive) {
      return res
        .status(401)
        .json(errorResponse('User not found or inactive.', undefined, 401).response);
    }

    // ── Rotation: Revoke old token, issue new one ──────────────────────────
    const newRefreshToken = generateRefreshToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

    // Revoke old token and link to new one (for audit trail)
    await RefreshToken.findByIdAndUpdate(tokenRecord._id, {
      isRevoked: true,
      replacedByToken: newRefreshToken,
    });

    // Save new refresh token
    await RefreshToken.create({
      userId: user._id,
      token: newRefreshToken,
      expiresAt,
      ipAddress: req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    // Issue new access token
    const accessToken = generateAccessToken(user);

    logger.info({ userId: user._id }, 'Refresh token rotated');

    const { response, statusCode } = successResponse('Token refreshed', {
      accessToken,
      refreshToken: newRefreshToken,
      user: user.toJSON(),
    });
    return res.status(statusCode).json(response);
  } catch (error) {
    logger.error({ err: error }, 'Token refresh error');
    return res.status(500).json(errorResponse('Token refresh failed', undefined, 500).response);
  }
}
