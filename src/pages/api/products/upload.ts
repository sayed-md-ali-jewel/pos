import type { NextApiRequest, NextApiResponse } from 'next';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate } from '@/middleware/auth';
import { errorResponse, successResponse } from '@/utils/response';
import { ApiResponse } from '@/types';

// Ensure upload dir exists
const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `product-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
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

// Support up to 5 images at once
const uploadMiddleware = upload.array('images', 5);

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
    await runMiddleware(req, res, uploadMiddleware);

    const files = (req as any).files as Express.Multer.File[];
    if (!files || files.length === 0) {
      const { response, statusCode } = errorResponse('No image files provided', undefined, 400);
      return res.status(statusCode).json(response);
    }

    const imageUrls = files.map((file) => `/uploads/products/${file.filename}`);
    const { response, statusCode } = successResponse('Images uploaded successfully', {
      imageUrls,
      // Convenience: first image URL
      imageUrl: imageUrls[0],
    });
    return res.status(statusCode).json(response);
  } catch (error: any) {
    const { response, statusCode } = errorResponse(
      error.message || 'Image upload failed',
      undefined,
      400
    );
    return res.status(statusCode).json(response);
  }
}
