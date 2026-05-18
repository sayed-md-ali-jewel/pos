import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Link from 'next/link';
import MainLayout from '@/components/Layout/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  Calendar,
  TrendingUp,
  Package,
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  Clock,
} from 'lucide-react';

export default function Dashboard() {
  return (
    <ProtectedRoute requiredRole={['admin', 'manager', 'cashier']}>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  const fetchDashboard = useCallback(
    async (periodParam = period, startDate = '', endDate = '') => {
      try {
        const params = startDate && endDate ? { startDate, endDate } : { period: periodParam };
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/dashboard', {
          headers: { Authorization: `Bearer ${token}` },
          params,
        });
        if (res.data.success) {
          setData(res.data.data);
        }
      } catch (error) {
        console.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    },
    [period]
  );

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    setIsCustom(false);
    fetchDashboard(newPeriod);
  };

  const handleCustomDateChange = () => {
    if (customStartDate && customEndDate) {
      setIsCustom(true);
      fetchDashboard('', customStartDate, customEndDate);
    }
  };

  if (loading) {
    return (
      <MainLayout title="Dashboard">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      </MainLayout>
    );
  }

  const kpis = data?.kpis || {};
  const salesTrend = data?.salesTrend || [];
  const topProducts = data?.topProducts || [];
  const trendingProducts = data?.trendingProducts || [];
  const lowStockProducts = data?.lowStockProducts || [];

  const COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#ef4444', '#a855f7'];

  // Custom legend renderer for pie chart
  const renderCustomLegend = () => (
    <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center mt-3">
      {topProducts.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-1.5 text-xs text-slate-600">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: COLORS[index % COLORS.length] }}
          />
          <span>
            {entry.name} ({entry.totalSold})
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <MainLayout title="Dashboard">
      <div className="space-y-6">
        {/* Dashboard Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1 text-sm">Overview of your bookstore performance</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
          {/* Today's Sales */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-[0.2em]">
                  Today&apos;s Sales
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-2">
                  ৳{(kpis.revenueToday || 0).toFixed(0)}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {kpis.salesCountToday || 0} transactions
                </p>
              </div>
              <div className="rounded-lg bg-emerald-100 p-2 flex-shrink-0">
                <ShoppingCart className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
          </div>

          {/* This Month */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-[0.2em]">
                  This Month
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-2">
                  ৳{(kpis.revenuePeriod || 0).toFixed(0)}
                </p>
                <p className="text-xs text-slate-400 mt-1">{kpis.salesCountPeriod || 0} sales</p>
              </div>
              <div className="rounded-lg bg-sky-100 p-2 flex-shrink-0">
                <Calendar className="h-5 w-5 text-sky-500" />
              </div>
            </div>
          </div>

          {/* Total Revenue */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-[0.2em]">
                  Total Revenue
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-2">
                  ৳{(kpis.totalRevenue || 0).toFixed(0)}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {kpis.totalSalesCount || 0} all-time sales
                </p>
              </div>
              <div className="rounded-lg bg-purple-100 p-2 flex-shrink-0">
                <DollarSign className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Monthly Profit */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-[0.2em]">
                  Monthly Profit
                </p>
                <p
                  className={`text-2xl font-bold mt-2 ${
                    (kpis.profitPeriod || 0) < 0 ? 'text-red-600' : 'text-slate-900'
                  }`}
                >
                  ৳{(kpis.profitPeriod || 0).toFixed(0)}
                </p>
                <p className="text-xs text-slate-400 mt-1">Revenue minus expenses</p>
              </div>
              <div className="rounded-lg bg-indigo-100 p-2 flex-shrink-0">
                <TrendingUp className="h-5 w-5 text-indigo-500" />
              </div>
            </div>
          </div>

          {/* Month Expenses */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-[0.2em]">
                  Month Expenses
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-2">
                  ৳{(kpis.monthlyExpenses || 0).toFixed(0)}
                </p>
                <p className="text-xs text-slate-400 mt-1">This month&apos;s costs</p>
              </div>
              <div className="rounded-lg bg-orange-100 p-2 flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
              </div>
            </div>
          </div>
          {/* Total Due — standalone wide card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Total Due
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-2">
                  ৳{(kpis.totalDue || 0).toFixed(0)}
                </p>
                <p className="text-xs text-slate-400 mt-1">Pending customer payments</p>
              </div>
              <div className="rounded-lg bg-orange-100 p-2 flex-shrink-0">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Monthly Sales Trend Line Chart — takes 2/3 width */}
          <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-base font-bold text-slate-900">Monthly Sales Trend</h2>
              <p className="text-slate-400 text-xs mt-0.5">Sales performance over time</p>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesTrend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(str) => {
                      const date = new Date(str);
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `৳${v}`}
                  />
                  <Tooltip
                    formatter={(value: number) => [`৳${value.toFixed(0)}`, 'Revenue']}
                    labelFormatter={(label) =>
                      `Date: ${new Date(label).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}`
                    }
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#4f46e5"
                    strokeWidth={2.5}
                    dot={{ fill: '#4f46e5', r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Books by Category Pie Chart — takes 1/3 width */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-base font-bold text-slate-900">Products by Category</h2>
              <p className="text-slate-400 text-xs mt-0.5">Sales distribution by category</p>
            </div>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topProducts}
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="totalSold"
                    nameKey="name"
                  >
                    {topProducts.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value} units`, name]}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {renderCustomLegend()}
          </div>
        </div>

        {/* Best-Selling Products & Low Stock Alert */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Best-Selling Products */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <span className="text-xl">🏆</span>
              <h3 className="text-base font-bold text-slate-900">Best-Selling Products</h3>
            </div>
            <div className="space-y-1">
              {trendingProducts.length === 0 && (
                <p className="text-sm text-slate-400">No sales data available.</p>
              )}
              {trendingProducts.slice(0, 7).map((product: any, index: number) => (
                <div
                  key={product._id}
                  className="flex items-center justify-between rounded-lg px-1 py-2.5 border-b border-slate-100 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold flex-shrink-0
                        ${
                          index === 0
                            ? 'bg-indigo-600 text-white'
                            : index === 1
                              ? 'bg-indigo-500 text-white'
                              : index === 2
                                ? 'bg-indigo-400 text-white'
                                : 'bg-slate-100 text-slate-500'
                        }`}
                    >
                      {index + 1}
                    </div>
                    <p className="text-sm font-medium text-slate-800 truncate max-w-[180px]">
                      {product.name}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-indigo-600 flex-shrink-0">
                    {product.totalSold} sold
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Low Stock Alert */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <h3 className="text-base font-bold text-slate-900">Low Stock Alert</h3>
            </div>

            {!kpis.lowStockCount || kpis.lowStockCount === 0 ? (
              <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-4">
                <p className="text-sm font-medium text-emerald-700">
                  ✓ All products have sufficient stock
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg bg-red-50 border border-red-100 p-3">
                  <p className="text-sm font-semibold text-red-700">
                    ⚠ {kpis.lowStockCount} product{kpis.lowStockCount > 1 ? 's' : ''} need restock
                  </p>
                </div>
                <div className="space-y-2">
                  {lowStockProducts.map((product: any) => (
                    <div
                      key={product._id}
                      className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5"
                    >
                      <p className="text-sm font-medium text-slate-800 truncate max-w-[200px]">
                        {product.name}
                      </p>
                      <span className="text-xs font-semibold text-red-600 bg-red-50 rounded-full px-2 py-0.5 flex-shrink-0">
                        {product.stock} left
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
