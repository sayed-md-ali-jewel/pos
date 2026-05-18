import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/config/database';
import WarrantyRepair from '@/models/WarrantyRepair';
import User from '@/models/User';
import { AuthenticatedRequest, authenticate } from '@/middleware/auth';
import { errorResponse, successResponse, formatErrorMessage } from '@/utils/response';
import { ApiResponse } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    await dbConnect();

    if (!(await authenticate(req as AuthenticatedRequest, res))) {
      return;
    }

    const {
      query: { id },
      method,
    } = req;

    if (typeof id !== 'string') {
      return res
        .status(400)
        .json(errorResponse('Invalid request', 'Invalid warranty request ID', 400).response);
    }

    switch (method) {
      case 'GET':
        return handleGetRequest(req, res, id);
      case 'PUT':
      case 'PATCH':
        return handleUpdateRequest(req as AuthenticatedRequest, res, id);
      default:
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Warranty request detail error:', error);
    const { response, statusCode } = errorResponse(
      'Warranty request detail operation failed',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleGetRequest(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  id: string
) {
  try {
    const request = await WarrantyRepair.findById(id).lean();
    if (!request) {
      return res
        .status(404)
        .json(errorResponse('Warranty request not found', undefined, 404).response);
    }

    const { response, statusCode } = successResponse(
      'Warranty request fetched successfully',
      request
    );
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to fetch warranty request',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleUpdateRequest(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse>,
  id: string
) {
  try {
    const { status, note, sendToSupplier, supplierId, supplierName, purchaseNumber } = req.body;

    const request = await WarrantyRepair.findById(id);
    if (!request) {
      return res
        .status(404)
        .json(errorResponse('Warranty request not found', undefined, 404).response);
    }

    const user = req.userId
      ? await User.findById(req.userId).select('firstName lastName role')
      : null;
    const performer = {
      id: req.userId,
      name: user ? `${user.firstName} ${user.lastName}` : 'System',
      role: user?.role || req.userRole || 'staff',
    };

    const historyNote = note || (status ? `Status moved to ${status}` : 'Updated repair request');
    if (status && status !== request.status) {
      request.status = status;
      request.history.push({
        status,
        note: historyNote,
        performedBy: performer,
      });
    } else if (note) {
      request.history.push({
        status: request.status,
        note,
        performedBy: performer,
      });
    }

    if (sendToSupplier) {
      request.sendToSupplier = {
        ...request.sendToSupplier,
        ...sendToSupplier,
      };
    }

    if (supplierId) {
      request.supplierId = supplierId;
      request.supplierName = supplierName || request.supplierName;
    }
    if (purchaseNumber) {
      request.purchaseNumber = purchaseNumber;
    }

    request.updatedBy = req.userId;
    await request.save();

    const { response, statusCode } = successResponse(
      'Warranty request updated successfully',
      request
    );
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to update warranty request',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}
