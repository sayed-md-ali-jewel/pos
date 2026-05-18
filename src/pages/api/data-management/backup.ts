import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/config/database';
import { authenticate, authorize, AuthenticatedRequest } from '@/middleware/auth';
import { errorResponse, successResponse, formatErrorMessage } from '@/utils/response';
import { auditLog } from '@/utils/audit';
import { createBackup, listBackups } from '@/utils/dataManagement';
import { initializeScheduler } from '@/utils/cronManager';
import logger from '@/utils/logger';
import { ApiResponse } from '@/types';

initializeScheduler().catch((error) => {
  logger.error({ err: error }, 'Failed to initialize scheduler');
});

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    await dbConnect();

    if (!(await authenticate(req as AuthenticatedRequest, res))) {
      return;
    }

    switch (req.method) {
      case 'GET':
        return handleListBackups(req as AuthenticatedRequest, res);
      case 'POST':
        return handleCreateBackup(req as AuthenticatedRequest, res);
      default:
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Backup operation failed',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleListBackups(req: AuthenticatedRequest, res: NextApiResponse<ApiResponse>) {
  if (!(await authorize(['admin'])(req, res))) {
    return;
  }

  try {
    const filters: any = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.module) filters.module = req.query.module;
    if (req.query.userId) filters.userId = req.query.userId;

    const backups = await listBackups(filters);
    const { response, statusCode } = successResponse('Backup history loaded successfully', backups);
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to list backups',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleCreateBackup(req: AuthenticatedRequest, res: NextApiResponse<ApiResponse>) {
  if (!(await authorize(['admin'])(req, res))) {
    return;
  }

  try {
    const body = req.body as any;
    const modules = body.modules || 'all';
    const format = body.format || 'json';
    const storageProvider = body.storageProvider || 'local';
    const destinationPath = body.destinationPath ? String(body.destinationPath).trim() : undefined;
    const driveEmail = body.driveEmail ? String(body.driveEmail).trim() : undefined;
    const encrypt = Boolean(body.encrypt);
    const notes = body.notes;

    const { backupLog } = await createBackup({
      modules,
      format,
      encrypt,
      storageProvider,
      destinationPath,
      driveEmail,
      type: 'manual',
      userId: req.userId!,
      userEmail: req.userEmail,
      notes,
    });

    await auditLog({
      userId: req.userId!,
      action: 'MANUAL_BACKUP',
      module: 'settings',
      userEmail: req.userEmail,
      notes: `Created backup for modules: ${JSON.stringify(modules)}`,
      status: 'success',
    });

    const { response, statusCode } = successResponse('Backup created successfully', backupLog);
    return res.status(statusCode).json(response);
  } catch (error) {
    logger.error({ err: error }, 'Backup creation failed');
    const { response, statusCode } = errorResponse(
      'Failed to create backup',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}
