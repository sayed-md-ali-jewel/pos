import cron from 'node-cron';
import { zonedTimeToUtc } from 'date-fns-tz';
import dbConnect from '@/config/database';
import ScheduledJob from '@/models/ScheduledJob';
import {
  createBackup,
  createExportRecord,
  exportData,
  importFromFilePath,
  resolveCronExpression,
} from '@/utils/dataManagement';
import logger from '@/utils/logger';

const activeTasks: Map<string, cron.ScheduledTask | NodeJS.Timeout> = new Map();

async function clearTask(jobId: string) {
  const task = activeTasks.get(jobId);
  if (!task) {
    return;
  }
  if ('stop' in task) {
    task.stop();
  } else {
    clearTimeout(task);
  }
  activeTasks.delete(jobId);
}

function nextExecutionForOnce(scheduleValue: string, timezone: string): Date {
  return zonedTimeToUtc(scheduleValue, timezone);
}

async function executeJob(job: any) {
  logger.info({ jobId: job._id, type: job.type }, 'Executing scheduled job');
  job.status = 'running';
  job.errorMessage = undefined;
  await job.save();

  try {
    let result: any;

    if (job.type === 'backup') {
      const modules = job.payload.modules || 'all';
      const format = job.payload.format || 'json';
      result = await createBackup({
        modules,
        format,
        encrypt: job.payload.encrypt || false,
        storageProvider: job.payload.storageProvider || 'local',
        destinationPath: job.payload.destinationPath,
        driveEmail: job.payload.driveEmail,
        type: 'auto',
        userId: job.createdBy.toString(),
        userEmail: job.createdByEmail,
        filters: job.payload.filters || {},
      });
    } else if (job.type === 'export') {
      const moduleName = job.payload.module;
      const exportResult = await exportData(
        moduleName,
        job.payload.format || 'json',
        job.payload.filters || {}
      );
      const exportLog = await createExportRecord({
        module: moduleName,
        format: job.payload.format || 'json',
        filters: job.payload.filters || {},
        storageProvider: job.payload.storageProvider || 'local',
        driveEmail: job.payload.driveEmail,
        fileName: exportResult.fileName,
        buffer: exportResult.buffer,
        userId: job.createdBy.toString(),
        userEmail: job.createdByEmail,
        notes: 'Scheduled export',
      });
      result = { fileName: exportResult.fileName, exportLog };
    } else if (job.type === 'import') {
      if (!job.payload.sourceFilePath) {
        throw new Error('Import job payload must include sourceFilePath.');
      }
      result = await importFromFilePath(
        job.payload.sourceFilePath,
        job.payload.module,
        job.payload.strategy || 'merge',
        job.createdBy.toString(),
        job.createdByEmail
      );
    } else {
      throw new Error(`Unsupported scheduled job type: ${job.type}`);
    }

    job.status = 'success';
    job.lastRunAt = new Date();
    job.result = result;
    job.errorMessage = undefined;
    if (!job.isRecurring) {
      job.nextRunAt = undefined;
    }
    await job.save();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Scheduled job failed';
    logger.error({ err: error, jobId: job._id }, 'Scheduled job failed');
    job.status = 'failed';
    job.lastRunAt = new Date();
    job.errorMessage = message;
    await job.save();
  }
}

async function scheduleCronJob(job: any) {
  const expression = await resolveCronExpression(job.scheduleValue);
  const task = cron.schedule(
    expression,
    async () => {
      await executeJob(job);
    },
    { timezone: job.timezone || 'UTC' }
  );
  activeTasks.set(job._id.toString(), task);
  logger.info({ jobId: job._id, expression }, 'Scheduled cron job');
}

async function scheduleOnceJob(job: any) {
  const runAt = nextExecutionForOnce(job.scheduleValue, job.timezone || 'UTC');
  const milliseconds = runAt.getTime() - Date.now();
  if (milliseconds <= 0) {
    await executeJob(job);
    return;
  }

  const timeout = setTimeout(async () => {
    await executeJob(job);
    activeTasks.delete(job._id.toString());
  }, milliseconds);

  activeTasks.set(job._id.toString(), timeout);
  logger.info({ jobId: job._id, runAt }, 'Scheduled one-time job');
}

export async function initializeScheduler() {
  await dbConnect();
  const jobs = await ScheduledJob.find({
    $or: [
      { scheduleType: 'cron', status: { $in: ['pending', 'success', 'failed'] } },
      { scheduleType: 'once', status: 'pending' },
    ],
  });

  for (const job of jobs) {
    await scheduleJob(job);
  }
}

export async function scheduleJob(job: any) {
  await clearTask(job._id.toString());

  if (job.scheduleType === 'cron') {
    await scheduleCronJob(job);
    return;
  }

  if (job.scheduleType === 'once') {
    await scheduleOnceJob(job);
    return;
  }
}

export async function runJobNow(jobId: string) {
  await dbConnect();
  const job = await ScheduledJob.findById(jobId);
  if (!job) {
    throw new Error('Job not found');
  }
  await executeJob(job);
  return job;
}

export async function stopScheduledJob(jobId: string) {
  await clearTask(jobId);
}

export async function refreshScheduler() {
  const jobs = await ScheduledJob.find({ status: { $in: ['pending', 'success', 'failed'] } });
  for (const job of jobs) {
    await scheduleJob(job);
  }
}
