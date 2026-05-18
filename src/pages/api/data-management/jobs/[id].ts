import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/config/database';
import ScheduledJob from '@/models/ScheduledJob';
import { authenticate, authorize, AuthenticatedRequest } from '@/middleware/auth';
import { errorResponse, successResponse, formatErrorMessage } from '@/utils/response';
import { runJobNow, stopScheduledJob } from '@/utils/cronManager';
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
        return handleGetJob(req as AuthenticatedRequest, res);
      case 'PATCH':
        return handleUpdateJob(req as AuthenticatedRequest, res);
      case 'DELETE':
        return handleDeleteJob(req as AuthenticatedRequest, res);
      default:
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Job detail operation failed',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleGetJob(req: AuthenticatedRequest, res: NextApiResponse<ApiResponse>) {
  if (!(await authorize(['admin'])(req, res))) {
    return;
  }

  try {
    const job = await ScheduledJob.findById(req.query.id).lean();
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const { response, statusCode } = successResponse('Scheduled job loaded successfully', job);
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to load scheduled job',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleUpdateJob(req: AuthenticatedRequest, res: NextApiResponse<ApiResponse>) {
  if (!(await authorize(['admin'])(req, res))) {
    return;
  }

  try {
    const job = await ScheduledJob.findById(req.query.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const body = req.body as any;
    if (body.action === 'runNow') {
      await runJobNow(job._id.toString());
      const { response, statusCode } = successResponse('Scheduled job executed immediately', job);
      return res.status(statusCode).json(response);
    }

    if (body.action === 'disable') {
      await stopScheduledJob(job._id.toString());
      job.status = 'pending';
      await job.save();
      const { response, statusCode } = successResponse('Scheduled job disabled', job);
      return res.status(statusCode).json(response);
    }

    if (body.scheduleType) job.scheduleType = body.scheduleType;
    if (body.scheduleValue) job.scheduleValue = body.scheduleValue;
    if (body.timezone) job.timezone = body.timezone;
    if (typeof body.isRecurring !== 'undefined') job.isRecurring = Boolean(body.isRecurring);
    await job.save();

    const { response, statusCode } = successResponse('Scheduled job updated', job);
    return res.status(statusCode).json(response);
  } catch (error) {
    logger.error({ err: error }, 'Failed to update scheduled job');
    const { response, statusCode } = errorResponse(
      'Failed to update scheduled job',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleDeleteJob(req: AuthenticatedRequest, res: NextApiResponse<ApiResponse>) {
  if (!(await authorize(['admin'])(req, res))) {
    return;
  }

  try {
    const job = await ScheduledJob.findById(req.query.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    await stopScheduledJob(job._id.toString());
    await job.remove();

    await auditLog({
      userId: req.userId!,
      action: 'DELETE_SCHEDULED_JOB',
      module: 'settings',
      userEmail: req.userEmail,
      notes: `Deleted scheduled job ${job._id}`,
      status: 'success',
    });

    const { response, statusCode } = successResponse('Scheduled job deleted', { id: job._id });
    return res.status(statusCode).json(response);
  } catch (error) {
    logger.error({ err: error }, 'Failed to delete scheduled job');
    const { response, statusCode } = errorResponse(
      'Failed to delete scheduled job',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}
