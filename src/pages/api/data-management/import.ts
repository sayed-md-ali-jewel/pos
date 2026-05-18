import type { NextApiRequest, NextApiResponse } from 'next';
import multer from 'multer';
import dbConnect from '@/config/database';
import { authenticate, authorize, AuthenticatedRequest } from '@/middleware/auth';
import { errorResponse, successResponse, formatErrorMessage } from '@/utils/response';
import { auditLog } from '@/utils/audit';
import { parseImportFile, listImports } from '@/utils/dataManagement';
import logger from '@/utils/logger';
import { ApiResponse } from '@/types';

export const config = {
  api: {
    bodyParser: false,
  },
};

const upload = multer({ storage: multer.memoryStorage() });

function runMiddleware(req: NextApiRequest, res: NextApiResponse, fn: any) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    await dbConnect();

    if (!(await authenticate(req as AuthenticatedRequest, res))) {
      return;
    }

    switch (req.method) {
      case 'GET':
        return handleListImports(req as AuthenticatedRequest, res);
      case 'POST':
        return handleImport(req as AuthenticatedRequest, res);
      default:
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Import operation failed',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleListImports(req: AuthenticatedRequest, res: NextApiResponse<ApiResponse>) {
  if (!(await authorize(['admin'])(req, res))) {
    return;
  }

  try {
    const filters: any = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.userId) filters.userId = req.query.userId;

    const imports = await listImports(filters);
    const { response, statusCode } = successResponse('Import history loaded successfully', imports);
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to list imports',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleImport(req: AuthenticatedRequest, res: NextApiResponse<ApiResponse>) {
  if (!(await authorize(['admin'])(req, res))) {
    return;
  }

  try {
    await runMiddleware(req, res, upload.single('file'));

    const file = (req as any).file as Express.Multer.File;
    if (!file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const strategy = (req.body.strategy as string) || 'merge';
    const moduleName = req.body.module as string | undefined;
    const validateOnly = String(req.body.validateOnly).toLowerCase() === 'true';

    const result = await parseImportFile(
      file.buffer,
      file.originalname,
      moduleName,
      strategy as any,
      validateOnly,
      req.userId!,
      req.userEmail
    );

    await auditLog({
      userId: req.userId!,
      action: 'IMPORT_DATA',
      module: 'settings',
      userEmail: req.userEmail,
      notes: `Import file: ${file.originalname} strategy: ${strategy}`,
      status: 'success',
    });

    const { response, statusCode } = successResponse('File imported successfully', result);
    return res.status(statusCode).json(response);
  } catch (error) {
    logger.error({ err: error }, 'Data import failed');
    const { response, statusCode } = errorResponse(
      'Failed to import file',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}
