import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Link from 'next/link';
import MainLayout from '@/components/Layout/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/Common/FormElements';
import {
  ArrowLeft,
  Truck,
  Phone,
  Mail,
  MapPin,
  Star,
  Plus,
  FileText,
  TrendingUp,
  AlertCircle,
  CreditCard,
  ShoppingBag,
  Receipt,
  BookOpen,
  X,
  Hash,
  Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/utils/format';

const fmtDate = (d: any) =>
  d
    ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

// Group ledger entries by date string
function groupByDate(entries: any[]) {
  const map = new Map<string, any[]>();
  entries.forEach((e) => {
    const key = fmtDate(e.date);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  });
  return Array.from(map.entries());
}

function TypeChip({ type }: { type: string }) {
  const cfg: Record<string, { cls: string; dot: string; label: string }> = {
    Purchase: {
      cls: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
      dot: 'bg-indigo-500',
      label: 'Purchase',
    },
    Payment: {
      cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
      dot: 'bg-emerald-500',
      label: 'Payment',
    },
    Due: { cls: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500', label: 'Due' },
    Refund: {
      cls: 'bg-amber-50 text-amber-700 ring-amber-200',
      dot: 'bg-amber-500',
      label: 'Refund',
    },
  };
  const c = cfg[type] || cfg.Purchase;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${c.cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function InfoRow({ icon: Icon, value }: { icon: any; value: string }) {
  return value ? (
    <div className="flex items-center gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100">
        <Icon size={13} className="text-slate-500" />
      </div>
      <span className="text-[13px] font-medium text-slate-700 truncate">{value}</span>
    </div>
  ) : null;
}

function StatCard({
  label,
  value,
  sub,
  accent,
  bg,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
  bg: string;
}) {
  return (
    <div className={`rounded-2xl p-4 ring-1 ${bg}`}>
      <p className={`text-[10px] font-bold uppercase tracking-wider ${accent} opacity-70`}>
        {label}
      </p>
      <p className={`mt-1 text-xl font-extrabold ${accent}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    paid: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    pending: 'bg-amber-50 text-amber-700 ring-amber-200',
    partial: 'bg-sky-50 text-sky-700 ring-sky-200',
    due: 'bg-rose-50 text-rose-700 ring-rose-200',
    draft: 'bg-slate-100 text-slate-600 ring-slate-200',
    cancelled: 'bg-rose-50 text-rose-700 ring-rose-200',
  };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ring-1 ${map[status] || map.pending}`}
    >
      {status}
    </span>
  );
}

type Tab = 'overview' | 'purchases' | 'payments' | 'ledger';

export default function SupplierDetails() {
  return (
    <ProtectedRoute requiredRole={['admin', 'manager']}>
      <SupplierDetailsContent />
    </ProtectedRoute>
  );
}

function SupplierDetailsContent() {
  const router = useRouter();
  const { id } = router.query;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payNote, setPayNote] = useState('');
  const [paying, setPaying] = useState(false);

  const fetchLedger = useCallback(async () => {
    if (!id) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/inventory/suppliers/${id}/ledger`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) setData(res.data.data);
    } catch {
      toast.error('Failed to load supplier ledger');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const handlePayDue = async () => {
    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (amount > Number(supplier?.dueAmount || 0)) {
      toast.error('Amount exceeds due');
      return;
    }
    setPaying(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `/api/inventory/suppliers/${id}/pay-due`,
        { amount, paymentDate: payDate, note: payNote },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        toast.success('Payment recorded!');
        setIsPayModalOpen(false);
        setPayAmount('');
        setPayNote('');
        fetchLedger();
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed');
    } finally {
      setPaying(false);
    }
  };

  if (loading)
    return (
      <MainLayout title="Supplier">
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" />
        </div>
      </MainLayout>
    );
  if (!data) return null;

  const { supplier, ledger } = data;
  const purchases = ledger.filter((e: any) => e.type === 'Purchase');
  const payments = ledger.filter((e: any) => e.type === 'Payment');
  const totalPaid = payments.reduce((s: number, p: any) => s + (p.paid || 0), 0);
  const tabs: { key: Tab; label: string; icon: any; count?: number }[] = [
    { key: 'overview', label: 'Overview', icon: TrendingUp },
    { key: 'purchases', label: 'Purchases', icon: ShoppingBag, count: purchases.length },
    { key: 'payments', label: 'Payments', icon: CreditCard, count: payments.length },
    { key: 'ledger', label: 'Ledger', icon: BookOpen, count: ledger.length },
  ];

  return (
    <MainLayout title={`Supplier — ${supplier.name}`}>
      <div className="space-y-5 max-w-6xl mx-auto">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => router.push('/inventory/suppliers')}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            <ArrowLeft size={15} /> Back
          </button>
          <div className="flex gap-2">
            <Link href={`/inventory/purchase?supplierId=${supplier._id}`}>
              <button className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:from-sky-700 hover:to-indigo-700 transition">
                <Plus size={15} /> New Purchase
              </button>
            </Link>
            <Link href={`/inventory/suppliers/${supplier._id}/statement`}>
              <button className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                <FileText size={15} /> Statement
              </button>
            </Link>
          </div>
        </div>

        {/* Profile Header Card */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-1.5 w-full bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500" />
          <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start">
            {/* Avatar */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg shadow-indigo-200">
              <Truck size={28} />
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start gap-3">
                <div>
                  <h1 className="text-xl font-extrabold text-slate-900">{supplier.name}</h1>
                  <p className="mt-0.5 text-xs font-mono text-slate-400">{supplier.supplierCode}</p>
                </div>
                <div className="flex items-center gap-0.5 rounded-full bg-amber-50 px-2.5 py-1 ring-1 ring-amber-100">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={11}
                      fill={i < (supplier.rating || 5) ? '#f59e0b' : 'none'}
                      className="text-amber-400"
                    />
                  ))}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                <InfoRow icon={Phone} value={supplier.phone} />
                <InfoRow icon={Mail} value={supplier.email || ''} />
                <InfoRow
                  icon={MapPin}
                  value={[supplier.address, supplier.city].filter(Boolean).join(', ')}
                />
              </div>
            </div>
            {/* Due Pay Button */}
            {supplier.dueAmount > 0 && (
              <button
                onClick={() => setIsPayModalOpen(true)}
                className="shrink-0 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-rose-700 transition"
              >
                Pay Due {formatCurrency(supplier.dueAmount)}
              </button>
            )}
          </div>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 px-6 py-4 sm:grid-cols-4">
            <StatCard
              label="Total Purchased"
              value={formatCurrency(supplier.totalPurchased)}
              sub={`${purchases.length} orders`}
              accent="text-indigo-700"
              bg="bg-indigo-50 ring-indigo-100"
            />
            <StatCard
              label="Total Paid"
              value={formatCurrency(totalPaid)}
              sub={`${payments.length} payments`}
              accent="text-emerald-700"
              bg="bg-emerald-50 ring-emerald-100"
            />
            <StatCard
              label="Outstanding Due"
              value={formatCurrency(supplier.dueAmount)}
              sub={supplier.dueAmount > 0 ? 'Needs attention' : 'All clear'}
              accent={supplier.dueAmount > 0 ? 'text-rose-700' : 'text-emerald-700'}
              bg={
                supplier.dueAmount > 0
                  ? 'bg-rose-50 ring-rose-100'
                  : 'bg-emerald-50 ring-emerald-100'
              }
            />
            <StatCard
              label="Last Transaction"
              value={fmtDate(supplier.lastTransactionDate)}
              accent="text-slate-700"
              bg="bg-slate-50 ring-slate-200"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
          {tabs.map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${activeTab === key ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Icon size={13} /> {label}
              {count !== undefined && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${activeTab === key ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}
                >
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="p-6 space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Supplier Details
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  ['Supplier Code', supplier.supplierCode],
                  ['Phone', supplier.phone],
                  ['Email', supplier.email || '—'],
                  ['Contact Person', supplier.contactPerson || '—'],
                  ['Address', supplier.address || '—'],
                  ['City', supplier.city || '—'],
                  ['Credit Limit', formatCurrency(supplier.creditLimit || 0)],
                  ['Rating', `${supplier.rating || 5} / 5`],
                  ['Status', supplier.isActive !== false ? 'Active' : 'Inactive'],
                  ['Member Since', fmtDate(supplier.createdAt)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-start justify-between rounded-xl bg-slate-50 px-4 py-3"
                  >
                    <span className="text-xs font-semibold text-slate-400">{label}</span>
                    <span className="text-xs font-bold text-slate-700 text-right max-w-[60%] truncate">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
              {supplier.notes && (
                <div className="rounded-xl bg-amber-50 px-4 py-3 ring-1 ring-amber-100">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">
                    Notes
                  </p>
                  <p className="text-sm text-slate-700">{supplier.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* PURCHASES */}
          {activeTab === 'purchases' && (
            <div className="p-4">
              <div className="mb-4 flex items-center justify-between px-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                  Purchase Orders
                </h3>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                  {purchases.length}
                </span>
              </div>
              {purchases.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center text-center">
                  <ShoppingBag size={28} className="text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-400">No purchases yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="px-3 py-3">Reference</th>
                        <th className="px-3 py-3">Date</th>
                        <th className="px-3 py-3 text-right">Total</th>
                        <th className="px-3 py-3 text-right">Paid</th>
                        <th className="px-3 py-3 text-right">Due</th>
                        <th className="px-3 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {purchases.map((p: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50 transition">
                          <td className="px-3 py-3 text-xs font-bold font-mono text-sky-600">
                            {p.reference}
                          </td>
                          <td className="px-3 py-3 text-xs text-slate-500">{fmtDate(p.date)}</td>
                          <td className="px-3 py-3 text-right text-xs font-bold text-slate-800">
                            {formatCurrency(p.amount)}
                          </td>
                          <td className="px-3 py-3 text-right text-xs font-semibold text-emerald-600">
                            {formatCurrency(p.paid)}
                          </td>
                          <td className="px-3 py-3 text-right text-xs font-semibold text-rose-600">
                            {formatCurrency(p.balance)}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <StatusBadge status={p.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* PAYMENTS */}
          {activeTab === 'payments' && (
            <div className="p-4">
              <div className="mb-4 flex items-center justify-between px-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                  Payment Records
                </h3>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                  {payments.length}
                </span>
              </div>
              {payments.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center text-center">
                  <CreditCard size={28} className="text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-400">No payments recorded</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {payments.map((p: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 hover:border-slate-200 transition"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Hash size={10} className="text-slate-400" />
                          <span className="text-xs font-bold font-mono text-sky-600">
                            {p.reference}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1">
                          <Calendar size={9} className="text-slate-400" />
                          <span className="text-[11px] text-slate-400">{fmtDate(p.date)}</span>
                        </div>
                        {p.note && (
                          <p className="mt-1 text-[11px] text-slate-500 italic">{p.note}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-extrabold text-emerald-600">
                          {formatCurrency(p.paid)}
                        </p>
                        <StatusBadge status="paid" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* LEDGER */}
          {activeTab === 'ledger' && (
            <div className="p-5 space-y-5">
              {/* Ledger Summary Cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  {
                    label: 'Total Purchase',
                    value: formatCurrency(
                      purchases.reduce((s: number, p: any) => s + (p.amount || 0), 0)
                    ),
                    dot: 'bg-indigo-500',
                    txt: 'text-indigo-700',
                    bg: 'bg-indigo-50 ring-1 ring-indigo-100',
                  },
                  {
                    label: 'Total Paid',
                    value: formatCurrency(totalPaid),
                    dot: 'bg-emerald-500',
                    txt: 'text-emerald-700',
                    bg: 'bg-emerald-50 ring-1 ring-emerald-100',
                  },
                  {
                    label: 'Current Due',
                    value: formatCurrency(supplier.dueAmount),
                    dot: supplier.dueAmount > 0 ? 'bg-rose-500' : 'bg-emerald-500',
                    txt: supplier.dueAmount > 0 ? 'text-rose-700' : 'text-emerald-700',
                    bg:
                      supplier.dueAmount > 0
                        ? 'bg-rose-50 ring-1 ring-rose-100'
                        : 'bg-emerald-50 ring-1 ring-emerald-100',
                  },
                  {
                    label: 'Last Transaction',
                    value: fmtDate(supplier.lastTransactionDate),
                    dot: 'bg-slate-400',
                    txt: 'text-slate-700',
                    bg: 'bg-slate-50 ring-1 ring-slate-200',
                  },
                ].map(({ label, value, dot, txt, bg }) => (
                  <div key={label} className={`rounded-xl p-3 ${bg}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`h-2 w-2 rounded-full ${dot}`} />
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {label}
                      </p>
                    </div>
                    <p className={`text-[13px] font-extrabold ${txt}`}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-3 rounded-xl bg-slate-50 px-4 py-2.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 self-center mr-1">
                  Legend:
                </p>
                {[
                  {
                    type: 'Purchase',
                    cls: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
                    dot: 'bg-indigo-500',
                  },
                  {
                    type: 'Payment',
                    cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
                    dot: 'bg-emerald-500',
                  },
                  {
                    type: 'Due',
                    cls: 'bg-rose-50 text-rose-700 ring-rose-200',
                    dot: 'bg-rose-500',
                  },
                  {
                    type: 'Refund',
                    cls: 'bg-amber-50 text-amber-700 ring-amber-200',
                    dot: 'bg-amber-500',
                  },
                ].map(({ type, cls, dot }) => (
                  <span
                    key={type}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${cls}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                    {type}
                  </span>
                ))}
              </div>

              {/* Date-grouped transactions */}
              {ledger.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center text-center">
                  <BookOpen size={28} className="text-slate-300 mb-2" />
                  <p className="text-[13px] font-semibold text-slate-400">No transactions found.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {groupByDate(ledger).map(([dateStr, entries]) => (
                    <div key={dateStr}>
                      {/* Date separator */}
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1">
                          <Calendar size={11} className="text-slate-300" />
                          <span className="text-[11px] font-bold text-white">{dateStr}</span>
                        </div>
                        <div className="flex-1 h-px bg-slate-100" />
                        <span className="text-[10px] font-semibold text-slate-400">
                          {entries.length} txn{entries.length > 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Transactions for that date */}
                      <div className="space-y-2">
                        {entries.map((e: any, i: number) => (
                          <div
                            key={i}
                            className={`flex items-stretch gap-0 overflow-hidden rounded-xl border transition hover:shadow-sm ${
                              e.type === 'Payment'
                                ? 'border-emerald-100 bg-emerald-50/40'
                                : 'border-slate-100 bg-white'
                            }`}
                          >
                            {/* Left color strip */}
                            <div
                              className={`w-1 shrink-0 ${
                                e.type === 'Payment'
                                  ? 'bg-emerald-400'
                                  : e.type === 'Refund'
                                    ? 'bg-amber-400'
                                    : e.balance > 0
                                      ? 'bg-rose-400'
                                      : 'bg-indigo-400'
                              }`}
                            />

                            <div className="flex flex-1 flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
                              {/* Type + Ref */}
                              <div className="min-w-[130px]">
                                <TypeChip type={e.type} />
                                <p className="mt-1 font-mono text-[12px] font-bold text-sky-700">
                                  {e.reference}
                                </p>
                              </div>

                              {/* Debit (Purchase amount) */}
                              <div className="min-w-[90px]">
                                <p className="text-[10px] font-semibold uppercase text-slate-400">
                                  Debit
                                </p>
                                <p
                                  className={`text-[13px] font-extrabold ${e.amount > 0 ? 'text-slate-800' : 'text-slate-300'}`}
                                >
                                  {e.amount > 0 ? formatCurrency(e.amount) : '—'}
                                </p>
                              </div>

                              {/* Credit (Paid amount) */}
                              <div className="min-w-[90px]">
                                <p className="text-[10px] font-semibold uppercase text-slate-400">
                                  Credit
                                </p>
                                <p
                                  className={`text-[13px] font-extrabold ${e.paid > 0 ? 'text-emerald-600' : 'text-slate-300'}`}
                                >
                                  {e.paid > 0 ? formatCurrency(e.paid) : '—'}
                                </p>
                              </div>

                              {/* Balance / Due */}
                              <div className="min-w-[90px]">
                                <p className="text-[10px] font-semibold uppercase text-slate-400">
                                  Due Balance
                                </p>
                                <p
                                  className={`text-[13px] font-extrabold ${e.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}
                                >
                                  {formatCurrency(e.balance)}
                                </p>
                              </div>

                              {/* Note */}
                              {e.note && (
                                <div className="flex-1 min-w-[100px]">
                                  <p className="text-[10px] font-semibold uppercase text-slate-400">
                                    Note
                                  </p>
                                  <p className="text-[12px] text-slate-600 truncate max-w-[200px]">
                                    {e.note}
                                  </p>
                                </div>
                              )}

                              {/* Status */}
                              <div className="ml-auto">
                                <StatusBadge status={e.status} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pay Due Modal */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-gradient-to-r from-rose-600 to-rose-500 px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-white">Record Due Payment</h3>
                <p className="text-xs text-rose-200">
                  Current due: {formatCurrency(supplier.dueAmount)}
                </p>
              </div>
              <button
                onClick={() => !paying && setIsPayModalOpen(false)}
                className="rounded-lg p-1.5 text-white/70 hover:bg-white/20 hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4 p-5">
              {[
                {
                  label: 'Amount (৳)',
                  type: 'number',
                  val: payAmount,
                  set: setPayAmount,
                  placeholder: '0.00',
                  max: supplier.dueAmount,
                },
                {
                  label: 'Payment Date',
                  type: 'date',
                  val: payDate,
                  set: setPayDate,
                  placeholder: '',
                },
              ].map(({ label, type, val, set, placeholder, max }: any) => (
                <div key={label}>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    {label}
                  </label>
                  <input
                    type={type}
                    value={val}
                    onChange={(e) => set(e.target.value)}
                    max={max}
                    step="0.01"
                    placeholder={placeholder}
                    className="input-field w-full"
                  />
                </div>
              ))}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Note (Optional)
                </label>
                <textarea
                  rows={2}
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  className="input-field w-full resize-none"
                  placeholder="e.g. Bank transfer ref #123"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4">
              <button
                onClick={() => !paying && setIsPayModalOpen(false)}
                disabled={paying}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handlePayDue}
                disabled={paying || !payAmount}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50 transition"
              >
                {paying ? 'Processing...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
