import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/config/database';
import ScheduledJob from '@/models/ScheduledJob';
import { authenticate, authorize, AuthenticatedRequest } from '@/middleware/auth';
import { initializeScheduler, scheduleJob } from '@/utils/cronManager';
import { errorResponse, successResponse, formatErrorMessage } from '@/utils/response';
import { auditLog } from '@/utils/audit';
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
        return handleListJobs(req as AuthenticatedRequest, res);
      case 'POST':
        return handleCreateJob(req as AuthenticatedRequest, res);
      default:
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Job operation failed',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleListJobs(req: AuthenticatedRequest, res: NextApiResponse<ApiResponse>) {
  if (!(await authorize(['admin'])(req, res))) {
    return;
  }

  try {
    const filters: any = {};
    if (req.query.type) filters.type = req.query.type;
    if (req.query.status) filters.status = req.query.status;

    const jobs = await ScheduledJob.find(filters).sort({ createdAt: -1 }).lean();
    const { response, statusCode } = successResponse('Scheduled jobs loaded successfully', jobs);
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to load scheduled jobs',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleCreateJob(req: AuthenticatedRequest, res: NextApiResponse<ApiResponse>) {
  if (!(await authorize(['admin'])(req, res))) {
    return;
  }

  try {
    const body = req.body as any;
    const { type, scheduleType, scheduleValue, timezone, isRecurring, payload, name } = body;
    if (!type || !scheduleType || !scheduleValue || !payload) {
      return res.status(400).json({
        success: false,
        message: 'type, scheduleType, scheduleValue, and payload are required',
      });
    }

    const job = await ScheduledJob.create({
      name: name || `Scheduled ${type}`,
      type,
      payload,
      scheduleType,
      scheduleValue,
      timezone: timezone || 'UTC',
      isRecurring: Boolean(isRecurring),
      status: 'pending',
      createdBy: req.userId!,
      createdByEmail: req.userEmail,
    });

    await scheduleJob(job);

    await auditLog({
      userId: req.userId!,
      action: 'CREATE_SCHEDULED_JOB',
      module: 'settings',
      userEmail: req.userEmail,
      notes: `Created scheduled job ${job._id}`,
      status: 'success',
    });

    const { response, statusCode } = successResponse('Scheduled job created successfully', job);
    return res.status(statusCode).json(response);
  } catch (error) {
    logger.error({ err: error }, 'Failed to create scheduled job');
    const { response, statusCode } = errorResponse(
      'Failed to create scheduled job',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}
