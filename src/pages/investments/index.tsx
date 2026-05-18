import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import MainLayout from '@/components/Layout/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import {
  Plus,
  TrendingUp,
  Calendar,
  DollarSign,
  AlertTriangle,
  Clock,
  BarChart2,
  Phone,
  AlertCircle,
  Star,
  Pencil,
  ArrowRight,
  X,
  ChevronDown,
  Loader2,
  CheckCircle2,
  Briefcase,
  Hash,
  FileText,
  ToggleLeft,
} from 'lucide-react';
import { ActionButton } from '@/components/Common/FormElements';
import axios from 'axios';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/utils/format';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Investment {
  _id: string;
  name: string;
  category: string;
  initialAmount: number;
  investmentDate: string;
  description?: string;
  status: 'active' | 'inactive';
  earningInterval?: 'daily' | '15days' | '30days';
  expectedIncome?: number;
  totalEarnings?: number;
  totalProfit?: number;
  rating?: number;
  contactNumber?: string;
  code?: string;
}

interface FormData {
  name: string;
  category: string;
  initialAmount: string;
  investmentDate: string;
  description: string;
  status: 'active' | 'inactive';
  earningInterval: 'daily' | '15days' | '30days';
  expectedIncome: string;
}

const INITIAL_FORM: FormData = {
  name: '',
  category: '',
  initialAmount: '',
  investmentDate: '',
  description: '',
  status: 'active',
  earningInterval: 'daily',
  expectedIncome: '',
};

const CATEGORIES = [
  { value: 'stocks', label: 'Stocks', emoji: '📈' },
  { value: 'bonds', label: 'Bonds', emoji: '📄' },
  { value: 'real-estate', label: 'Real Estate', emoji: '🏠' },
  { value: 'crypto', label: 'Cryptocurrency', emoji: '₿' },
  { value: 'business', label: 'Business', emoji: '💼' },
  { value: 'other', label: 'Other', emoji: '📦' },
];

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function Investments() {
  return (
    <ProtectedRoute requiredRole={['admin']}>
      <MainLayout title="Investments">
        <InvestmentsContent />
      </MainLayout>
    </ProtectedRoute>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}
function StatCard({ label, value, sub, icon, iconBg, iconColor }: StatCardProps) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl bg-white px-6 py-5 shadow-sm">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">
          {label}
        </p>
        <p className="mt-2 text-[1.6rem] font-bold tracking-tight text-slate-900">{value}</p>
        <p className="mt-1.5 text-xs text-slate-400">{sub}</p>
      </div>
      <div
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: iconBg, color: iconColor }}
      >
        {icon}
      </div>
    </div>
  );
}

// ─── InvestmentCard ───────────────────────────────────────────────────────────
interface InvestmentCardProps {
  investment: Investment;
  onDelete: (id: string) => void;
  onEdit: (investment: Investment) => void;
}
function InvestmentCard({ investment, onDelete, onEdit }: InvestmentCardProps) {
  const profit = investment.totalProfit ?? 0;
  const earnings = investment.totalEarnings ?? 0;
  const rating = investment.rating ?? 5;

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="h-1.5 w-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500" />
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-200/60">
              <TrendingUp size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{investment.name}</h3>
              <p className="mt-0.5 text-sm capitalize text-slate-400">{investment.category}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 ring-1 ring-amber-100">
            <Star size={13} className="fill-amber-400 text-amber-400" />
            <span className="text-sm font-bold text-amber-600">{rating}</span>
          </div>
        </div>

        {/* Meta */}
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
          <Calendar size={14} className="text-slate-400" />
          <span>{new Date(investment.investmentDate).toLocaleDateString()}</span>
          {investment.contactNumber && (
            <>
              <span className="mx-1 text-slate-300">·</span>
              <Phone size={13} className="text-slate-400" />
              <span>{investment.contactNumber}</span>
            </>
          )}
        </div>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-slate-50 px-4 py-4 ring-1 ring-slate-100">
            <div className="flex items-center gap-1.5">
              <TrendingUp size={12} className="text-indigo-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">
                Invested
              </span>
            </div>
            <p className="mt-2 text-xl font-bold text-indigo-600">
              {formatCurrency(investment.initialAmount)}
            </p>
          </div>
          <div
            className={`rounded-2xl px-4 py-4 ring-1 ${
              profit >= 0 ? 'bg-emerald-50 ring-emerald-100' : 'bg-rose-50 ring-rose-100'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <AlertCircle
                size={12}
                className={profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}
              />
              <span
                className={`text-[10px] font-bold uppercase tracking-widest ${profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
              >
                Profit
              </span>
            </div>
            <p
              className={`mt-2 text-xl font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
            >
              {profit >= 0 ? '+' : '-'}
              {formatCurrency(Math.abs(profit))}
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Total Earnings
            </span>
            <span className="text-sm font-bold text-slate-800">{formatCurrency(earnings)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex items-center gap-3">
          <Link
            href={`/investments/${investment._id}/earnings`}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-200/60 transition hover:from-blue-700 hover:to-indigo-700"
          >
            Investment Earnings
            <ArrowRight size={15} />
          </Link>
          <ActionButton
            variant="secondary"
            onClick={() => onEdit(investment)}
            title="Edit investment"
            icon={<Pencil size={14} />}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Form Field wrapper ───────────────────────────────────────────────────────
function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        <span>{icon}</span>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100';

// ─── Modal ────────────────────────────────────────────────────────────────────
interface InvestmentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editTarget?: Investment | null;
}
function InvestmentModal({ open, onClose, onSuccess, editTarget }: InvestmentModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const isEdit = Boolean(editTarget);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (editTarget) {
      setForm({
        name: editTarget.name,
        category: editTarget.category,
        initialAmount: editTarget.initialAmount.toString(),
        investmentDate: new Date(editTarget.investmentDate).toISOString().split('T')[0],
        description: editTarget.description ?? '',
        status: editTarget.status,
        earningInterval: editTarget.earningInterval ?? 'daily',
        expectedIncome: editTarget.expectedIncome?.toString() ?? '',
      });
    } else {
      setForm(INITIAL_FORM);
    }
    setDone(false);
  }, [editTarget, open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...form,
        initialAmount: parseFloat(form.initialAmount),
        expectedIncome: form.expectedIncome ? parseFloat(form.expectedIncome) : undefined,
        earningInterval: form.earningInterval,
      };
      if (isEdit && editTarget) {
        await axios.put(`/api/investments/${editTarget._id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Investment updated successfully');
      } else {
        await axios.post('/api/investments', payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Investment created successfully');
      }
      setDone(true);
      setTimeout(() => {
        onSuccess();
        onClose();
        setDone(false);
      }, 900);
    } catch {
      toast.error(isEdit ? 'Failed to update investment' : 'Failed to create investment');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm"
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-slate-900/20"
        style={{ animation: 'modal-in 0.22s cubic-bezier(.22,1,.36,1)' }}
      >
        {/* Gradient strip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500" />

        {/* Header */}
        <div className="flex items-center justify-between px-8 pb-2 pt-7">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-200/60">
              <TrendingUp size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {isEdit ? 'Edit Investment' : 'New Investment'}
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                {isEdit
                  ? 'Update the details of your investment'
                  : 'Fill in the details to add a new position'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="space-y-5 px-8 py-6">
          {/* Name + Category */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name" icon={<Briefcase size={12} />}>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="e.g. Tech Growth Fund"
                className={inputCls}
              />
            </Field>
            <Field label="Category" icon={<Hash size={12} />}>
              <div className="relative">
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  required
                  className={`${inputCls} appearance-none pr-10`}
                >
                  <option value="" disabled>
                    Select one
                  </option>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.emoji} {c.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </Field>
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Amount (৳)" icon={<DollarSign size={12} />}>
              <input
                type="number"
                name="initialAmount"
                value={form.initialAmount}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                placeholder="0.00"
                className={inputCls}
              />
            </Field>
            <Field label="Investment Date" icon={<Calendar size={12} />}>
              <input
                type="date"
                name="investmentDate"
                value={form.investmentDate}
                onChange={handleChange}
                required
                className={inputCls}
              />
            </Field>
          </div>

          {/* Status toggle pills */}
          <Field label="Status" icon={<ToggleLeft size={12} />}>
            <div className="flex gap-3">
              {(['active', 'inactive'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, status: s }))}
                  className={`flex-1 rounded-2xl border py-3 text-sm font-semibold capitalize transition ${
                    form.status === s
                      ? s === 'active'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-100'
                        : 'border-slate-300 bg-slate-100 text-slate-700 ring-2 ring-slate-200'
                      : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  {s === 'active' ? `✓ Active` : `○ Inactive`}
                </button>
              ))}
            </div>
          </Field>

          {/* Earning Interval */}
          <Field label="Earning Interval" icon={<Calendar size={12} />}>
            <div className="relative">
              <select
                name="earningInterval"
                value={form.earningInterval}
                onChange={handleChange}
                className={`${inputCls} appearance-none pr-10`}
              >
                <option value="daily">Daily</option>
                <option value="15days">Every 15 days</option>
                <option value="30days">Every 30 days</option>
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          </Field>

          {/* Expected Income */}
          <Field label="Expected Income (৳)" icon={<DollarSign size={12} />}>
            <input
              type="number"
              name="expectedIncome"
              value={form.expectedIncome}
              onChange={handleChange}
              min="0"
              step="0.01"
              placeholder="0.00"
              className={inputCls}
            />
          </Field>

          {/* Description */}
          <Field label="Description" icon={<FileText size={12} />}>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              placeholder="Optional notes about this investment..."
              className={`${inputCls} resize-none`}
            />
          </Field>

          {/* Footer buttons */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || done}
              className="flex flex-[2] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-200/60 transition hover:from-blue-700 hover:to-indigo-700 disabled:opacity-70"
            >
              {done ? (
                <>
                  <CheckCircle2 size={16} /> Saved!
                </>
              ) : loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Saving...
                </>
              ) : (
                <>
                  {isEdit ? <Pencil size={16} /> : <Plus size={16} />}{' '}
                  {isEdit ? 'Update Investment' : 'Create Investment'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ─── Page Content ─────────────────────────────────────────────────────────────
function InvestmentsContent() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [monthExpenses, setMonthExpenses] = useState(0);
  const [pendingDue, setPendingDue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Investment | null>(null);

  const fetchInvestments = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const [investmentsRes, earningsRes] = await Promise.all([
        axios.get('/api/investments', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get('/api/earnings', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setInvestments(investmentsRes.data || []);

      const earnings: Array<{ month: string; expenses: number; netProfit: number }> =
        earningsRes.data || [];
      const currentDate = new Date();
      const currentMonthExpenses = earnings.reduce((sum, earning) => {
        const monthDate = new Date(earning.month);
        return monthDate.getFullYear() === currentDate.getFullYear() &&
          monthDate.getMonth() === currentDate.getMonth()
          ? sum + (earning.expenses || 0)
          : sum;
      }, 0);

      const totalPendingDue = (investmentsRes.data || []).reduce(
        (sum: number, inv: Investment) => sum + Math.max(0, inv.totalProfit ?? 0),
        0
      );

      setMonthExpenses(currentMonthExpenses);
      setPendingDue(totalPendingDue);
    } catch {
      toast.error('Failed to fetch investments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvestments();
  }, [fetchInvestments]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this investment?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/investments/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Investment deleted successfully');
      fetchInvestments();
    } catch {
      toast.error('Failed to delete investment');
    }
  };

  const openCreate = () => {
    setEditTarget(null);
    setModalOpen(true);
  };
  const openEdit = (inv: Investment) => {
    setEditTarget(inv);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditTarget(null);
  };

  const totalInvested = investments.reduce((s, i) => s + i.initialAmount, 0);
  const totalEarnings = investments.reduce((s, i) => s + (i.totalEarnings ?? 0), 0);
  const totalProfit = investments.reduce((s, i) => s + (i.totalProfit ?? 0), 0);
  const activeCount = investments.filter((i) => i.status === 'active').length;
  const inactiveCount = investments.filter((i) => i.status === 'inactive').length;

  const stats: StatCardProps[] = [
    {
      label: 'Total Investments',
      value: String(investments.length),
      sub: `${activeCount} active · ${inactiveCount} inactive`,
      icon: <TrendingUp size={20} />,
      iconBg: '#d1fae5',
      iconColor: '#059669',
    },
    {
      label: 'Total Invested',
      value: formatCurrency(totalInvested),
      sub: `${activeCount} active investments`,
      icon: <Calendar size={20} />,
      iconBg: '#dbeafe',
      iconColor: '#2563eb',
    },
    {
      label: 'Total Revenue',
      value: formatCurrency(totalEarnings),
      sub: `${investments.length} all-time positions`,
      icon: <DollarSign size={20} />,
      iconBg: '#ede9fe',
      iconColor: '#7c3aed',
    },
    {
      label: 'Monthly Profit',
      value: formatCurrency(Math.abs(totalProfit)),
      sub: 'Revenue minus expenses',
      icon: <BarChart2 size={20} />,
      iconBg: '#ede9fe',
      iconColor: '#7c3aed',
    },
    {
      label: 'Month Expenses',
      value: formatCurrency(monthExpenses),
      sub: "This month's costs",
      icon: <AlertTriangle size={20} />,
      iconBg: '#ffedd5',
      iconColor: '#ea580c',
    },
  ];

  if (loading) return <div className="p-6 text-sm text-slate-500">Loading...</div>;

  return (
    <>
      <InvestmentModal
        open={modalOpen}
        onClose={closeModal}
        onSuccess={fetchInvestments}
        editTarget={editTarget}
      />

      <div className="min-h-screen bg-slate-100 p-6">
        {/* Page header */}
        <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Investments</h1>
            <p className="mt-0.5 text-sm text-slate-500">Overview of your investment portfolio</p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            <Plus size={16} />
            Create Investment
          </button>
        </div>

        {/* Stats grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
          {stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
          {/* Total Due */}
          <div className="mt-4">
            <StatCard
              label="Total Due"
              value={formatCurrency(pendingDue)}
              sub="Pending investor payments"
              icon={<Clock size={20} />}
              iconBg="#ffedd5"
              iconColor="#ea580c"
            />
          </div>
        </div>

        {/* Investment cards */}
        <div className="mt-8">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">All Investments</h2>
              <p className="text-sm text-slate-400">
                A detailed view of each position with performance
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-600 ring-1 ring-emerald-100">
                Active: {activeCount}
              </span>
              <span className="rounded-full bg-slate-200 px-3 py-1 text-slate-600">
                Inactive: {inactiveCount}
              </span>
            </div>
          </div>

          {investments.length === 0 ? (
            <button
              type="button"
              onClick={openCreate}
              className="flex h-56 w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-slate-300 bg-white transition hover:border-blue-300 hover:bg-blue-50/30"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Plus size={22} />
              </div>
              <p className="text-sm font-semibold text-slate-400">
                No investments yet. Click to add your first one.
              </p>
            </button>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {investments.map((inv) => (
                <InvestmentCard
                  key={inv._id}
                  investment={inv}
                  onDelete={handleDelete}
                  onEdit={openEdit}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
