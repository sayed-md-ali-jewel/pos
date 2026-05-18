import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '@/config/database';
import Expense from '@/models/Expense';
import { authenticate, AuthenticatedRequest } from '@/middleware/auth';
import { getBranchFilter, resolveWriteBranchId } from '@/utils/branchScope';
import { ApiResponse } from '@/types';
import { errorResponse, formatErrorMessage, successResponse } from '@/utils/response';

const paymentMethods = ['cash', 'card', 'mobile', 'bank', 'cheque', 'other'];

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    await dbConnect();

    if (!(await authenticate(req as AuthenticatedRequest, res))) {
      return;
    }

    const { id } = req.query;

    switch (req.method) {
      case 'GET':
        return id
          ? handleGetExpense(req as AuthenticatedRequest, res, id as string)
          : handleGetExpenses(req as AuthenticatedRequest, res);
      case 'POST':
        return handleCreateExpense(req as AuthenticatedRequest, res);
      case 'PUT':
        return id
          ? handleUpdateExpense(req as AuthenticatedRequest, res, id as string)
          : handleError(res, 'Expense ID required', 400);
      case 'DELETE':
        return id
          ? handleDeleteExpense(req as AuthenticatedRequest, res, id as string)
          : handleError(res, 'Expense ID required', 400);
      default:
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Expense error:', error);
    const { response, statusCode } = errorResponse(
      'Expense operation failed',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleGetExpenses(req: AuthenticatedRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const { search, category, paymentMethod, startDate, endDate, page = 1, limit = 20 } = req.query;

    const query: any = {
      isActive: true,
      ...getBranchFilter(req, { adminCanViewAll: true }),
    };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { vendor: { $regex: search, $options: 'i' } },
        { reference: { $regex: search, $options: 'i' } },
        { expenseNumber: { $regex: search, $options: 'i' } },
      ];
    }

    if (category) query.category = category;
    if (paymentMethod && paymentMethods.includes(paymentMethod as string)) {
      query.paymentMethod = paymentMethod;
    }

    if (startDate || endDate) {
      query.expenseDate = {};
      if (startDate) query.expenseDate.$gte = new Date(startDate as string);
      if (endDate) {
        const inclusiveEndDate = new Date(endDate as string);
        inclusiveEndDate.setHours(23, 59, 59, 999);
        query.expenseDate.$lte = inclusiveEndDate;
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    const queryForAgg = { ...query };
    if (queryForAgg.branchId && typeof queryForAgg.branchId === 'string') {
      try {
        queryForAgg.branchId = new mongoose.Types.ObjectId(queryForAgg.branchId);
      } catch (err) {
        // leave branchId as-is if it cannot be converted
      }
    }

    const [expenses, total, totalAmountAgg, categories] = await Promise.all([
      Expense.find(query).skip(skip).limit(Number(limit)).sort({ expenseDate: -1, createdAt: -1 }),
      Expense.countDocuments(query),
      Expense.aggregate([
        { $match: queryForAgg },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Expense.distinct('category', queryForAgg),
    ]);

    const totalAmount = Number(totalAmountAgg[0]?.total || 0);

    const { response, statusCode } = successResponse('Expenses fetched successfully', {
      expenses,
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.max(1, Math.ceil(total / Number(limit))),
      summary: {
        totalAmount,
        totalExpenses: total,
      },
      categories: categories.filter(Boolean).sort(),
    });
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to fetch expenses',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleGetExpense(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse>,
  id: string
) {
  try {
    const expense = await Expense.findOne({
      _id: id,
      isActive: true,
      ...getBranchFilter(req, { adminCanViewAll: true }),
    });

    if (!expense) {
      const { response, statusCode } = errorResponse('Expense not found', undefined, 404);
      return res.status(statusCode).json(response);
    }

    const { response, statusCode } = successResponse('Expense fetched successfully', expense);
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to fetch expense',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleCreateExpense(req: AuthenticatedRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const validationMessage = validateExpense(req.body);
    if (validationMessage) return handleError(res, validationMessage, 400);

    const branchId = resolveWriteBranchId(req, res, req.body.branchId);
    if (res.writableEnded) return;

    const expenseData = normalizeExpensePayload(req.body);
    if (branchId) expenseData.branchId = branchId;
    if (req.userId) expenseData.createdBy = req.userId;

    const expense = await Expense.create(expenseData);
    const { response, statusCode } = successResponse('Expense created successfully', expense, 201);
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to create expense',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleUpdateExpense(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse>,
  id: string
) {
  try {
    const validationMessage = validateExpense(req.body, true);
    if (validationMessage) return handleError(res, validationMessage, 400);

    const updateData = normalizeExpensePayload(req.body, true);
    if (req.body.branchId !== undefined) {
      const branchId = resolveWriteBranchId(req, res, req.body.branchId);
      if (res.writableEnded) return;
      if (branchId) updateData.branchId = branchId;
    }

    const expense = await Expense.findOneAndUpdate(
      { _id: id, isActive: true, ...getBranchFilter(req, { adminCanViewAll: true }) },
      updateData,
      { new: true }
    );

    if (!expense) {
      const { response, statusCode } = errorResponse('Expense not found', undefined, 404);
      return res.status(statusCode).json(response);
    }

    const { response, statusCode } = successResponse('Expense updated successfully', expense);
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to update expense',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleDeleteExpense(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse>,
  id: string
) {
  try {
    const expense = await Expense.findOneAndUpdate(
      { _id: id, isActive: true, ...getBranchFilter(req, { adminCanViewAll: true }) },
      { isActive: false },
      { new: true }
    );

    if (!expense) {
      const { response, statusCode } = errorResponse('Expense not found', undefined, 404);
      return res.status(statusCode).json(response);
    }

    const { response, statusCode } = successResponse('Expense deleted successfully', expense);
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to delete expense',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

function validateExpense(payload: any, partial = false) {
  if (!partial || payload.title !== undefined) {
    if (!payload.title?.trim()) return 'Expense title is required';
  }
  if (!partial || payload.category !== undefined) {
    if (!payload.category?.trim()) return 'Expense category is required';
  }
  if (!partial || payload.amount !== undefined) {
    if (payload.amount === '' || Number(payload.amount) <= 0) {
      return 'Expense amount must be greater than 0';
    }
  }
  if (payload.paymentMethod && !paymentMethods.includes(payload.paymentMethod)) {
    return 'Invalid payment method';
  }
  return '';
}

function normalizeExpensePayload(payload: any, partial = false) {
  const fields = [
    'title',
    'category',
    'paymentMethod',
    'expenseDate',
    'vendor',
    'reference',
    'notes',
  ];
  const data: any = {};

  fields.forEach((field) => {
    if (payload[field] !== undefined) data[field] = payload[field];
  });

  if (payload.amount !== undefined) data.amount = Number(payload.amount);
  if (!partial && !data.expenseDate) data.expenseDate = new Date();

  return data;
}

function handleError(res: NextApiResponse<ApiResponse>, message: string, statusCode: number) {
  const { response, statusCode: code } = errorResponse(message, undefined, statusCode);
  return res.status(code).json(response);
}
