import { NextApiResponse } from 'next';
import { AuthenticatedRequest } from '@/middleware/auth';
import { errorResponse } from '@/utils/response';

export const getRequestedBranchId = (req: AuthenticatedRequest): string | undefined => {
  const queryBranchId = Array.isArray(req.query.branchId)
    ? req.query.branchId[0]
    : req.query.branchId;
  const bodyBranchId = req.body?.branchId;
  const headerBranchId = req.headers['x-branch-id'];

  if (typeof headerBranchId === 'string' && headerBranchId) return headerBranchId;
  if (typeof queryBranchId === 'string' && queryBranchId) return queryBranchId;
  if (typeof bodyBranchId === 'string' && bodyBranchId) return bodyBranchId;

  return req.branchId;
};

export const getBranchFilter = (
  req: AuthenticatedRequest,
  options: { adminCanViewAll?: boolean } = {}
) => {
  if (req.userRole === 'admin') {
    const branchId = getRequestedBranchId(req);
    return branchId ? { branchId } : options.adminCanViewAll ? {} : {};
  }

  return req.branchId ? { branchId: req.branchId } : {};
};

export const resolveWriteBranchId = (
  req: AuthenticatedRequest,
  res: NextApiResponse,
  fallback?: string
): string | undefined => {
  const branchId = req.userRole === 'admin' ? getRequestedBranchId(req) || fallback : req.branchId;

  if (!branchId && req.userRole !== 'admin') {
    const { response, statusCode } = errorResponse(
      'User is not assigned to a branch',
      undefined,
      403
    );
    res.status(statusCode).json(response);
    return undefined;
  }

  return branchId;
};
