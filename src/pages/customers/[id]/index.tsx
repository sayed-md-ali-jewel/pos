import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import MainLayout from '@/components/Layout/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ActionButton, Button, Card } from '@/components/Common/FormElements';
import { useAuthStore } from '@/store/authStore';
import { Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDialog } from '@/components/Common/AppDialog';

interface Customer {
  _id: string;
  customerCode?: string;
  name: string;
  email?: string;
  phone: string;
  address?: string;
  city?: string;
  avatar?: string;
  dateOfBirth?: string;
  gender?: string;
  balance?: number;
  dueAmount?: number;
  totalPurchased?: number;
  totalTransactions?: number;
  loyaltyPoints?: number;
  lastPurchaseDate?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Purchase {
  _id: string;
  saleNumber: string;
  total: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  items: { productName: string; quantity: number; subtotal: number }[];
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between border-b border-gray-100 py-3 last:border-0">
      <span className="text-sm font-medium text-secondary-500 w-36 shrink-0">{label}</span>
      <span className="text-sm font-semibold text-secondary-900 text-right">{value || '—'}</span>
    </div>
  );
}

function safe(val: number | undefined | null): string {
  return (val ?? 0).toFixed(2);
}

export default function CustomerDetailPage() {
  return (
    <ProtectedRoute requiredRole={['admin', 'manager', 'cashier']}>
      <CustomerDetailContent />
    </ProtectedRoute>
  );
}

function CustomerDetailContent() {
  const router = useRouter();
  const { id } = router.query;
  const auth = useAuthStore();
  const dialog = useAppDialog();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasePage, setPurchasePage] = useState(1);
  const [purchasePages, setPurchasePages] = useState(1);
  const [purchaseTotal, setPurchaseTotal] = useState(0);

  // Payment Modal State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentNote, setPaymentNote] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  // Tabs State
  const [activeTab, setActiveTab] = useState<'purchases' | 'payments'>('purchases');

  // Payment History State
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [paymentHistoryPage, setPaymentHistoryPage] = useState(1);
  const [paymentHistoryPages, setPaymentHistoryPages] = useState(1);
  const [paymentHistoryTotal, setPaymentHistoryTotal] = useState(0);

  const fetchData = useCallback(
    async (pPage = 1, pmPage = 1) => {
      if (!id) return;
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        const [custRes, purchRes, payRes] = await Promise.all([
          axios.get(`/api/customers?id=${id}`, { headers }),
          axios.get(`/api/customers/${id}/purchases?page=${pPage}&limit=10`, { headers }),
          axios.get(`/api/customers/${id}/payments?page=${pmPage}&limit=10`, { headers }),
        ]);

        if (custRes.data.success) setCustomer(custRes.data.data);
        if (purchRes.data.success) {
          setPurchases(purchRes.data.data.purchases);
          setPurchasePages(purchRes.data.data.pages || 1);
          setPurchaseTotal(purchRes.data.data.total || 0);
        }
        if (payRes.data.success) {
          setPaymentHistory(payRes.data.data.payments);
          setPaymentHistoryPages(payRes.data.data.pages || 1);
          setPaymentHistoryTotal(payRes.data.data.total || 0);
        }
      } catch {
        toast.error('Failed to load customer');
        router.push('/customers');
      } finally {
        setLoading(false);
      }
    },
    [id, router]
  );

  useEffect(() => {
    fetchData(purchasePage, paymentHistoryPage);
  }, [fetchData, purchasePage, paymentHistoryPage]);

  const handleToggleActive = async () => {
    if (!customer) return;
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `/api/customers?id=${customer._id}`,
        { isActive: !customer.isActive },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCustomer({ ...customer, isActive: !customer.isActive });
      toast.success(`Customer ${customer.isActive ? 'deactivated' : 'activated'}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async () => {
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
      router.push('/customers');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handlePayDue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    const dueAmountNum = Math.max(customer?.balance ?? 0, customer?.dueAmount ?? 0);
    if (Number(paymentAmount) > dueAmountNum) {
      toast.error('Amount cannot exceed the total due');
      return;
    }
    setIsPaying(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `/api/customers/${id}/pay`,
        {
          amount: Number(paymentAmount),
          paymentMethod,
          note: paymentNote,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.data.success) {
        toast.success('Payment recorded successfully');
        setIsPayModalOpen(false);
        setPaymentAmount('');
        setPaymentNote('');
        fetchData(purchasePage, paymentHistoryPage);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to process payment');
    } finally {
      setIsPaying(false);
    }
  };

  if (loading) {
    return (
      <MainLayout title="Customer Detail">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600" />
        </div>
      </MainLayout>
    );
  }

  if (!customer) return null;
  const canManage = auth.user?.role === 'admin' || auth.user?.role === 'manager';

  // Safe numeric values
  const totalPurchased = customer.totalPurchased ?? 0;
  const dueAmount = Math.max(customer.balance ?? 0, customer.dueAmount ?? 0);
  const loyaltyPoints = customer.loyaltyPoints ?? 0;
  const totalTransactions = customer.totalTransactions ?? 0;

  // Calculate days since last purchase
  const daysSinceLastPurchase = customer.lastPurchaseDate
    ? Math.floor(
        (Date.now() - new Date(customer.lastPurchaseDate).getTime()) / (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <MainLayout title={customer.name}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/customers')}
              className="rounded-lg border border-gray-200 p-2 text-secondary-500 hover:bg-gray-50 transition"
            >
              ← Back
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-secondary-900">{customer.name}</h1>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    customer.isActive
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {customer.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-sm text-secondary-500">
                {customer.customerCode || 'No Code'} · Member since{' '}
                {new Date(customer.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          {canManage && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleToggleActive}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  customer.isActive
                    ? 'border-amber-200 text-amber-600 hover:bg-amber-50'
                    : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                }`}
              >
                {customer.isActive ? '⏸ Deactivate' : '▶ Activate'}
              </button>
              <ActionButton
                variant="secondary"
                href={`/customers/${customer._id}/edit`}
                title="Edit customer"
                icon={<Pencil size={15} />}
              />
              <ActionButton
                variant="danger"
                onClick={handleDelete}
                title="Delete customer"
                icon={<Trash2 size={15} />}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Avatar Card */}
            <Card>
              <div className="flex flex-col items-center text-center">
                <div className="relative h-28 w-28 overflow-hidden rounded-full bg-gradient-to-br from-sky-100 to-sky-200 mb-3 ring-4 ring-sky-100">
                  {customer.avatar ? (
                    <Image
                      src={customer.avatar}
                      alt={customer.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sky-600 text-4xl font-bold">
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <h2 className="text-lg font-bold text-secondary-900">{customer.name}</h2>
                <p className="text-xs text-secondary-500 font-mono">
                  {customer.customerCode || '—'}
                </p>
                {customer.gender && (
                  <p className="text-xs text-secondary-400 mt-1">{customer.gender}</p>
                )}
              </div>
            </Card>

            {/* Quick Stats */}
            <Card>
              <h3 className="text-sm font-semibold text-secondary-700 uppercase tracking-wider mb-3">
                Financial Summary
              </h3>
              <div className="space-y-3">
                <div className="rounded-xl bg-sky-50 border border-sky-100 p-4 text-center">
                  <p className="text-xs font-medium text-sky-600 uppercase tracking-wider">
                    Total Purchased
                  </p>
                  <p className="text-2xl font-bold text-sky-700 mt-1">৳{safe(totalPurchased)}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-orange-50 border border-orange-100 p-3 text-center">
                    <p className="text-xs font-medium text-orange-600 uppercase">Due</p>
                    <p className="text-xl font-bold text-orange-700">৳{safe(dueAmount)}</p>
                    {dueAmount > 0 && canManage && (
                      <button
                        onClick={() => {
                          setPaymentAmount('');
                          setPaymentNote('');
                          setIsPayModalOpen(true);
                        }}
                        className="mt-2 text-[11px] font-bold bg-orange-600 text-white px-2 py-1.5 rounded-lg shadow-sm hover:bg-orange-700 w-full transition"
                      >
                        Pay Due
                      </button>
                    )}
                  </div>
                  <div className="rounded-xl bg-purple-50 border border-purple-100 p-3 text-center">
                    <p className="text-xs font-medium text-purple-600 uppercase">Points</p>
                    <p className="text-xl font-bold text-purple-700">{loyaltyPoints}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-gray-50 p-3 text-center">
                    <p className="text-xs text-secondary-500">Transactions</p>
                    <p className="text-lg font-bold text-secondary-900">{totalTransactions}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3 text-center">
                    <p className="text-xs text-secondary-500">Last Purchase</p>
                    <p className="text-lg font-bold text-secondary-900">
                      {daysSinceLastPurchase !== null ? `${daysSinceLastPurchase}d ago` : '—'}
                    </p>
                  </div>
                </div>
                {/* Avg per transaction */}
                {totalTransactions > 0 && (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-center">
                    <p className="text-xs font-medium text-emerald-600 uppercase">
                      Avg per Transaction
                    </p>
                    <p className="text-lg font-bold text-emerald-700">
                      ৳{(totalPurchased / totalTransactions).toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Contact & Personal Info */}
            <Card>
              <h3 className="text-sm font-semibold text-secondary-700 uppercase tracking-wider mb-2">
                Contact & Personal
              </h3>
              <InfoRow
                label="Phone"
                value={
                  <a href={`tel:${customer.phone}`} className="text-sky-600 hover:underline">
                    {customer.phone}
                  </a>
                }
              />
              <InfoRow
                label="Email"
                value={
                  customer.email ? (
                    <a href={`mailto:${customer.email}`} className="text-sky-600 hover:underline">
                      {customer.email}
                    </a>
                  ) : undefined
                }
              />
              <InfoRow label="Gender" value={customer.gender} />
              <InfoRow
                label="Date of Birth"
                value={
                  customer.dateOfBirth
                    ? new Date(customer.dateOfBirth).toLocaleDateString()
                    : undefined
                }
              />
              <InfoRow
                label="Address"
                value={[customer.address, customer.city].filter(Boolean).join(', ') || undefined}
              />
              <InfoRow
                label="Last Purchase"
                value={
                  customer.lastPurchaseDate
                    ? new Date(customer.lastPurchaseDate).toLocaleDateString()
                    : undefined
                }
              />
              <InfoRow label="Last Updated" value={new Date(customer.updatedAt).toLocaleString()} />
            </Card>

            {/* Notes */}
            {customer.notes && (
              <Card>
                <h3 className="text-sm font-semibold text-secondary-700 uppercase tracking-wider mb-2">
                  Notes
                </h3>
                <p className="text-sm text-secondary-600 leading-relaxed whitespace-pre-wrap">
                  {customer.notes}
                </p>
              </Card>
            )}

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('purchases')}
                className={`flex-1 py-3 text-sm font-bold border-b-2 transition ${
                  activeTab === 'purchases'
                    ? 'border-sky-600 text-sky-700 bg-sky-50/50'
                    : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:bg-gray-50'
                }`}
              >
                Purchase History
              </button>
              <button
                onClick={() => setActiveTab('payments')}
                className={`flex-1 py-3 text-sm font-bold border-b-2 transition ${
                  activeTab === 'payments'
                    ? 'border-sky-600 text-sky-700 bg-sky-50/50'
                    : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:bg-gray-50'
                }`}
              >
                Payment History
              </button>
            </div>

            {/* History Cards */}
            <Card>
              {activeTab === 'purchases' ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-secondary-700 uppercase tracking-wider">
                      Purchases
                    </h3>
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-secondary-600">
                      {purchaseTotal}
                    </span>
                  </div>
                  {purchases.length === 0 ? (
                    <div className="text-center py-10 text-secondary-400">
                      <p className="text-4xl mb-2">🧾</p>
                      <p className="text-sm font-medium text-secondary-500">No purchases yet</p>
                      <p className="text-xs text-secondary-400 mt-1">
                        Purchases will appear here once the customer makes a transaction
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100">
                              <th className="px-3 py-2 text-left font-semibold text-secondary-600">
                                Invoice
                              </th>
                              <th className="px-3 py-2 text-left font-semibold text-secondary-600">
                                Date
                              </th>
                              <th className="px-3 py-2 text-center font-semibold text-secondary-600">
                                Method
                              </th>
                              <th className="px-3 py-2 text-right font-semibold text-secondary-600">
                                Total
                              </th>
                              <th className="px-3 py-2 text-right font-semibold text-secondary-600">
                                Paid
                              </th>
                              <th className="px-3 py-2 text-right font-semibold text-secondary-600">
                                Due
                              </th>
                              <th className="px-3 py-2 text-center font-semibold text-secondary-600">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {purchases.map((p) => (
                              <tr key={p._id} className="hover:bg-gray-50 transition">
                                <td className="px-3 py-2.5 font-mono text-xs text-secondary-700">
                                  {p.saleNumber}
                                </td>
                                <td className="px-3 py-2.5 text-secondary-600 text-xs">
                                  {new Date(p.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-secondary-600 uppercase">
                                    {p.paymentMethod}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 text-right font-semibold">
                                  ৳{(p.total ?? 0).toFixed(2)}
                                </td>
                                <td className="px-3 py-2.5 text-right text-secondary-600">
                                  ৳{(p.paidAmount ?? 0).toFixed(2)}
                                </td>
                                <td className="px-3 py-2.5 text-right">
                                  <span
                                    className={`text-xs font-semibold ${(p.dueAmount ?? 0) > 0 ? 'text-orange-600' : 'text-emerald-600'}`}
                                  >
                                    ৳{(p.dueAmount ?? 0).toFixed(2)}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                      p.status === 'completed'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : p.status === 'pending'
                                          ? 'bg-amber-100 text-amber-700'
                                          : 'bg-red-100 text-red-700'
                                    }`}
                                  >
                                    {p.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {purchasePages > 1 && (
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs text-secondary-500">
                            Page {purchasePage} of {purchasePages}
                          </p>
                          <div className="flex gap-2">
                            <button
                              disabled={purchasePage === 1}
                              onClick={() => setPurchasePage(purchasePage - 1)}
                              className="rounded border px-2 py-1 text-xs font-medium text-secondary-600 hover:bg-gray-50 disabled:opacity-40 transition"
                            >
                              ← Prev
                            </button>
                            <button
                              disabled={purchasePage === purchasePages}
                              onClick={() => setPurchasePage(purchasePage + 1)}
                              className="rounded border px-2 py-1 text-xs font-medium text-secondary-600 hover:bg-gray-50 disabled:opacity-40 transition"
                            >
                              Next →
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-secondary-700 uppercase tracking-wider">
                      Payments
                    </h3>
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-secondary-600">
                      {paymentHistoryTotal}
                    </span>
                  </div>
                  {paymentHistory.length === 0 ? (
                    <div className="text-center py-10 text-secondary-400">
                      <p className="text-4xl mb-2">💳</p>
                      <p className="text-sm font-medium text-secondary-500">No payments yet</p>
                      <p className="text-xs text-secondary-400 mt-1">
                        Due payments will appear here once processed
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100">
                              <th className="px-3 py-2 text-left font-semibold text-secondary-600">
                                Date
                              </th>
                              <th className="px-3 py-2 text-left font-semibold text-secondary-600">
                                Method
                              </th>
                              <th className="px-3 py-2 text-right font-semibold text-secondary-600">
                                Amount
                              </th>
                              <th className="px-3 py-2 text-left font-semibold text-secondary-600">
                                Notes
                              </th>
                              <th className="px-3 py-2 text-left font-semibold text-secondary-600">
                                Processed By
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {paymentHistory.map((p) => (
                              <tr key={p._id} className="hover:bg-gray-50 transition">
                                <td className="px-3 py-2.5 text-secondary-600 text-xs">
                                  {new Date(p.paymentDate).toLocaleString()}
                                </td>
                                <td className="px-3 py-2.5">
                                  <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-secondary-600 uppercase">
                                    {p.paymentMethod}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 text-right font-bold text-sky-700">
                                  ৳{p.amount.toFixed(2)}
                                </td>
                                <td className="px-3 py-2.5 text-xs text-secondary-600 max-w-[150px] truncate">
                                  {p.note || '—'}
                                </td>
                                <td className="px-3 py-2.5 text-xs text-secondary-600">
                                  {p.createdBy?.firstName} {p.createdBy?.lastName}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {paymentHistoryPages > 1 && (
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs text-secondary-500">
                            Page {paymentHistoryPage} of {paymentHistoryPages}
                          </p>
                          <div className="flex gap-2">
                            <button
                              disabled={paymentHistoryPage === 1}
                              onClick={() => setPaymentHistoryPage(paymentHistoryPage - 1)}
                              className="rounded border px-2 py-1 text-xs font-medium text-secondary-600 hover:bg-gray-50 disabled:opacity-40 transition"
                            >
                              ← Prev
                            </button>
                            <button
                              disabled={paymentHistoryPage === paymentHistoryPages}
                              onClick={() => setPaymentHistoryPage(paymentHistoryPage + 1)}
                              className="rounded border px-2 py-1 text-xs font-medium text-secondary-600 hover:bg-gray-50 disabled:opacity-40 transition"
                            >
                              Next →
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-secondary-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => !isPaying && setIsPayModalOpen(false)}
          />
          <div className="relative w-full max-w-md scale-100 transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-2xl transition-all">
            <h3 className="text-lg font-bold leading-6 text-secondary-900 mb-4">
              Pay Customer Due
            </h3>
            <div className="mb-4 rounded-xl bg-orange-50 p-4 border border-orange-100">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-orange-800">Total Due</span>
                <span className="text-xl font-bold text-orange-700">৳{safe(dueAmount)}</span>
              </div>
            </div>

            <form onSubmit={handlePayDue} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-secondary-700">
                  Payment Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-500 font-bold">
                    ৳
                  </span>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    max={dueAmount}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 py-2.5 pl-8 pr-3 text-sm font-semibold focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-secondary-700">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-sm font-semibold focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="mobile">Mobile Banking</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-secondary-700">
                  Notes (Optional)
                </label>
                <textarea
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  placeholder="Any additional details..."
                  rows={2}
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsPayModalOpen(false)}
                  disabled={isPaying}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPaying || !paymentAmount || Number(paymentAmount) <= 0}
                >
                  {isPaying ? 'Processing...' : 'Confirm Payment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
