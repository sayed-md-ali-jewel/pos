import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import { ArrowLeft, Printer, ShoppingBag } from 'lucide-react';
import MainLayout from '@/components/Layout/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button, Card } from '@/components/Common/FormElements';
import toast from 'react-hot-toast';

interface PurchaseItem {
  productId?: { name: string; sku?: string; price?: number; stock?: number };
  productName: string;
  quantity: number;
  costPrice: number;
  subtotal: number;
}

interface Purchase {
  _id: string;
  purchaseNumber: string;
  supplierId?: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    supplierCode?: string;
  };
  items: PurchaseItem[];
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: string;
  paymentStatus: string;
  notes?: string;
  createdAt: string;
  createdBy?: { firstName: string; lastName: string };
}

export default function PurchaseDetailPage() {
  return (
    <ProtectedRoute requiredRole={['admin', 'manager']}>
      <PurchaseDetailContent />
    </ProtectedRoute>
  );
}

function PurchaseDetailContent() {
  const router = useRouter();
  const { id } = router.query;
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(true);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-BD', {
        style: 'currency',
        currency: 'BDT',
        maximumFractionDigits: 0,
      }),
    []
  );

  useEffect(() => {
    if (!id || Array.isArray(id)) return;

    const fetchPurchase = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`/api/inventory/purchases?id=${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data.success) setPurchase(res.data.data);
      } catch {
        toast.error('Failed to load purchase');
      } finally {
        setLoading(false);
      }
    };

    fetchPurchase();
  }, [id]);

  if (loading) {
    return (
      <MainLayout title="Purchase Detail">
        <div className="flex h-64 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-sky-600" />
        </div>
      </MainLayout>
    );
  }

  if (!purchase) {
    return (
      <MainLayout title="Purchase Detail">
        <Card>
          <div className="py-14 text-center text-slate-500">Purchase not found.</div>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={purchase.purchaseNumber}>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="secondary" className="gap-2" onClick={() => router.back()}>
            <ArrowLeft size={16} />
            Back
          </Button>
          <Button className="gap-2" onClick={() => window.print()}>
            <Printer size={16} />
            Print
          </Button>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/70">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex gap-4">
              <div className="rounded-2xl bg-indigo-50 p-4 text-indigo-600">
                <ShoppingBag size={28} />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Purchase Order
                </p>
                <h1 className="mt-1 text-2xl font-bold text-slate-950">
                  {purchase.purchaseNumber}
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  Created on {new Date(purchase.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize text-slate-700">
                {purchase.status}
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold capitalize text-emerald-700 ring-1 ring-emerald-200">
                {purchase.paymentStatus}
              </span>
            </div>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <h2 className="mb-4 text-lg font-bold text-slate-950">Items</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 font-bold">Product</th>
                    <th className="px-4 py-3 text-center font-bold">Qty</th>
                    <th className="px-4 py-3 text-right font-bold">Unit Cost</th>
                    <th className="px-4 py-3 text-right font-bold">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {purchase.items.map((item, index) => (
                    <tr key={`${item.productName}-${index}`} className="hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <p className="font-bold text-slate-950">
                          {item.productId?.name || item.productName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.productId?.sku || 'No SKU'}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-center font-semibold text-slate-700">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-slate-700">
                        {currencyFormatter.format(item.costPrice || 0)}
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-slate-950">
                        {currencyFormatter.format(item.subtotal || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="space-y-5">
            <Card>
              <h2 className="mb-4 text-lg font-bold text-slate-950">Supplier</h2>
              <p className="font-bold text-slate-950">{purchase.supplierId?.name || 'N/A'}</p>
              <p className="mt-1 text-sm text-slate-500">{purchase.supplierId?.supplierCode}</p>
              <div className="mt-4 space-y-1 text-sm text-slate-600">
                <p>{purchase.supplierId?.phone || 'No phone'}</p>
                <p>{purchase.supplierId?.email || 'No email'}</p>
                <p>
                  {[purchase.supplierId?.address, purchase.supplierId?.city]
                    .filter(Boolean)
                    .join(', ') || 'No address'}
                </p>
              </div>
            </Card>

            <Card>
              <h2 className="mb-4 text-lg font-bold text-slate-950">Payment Summary</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total</span>
                  <span className="font-bold text-slate-950">
                    {currencyFormatter.format(purchase.totalAmount || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Paid</span>
                  <span className="font-bold text-emerald-700">
                    {currencyFormatter.format(purchase.paidAmount || 0)}
                  </span>
                </div>
                <div className="flex justify-between rounded-xl bg-rose-50 px-4 py-3">
                  <span className="font-semibold text-rose-700">Due</span>
                  <span className="font-bold text-rose-700">
                    {currencyFormatter.format(purchase.dueAmount || 0)}
                  </span>
                </div>
              </div>
            </Card>

            {purchase.notes && (
              <Card>
                <h2 className="mb-3 text-lg font-bold text-slate-950">Notes</h2>
                <p className="text-sm text-slate-600">{purchase.notes}</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
