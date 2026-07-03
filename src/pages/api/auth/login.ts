import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/config/database';
import User from '@/models/User';
import { comparePassword } from '@/utils/password';
import { generateToken } from '@/utils/jwt';
import { validateInput, loginSchema } from '@/utils/validation';
import { errorResponse, successResponse, formatErrorMessage } from '@/utils/response';
import { checkLoginLimit, resetLoginLimit } from '@/middleware/rateLimiter';
import logger from '@/utils/logger';
import { ApiResponse } from '@/types';

const isDatabaseConnectionError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes('Password contains unescaped characters') ||
    message.includes('MongoParseError') ||
    message.includes('Database connection failed')
  );
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  }

  try {
    await dbConnect();

    // ── Brute-Force Protection ─────────────────────────────────────────────
    if (!(await checkLoginLimit(req, res))) return;

    // Validate input
    const { isValid, messages, value } = validateInput(loginSchema, req.body);
    if (!isValid) {
      const { response, statusCode } = errorResponse(
        'Validation failed',
        messages?.join(', '),
        400
      );
      return res.status(statusCode).json(response);
    }

    // Find user
    const user = await User.findOne({ email: value.email });
    if (!user || !user.isActive) {
      logger.warn({ email: value.email }, 'Failed login attempt — user not found or inactive');
      const { response, statusCode } = errorResponse('Invalid credentials', undefined, 401);
      return res.status(statusCode).json(response);
    }

    // Check password
    const isPasswordValid = await comparePassword(value.password, user.password);
    if (!isPasswordValid) {
      logger.warn({ email: value.email }, 'Failed login attempt — wrong password');
      const { response, statusCode } = errorResponse('Invalid credentials', undefined, 401);
      return res.status(statusCode).json(response);
    }

    // ── Reset brute-force counter on successful login ──────────────────────
    await resetLoginLimit(req);

    // Generate token
    const token = generateToken(user);

    logger.info({ userId: user._id, role: user.role }, 'User logged in');

    const { response, statusCode } = successResponse('Login successful', {
      token,
      user: user.toJSON(),
    });
    return res.status(statusCode).json(response);
  } catch (error) {
    logger.error({ err: error }, 'Login error');

    const { response, statusCode } = isDatabaseConnectionError(error)
      ? errorResponse('Login failed', 'Database connection is not configured correctly')
      : errorResponse('Login failed', formatErrorMessage(error));

    return res.status(statusCode).json(response);
  }
}
