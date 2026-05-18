import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/router';
import MainLayout from '@/components/Layout/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import {
  Search,
  Wrench,
  Clock4,
  CheckCircle2,
  Truck,
  Shield,
  Zap,
  Eye,
  ShieldCheck,
  ShieldOff,
  Settings,
  ListFilter,
  Activity,
} from 'lucide-react';
import { FilterSelect } from '@/components/Common/FilterSelect';
import { ActionButton } from '@/components/Common/FormElements';

const statusConfig: Record<string, { badge: string; dot: string }> = {
  Pending: { badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200', dot: 'bg-amber-400' },
  'Sent to Supplier': { badge: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200', dot: 'bg-sky-400' },
  'Received from Supplier': {
    badge: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    dot: 'bg-blue-400',
  },
  'Delivered Back to Customer': {
    badge: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200',
    dot: 'bg-teal-400',
  },
};

const getStatusCfg = (s: string) =>
  statusConfig[s] || {
    badge: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
    dot: 'bg-slate-400',
  };

export default function WarrantyRequests() {
  const router = useRouter();
  const [repairs, setRepairs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  const fetchRepairs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/warranty', {
        headers: { Authorization: `Bearer ${token}` },
        params: { page, limit: 20, status: statusFilter || undefined, search: search || undefined },
      });
      if (res.data.success) {
        setRepairs(res.data.data.repairs || []);
        setTotal(res.data.data.total || 0);
        setPages(res.data.data.pages || 1);
        setStatusCounts(res.data.data.statusCounts || {});
      }
    } catch (error) {
      console.error('Unable to fetch warranty requests', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepairs();
  }, [page, statusFilter, search]);

  const statCards = [
    {
      label: 'Total Claims',
      value: total,
      icon: Shield,
      gradient: 'from-slate-800 to-slate-900',
      textColor: 'text-white',
      subColor: 'text-slate-300',
      iconBg: 'bg-white/10 text-sky-300',
    },
    {
      label: 'Pending',
      value: statusCounts.Pending || 0,
      icon: Clock4,
      gradient: 'from-amber-500 to-orange-500',
      textColor: 'text-white',
      subColor: 'text-amber-100',
      iconBg: 'bg-white/20 text-white',
    },
    {
      label: 'Sent to Supplier',
      value: statusCounts['Sent to Supplier'] || 0,
      icon: Truck,
      gradient: 'from-sky-500 to-indigo-500',
      textColor: 'text-white',
      subColor: 'text-sky-100',
      iconBg: 'bg-white/20 text-white',
    },
    {
      label: 'Repaired',
      value: statusCounts.Repaired || 0,
      icon: CheckCircle2,
      gradient: 'from-emerald-500 to-teal-500',
      textColor: 'text-white',
      subColor: 'text-emerald-100',
      iconBg: 'bg-white/20 text-white',
    },
  ];

  return (
    <ProtectedRoute requiredRole={['admin', 'manager', 'cashier']}>
      <MainLayout title="Warranty Repairs">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Service Center
              </p>
              <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Warranty Repairs</h1>
              <p className="mt-1 text-[13px] text-slate-500 max-w-xl">
                Track customer warranty claims, supplier returns, and repair progress from a single
                dashboard.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link href="/warranty/new-dynamic">
                <button className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-[13px] font-bold text-white shadow-md shadow-indigo-200 transition hover:from-indigo-700 hover:to-violet-700">
                  <Zap size={14} /> Dynamic Batch Repair
                </button>
              </Link>
              <Link href="/warranty/new">
                <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-bold text-slate-700 shadow-sm transition hover:bg-slate-50">
                  <Wrench size={14} /> Single Repair
                </button>
              </Link>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map(
              ({ label, value, icon: Icon, gradient, textColor, subColor, iconBg }) => (
                <div
                  key={label}
                  className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-5 shadow-lg`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${subColor}`}>
                        {label}
                      </p>
                      <p className={`mt-2 text-4xl font-extrabold leading-none ${textColor}`}>
                        {value}
                      </p>
                    </div>
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}
                    >
                      <Icon size={20} />
                    </div>
                  </div>
                  {/* decorative circle */}
                  <div className="absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-white/5" />
                </div>
              )
            )}
          </div>

          {/* Search + Fast Actions */}
          <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
            {/* Search / Filter */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by customer, product, serial or repair #"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-[13px] text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div className="relative min-w-[250px]">
                  <ListFilter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <div className="min-w-[250px]">
                    <FilterSelect
                      value={statusFilter}
                      onChange={(v) => setStatusFilter(v)}
                      placeholder="All Statuses"
                      icon={<Activity size={15} />}
                      options={Object.keys(statusConfig).map((k) => ({ value: k, label: k }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Fast Actions */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Fast Actions
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => router.push('/warranty/new')}
                  className="flex w-full items-center gap-2.5 rounded-xl bg-indigo-50 px-3.5 py-2.5 text-[13px] font-semibold text-indigo-700 ring-1 ring-indigo-100 transition hover:bg-indigo-100"
                >
                  <Wrench size={14} /> Create warranty repair request
                </button>
                <button
                  onClick={() => setStatusFilter('Pending')}
                  className="flex w-full items-center gap-2.5 rounded-xl bg-amber-50 px-3.5 py-2.5 text-[13px] font-semibold text-amber-700 ring-1 ring-amber-100 transition hover:bg-amber-100"
                >
                  <Clock4 size={14} /> View pending repairs
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* Table Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
                  <Settings size={15} className="text-indigo-600" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-slate-800">Repair Records</p>
                  <p className="text-[11px] text-slate-400">{total} total claims</p>
                </div>
              </div>
              {statusFilter && (
                <button
                  onClick={() => setStatusFilter('')}
                  className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-200 transition"
                >
                  Clear filter ✕
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-[13px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3 text-left">Repair #</th>
                    <th className="px-5 py-3 text-left">Customer</th>
                    <th className="px-5 py-3 text-left">Product</th>
                    <th className="px-5 py-3 text-left">Supplier</th>
                    <th className="px-5 py-3 text-left">Status</th>
                    <th className="px-5 py-3 text-left">Warranty</th>
                    <th className="px-5 py-3 text-left">Created</th>
                    <th className="px-5 py-3 text-center">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td className="px-5 py-10 text-center text-slate-400" colSpan={8}>
                        Loading warranty requests...
                      </td>
                    </tr>
                  ) : repairs.length === 0 ? (
                    <tr>
                      <td className="px-5 py-14 text-center" colSpan={8}>
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                            <Shield size={24} className="text-slate-400" />
                          </div>
                          <p className="text-[13px] font-semibold text-slate-500">
                            No warranty repairs found
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Create a repair request to get started
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    repairs.map((repair) => {
                      const sc = getStatusCfg(repair.status);
                      return (
                        <tr key={repair._id} className="group transition hover:bg-indigo-50/30">
                          <td className="whitespace-nowrap px-5 py-4">
                            <span className="font-mono text-[12px] font-bold text-indigo-600">
                              {repair.repairNumber}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-800">{repair.customerName}</p>
                            <p className="text-[11px] text-slate-400">{repair.customerPhone}</p>
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-medium text-slate-700">{repair.productName}</p>
                            <p className="text-[11px] font-mono text-slate-400">
                              {repair.productSku || repair.serialNumber}
                            </p>
                          </td>
                          <td className="px-5 py-4 font-medium text-slate-700">
                            {repair.supplierName || '—'}
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${sc.badge}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                              {repair.status}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            {repair.warrantyValid ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                                <ShieldCheck size={11} /> Valid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 ring-1 ring-rose-200">
                                <ShieldOff size={11} /> Expired
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-[12px] text-slate-500">
                            {new Date(repair.createdAt).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <ActionButton
                              variant="view"
                              onClick={() => router.push(`/warranty/${repair._id}`)}
                              title="View repair details"
                              icon={<Eye size={12} />}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
                <span className="text-[12px] text-slate-500">
                  Page {page} of {pages}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
                  >
                    ← Prev
                  </button>
                  <button
                    disabled={page === pages}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
