import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/config/database';
import { authenticate, authorize, AuthenticatedRequest } from '@/middleware/auth';
import { errorResponse, successResponse, formatErrorMessage } from '@/utils/response';
import { auditLog } from '@/utils/audit';
import { exportData, createExportRecord } from '@/utils/dataManagement';
import { initializeScheduler, scheduleJob } from '@/utils/cronManager';
import ScheduledJob from '@/models/ScheduledJob';
import logger from '@/utils/logger';
import { ApiResponse } from '@/types';

initializeScheduler().catch((error) => {
  logger.error({ err: error }, 'Failed to initialize scheduler');
});

export default async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    await dbConnect();

    if (!(await authenticate(req as AuthenticatedRequest, res))) {
      return;
    }

    switch (req.method) {
      case 'GET':
        return handleExportNow(req as AuthenticatedRequest, res);
      case 'POST':
        return handleScheduleExport(req as AuthenticatedRequest, res);
      default:
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Export operation failed',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleExportNow(req: AuthenticatedRequest, res: NextApiResponse<any>) {
  if (!(await authorize(['admin'])(req, res))) {
    return;
  }

  try {
    const moduleName = String(req.query.module || '');
    const format = String(req.query.format || 'json') as any;
    const storageProvider = String(req.query.storageProvider || 'local') as any;
    const driveEmail = req.query.driveEmail ? String(req.query.driveEmail).trim() : undefined;
    if (!moduleName) {
      return res.status(400).json({ success: false, message: 'Module is required for export' });
    }

    const filters: any = {};
    if (req.query.fromDate) filters.fromDate = req.query.fromDate;
    if (req.query.toDate) filters.toDate = req.query.toDate;
    if (req.query.role) filters.role = req.query.role;

    const exportResult = await exportData(moduleName, format, filters);
    await createExportRecord({
      module: moduleName,
      format,
      filters,
      storageProvider,
      driveEmail,
      fileName: exportResult.fileName,
      buffer: exportResult.buffer,
      userId: req.userId!,
      userEmail: req.userEmail,
      notes: 'Instant export',
    });

    res.setHeader('Content-Type', exportResult.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportResult.fileName}"`);
    res.status(200).send(exportResult.buffer);
  } catch (error) {
    logger.error({ err: error }, 'Export failed');
    const { response, statusCode } = errorResponse(
      'Failed to export data',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleScheduleExport(req: AuthenticatedRequest, res: NextApiResponse<ApiResponse>) {
  if (!(await authorize(['admin'])(req, res))) {
    return;
  }

  try {
    const body = req.body as any;
    const scheduleType = body.scheduleType || 'cron';
    const scheduleValue = body.scheduleValue;
    const timezone = body.timezone || 'UTC';
    const isRecurring = body.isRecurring !== false;
    const moduleName = body.module;
    const format = body.format || 'json';
    const filters = body.filters || {};
    const storageProvider = body.storageProvider || 'local';
    const driveEmail = body.driveEmail ? String(body.driveEmail).trim() : undefined;
    const notes = body.notes;

    if (!moduleName || !scheduleValue) {
      return res
        .status(400)
        .json({ success: false, message: 'module and scheduleValue are required' });
    }

    const job = await ScheduledJob.create({
      name: `Export ${moduleName} ${format}`,
      type: 'export',
      payload: { module: moduleName, format, filters, storageProvider, driveEmail },
      scheduleType,
      scheduleValue,
      timezone,
      isRecurring,
      status: 'pending',
      createdBy: req.userId!,
      createdByEmail: req.userEmail,
    });

    await scheduleJob(job);

    await auditLog({
      userId: req.userId!,
      action: 'SCHEDULE_EXPORT',
      module: 'settings',
      userEmail: req.userEmail,
      notes: `Scheduled export job ${job._id}`,
      status: 'success',
    });

    const { response, statusCode } = successResponse('Export job scheduled successfully', job);
    return res.status(statusCode).json(response);
  } catch (error) {
    logger.error({ err: error }, 'Failed to schedule export');
    const { response, statusCode } = errorResponse(
      'Failed to schedule export',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}
