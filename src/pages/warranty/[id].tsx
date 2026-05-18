import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import axios from 'axios';
import { useRouter } from 'next/router';
import MainLayout from '@/components/Layout/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import {
  ArrowLeft,
  Truck,
  Wrench,
  User,
  Package,
  CheckCircle2,
  Circle,
  Clock4,
  ShieldCheck,
  ShieldOff,
  Hash,
  Calendar,
  MapPin,
  Phone,
  FileText,
  AlertCircle,
} from 'lucide-react';

const statusOptions = [
  'Initiated',
  'Sent to Supplier',
  'Received from Supplier',
  'Delivered Back to Customer',
];

const workflowSteps = [
  { key: 'Initiated', label: 'Initiated', icon: FileText, color: 'emerald' },
  { key: 'Sent to Supplier', label: 'Sent to Supplier', icon: Truck, color: 'sky' },
  {
    key: 'Received from Supplier',
    label: 'Received from Supplier',
    icon: Package,
    color: 'indigo',
  },
  {
    key: 'Delivered Back to Customer',
    label: 'Delivered Back to Customer',
    icon: CheckCircle2,
    color: 'violet',
  },
];

const colorMap: Record<
  string,
  { ring: string; bg: string; text: string; line: string; badge: string }
> = {
  emerald: {
    ring: 'ring-emerald-400',
    bg: 'bg-emerald-500',
    text: 'text-emerald-700',
    line: 'bg-emerald-400',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  },
  sky: {
    ring: 'ring-sky-400',
    bg: 'bg-sky-500',
    text: 'text-sky-700',
    line: 'bg-sky-400',
    badge: 'bg-sky-50 text-sky-700 ring-sky-200',
  },
  indigo: {
    ring: 'ring-indigo-400',
    bg: 'bg-indigo-500',
    text: 'text-indigo-700',
    line: 'bg-indigo-400',
    badge: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  },
  violet: {
    ring: 'ring-violet-400',
    bg: 'bg-violet-500',
    text: 'text-violet-700',
    line: 'bg-violet-400',
    badge: 'bg-violet-50 text-violet-700 ring-violet-200',
  },
};

const statusBadge: Record<string, string> = {
  Initiated: 'bg-slate-100 text-slate-700 ring-slate-200',
  Pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  'Sent to Supplier': 'bg-sky-50 text-sky-700 ring-sky-200',
  'In Repair': 'bg-violet-50 text-violet-700 ring-violet-200',
  'Received from Supplier': 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  'Ready for Delivery': 'bg-teal-50 text-teal-700 ring-teal-200',
  Repaired: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'Returned to Shop': 'bg-slate-100 text-slate-600 ring-slate-200',
  'Delivered Back to Customer': 'bg-emerald-100 text-emerald-800 ring-emerald-300',
};

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3.5 py-3 ring-1 ring-slate-100">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-0.5 text-[13px] font-semibold text-slate-800">{value || '—'}</p>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  color = 'indigo',
}: {
  icon: any;
  title: string;
  color?: string;
}) {
  const c = colorMap[color] || colorMap.indigo;
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.badge} ring-1`}>
        <Icon size={15} />
      </div>
      <h2 className="text-[13px] font-bold text-slate-800">{title}</h2>
    </div>
  );
}

const FULL_STATUS_ORDER = [
  'Initiated',
  'Sent to Supplier',
  'Received from Supplier',
  'Delivered Back to Customer',
];

const PRIVILEGED_ROLES = ['super_admin', 'manager'];

const emptySupplier = {
  shippingMethod: '',
  trackingNumber: '',
  expectedReturnDate: '',
  sentAt: '',
  notes: '',
};

export default function WarrantyDetail() {
  const router = useRouter();
  const { id } = router.query;
  const auth = useAuth();
  const userRole = auth.user?.role || '';
  const canGoBack = PRIVILEGED_ROLES.includes(userRole);

  const [repair, setRepair] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('Initiated');
  const [note, setNote] = useState('');
  const [sendToSupplier, setSendToSupplier] = useState({ ...emptySupplier });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    const fetchRepair = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const res = await axios.get(`/api/warranty/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) {
          const d = res.data.data;
          setRepair(d);
          setStatus(d.status || 'Initiated');
          setSendToSupplier({
            shippingMethod: d.sendToSupplier?.shippingMethod || '',
            trackingNumber: d.sendToSupplier?.trackingNumber || '',
            expectedReturnDate: d.sendToSupplier?.expectedReturnDate
              ? new Date(d.sendToSupplier.expectedReturnDate).toISOString().slice(0, 10)
              : '',
            sentAt: d.sendToSupplier?.sentAt
              ? new Date(d.sendToSupplier.sentAt).toISOString().slice(0, 10)
              : '',
            notes: d.sendToSupplier?.notes || '',
          });
        }
      } catch {
        console.error('Failed to load warranty detail');
      } finally {
        setLoading(false);
      }
    };
    fetchRepair();
  }, [id]);

  // When status changes, clear form fields to prevent stale mixed data
  const handleStatusChange = useCallback((newStatus: string) => {
    setStatus(newStatus);
    setNote('');
    setSendToSupplier({ ...emptySupplier });
  }, []);

  const handleSave = async () => {
    setError('');
    if (!repair) return;
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      await axios.put(
        `/api/warranty/${repair._id}`,
        { status, note, sendToSupplier },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      router.reload();
    } catch {
      setError('Unable to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const fmtDate = (d: any) =>
    d
      ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—';

  // Step tracker: which workflow steps are complete
  const activeStepKey = useMemo(() => {
    const map: Record<string, string> = {
      Initiated: 'Initiated',
      Pending: 'Initiated',
      'Sent to Supplier': 'Sent to Supplier',
      'In Repair': 'Sent to Supplier',
      'Received from Supplier': 'Received from Supplier',
      'Ready for Delivery': 'Received from Supplier',
      Repaired: 'Received from Supplier',
      'Returned to Shop': 'Received from Supplier',
      'Delivered Back to Customer': 'Delivered Back to Customer',
    };
    return map[repair?.status || 'Initiated'] || 'Initiated';
  }, [repair]);

  const activeStepIdx = workflowSteps.findIndex((s) => s.key === activeStepKey);

  // Forward-only: current status index in the full order
  const currentStatusIdx = FULL_STATUS_ORDER.indexOf(repair?.status || 'Initiated');
  // Allowed statuses: for privileged roles = all; others = only current & forward
  const allowedStatuses = useMemo(() => {
    if (canGoBack) return FULL_STATUS_ORDER;
    return FULL_STATUS_ORDER.filter((_, i) => i >= currentStatusIdx);
  }, [canGoBack, currentStatusIdx]);

  // Whether the update panel is locked (non-privileged viewing a completed repair)
  const isCompleted = repair?.status === 'Delivered Back to Customer';
  const panelLocked = isCompleted && !canGoBack;

  if (loading)
    return (
      <MainLayout title="Warranty Repair Detail">
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" />
        </div>
      </MainLayout>
    );

  if (!repair) return null;

  return (
    <ProtectedRoute requiredRole={['admin', 'manager', 'cashier']}>
      <MainLayout title="Warranty Repair Detail">
        <div className="space-y-5 max-w-6xl mx-auto">
          {/* Top bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Repair Detail
              </p>
              <h1 className="mt-0.5 text-xl font-extrabold text-slate-900">Warranty Request</h1>
            </div>
            <button
              onClick={() => router.push('/warranty')}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              <ArrowLeft size={14} /> Back to list
            </button>
          </div>

          {/* Hero Header Card */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-1.5 w-full bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500" />
            <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Repair Number
                </p>
                <p className="mt-0.5 font-mono text-xl font-extrabold text-indigo-700">
                  {repair.repairNumber}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Status</p>
                  <span
                    className={`mt-1 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold ring-1 ${statusBadge[repair.status] || 'bg-slate-100 text-slate-700 ring-slate-200'}`}
                  >
                    {repair.status}
                  </span>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Warranty</p>
                  <span
                    className={`mt-1 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold ring-1 ${repair.warrantyValid ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-rose-50 text-rose-700 ring-rose-200'}`}
                  >
                    {repair.warrantyValid ? <ShieldCheck size={11} /> : <ShieldOff size={11} />}
                    {repair.warrantyValid ? 'Valid' : 'Expired'}
                  </span>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Created</p>
                  <p className="mt-1 text-[12px] font-semibold text-slate-700">
                    {fmtDate(repair.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Step Progress Tracker */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Repair Progress
            </p>
            <div className="flex items-start gap-0">
              {workflowSteps.map((step, idx) => {
                const isComplete = idx < activeStepIdx;
                const isActive = idx === activeStepIdx;
                const isPending = idx > activeStepIdx;
                const c = colorMap[step.color];
                const Icon = step.icon;
                const isLast = idx === workflowSteps.length - 1;
                return (
                  <div key={step.key} className="flex flex-1 flex-col items-center">
                    <div className="flex w-full items-center">
                      {/* Circle */}
                      <div
                        className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-2 transition-all ${
                          isComplete
                            ? `${c.bg} ring-transparent text-white shadow-md`
                            : isActive
                              ? `bg-white ${c.ring} text-${step.color}-600 shadow-md`
                              : 'bg-slate-100 ring-slate-200 text-slate-400'
                        }`}
                      >
                        {isComplete ? <CheckCircle2 size={18} /> : <Icon size={16} />}
                        {isActive && (
                          <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                            <span
                              className={`animate-ping absolute inline-flex h-full w-full rounded-full ${c.bg} opacity-50`}
                            />
                            <span className={`relative inline-flex h-3 w-3 rounded-full ${c.bg}`} />
                          </span>
                        )}
                      </div>
                      {/* Connector line */}
                      {!isLast && (
                        <div
                          className={`h-0.5 flex-1 transition-all ${isComplete ? c.line : 'bg-slate-200'}`}
                        />
                      )}
                    </div>
                    <div className="mt-2 text-center px-1">
                      <p
                        className={`text-[11px] font-bold leading-tight ${isComplete || isActive ? 'text-slate-800' : 'text-slate-400'}`}
                      >
                        {step.label}
                      </p>
                      {isActive && (
                        <p className={`mt-0.5 text-[10px] font-semibold ${c.text}`}>In Progress</p>
                      )}
                      {isComplete && <p className="mt-0.5 text-[10px] text-slate-400">Done</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
            {/* Left column */}
            <div className="space-y-5">
              {/* Info Cards */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="grid gap-5 md:grid-cols-2">
                  {/* Customer */}
                  <div>
                    <SectionHeader icon={User} title="Customer" color="sky" />
                    <div className="space-y-2">
                      <InfoPill label="Name" value={repair.customerName} />
                      <div className="grid grid-cols-2 gap-2">
                        <InfoPill label="Phone" value={repair.customerPhone} />
                        <InfoPill label="Email" value={repair.customerEmail || '—'} />
                      </div>
                      {repair.customerAddress && (
                        <InfoPill label="Address" value={repair.customerAddress} />
                      )}
                    </div>
                  </div>
                  {/* Product */}
                  <div>
                    <SectionHeader icon={Package} title="Product" color="indigo" />
                    <div className="space-y-2">
                      <InfoPill label="Product Name" value={repair.productName} />
                      <div className="grid grid-cols-2 gap-2">
                        <InfoPill label="SKU" value={repair.productSku || '—'} />
                        <InfoPill label="Serial" value={repair.serialNumber || '—'} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <InfoPill label="Invoice" value={repair.invoiceNumber || '—'} />
                        <InfoPill label="Purchase Date" value={fmtDate(repair.purchaseDate)} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Warranty + Supplier Info */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                    Warranty
                  </p>
                  <p className="mt-1 text-[15px] font-extrabold text-emerald-800">
                    {repair.warrantyType}
                  </p>
                  <p className="mt-0.5 text-[11px] text-emerald-600">
                    Expires {fmtDate(repair.warrantyExpiresAt)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Supplier
                  </p>
                  <p className="mt-1 text-[14px] font-bold text-slate-800">
                    {repair.supplierName || 'Not linked'}
                  </p>
                  {repair.sendToSupplier?.trackingNumber && (
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Track: {repair.sendToSupplier.trackingNumber}
                    </p>
                  )}
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Expected Return
                  </p>
                  <p className="mt-1 text-[14px] font-bold text-slate-800">
                    {fmtDate(repair.sendToSupplier?.expectedReturnDate)}
                  </p>
                  {repair.sendToSupplier?.shippingMethod && (
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {repair.sendToSupplier.shippingMethod}
                    </p>
                  )}
                </div>
              </div>

              {/* Issue Description */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <SectionHeader icon={Wrench} title="Issue Description" color="sky" />
                <p className="text-[13px] leading-relaxed text-slate-700 whitespace-pre-line">
                  {repair.issueDescription || '—'}
                </p>
              </div>

              {/* Action History */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <SectionHeader icon={Clock4} title="Action History" color="indigo" />
                {!repair.history?.length ? (
                  <p className="text-[13px] text-slate-400">No history yet.</p>
                ) : (
                  <div className="relative space-y-0 pl-5">
                    {/* vertical line */}
                    <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-slate-100" />
                    {repair.history.map((entry: any, i: number) => (
                      <div key={i} className="relative pb-4">
                        <div className="absolute -left-3 top-1 h-3 w-3 rounded-full border-2 border-white bg-indigo-400 ring-1 ring-indigo-200" />
                        <div className="ml-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ring-1 ${statusBadge[entry.status] || 'bg-slate-100 text-slate-600 ring-slate-200'}`}
                              >
                                {entry.status}
                              </span>
                              {entry.note && (
                                <p className="mt-1 text-[12px] text-slate-600 italic">
                                  {entry.note}
                                </p>
                              )}
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-[11px] font-semibold text-slate-600">
                                {entry.performedBy?.name || 'Staff'}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {new Date(entry.createdAt).toLocaleString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right column – Update Panel */}
            <div className="space-y-4">
              <div className="sticky top-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                {/* Panel Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ring-1 ${panelLocked ? 'bg-slate-100 ring-slate-200' : 'bg-indigo-50 ring-indigo-100'}`}
                    >
                      <AlertCircle
                        size={15}
                        className={panelLocked ? 'text-slate-400' : 'text-indigo-600'}
                      />
                    </div>
                    <p className="text-[13px] font-bold text-slate-800">Update Status</p>
                  </div>
                  {/* Role badge */}
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ring-1 ${canGoBack ? 'bg-violet-50 text-violet-700 ring-violet-200' : 'bg-slate-100 text-slate-500 ring-slate-200'}`}
                  >
                    {canGoBack ? '✦ Privileged' : 'Standard'}
                  </span>
                </div>

                {/* Locked state for completed non-privileged */}
                {panelLocked ? (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-4 text-center">
                    <CheckCircle2 size={28} className="mx-auto text-emerald-500 mb-2" />
                    <p className="text-[13px] font-bold text-emerald-800">Repair Completed</p>
                    <p className="mt-0.5 text-[11px] text-emerald-600">
                      This warranty request has been fully delivered. No further edits are allowed.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Forward-only notice for non-privileged */}
                    {!canGoBack && (
                      <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3.5 py-2.5">
                        <AlertCircle size={13} className="mt-0.5 shrink-0 text-amber-500" />
                        <p className="text-[11px] text-amber-700 font-medium">
                          Workflow is <strong>forward-only</strong>. Previous steps cannot be
                          edited. Contact a Manager to reverse.
                        </p>
                      </div>
                    )}

                    {/* Status Dropdown */}
                    <div>
                      <label className="mb-1.5 block text-[12px] font-semibold text-slate-600">
                        Current Status
                      </label>
                      <select
                        value={status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      >
                        {allowedStatuses.map((o) => (
                          <option
                            key={o}
                            value={o}
                            disabled={!canGoBack && FULL_STATUS_ORDER.indexOf(o) < currentStatusIdx}
                          >
                            {!canGoBack && FULL_STATUS_ORDER.indexOf(o) < currentStatusIdx
                              ? `🔒 ${o}`
                              : o}
                          </option>
                        ))}
                      </select>
                      {!canGoBack && currentStatusIdx > 0 && (
                        <p className="mt-1 text-[10px] text-slate-400">
                          🔒 {currentStatusIdx} previous step{currentStatusIdx > 1 ? 's' : ''}{' '}
                          locked
                        </p>
                      )}
                    </div>

                    {/* Action Note */}
                    <div>
                      <label className="mb-1.5 block text-[12px] font-semibold text-slate-600">
                        Action Note
                      </label>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={3}
                        placeholder="Add a note for this update..."
                        className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>

                    {/* Supplier shipping fields – only relevant when Sent to Supplier */}
                    {(status === 'Sent to Supplier' || canGoBack) && (
                      <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Supplier Shipping Details
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { label: 'Sent Date', key: 'sentAt', type: 'date', placeholder: '' },
                            {
                              label: 'Expected Return',
                              key: 'expectedReturnDate',
                              type: 'date',
                              placeholder: '',
                            },
                            {
                              label: 'Shipping Method',
                              key: 'shippingMethod',
                              type: 'text',
                              placeholder: 'Courier / service',
                            },
                            {
                              label: 'Tracking Number',
                              key: 'trackingNumber',
                              type: 'text',
                              placeholder: 'Tracking #',
                            },
                          ].map(({ label, key, type, placeholder }) => (
                            <div key={key}>
                              <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                                {label}
                              </label>
                              <input
                                type={type}
                                value={(sendToSupplier as any)[key]}
                                onChange={(e) =>
                                  setSendToSupplier((p) => ({ ...p, [key]: e.target.value }))
                                }
                                placeholder={placeholder}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-800 outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100"
                              />
                            </div>
                          ))}
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                            Supplier Notes
                          </label>
                          <textarea
                            value={sendToSupplier.notes}
                            onChange={(e) =>
                              setSendToSupplier((p) => ({ ...p, notes: e.target.value }))
                            }
                            rows={2}
                            placeholder="Instructions or remarks..."
                            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-800 outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100"
                          />
                        </div>
                      </div>
                    )}

                    {error && <p className="text-[12px] font-medium text-rose-600">{error}</p>}

                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:from-indigo-700 hover:to-violet-700 disabled:opacity-60"
                    >
                      {saving ? 'Saving...' : 'Save Update'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
