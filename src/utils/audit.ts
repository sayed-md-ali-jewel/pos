import AuditLog from '@/models/AuditLog';
import logger from '@/utils/logger';

interface AuditOptions {
  userId: string;
  userEmail?: string;
  action: string;
  module:
    | 'sale'
    | 'product'
    | 'customer'
    | 'supplier'
    | 'purchase'
    | 'user'
    | 'settings'
    | 'inventory'
    | 'auth';
  targetId?: string;
  targetModel?: string;
  changes?: { before?: any; after?: any };
  ipAddress?: string;
  userAgent?: string;
  status?: 'success' | 'failure';
  notes?: string;
}

/**
 * Write an immutable audit log entry.
 * Fire-and-forget (non-blocking) — errors are logged but never thrown to the caller.
 */
export async function auditLog(options: AuditOptions): Promise<void> {
  try {
    await AuditLog.create(options);
  } catch (err) {
    // Audit logging must never break the main business logic
    logger.error({ err, auditOptions: options }, 'Failed to write audit log');
  }
}

/**
 * Create a middleware-style audit wrapper for API routes.
 * Use this to log settings changes, user role updates, etc.
 */
export function createAuditEntry(
  userId: string,
  action: string,
  module: AuditOptions['module'],
  extra?: Partial<AuditOptions>
) {
  return auditLog({ userId, action, module, ...extra });
}
