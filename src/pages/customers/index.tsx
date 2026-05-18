import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
import MainLayout from '@/components/Layout/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ActionButton, Button, Card } from '@/components/Common/FormElements';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDialog } from '@/components/Common/AppDialog';

interface Customer {
  _id: string;
  customerCode?: string;
  name: string;
  phone: string;
  email?: string;
  avatar?: string;
  gender?: string;
  balance?: number;
  dueAmount?: number;
  totalPurchased?: number;
  totalTransactions?: number;
  loyaltyPoints?: number;
  isActive: boolean;
}

export default function CustomersPage() {
  return (
    <ProtectedRoute requiredRole={['admin', 'manager', 'cashier']}>
      <CustomersContent />
    </ProtectedRoute>
  );
}

function CustomersContent() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [filterDue, setFilterDue] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const auth = useAuthStore();
  const dialog = useAppDialog();

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterStatus) params.set('status', filterStatus);
      if (filterDue) params.set('hasDue', filterDue);
      if (filterGender) params.set('gender', filterGender);
      params.set('page', String(page));
      params.set('limit', '20');

      const response = await axios.get(`/api/customers?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setCustomers(response.data.data.customers);
        setTotalPages(response.data.data.pages);
        setTotal(response.data.data.total);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, filterDue, filterGender, page]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleDeleteCustomer = async (id: string) => {
    const confirmed = await dialog.confirm({
      title: 'Delete customer?',
      message: 'This customer will be removed from active records.',
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/customers?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Customer deleted');
      fetchCustomers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete');
    }
  };

  const handleReset = () => {
    setSearch('');
    setFilterStatus('active');
    setFilterDue('');
    setFilterGender('');
    setPage(1);
  };

  const activeFilters = [
    search,
    filterDue,
    filterGender,
    filterStatus !== 'active' ? filterStatus : '',
  ].filter(Boolean).length;
  const canManage = auth.user?.role === 'admin' || auth.user?.role === 'manager';

  return (
    <MainLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">Customers</h1>
            {!loading && (
              <p className="text-sm text-secondary-500 mt-1">
                {total} customer{total !== 1 ? 's' : ''} found
              </p>
            )}
          </div>
          {canManage && (
            <Link href="/customers/add">
              <Button size="md">+ Add Customer</Button>
            </Link>
          )}
        </div>

        {/* Search & Filters */}
        <Card>
          <div className="space-y-4">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="🔍  Search by name, phone, email, or code..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="input-field flex-1"
              />
              {activeFilters > 0 && (
                <button
                  onClick={handleReset}
                  className="rounded-lg border border-gray-200 px-4 text-sm font-medium text-secondary-600 hover:bg-gray-50 transition whitespace-nowrap"
                >
                  Clear ({activeFilters})
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(1);
                }}
                className="input-field text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="all">All Status</option>
              </select>

              <select
                value={filterDue}
                onChange={(e) => {
                  setFilterDue(e.target.value);
                  setPage(1);
                }}
                className="input-field text-sm"
              >
                <option value="">All Dues</option>
                <option value="true">Has Due</option>
                <option value="false">No Due</option>
              </select>

              <select
                value={filterGender}
                onChange={(e) => {
                  setFilterGender(e.target.value);
                  setPage(1);
                }}
                className="input-field text-sm"
              >
                <option value="">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Customer Table */}
        <Card>
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600" />
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-16 text-secondary-400">
              <p className="text-5xl mb-3">👤</p>
              <p className="font-medium text-secondary-600">No customers found</p>
              <p className="text-sm mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-3 text-left font-semibold text-secondary-600">
                        Customer
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-secondary-600">Code</th>
                      <th className="px-4 py-3 text-left font-semibold text-secondary-600">
                        Phone
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-secondary-600">
                        Purchased
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-secondary-600">Due</th>
                      <th className="px-4 py-3 text-center font-semibold text-secondary-600">
                        Points
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-secondary-600">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {customers.map((customer) =>
                      (() => {
                        const normalizedDue = Math.max(
                          customer.dueAmount ?? 0,
                          customer.balance ?? 0
                        );
                        return (
                          <tr key={customer._id} className="hover:bg-slate-50 transition">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-sky-100 relative">
                                  {customer.avatar ? (
                                    <Image
                                      src={customer.avatar}
                                      alt={customer.name}
                                      fill
                                      className="object-cover"
                                      unoptimized
                                    />
                                  ) : (
                                    <div className="flex h-full items-center justify-center text-sky-600 text-sm font-bold">
                                      {customer.name.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium text-secondary-900 leading-tight">
                                    {customer.name}
                                  </p>
                                  {customer.email && (
                                    <p className="text-xs text-secondary-400">{customer.email}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-secondary-600">
                                {customer.customerCode || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-secondary-700">{customer.phone}</td>
                            <td className="px-4 py-3 text-right font-semibold text-secondary-900">
                              ৳{(customer.totalPurchased ?? 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span
                                className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                  normalizedDue > 0
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-emerald-100 text-emerald-700'
                                }`}
                              >
                                ৳{normalizedDue.toFixed(2)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-xs font-medium text-secondary-600">
                                {customer.loyaltyPoints || 0}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex gap-1.5 justify-center">
                                <ActionButton
                                  variant="view"
                                  href={`/customers/${customer._id}`}
                                  label="View"
                                  icon={<Eye size={12} />}
                                />
                                {canManage && (
                                  <>
                                    <ActionButton
                                      variant="edit"
                                      href={`/customers/${customer._id}/edit`}
                                      label="Edit"
                                      icon={<Pencil size={12} />}
                                    />
                                    <ActionButton
                                      variant="delete"
                                      onClick={() => handleDeleteCustomer(customer._id)}
                                      label="Delete"
                                      icon={<Trash2 size={12} />}
                                    />
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })()
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-secondary-500">
                    Page {page} of {totalPages} · {total} total
                  </p>
                  <div className="flex gap-2">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                      className="rounded-lg border px-3 py-1.5 text-sm font-medium text-secondary-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      ← Prev
                    </button>
                    <button
                      disabled={page === totalPages}
                      onClick={() => setPage(page + 1)}
                      className="rounded-lg border px-3 py-1.5 text-sm font-medium text-secondary-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </MainLayout>
  );
}
