import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import MainLayout from '@/components/Layout/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import {
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  Eye,
  Settings,
  AlertCircle,
} from 'lucide-react';
import { ActionButton } from '@/components/Common/FormElements';
import axios from 'axios';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/utils/format';

interface Earning {
  _id: string;
  month: string;
  earnings: number;
  expenses: number;
  netProfit: number;
}

interface Investment {
  _id: string;
  name: string;
  earningInterval?: 'daily' | '15days' | '30days';
  expectedIncome?: number;
}

export default function InvestmentEarnings() {
  return (
    <ProtectedRoute requiredRole={['admin']}>
      <MainLayout title="Investment Earnings">
        <EarningsContent />
      </MainLayout>
    </ProtectedRoute>
  );
}

function EarningsContent() {
  const router = useRouter();
  const { id } = router.query;
  const [investment, setInvestment] = useState<Investment | null>(null);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEarning, setEditingEarning] = useState<Earning | null>(null);
  const [formData, setFormData] = useState({
    month: '',
    earnings: '',
    expenses: '',
  });

  const getPeriodFieldConfig = () => {
    const interval = investment?.earningInterval ?? '30days';

    if (interval === 'daily') {
      return { label: 'Date', type: 'date' as const };
    }
    if (interval === '30days') {
      return { label: 'Month', type: 'month' as const };
    }
    const labelMap: Record<string, string> = {
      '15days': '15-Day Period Start',
    };
    return { label: labelMap[interval] || 'Period', type: 'date' as const };
  };

  const formatPeriodInputValue = (value: string) => {
    if (investment?.earningInterval === '30days') {
      return new Date(value).toISOString().slice(0, 7);
    }
    return new Date(value).toISOString().split('T')[0];
  };

  const formatPeriodDisplayValue = (value: string) => {
    const date = new Date(value);
    if (investment?.earningInterval === '30days') {
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isOverdue = () => {
    if (!investment || investment.earningInterval !== '15days') return false;
    const lastEarning = earnings.sort(
      (a, b) => new Date(b.month).getTime() - new Date(a.month).getTime()
    )[0];
    if (!lastEarning) return true; // No earnings yet
    const lastDate = new Date(lastEarning.month);
    const now = new Date();
    const daysSince = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > 15;
  };

  const expectedAmount = investment?.expectedIncome || 0;

  const getIntervalLabel = () => {
    if (!investment) return 'Monthly';
    if (investment.earningInterval === 'daily') return 'Daily';
    if (investment.earningInterval === '15days') return '15 Days';
    return 'Monthly';
  };

  const getIntervalSubtitle = () => {
    if (!investment) return 'Track monthly earnings and expenses';
    if (investment.earningInterval === 'daily') return 'Track daily earnings and expenses';
    if (investment.earningInterval === '15days') return 'Track 15-day earnings and expenses';
    return 'Track monthly earnings and expenses';
  };

  const intervalLabel = getIntervalLabel();
  const intervalSubtitle = getIntervalSubtitle();

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [investmentRes, earningsRes] = await Promise.all([
        axios.get(`/api/investments/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`/api/earnings?investmentId=${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setInvestment(investmentRes.data);
      setEarnings(earningsRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const data = {
        investmentId: id,
        month: formData.month,
        earnings: parseFloat(formData.earnings),
        expenses: parseFloat(formData.expenses),
      };
      if (editingEarning) {
        await axios.put(`/api/earnings/${editingEarning._id}`, data, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Earning updated successfully');
      } else {
        await axios.post('/api/earnings', data, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Earning added successfully');
      }
      setShowForm(false);
      setEditingEarning(null);
      setFormData({ month: '', earnings: '', expenses: '' });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save earning');
    }
  };

  const handleEdit = (earning: Earning) => {
    setEditingEarning(earning);
    setFormData({
      month: formatPeriodInputValue(earning.month),
      earnings: earning.earnings.toString(),
      expenses: earning.expenses.toString(),
    });
    setShowForm(true);
  };

  const handleDelete = async (earningId: string) => {
    if (!confirm('Are you sure you want to delete this earning?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/earnings/${earningId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Earning deleted successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete earning');
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!investment) return <div className="p-6">Investment not found</div>;

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            {intervalLabel} Earnings for {investment.name}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{intervalSubtitle}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium"
        >
          <Plus size={16} />
          {`Add ${intervalLabel} Earning`}
        </button>
      </div>

      {/* Warning for overdue payments */}
      {isOverdue() && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Payment Overdue</h3>
              <p className="mt-1 text-sm text-yellow-700">
                No earnings recorded in the last 15 days. Please add the latest earnings.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 mb-6">
          <h2 className="text-base font-semibold mb-4">
            {editingEarning ? `Edit ${intervalLabel} Earning` : `Add ${intervalLabel} Earning`}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              {(() => {
                const periodConfig = getPeriodFieldConfig();
                return (
                  <>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      {periodConfig.label}
                    </label>
                    <input
                      type={periodConfig.type}
                      value={formData.month}
                      onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </>
                );
              })()}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Earnings
              </label>
              <input
                type="number"
                value={formData.earnings}
                onChange={(e) => setFormData({ ...formData, earnings: e.target.value })}
                required
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Expenses
              </label>
              <input
                type="number"
                value={formData.expenses}
                onChange={(e) => setFormData({ ...formData, expenses: e.target.value })}
                required
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-3 flex gap-3">
              <button
                type="submit"
                className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                {editingEarning
                  ? `Update ${intervalLabel} Earning`
                  : `Add ${intervalLabel} Earning`}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingEarning(null);
                  setFormData({ month: '', earnings: '', expenses: '' });
                }}
                className="bg-gray-100 text-gray-600 px-5 py-2 rounded-lg hover:bg-gray-200 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Card Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
            <Settings size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Earnings</p>
            <p className="text-xs text-gray-400">{earnings.length} total records</p>
          </div>
        </div>

        {/* Table */}
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                {investment?.earningInterval === '30days' ? 'Month' : 'Period'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Expected
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Earnings
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Comparison
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Expenses
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Net Profit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {earnings.map((earning) => {
              const comparison = earning.earnings - expectedAmount;
              return (
                <tr key={earning._id} className="hover:bg-gray-50 transition-colors">
                  {/* Month */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-indigo-600">
                      {formatPeriodDisplayValue(earning.month)}
                    </span>
                  </td>

                  {/* Expected */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">{formatCurrency(expectedAmount)}</div>
                  </td>

                  {/* Earnings */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-800">
                      {formatCurrency(earning.earnings)}
                    </div>
                  </td>

                  {/* Comparison */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                        comparison >= 0
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-red-50 text-red-600 border-red-200'
                      }`}
                    >
                      {comparison >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {formatCurrency(Math.abs(comparison))}
                    </span>
                  </td>

                  {/* Expenses */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">{formatCurrency(earning.expenses)}</div>
                  </td>

                  {/* Net Profit — badge style */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                        earning.netProfit >= 0
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-red-50 text-red-600 border-red-200'
                      }`}
                    >
                      {earning.netProfit >= 0 ? (
                        <TrendingUp size={12} />
                      ) : (
                        <TrendingDown size={12} />
                      )}
                      {formatCurrency(Math.abs(earning.netProfit))}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <ActionButton
                        variant="edit"
                        onClick={() => handleEdit(earning)}
                        title="Edit earning"
                        icon={<Edit size={12} />}
                      />
                      <ActionButton
                        variant="delete"
                        onClick={() => handleDelete(earning._id)}
                        title="Delete earning"
                        icon={<Trash2 size={12} />}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}

            {earnings.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">
                  No earnings recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
