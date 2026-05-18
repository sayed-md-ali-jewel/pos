import type { NextApiRequest, NextApiResponse } from 'next';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate } from '@/middleware/auth';
import { errorResponse, successResponse } from '@/utils/response';
import { ApiResponse } from '@/types';

// Ensure upload dir exists
const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'customers');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, and WebP images are allowed'));
    }
  },
});

export const config = {
  api: { bodyParser: false },
};

function runMiddleware(req: any, res: any, fn: Function) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  if (!(await authenticate(req as any, res))) return;

  try {
    await runMiddleware(req, res, upload.single('avatar'));

    const file = (req as any).file;
    if (!file) {
      const { response, statusCode } = errorResponse('No image file provided', undefined, 400);
      return res.status(statusCode).json(response);
    }

    const avatarUrl = `/uploads/customers/${file.filename}`;
    const { response, statusCode } = successResponse('Avatar uploaded successfully', { avatarUrl });
    return res.status(statusCode).json(response);
  } catch (error: any) {
    const { response, statusCode } = errorResponse(
      error.message || 'Avatar upload failed',
      undefined,
      400
    );
    return res.status(statusCode).json(response);
  }
}
