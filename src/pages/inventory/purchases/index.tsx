import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { Eye, Plus, ShoppingBag } from 'lucide-react';
import MainLayout from '@/components/Layout/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button, ActionButton } from '@/components/Common/FormElements';
import toast from 'react-hot-toast';

interface Purchase {
  _id: string;
  purchaseNumber: string;
  supplierId?: { name: string; phone?: string };
  items: Array<{ productName: string; quantity: number; subtotal: number }>;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  createdBy?: { firstName: string; lastName: string };
}

export default function PurchasesPage() {
  return (
    <ProtectedRoute requiredRole={['admin', 'manager']}>
      <PurchasesContent />
    </ProtectedRoute>
  );
}

function PurchasesContent() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-BD', {
        style: 'currency',
        currency: 'BDT',
        maximumFractionDigits: 0,
      }),
    []
  );

  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/inventory/purchases?page=${pagination.page}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        setPurchases(res.data.data.purchases);
        setPagination({
          page: res.data.data.page,
          pages: res.data.data.pages || 1,
          total: res.data.data.total,
        });
      }
    } catch {
      toast.error('Failed to load purchases');
    } finally {
      setLoading(false);
    }
  }, [pagination.page]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  const getPaymentBadge = (status: string) => {
    if (status === 'paid') return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
    if (status === 'partial') return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
    return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200';
  };

  return (
    <MainLayout title="Purchase History">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              Procurement
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950">Purchase History</h1>
            <p className="mt-1 text-sm text-slate-500">
              {pagination.total} purchase{pagination.total !== 1 ? 's' : ''} recorded
            </p>
          </div>
          <Link href="/inventory/purchase">
            <Button className="gap-2">
              <Plus size={16} />
              New Purchase
            </Button>
          </Link>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/70">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
              <ShoppingBag size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-950">Purchases</h2>
              <p className="text-sm text-slate-500">Open any purchase to view its full detail.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-4 font-bold">Purchase</th>
                  <th className="px-4 py-4 font-bold">Supplier</th>
                  <th className="px-4 py-4 text-center font-bold">Items</th>
                  <th className="px-4 py-4 text-right font-bold">Total</th>
                  <th className="px-4 py-4 text-right font-bold">Paid</th>
                  <th className="px-4 py-4 text-right font-bold">Due</th>
                  <th className="px-4 py-4 text-center font-bold">Status</th>
                  <th className="px-4 py-4 text-center font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-14 text-center text-slate-500">
                      Loading purchases...
                    </td>
                  </tr>
                ) : purchases.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-14 text-center text-slate-500">
                      No purchases found.
                    </td>
                  </tr>
                ) : (
                  purchases.map((purchase) => (
                    <tr key={purchase._id} className="transition hover:bg-slate-50/80">
                      <td className="px-4 py-4">
                        <p className="font-bold text-slate-950">{purchase.purchaseNumber}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {new Date(purchase.createdAt).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-800">
                          {purchase.supplierId?.name || 'Unknown Supplier'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {purchase.createdBy
                            ? `${purchase.createdBy.firstName} ${purchase.createdBy.lastName}`
                            : 'System'}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-center font-semibold text-slate-700">
                        {purchase.items.length}
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-slate-950">
                        {currencyFormatter.format(purchase.totalAmount || 0)}
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-emerald-700">
                        {currencyFormatter.format(purchase.paidAmount || 0)}
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-rose-700">
                        {currencyFormatter.format(purchase.dueAmount || 0)}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ${getPaymentBadge(
                            purchase.paymentStatus
                          )}`}
                        >
                          {purchase.paymentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <ActionButton
                          variant="view"
                          href={`/inventory/purchases/${purchase._id}`}
                          label="View"
                          icon={<Eye size={15} />}
                          title="View purchase details"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
              <span className="text-sm text-slate-500">
                Page {pagination.page} of {pagination.pages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pagination.page === pagination.pages}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </MainLayout>
  );
}
