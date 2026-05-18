import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/config/database';
import Settings from '@/models/Settings';
import { authenticate, authorize, AuthenticatedRequest } from '@/middleware/auth';
import { errorResponse, successResponse, formatErrorMessage } from '@/utils/response';
import { auditLog } from '@/utils/audit';
import logger from '@/utils/logger';
import { ApiResponse } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    await dbConnect();

    if (!(await authenticate(req as AuthenticatedRequest, res))) {
      return;
    }

    switch (req.method) {
      case 'GET':
        return handleGetSettings(req, res);
      case 'PATCH':
        return handleUpdateSettings(req as AuthenticatedRequest, res);
      default:
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Settings operation failed',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleGetSettings(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    // findOne or create default settings
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }

    const { response, statusCode } = successResponse('Settings fetched successfully', settings);
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to fetch settings',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleUpdateSettings(req: AuthenticatedRequest, res: NextApiResponse<ApiResponse>) {
  try {
    // Only admin can update settings
    if (!(await authorize(['admin'])(req, res))) {
      return;
    }

    const before = await Settings.findOne();

    // Find existing settings or create a new document
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create(req.body);
    } else {
      Object.assign(settings, req.body);
      await settings.save();
    }

    // Audit log
    await auditLog({
      userId: req.userId!,
      action: 'UPDATE_SETTINGS',
      module: 'settings',
      changes: { before: before?.toObject(), after: settings.toObject() },
    });

    logger.info({ userId: req.userId }, 'Settings updated');

    const { response, statusCode } = successResponse('Settings updated successfully', settings);
    return res.status(statusCode).json(response);
  } catch (error) {
    logger.error({ err: error }, 'Failed to update settings');
    const { response, statusCode } = errorResponse(
      'Failed to update settings',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}
