import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import MainLayout from '@/components/Layout/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import axios from 'axios';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/utils/format';

interface Investment {
  _id: string;
  name: string;
  category: string;
  initialAmount: number;
  investmentDate: string;
  description?: string;
  status: 'active' | 'inactive';
}

export default function EditInvestment() {
  return (
    <ProtectedRoute requiredRole={['admin']}>
      <MainLayout title="Edit Investment">
        <EditInvestmentForm />
      </MainLayout>
    </ProtectedRoute>
  );
}

function EditInvestmentForm() {
  const router = useRouter();
  const { id } = router.query;
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    initialAmount: '',
    investmentDate: '',
    description: '',
    status: 'active',
  });
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);

  const fetchInvestment = useCallback(async () => {
    if (!id) return;

    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/investments/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const investment = res.data;
      setFormData({
        name: investment.name,
        category: investment.category,
        initialAmount: investment.initialAmount.toString(),
        investmentDate: new Date(investment.investmentDate).toISOString().split('T')[0],
        description: investment.description || '',
        status: investment.status,
      });
    } catch (error) {
      toast.error('Failed to fetch investment');
      router.push('/investments');
    } finally {
      setFetchLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchInvestment();
  }, [fetchInvestment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `/api/investments/${id}`,
        {
          ...formData,
          initialAmount: parseFloat(formData.initialAmount),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success('Investment updated successfully');
      router.push('/investments');
    } catch (error) {
      toast.error('Failed to update investment');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (fetchLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Edit Investment</h1>

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="input-field"
              >
                <option value="">Select Category</option>
                <option value="stocks">Stocks</option>
                <option value="bonds">Bonds</option>
                <option value="real-estate">Real Estate</option>
                <option value="crypto">Cryptocurrency</option>
                <option value="business">Business</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invested Amount
              </label>
              <input
                type="number"
                name="initialAmount"
                value={formData.initialAmount}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Investment Date
              </label>
              <input
                type="date"
                name="investmentDate"
                value={formData.investmentDate}
                onChange={handleChange}
                required
                className="input-field"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="input-field"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Update Investment'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
