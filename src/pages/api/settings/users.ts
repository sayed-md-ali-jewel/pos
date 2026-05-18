import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/config/database';
import User from '@/models/User';
import { authenticate, authorize, AuthenticatedRequest } from '@/middleware/auth';
import { errorResponse, successResponse, formatErrorMessage } from '@/utils/response';
import { hashPassword } from '@/utils/password';
import { ApiResponse } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    await dbConnect();

    if (!(await authenticate(req as AuthenticatedRequest, res))) return;
    if (!(await authorize(['admin'])(req as AuthenticatedRequest, res))) return;

    switch (req.method) {
      case 'GET':
        return handleGetUsers(req, res);
      case 'POST':
        return handleCreateUser(req as AuthenticatedRequest, res);
      case 'PATCH':
        return handleUpdateUser(req as AuthenticatedRequest, res);
      case 'DELETE':
        return handleDeleteUser(req as AuthenticatedRequest, res);
      default:
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'User settings operation failed',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleGetUsers(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const users = await User.find({}, '-password').sort({ role: 1, firstName: 1 });
    const { response, statusCode } = successResponse('Users fetched successfully', users);
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to fetch users',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleCreateUser(req: AuthenticatedRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const { email, password, firstName, lastName, role = 'cashier', isActive = true } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res
        .status(400)
        .json(
          errorResponse('Email, password, first name, and last name are required', undefined, 400)
            .response
        );
    }

    if (!['admin', 'manager', 'cashier'].includes(role)) {
      return res.status(400).json(errorResponse('Invalid role', undefined, 400).response);
    }

    const existing = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (existing) {
      return res.status(400).json(errorResponse('User already exists', undefined, 400).response);
    }

    const created = await User.create({
      email: String(email).toLowerCase().trim(),
      password: await hashPassword(password),
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      role,
      isActive: Boolean(isActive),
    });

    const user = await User.findById(created._id).select('-password');
    const { response, statusCode } = successResponse('User created successfully', user);
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to create user',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleUpdateUser(req: AuthenticatedRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const { userId, email, password, firstName, lastName, role, isActive } = req.body;

    if (!userId) {
      return res.status(400).json(errorResponse('userId is required', undefined, 400).response);
    }

    const current = await User.findById(userId);
    if (!current) {
      return res.status(404).json(errorResponse('User not found', undefined, 404).response);
    }

    const isSelf = userId === req.userId;

    if (isSelf && isActive === false) {
      return res
        .status(400)
        .json(errorResponse('You cannot deactivate your own account', undefined, 400).response);
    }

    if (role && !['admin', 'manager', 'cashier'].includes(role)) {
      return res.status(400).json(errorResponse('Invalid role', undefined, 400).response);
    }

    if (isSelf && role && role !== 'admin') {
      return res
        .status(400)
        .json(errorResponse('You cannot change your own admin role', undefined, 400).response);
    }

    if (current.role === 'admin' && role && role !== 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin', isActive: true });
      if (adminCount <= 1) {
        return res
          .status(400)
          .json(errorResponse('At least one active admin is required', undefined, 400).response);
      }
    }

    if (current.role === 'admin' && isActive === false) {
      const adminCount = await User.countDocuments({ role: 'admin', isActive: true });
      if (adminCount <= 1) {
        return res
          .status(400)
          .json(errorResponse('At least one active admin is required', undefined, 400).response);
      }
    }

    if (email) {
      const normalizedEmail = String(email).toLowerCase().trim();
      const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: userId } });
      if (existing) {
        return res.status(400).json(errorResponse('Email already exists', undefined, 400).response);
      }
      current.email = normalizedEmail;
    }

    if (firstName !== undefined) current.firstName = String(firstName).trim();
    if (lastName !== undefined) current.lastName = String(lastName).trim();
    if (role) current.role = role;
    if (isActive !== undefined) current.isActive = Boolean(isActive);
    if (password) current.password = await hashPassword(password);

    await current.save();

    const updated = await User.findById(userId).select('-password');
    const { response, statusCode } = successResponse('User updated successfully', updated);
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to update user',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleDeleteUser(req: AuthenticatedRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const { userId } = req.query;

    if (!userId || Array.isArray(userId)) {
      return res.status(400).json(errorResponse('userId is required', undefined, 400).response);
    }

    if (userId === req.userId) {
      return res
        .status(400)
        .json(errorResponse('You cannot delete your own account', undefined, 400).response);
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json(errorResponse('User not found', undefined, 404).response);
    }

    if (user.role === 'admin' && user.isActive) {
      const adminCount = await User.countDocuments({ role: 'admin', isActive: true });
      if (adminCount <= 1) {
        return res
          .status(400)
          .json(errorResponse('At least one active admin is required', undefined, 400).response);
      }
    }

    await User.findByIdAndDelete(userId);

    const { response, statusCode } = successResponse('User deleted successfully', { userId });
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to delete user',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}
