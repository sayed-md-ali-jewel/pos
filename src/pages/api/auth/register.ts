import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/config/database';
import User from '@/models/User';
import { hashPassword } from '@/utils/password';
import { generateToken } from '@/utils/jwt';
import { validateInput, registerSchema } from '@/utils/validation';
import { errorResponse, successResponse, formatErrorMessage } from '@/utils/response';
import { ApiResponse } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  }

  try {
    await dbConnect();

    // Validate input
    const { isValid, messages, value } = validateInput(registerSchema, req.body);
    if (!isValid) {
      const { response, statusCode } = errorResponse(
        'Validation failed',
        messages?.join(', '),
        400
      );
      return res.status(statusCode).json(response);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: value.email });
    if (existingUser) {
      const { response, statusCode } = errorResponse('User already exists', undefined, 400);
      return res.status(statusCode).json(response);
    }

    // Hash password
    const hashedPassword = await hashPassword(value.password);

    // Create user
    const user = await User.create({
      email: value.email,
      password: hashedPassword,
      firstName: value.firstName,
      lastName: value.lastName,
      role: value.role,
      branchId: value.branchId || undefined,
      branchRoles: value.branchRoles || [],
    });

    // Generate token
    const token = generateToken(user);

    const { response, statusCode } = successResponse('Registration successful', {
      token,
      user: user.toJSON(),
    });
    return res.status(statusCode).json(response);
  } catch (error) {
    console.error('Registration error:', error);
    const { response, statusCode } = errorResponse(
      'Registration failed',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}
