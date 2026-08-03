import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/config/database';
import Customer from '@/models/Customer';
import Sale from '@/models/Sale';
import { authenticate } from '@/middleware/auth';
import { AuthenticatedRequest } from '@/middleware/auth';
import { getBranchFilter, resolveWriteBranchId } from '@/utils/branchScope';
import { errorResponse, successResponse, formatErrorMessage } from '@/utils/response';
import { validateInput, customerSchema, customerUpdateSchema } from '@/utils/customerValidation';
import { ApiResponse } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    await dbConnect();

    // Authenticate
    if (!(await authenticate(req as any, res))) {
      return;
    }

    const { id } = req.query;

    switch (req.method) {
      case 'GET':
        return id ? handleGetCustomer(req, res, id as string) : handleGetCustomers(req, res);
      case 'POST':
        return handleCreateCustomer(req, res);
      case 'PUT':
        return id
          ? handleUpdateCustomer(req, res, id as string)
          : handleError(res, 'Customer ID required', 400);
      case 'DELETE':
        return id
          ? handleDeleteCustomer(req, res, id as string)
          : handleError(res, 'Customer ID required', 400);
      default:
        return res.status(405).json({
          success: false,
          message: 'Method not allowed',
        });
    }
  } catch (error) {
    console.error('Customer error:', error);
    const { response, statusCode } = errorResponse(
      'Customer operation failed',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleGetCustomers(req: AuthenticatedRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const { search, status, hasDue, gender, page = 1, limit = 20 } = req.query;

    const query: any = { ...getBranchFilter(req, { adminCanViewAll: true }) };

    // Status filter
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    } else {
      // Default: show only active
      query.isActive = true;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: search },
        { email: { $regex: search, $options: 'i' } },
        { customerCode: { $regex: search, $options: 'i' } },
      ];
    }

    if (gender && ['Male', 'Female', 'Other'].includes(gender as string)) {
      query.gender = gender;
    }

    if (hasDue === 'true' || hasDue === 'false') {
      const dueCustomers = await Sale.aggregate([
        {
          $match: {
            customerId: { $ne: null },
            ...getBranchFilter(req, { adminCanViewAll: true }),
          },
        },
        {
          $group: {
            _id: '$customerId',
            totalDue: { $sum: '$dueAmount' },
          },
        },
        {
          $match: hasDue === 'true' ? { totalDue: { $gt: 0 } } : { totalDue: { $lte: 0 } },
        },
      ]);

      const dueCustomerIds = dueCustomers.map((item: any) => item._id);
      if (hasDue === 'true') {
        query._id = { $in: dueCustomerIds };
      } else {
        query._id = { $nin: dueCustomerIds };
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    const customers = await Customer.find(query)
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Customer.countDocuments(query);

    const customerIds = customers.map((customer: any) => customer._id);
    const salesSummary = customerIds.length
      ? await Sale.aggregate([
          {
            $match: {
              customerId: { $in: customerIds },
              ...getBranchFilter(req, { adminCanViewAll: true }),
            },
          },
          {
            $group: {
              _id: '$customerId',
              totalPurchased: { $sum: '$total' },
              dueAmount: { $sum: '$dueAmount' },
              totalTransactions: { $sum: 1 },
              lastPurchaseDate: { $max: '$createdAt' },
            },
          },
        ])
      : [];

    const summaryMap = new Map(salesSummary.map((summary: any) => [String(summary._id), summary]));

    const normalizedCustomers = customers.map((customer: any) => {
      const summary = summaryMap.get(String(customer._id));
      const totalPurchased = Number(summary?.totalPurchased ?? customer.totalPurchased ?? 0);
      const dueAmountFromSales = Number(summary?.dueAmount ?? 0);
      const dueAmount = Math.max(
        dueAmountFromSales,
        Number(customer.dueAmount ?? 0),
        Number(customer.balance ?? 0)
      );

      return {
        ...customer.toObject(),
        totalPurchased,
        dueAmount,
        balance: dueAmount,
        totalTransactions: Number(summary?.totalTransactions ?? customer.totalTransactions ?? 0),
        lastPurchaseDate: summary?.lastPurchaseDate ?? customer.lastPurchaseDate,
      };
    });

    const { response, statusCode } = successResponse('Customers fetched successfully', {
      customers: normalizedCustomers,
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)),
    });
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to fetch customers',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleGetCustomer(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse>,
  id: string
) {
  try {
    const customer = await Customer.findOne({
      _id: id,
      ...getBranchFilter(req, { adminCanViewAll: true }),
    });

    if (!customer) {
      const { response, statusCode } = errorResponse('Customer not found', undefined, 404);
      return res.status(statusCode).json(response);
    }

    const summary = await Sale.aggregate([
      {
        $match: {
          customerId: customer._id,
          ...getBranchFilter(req, { adminCanViewAll: true }),
        },
      },
      {
        $group: {
          _id: null,
          totalPurchased: { $sum: '$total' },
          dueAmount: { $sum: '$dueAmount' },
          totalTransactions: { $sum: 1 },
          lastPurchaseDate: { $max: '$createdAt' },
        },
      },
    ]);

    const aggregate = summary[0];
    const normalizedDue = Math.max(
      Number(aggregate?.dueAmount ?? 0),
      Number(customer.balance ?? 0),
      Number(customer.dueAmount ?? 0)
    );

    const customerData = {
      ...customer.toObject(),
      totalPurchased: Number(aggregate?.totalPurchased ?? customer.totalPurchased ?? 0),
      totalTransactions: Number(aggregate?.totalTransactions ?? customer.totalTransactions ?? 0),
      lastPurchaseDate: aggregate?.lastPurchaseDate ?? customer.lastPurchaseDate,
      dueAmount: normalizedDue,
      balance: normalizedDue,
    };

    const { response, statusCode } = successResponse('Customer fetched successfully', customerData);
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to fetch customer',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleCreateCustomer(req: AuthenticatedRequest, res: NextApiResponse<ApiResponse>) {
  try {
    const { isValid, messages, value } = validateInput(customerSchema, req.body);
    if (!isValid) {
      const { response, statusCode } = errorResponse(
        'Validation failed',
        messages?.join(', '),
        400
      );
      return res.status(statusCode).json(response);
    }

    // Check for duplicate email
    if (value.email) {
      const existingCustomer = await Customer.findOne({
        email: value.email,
        ...getBranchFilter(req, { adminCanViewAll: true }),
      });
      if (existingCustomer) {
        const { response, statusCode } = errorResponse('Email already exists', undefined, 400);
        return res.status(statusCode).json(response);
      }
    }

    if (value.branchId === '') delete value.branchId;
    const branchId = resolveWriteBranchId(req, res, value.branchId);
    if (res.writableEnded) return;

    const customerData: any = { ...value };
    if (req.userRole !== 'admin') {
      delete customerData.balance;
      delete customerData.dueAmount;
    } else if (customerData.dueAmount !== undefined) {
      customerData.balance = customerData.dueAmount;
    }
    if (branchId) customerData.branchId = branchId;

    const customer = await Customer.create(customerData);
    const { response, statusCode } = successResponse(
      'Customer created successfully',
      customer,
      201
    );
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to create customer',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleUpdateCustomer(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse>,
  id: string
) {
  try {
    const unsetData = req.body.$unset;
    if (unsetData) delete req.body.$unset;

    const { isValid, messages, value } = validateInput(customerUpdateSchema, req.body);
    if (!isValid) {
      const { response, statusCode } = errorResponse(
        'Validation failed',
        messages?.join(', '),
        400
      );
      return res.status(statusCode).json(response);
    }

    // Check email uniqueness on update
    if (value.email) {
      const existingCustomer = await Customer.findOne({
        email: value.email,
        _id: { $ne: id },
        ...getBranchFilter(req, { adminCanViewAll: true }),
      });
      if (existingCustomer) {
        const { response, statusCode } = errorResponse('Email already exists', undefined, 400);
        return res.status(statusCode).json(response);
      }
    }

    const updateData: any = { ...value };
    if (req.userRole !== 'admin') {
      delete updateData.balance;
      delete updateData.dueAmount;
    } else if (updateData.dueAmount !== undefined) {
      updateData.balance = updateData.dueAmount;
    }
    if (updateData.branchId === '') delete updateData.branchId;
    if (unsetData) {
      updateData.$unset = unsetData;
    }

    const branchId = resolveWriteBranchId(req, res, value.branchId);
    if (res.writableEnded) return;
    if (branchId) updateData.branchId = branchId;

    const customer = await Customer.findOneAndUpdate(
      { _id: id, ...getBranchFilter(req, { adminCanViewAll: true }) },
      updateData,
      { new: true }
    );

    if (!customer) {
      const { response, statusCode } = errorResponse('Customer not found', undefined, 404);
      return res.status(statusCode).json(response);
    }

    const { response, statusCode } = successResponse('Customer updated successfully', customer);
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to update customer',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

async function handleDeleteCustomer(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse>,
  id: string
) {
  try {
    const customer = await Customer.findOneAndUpdate(
      { _id: id, ...getBranchFilter(req, { adminCanViewAll: true }) },
      { isActive: false },
      { new: true }
    );

    if (!customer) {
      const { response, statusCode } = errorResponse('Customer not found', undefined, 404);
      return res.status(statusCode).json(response);
    }

    const { response, statusCode } = successResponse('Customer deleted successfully', customer);
    return res.status(statusCode).json(response);
  } catch (error) {
    const { response, statusCode } = errorResponse(
      'Failed to delete customer',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}

function handleError(res: NextApiResponse<ApiResponse>, message: string, statusCode: number) {
  const { response, statusCode: code } = errorResponse(message, undefined, statusCode);
  return res.status(code).json(response);
}
