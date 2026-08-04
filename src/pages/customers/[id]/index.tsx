import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { ArrowLeft, CreditCard, Pencil, ReceiptText } from 'lucide-react';
import toast from 'react-hot-toast';
import MainLayout from '@/components/Layout/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ActionButton, Button, Card } from '@/components/Common/FormElements';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency } from '@/utils/format';

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
  dueAmount?: number;
  balance?: number;
  totalPurchased?: number;
  totalTransactions?: number;
  lastPurchaseDate?: string;
  loyaltyPoints?: number;
  notes?: string;
  isActive: boolean;
  createdAt?: string;
}

interface SaleHistoryItem {
  _id: string;
  saleNumber?: string;
  total: number;
  paidAmount: number;
  dueAmount: number;
  status: string;
  paymentMethod?: string;
  createdAt?: string;
  items?: Array<{
    productName?: string;
    quantity: number;
    subtotal?: number;
    productId?: { name?: string };
  }>;
}

interface CustomerPaymentItem {
  _id: string;
  amount: number;
  paymentMethod: string;
  paymentDate?: string;
  note?: string;
  createdAt?: string;
  createdBy?: {
    firstName?: string;
    lastName?: string;
  };
}

interface TransactionHistoryItem {
  id: string;
  type: 'sale' | 'payment';
  date?: string;
  reference: string;
  description: string;
  method?: string;
  saleAmount: number;
  paidAmount: number;
  dueChange: number;
  balanceAfter: number;
  status?: string;
  saleId?: string;
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 py-3 last:border-0">
      <span className="shrink-0 text-sm font-medium text-secondary-500">{label}</span>
      <span className="text-right text-sm font-semibold text-secondary-900">{value || '-'}</span>
    </div>
  );
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
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [transactionHistory, setTransactionHistory] = useState<TransactionHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'cheque' | 'mobile'>('cash');
  const [paymentNote, setPaymentNote] = useState('');
  const [paying, setPaying] = useState(false);

  const fetchCustomer = React.useCallback(async () => {
    if (!id) return;

    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/customers?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        setCustomer(res.data.data);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load customer');
      router.push('/customers');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  const fetchTransactionHistory = React.useCallback(async () => {
    if (!id) return;

    setHistoryLoading(true);
    try {
      const token = localStorage.getItem('token');
      const [salesRes, paymentsRes] = await Promise.all([
        axios.get(`/api/customers/${id}/purchases?limit=200`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`/api/customers/${id}/payments?limit=200`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const sales: SaleHistoryItem[] = salesRes.data.success
        ? salesRes.data.data.purchases || []
        : [];
      const payments: CustomerPaymentItem[] = paymentsRes.data.success
        ? paymentsRes.data.data.payments || []
        : [];

      const saleTransactions: TransactionHistoryItem[] = sales.map((sale) => ({
        id: `sale-${sale._id}`,
        type: 'sale',
        date: sale.createdAt,
        reference: sale.saleNumber || 'Sale',
        description:
          (sale.items || [])
            .map((item) => item.productName || item.productId?.name)
            .filter(Boolean)
            .join(', ') || 'Sale order',
        method: sale.paymentMethod,
        saleAmount: Number(sale.total || 0),
        paidAmount: Number(sale.paidAmount || 0),
        dueChange: Number(sale.dueAmount || 0),
        balanceAfter: 0,
        status: sale.status,
        saleId: sale._id,
      }));

      const paymentTransactions: TransactionHistoryItem[] = payments.map((payment) => ({
        id: `payment-${payment._id}`,
        type: 'payment',
        date: payment.paymentDate || payment.createdAt,
        reference: 'Due Payment',
        description: payment.note || 'Customer due payment',
        method: payment.paymentMethod,
        saleAmount: 0,
        paidAmount: Number(payment.amount || 0),
        dueChange: -Number(payment.amount || 0),
        balanceAfter: 0,
        status: 'received',
      }));

      let runningDue = 0;
      const chronologicalTransactions = [...saleTransactions, ...paymentTransactions].sort(
        (a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime()
      );
      const transactionsWithBalance = chronologicalTransactions.map((transaction) => {
        runningDue = Math.max(0, runningDue + transaction.dueChange);
        return {
          ...transaction,
          balanceAfter: runningDue,
        };
      });

      setTransactionHistory(
        transactionsWithBalance.sort(
          (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
        )
      );
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load transaction history');
    } finally {
      setHistoryLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetchCustomer();
    fetchTransactionHistory();
  }, [id, fetchCustomer, fetchTransactionHistory]);

  if (loading) {
    return (
      <MainLayout title="Customer Detail">
        <div className="flex h-64 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-sky-600" />
        </div>
      </MainLayout>
    );
  }

  if (!customer) return null;

  const canManage = auth.user?.role === 'admin' || auth.user?.role === 'manager';
  const normalizedDue = Math.max(customer.dueAmount ?? 0, customer.balance ?? 0);
  const canPayDue = normalizedDue > 0;

  const openPayModal = () => {
    setPayAmount(normalizedDue.toFixed(2));
    setPaymentMethod('cash');
    setPaymentNote('');
    setIsPayModalOpen(true);
  };

  const handlePayDue = async () => {
    const amount = Number(Number(payAmount).toFixed(2));
    if (!amount || amount <= 0) {
      toast.error('Enter a valid payment amount');
      return;
    }
    if (amount > normalizedDue) {
      toast.error('Payment amount cannot exceed due');
      return;
    }

    setPaying(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `/api/customers/${customer._id}/pay`,
        { amount, paymentMethod, note: paymentNote },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        toast.success('Due payment received');
        setIsPayModalOpen(false);
        await Promise.all([fetchCustomer(), fetchTransactionHistory()]);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to receive payment');
    } finally {
      setPaying(false);
    }
  };

  return (
    <MainLayout title={customer.name}>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => router.push('/customers')}
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-secondary-600 transition hover:bg-gray-50"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div className="flex flex-wrap gap-2">
            {canManage && (
              <ActionButton
                variant="edit"
                href={`/customers/${customer._id}/edit`}
                label="Edit Customer"
                icon={<Pencil size={12} />}
              />
            )}
          </div>
        </div>

        <Card>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-sky-100">
              {customer.avatar ? (
                <Image
                  src={customer.avatar}
                  alt={customer.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center text-3xl font-bold text-sky-700">
                  {customer.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-bold text-secondary-900">{customer.name}</h1>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    customer.isActive
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {customer.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium text-secondary-500">
                {customer.customerCode || 'No customer code'}
              </p>
            </div>
            {canPayDue && (
              <Button
                type="button"
                onClick={openPayModal}
                size="lg"
                className="w-full bg-slate-950 shadow-slate-300 hover:bg-slate-800 sm:w-auto"
              >
                <CreditCard size={18} />
                Pay Due
              </Button>
            )}
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs font-bold uppercase text-secondary-400">Purchased</p>
            <p className="mt-1 text-xl font-bold text-secondary-900">
              {formatCurrency(customer.totalPurchased ?? 0)}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-bold uppercase text-secondary-400">Due</p>
            <p className="mt-1 text-xl font-bold text-orange-600">
              {formatCurrency(normalizedDue)}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-bold uppercase text-secondary-400">Transactions</p>
            <p className="mt-1 text-xl font-bold text-secondary-900">
              {customer.totalTransactions ?? 0}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-bold uppercase text-secondary-400">Points</p>
            <p className="mt-1 text-xl font-bold text-secondary-900">
              {customer.loyaltyPoints ?? 0}
            </p>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Contact Information">
            <InfoRow label="Phone" value={customer.phone} />
            <InfoRow label="Email" value={customer.email} />
            <InfoRow label="Address" value={customer.address} />
            <InfoRow label="City" value={customer.city} />
          </Card>

          <Card title="Customer Information">
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
              label="Last Purchase"
              value={
                customer.lastPurchaseDate
                  ? new Date(customer.lastPurchaseDate).toLocaleDateString()
                  : undefined
              }
            />
            <InfoRow
              label="Created"
              value={
                customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : undefined
              }
            />
          </Card>
        </div>

        {customer.notes && (
          <Card title="Notes">
            <p className="whitespace-pre-wrap text-sm font-medium text-secondary-700">
              {customer.notes}
            </p>
          </Card>
        )}

        <Card title="Transaction History">
          {historyLoading ? (
            <div className="flex h-28 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-sky-600" />
            </div>
          ) : transactionHistory.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <ReceiptText className="mx-auto mb-2 text-slate-300" size={34} />
              <p className="text-sm font-semibold text-slate-500">No transactions found</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-bold uppercase text-secondary-400">Bill</p>
                  <p className="mt-1 text-sm font-semibold text-secondary-700">
                    Total sale amount for the order
                  </p>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-xs font-bold uppercase text-emerald-600">Received</p>
                  <p className="mt-1 text-sm font-semibold text-emerald-800">
                    Cash/card/mobile payment received
                  </p>
                </div>
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                  <p className="text-xs font-bold uppercase text-orange-600">Due Balance</p>
                  <p className="mt-1 text-sm font-semibold text-orange-800">
                    Customer due remaining after this row
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-200">
                <div className="hidden grid-cols-[1fr_1.35fr_0.75fr_0.8fr_0.85fr_0.85fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase text-secondary-500 md:grid">
                  <span>Date / Type</span>
                  <span>Details</span>
                  <span>Method</span>
                  <span className="text-right">Bill</span>
                  <span className="text-right">Received</span>
                  <span className="text-right">Due Balance</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {transactionHistory.map((transaction) => (
                    <button
                      key={transaction.id}
                      type="button"
                      onClick={() => {
                        if (transaction.saleId) router.push(`/sales/receipt/${transaction.saleId}`);
                      }}
                      className={`grid w-full grid-cols-1 gap-2 px-4 py-4 text-left transition md:grid-cols-[1fr_1.35fr_0.75fr_0.8fr_0.85fr_0.85fr] md:items-center md:gap-3 ${
                        transaction.saleId ? 'hover:bg-slate-50' : 'cursor-default bg-emerald-50/40'
                      }`}
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-secondary-900">
                            {transaction.reference}
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${
                              transaction.type === 'payment'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-sky-100 text-sky-700'
                            }`}
                          >
                            {transaction.type === 'payment' ? 'Payment' : 'Sale'}
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-medium text-secondary-500">
                          {transaction.date ? new Date(transaction.date).toLocaleDateString() : '-'}
                          {transaction.status ? ` - ${transaction.status}` : ''}
                        </p>
                      </div>
                      <p className="line-clamp-2 text-sm font-medium text-secondary-600">
                        {transaction.description}
                      </p>
                      <p className="text-sm font-semibold capitalize text-secondary-600">
                        {transaction.method || '-'}
                      </p>
                      <p className="text-sm font-bold text-secondary-900 md:text-right">
                        {transaction.saleAmount > 0 ? formatCurrency(transaction.saleAmount) : '-'}
                      </p>
                      <p className="text-sm font-semibold text-emerald-700 md:text-right">
                        {formatCurrency(transaction.paidAmount)}
                      </p>
                      <div className="text-sm md:text-right">
                        <p
                          className={`font-bold ${
                            transaction.balanceAfter > 0 ? 'text-orange-600' : 'text-secondary-500'
                          }`}
                        >
                          {formatCurrency(transaction.balanceAfter)}
                        </p>
                        <p
                          className={`mt-1 text-xs font-semibold ${
                            transaction.dueChange > 0 ? 'text-orange-600' : 'text-emerald-700'
                          }`}
                        >
                          {transaction.dueChange > 0
                            ? `Due added ${formatCurrency(transaction.dueChange)}`
                            : `Due paid ${formatCurrency(Math.abs(transaction.dueChange))}`}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 p-5">
              <h3 className="text-lg font-bold text-secondary-900">Pay Due Payment</h3>
              <p className="mt-1 text-sm font-medium text-secondary-500">
                Outstanding due {formatCurrency(normalizedDue)}
              </p>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-secondary-800">
                  Amount
                </label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(event) => setPayAmount(event.target.value)}
                  min="0"
                  max={normalizedDue}
                  step="0.01"
                  className="input-field w-full text-lg font-bold"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-secondary-800">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value as any)}
                  className="input-field w-full"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="mobile">Mobile</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-secondary-800">Note</label>
                <textarea
                  value={paymentNote}
                  onChange={(event) => setPaymentNote(event.target.value)}
                  rows={3}
                  className="input-field w-full resize-none"
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="flex gap-3 border-t border-slate-200 bg-slate-50 p-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsPayModalOpen(false)}
                disabled={paying}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handlePayDue}
                isLoading={paying}
                disabled={!payAmount || Number(payAmount) <= 0}
                className="flex-1"
              >
                Receive
              </Button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
