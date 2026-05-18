import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/utils/jwt';
import User from '@/models/User';

export interface AuthenticatedRequest extends NextApiRequest {
  userId?: string;
  userRole?: string;
  userEmail?: string;
  branchId?: string;
  branchRoles?: { branchId: string; role: string }[];
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: NextApiResponse
): Promise<boolean> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'No token provided',
      });
      return false;
    }

    const decoded = verifyToken(token);
    req.userId = decoded._id;
    req.userEmail = decoded.email;
    req.userRole = decoded.role;
    req.branchId = decoded.branchId;
    req.branchRoles = decoded.branchRoles || [];

    if (!req.branchId && req.userId) {
      const user = await User.findById(req.userId).select('branchId branchRoles role email');
      req.branchId = user?.branchId?.toString();
      req.branchRoles =
        user?.branchRoles?.map((branchRole: any) => ({
          branchId: branchRole.branchId.toString(),
          role: branchRole.role,
        })) || [];
      req.userRole = user?.role || req.userRole;
      req.userEmail = user?.email || req.userEmail;
    }

    return true;
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
    return false;
  }
};

export const authorize = (allowedRoles: string[]) => {
  return async (req: AuthenticatedRequest, res: NextApiResponse): Promise<boolean> => {
    if (!req.userRole || !allowedRoles.includes(req.userRole)) {
      res.status(403).json({
        success: false,
        message: 'Access denied',
      });
      return false;
    }
    return true;
  };
};
