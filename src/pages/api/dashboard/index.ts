import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/config/database';
import Sale from '@/models/Sale';
import Product from '@/models/Product';
import Customer from '@/models/Customer';
import User from '@/models/User';
import Expense from '@/models/Expense';
import Supplier from '@/models/Supplier';
import { authenticate } from '@/middleware/auth';
import { errorResponse, successResponse, formatErrorMessage } from '@/utils/response';
import { ApiResponse } from '@/types';
import { formatInTimeZone, zonedTimeToUtc } from 'date-fns-tz';

const DASHBOARD_TIMEZONE = process.env.DASHBOARD_TIMEZONE || 'Asia/Dhaka';
const DAY_MS = 24 * 60 * 60 * 1000;

const startOfZonedDay = (dateKey: string) =>
  zonedTimeToUtc(`${dateKey} 00:00:00`, DASHBOARD_TIMEZONE);

const getZonedDateKey = (date: Date) => formatInTimeZone(date, DASHBOARD_TIMEZONE, 'yyyy-MM-dd');

const getZonedMonthKey = (date: Date) => formatInTimeZone(date, DASHBOARD_TIMEZONE, 'yyyy-MM');

const getNextMonthKey = (monthKey: string) => {
  const [year, month] = monthKey.split('-').map(Number);
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  return `${next.year}-${String(next.month).padStart(2, '0')}`;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    await dbConnect();

    if (!(await authenticate(req as any, res))) {
      return;
    }

    if (req.method !== 'GET') {
      return res.status(405).json(errorResponse('Method not allowed', undefined, 405).response);
    }

    const { period = '7', startDate, endDate } = req.query;

    const now = new Date();
    const todayKey = getZonedDateKey(now);
    const today = startOfZonedDay(todayKey);
    const tomorrow = new Date(today.getTime() + DAY_MS);

    // Calculate date range in the dashboard timezone.
    let start: Date;
    let end: Date;

    if (startDate && endDate) {
      start = startOfZonedDay(startDate as string);
      end = new Date(startOfZonedDay(endDate as string).getTime() + DAY_MS);
    } else {
      const days = parseInt(period as string) || 7;
      start = new Date(today.getTime() - (days - 1) * DAY_MS);
      end = tomorrow;
    }

    // Sales Today
    const todaySales = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: today },
          status: { $in: ['completed', 'pending', 'returned_partial'] },
        },
      },
      { $group: { _id: null, totalRevenue: { $sum: '$total' }, count: { $sum: 1 } } },
    ]);

    const revenueToday = todaySales.length > 0 ? todaySales[0].totalRevenue : 0;
    const salesCountToday = todaySales.length > 0 ? todaySales[0].count : 0;

    // Total Overall Revenue
    const totalRevenueAgg = await Sale.aggregate([
      { $match: { status: { $in: ['completed', 'pending', 'returned_partial'] } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);
    const totalRevenue = totalRevenueAgg.length > 0 ? totalRevenueAgg[0].total : 0;

    // Revenue for selected period
    const periodSales = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lt: end },
          status: { $in: ['completed', 'pending', 'returned_partial'] },
        },
      },
      { $group: { _id: null, totalRevenue: { $sum: '$total' }, count: { $sum: 1 } } },
    ]);

    const revenuePeriod = periodSales.length > 0 ? periodSales[0].totalRevenue : 0;
    const salesCountPeriod = periodSales.length > 0 ? periodSales[0].count : 0;

    // Pending Orders
    const pendingOrdersCount = await Sale.countDocuments({ status: 'pending' });

    // Total price of current stock
    const stockValueAgg = await Product.aggregate([
      { $match: { isActive: true, stock: { $gt: 0 } } },
      {
        $group: {
          _id: null,
          totalStockValue: { $sum: { $multiply: ['$stock', '$price'] } },
        },
      },
    ]);
    const totalStockValue = stockValueAgg.length > 0 ? stockValueAgg[0].totalStockValue : 0;

    // Total amount payable to suppliers
    const supplierPayableAgg = await Supplier.aggregate([
      { $match: { isActive: true, dueAmount: { $gt: 0 } } },
      { $group: { _id: null, totalSupplierPayable: { $sum: '$dueAmount' } } },
    ]);
    const totalSupplierPayable =
      supplierPayableAgg.length > 0 ? supplierPayableAgg[0].totalSupplierPayable : 0;

    // Total Due
    // Customer records hold manually entered previous due plus sale-created due.
    // Keep sale dues in the calculation as a fallback for older records.
    const totalDueAgg = await Customer.aggregate([
      {
        $lookup: {
          from: 'sales',
          let: { customerId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$customerId', '$$customerId'] },
                status: { $in: ['completed', 'pending', 'returned_partial'] },
                dueAmount: { $gt: 0 },
              },
            },
            { $group: { _id: null, totalDue: { $sum: '$dueAmount' } } },
          ],
          as: 'saleDueSummary',
        },
      },
      {
        $project: {
          normalizedDue: {
            $max: [
              { $ifNull: ['$dueAmount', 0] },
              { $ifNull: ['$balance', 0] },
              { $ifNull: [{ $arrayElemAt: ['$saleDueSummary.totalDue', 0] }, 0] },
            ],
          },
        },
      },
      { $match: { normalizedDue: { $gt: 0 } } },
      { $group: { _id: null, totalDue: { $sum: '$normalizedDue' } } },
    ]);
    const totalDue = totalDueAgg.length > 0 ? totalDueAgg[0].totalDue : 0;

    // Expenses for selected period
    const periodExpensesAgg = await Expense.aggregate([
      {
        $match: {
          isActive: true,
          expenseDate: { $gte: start, $lt: end },
        },
      },
      { $group: { _id: null, totalExpenses: { $sum: '$amount' } } },
    ]);
    const periodExpenses = periodExpensesAgg.length > 0 ? periodExpensesAgg[0].totalExpenses : 0;

    // Current month expenses for the Month Expenses card
    const monthKey = getZonedMonthKey(now);
    const monthStart = startOfZonedDay(`${monthKey}-01`);
    const monthEnd = startOfZonedDay(`${getNextMonthKey(monthKey)}-01`);
    const monthlyExpensesAgg = await Expense.aggregate([
      {
        $match: {
          isActive: true,
          expenseDate: { $gte: monthStart, $lt: monthEnd },
        },
      },
      { $group: { _id: null, totalExpenses: { $sum: '$amount' } } },
    ]);
    const monthlyExpenses = monthlyExpensesAgg.length > 0 ? monthlyExpensesAgg[0].totalExpenses : 0;

    // Low Stock Count & Products
    const products = await Product.find({}, 'name stock minStock');
    const lowStockProductsList = products.filter((p) => p.stock <= p.minStock);
    const lowStockCount = lowStockProductsList.length;

    // Sort by stock ascending to show the most critically low products first
    const lowStockProducts = lowStockProductsList
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 10)
      .map((p) => ({
        _id: p._id,
        name: p.name,
        stock: p.stock,
      }));

    // 2. Sales Trend for selected period
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const groupBy = daysDiff <= 7 ? '%Y-%m-%d' : daysDiff <= 31 ? '%Y-%m-%d' : '%Y-%m';

    const salesData = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lt: end },
          status: { $in: ['completed', 'pending', 'returned_partial'] },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: groupBy,
              date: '$createdAt',
              timezone: DASHBOARD_TIMEZONE,
            },
          },
          revenue: { $sum: '$total' },
          sales: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill in missing periods
    const salesTrend = [];
    let current =
      groupBy === '%Y-%m-%d' ? new Date(start) : startOfZonedDay(`${getZonedMonthKey(start)}-01`);
    while (current < end) {
      const periodKey =
        groupBy === '%Y-%m-%d' ? getZonedDateKey(current) : getZonedMonthKey(current);

      const found = salesData.find((ds) => ds._id === periodKey);
      salesTrend.push({
        date: periodKey,
        revenue: found ? found.revenue : 0,
        sales: found ? found.sales : 0,
      });

      if (groupBy === '%Y-%m-%d') {
        current = new Date(current.getTime() + DAY_MS);
      } else {
        current = startOfZonedDay(`${getNextMonthKey(periodKey)}-01`);
      }
    }

    // 3. Top 5 Products All Time
    const topProducts = await Sale.aggregate([
      { $match: { status: { $in: ['completed', 'pending', 'returned_partial'] } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          name: { $first: '$items.productName' },
          totalSold: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.subtotal' },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
    ]);

    // 4. Trending Products (most sold in selected period)
    const trendingProducts = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lt: end },
          status: { $in: ['completed', 'pending', 'returned_partial'] },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          name: { $first: '$items.productName' },
          totalSold: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.subtotal' },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
    ]);

    // 5. Last 5 Customers
    const recentCustomers = await Sale.aggregate([
      { $match: { status: { $in: ['completed', 'pending', 'returned_partial'] } } },
      {
        $group: {
          _id: '$customerId',
          lastPurchase: { $max: '$createdAt' },
          totalPurchases: { $sum: 1 },
          totalSpent: { $sum: '$total' },
        },
      },
      { $sort: { lastPurchase: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'customers',
          localField: '_id',
          foreignField: '_id',
          as: 'customer',
        },
      },
      { $unwind: '$customer' },
      {
        $project: {
          _id: 0,
          id: '$customer._id',
          name: '$customer.name',
          phone: '$customer.phone',
          lastPurchase: 1,
          totalPurchases: 1,
          totalSpent: 1,
        },
      },
    ]);

    // 6. Top Staff (based on cashierId in Sale)
    const topStaff = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lt: end },
          status: { $in: ['completed', 'pending', 'returned_partial'] },
        },
      },
      {
        $group: {
          _id: '$cashierId',
          totalSales: { $sum: 1 },
          revenue: { $sum: '$total' },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'staff',
        },
      },
      { $unwind: '$staff' },
      {
        $project: {
          _id: 0,
          id: '$staff._id',
          name: { $concat: ['$staff.firstName', ' ', '$staff.lastName'] },
          totalSales: 1,
          revenue: 1,
        },
      },
    ]);

    // 7. Estimate Profit for selected period (Revenue - (Cost * Qty))
    const periodItems = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lt: end },
          status: { $in: ['completed', 'pending', 'returned_partial'] },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          quantity: { $sum: '$items.quantity' },
        },
      },
    ]);

    let periodCost = 0;
    for (const item of periodItems) {
      const prod = await Product.findById(item._id, 'cost');
      if (prod && prod.cost) {
        periodCost += prod.cost * item.quantity;
      }
    }
    const profitPeriod = revenuePeriod - periodCost - periodExpenses;

    const todayItems = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: today, $lt: tomorrow },
          status: { $in: ['completed', 'pending', 'returned_partial'] },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          quantity: { $sum: '$items.quantity' },
        },
      },
    ]);

    let todayCost = 0;
    for (const item of todayItems) {
      const prod = await Product.findById(item._id, 'cost');
      if (prod && prod.cost) {
        todayCost += prod.cost * item.quantity;
      }
    }
    const profitToday = revenueToday - todayCost;

    const dashboardData = {
      kpis: {
        revenueToday,
        salesCountToday,
        totalRevenue,
        profitToday,
        revenuePeriod,
        salesCountPeriod,
        profitPeriod,
        monthlyExpenses,
        totalDue,
        totalStockValue,
        totalSupplierPayable,
        pendingOrdersCount,
        lowStockCount,
      },
      salesTrend,
      topProducts,
      trendingProducts,
      recentCustomers,
      topStaff,
      lowStockProducts,
    };

    const { response, statusCode } = successResponse(
      'Dashboard data fetched successfully',
      dashboardData
    );
    return res.status(statusCode).json(response);
  } catch (error) {
    console.error('Dashboard error:', error);
    const { response, statusCode } = errorResponse(
      'Failed to fetch dashboard data',
      formatErrorMessage(error)
    );
    return res.status(statusCode).json(response);
  }
}
