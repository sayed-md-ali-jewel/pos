import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import MainLayout from '@/components/Layout/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Card, Button } from '@/components/Common/FormElements';
import { ArrowLeft, Package, TrendingUp } from 'lucide-react';

const stepStyles: Record<string, string> = {
  Initiated: 'bg-slate-100 text-slate-700',
  Pending: 'bg-slate-100 text-slate-700',
  'Sent to Supplier': 'bg-amber-100 text-amber-700',
  'In Repair': 'bg-sky-100 text-sky-700',
  'Received from Supplier': 'bg-indigo-100 text-indigo-700',
  'Ready for Delivery': 'bg-violet-100 text-violet-700',
  Repaired: 'bg-emerald-100 text-emerald-700',
  'Returned to Shop': 'bg-slate-100 text-slate-700',
  'Delivered Back to Customer': 'bg-emerald-100 text-emerald-700',
};

export default function WarrantyBatchDetail() {
  const router = useRouter();
  const { batchId } = router.query;
  const [batch, setBatch] = useState<any>(null);
  const [repairs, setRepairs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!batchId) return;
    const fetchBatch = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const res = await axios.get(`/api/warranty/batch/${batchId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) {
          setBatch(res.data.data.batch);
          setRepairs(res.data.data.repairs);
        }
      } catch (err: any) {
        console.error('Failed to load batch', err);
        setError(err.response?.data?.message || 'Failed to load batch details');
      } finally {
        setLoading(false);
      }
    };
    fetchBatch();
  }, [batchId]);

  if (loading) {
    return (
      <ProtectedRoute requiredRole={['admin', 'manager', 'cashier']}>
        <MainLayout title="Warranty Batch">
          <Card className="rounded-[28px] border-slate-200 p-6 text-center text-slate-500">
            Loading batch details...
          </Card>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute requiredRole={['admin', 'manager', 'cashier']}>
        <MainLayout title="Warranty Batch">
          <Card className="rounded-[28px] border-rose-200 bg-rose-50 p-6">
            <p className="text-sm font-medium text-rose-700">{error}</p>
          </Card>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  if (!batch) {
    return (
      <ProtectedRoute requiredRole={['admin', 'manager', 'cashier']}>
        <MainLayout title="Warranty Batch">
          <Card className="rounded-[28px] border-slate-200 p-6 text-center text-slate-500">
            Batch not found
          </Card>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole={['admin', 'manager', 'cashier']}>
      <MainLayout title="Warranty Batch">
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                Warranty Batch
              </p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900">{batch.batchNumber}</h1>
            </div>
            <Button variant="secondary" size="md" onClick={() => router.push('/warranty')}>
              <ArrowLeft size={16} /> Back to list
            </Button>
          </div>

          {/* Batch Summary */}
          <Card className="rounded-[28px] border-slate-200 p-6 shadow-sm shadow-slate-200/40">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Batch Information</h2>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm font-semibold text-slate-500">Invoice</p>
                <p className="mt-2 text-slate-900">{batch.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">Customer</p>
                <p className="mt-2 text-slate-900">{batch.customerName}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">Total Products</p>
                <p className="mt-2 text-2xl font-bold text-sky-600">
                  {batch.productRepairTracking?.length || 0}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">Total Units Sending</p>
                <p className="mt-2 text-2xl font-bold text-emerald-600">
                  {batch.productRepairTracking?.reduce(
                    (sum: number, p: any) => sum + p.totalSentQuantity,
                    0
                  ) || 0}
                </p>
              </div>
            </div>
          </Card>

          {/* Product Repair Tracking */}
          <Card className="rounded-[28px] border-slate-200 p-6 shadow-sm shadow-slate-200/40">
            <div className="mb-4 flex items-center gap-2">
              <Package className="h-5 w-5 text-sky-600" />
              <h2 className="text-lg font-semibold text-slate-900">Product Tracking</h2>
            </div>

            <div className="space-y-4">
              {batch.productRepairTracking?.map((product: any, index: number) => (
                <div key={index} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="mb-4 grid gap-4 md:grid-cols-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-500">Product</p>
                      <p className="mt-1 font-semibold text-slate-900">{product.productName}</p>
                      <p className="text-xs text-slate-500">SKU: {product.productSku}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-500">Purchased Qty</p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">
                        {product.invoiceQuantity}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-500">Already Sent</p>
                      <p className="mt-1 text-2xl font-bold text-amber-600">
                        {product.totalSentQuantity}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-500">Remaining</p>
                      <p className="mt-1 text-2xl font-bold text-emerald-600">
                        {product.remainingQuantity}
                      </p>
                    </div>
                  </div>

                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex-1 rounded-full bg-slate-200 p-1">
                      <div
                        className="flex h-2 rounded-full bg-sky-500"
                        style={{
                          width: `${(product.totalSentQuantity / product.invoiceQuantity) * 100}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs font-semibold text-slate-600">
                      {Math.round((product.totalSentQuantity / product.invoiceQuantity) * 100)}%
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-300 bg-white p-3">
                    <p className="text-xs font-semibold text-slate-600">Warranty Status</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          product.warrantyValid
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {product.warrantyValid ? '✓ Valid' : '✗ Expired'}
                      </span>
                      {product.warrantyExpiresAt && (
                        <p className="text-xs text-slate-500">
                          Expires: {new Date(product.warrantyExpiresAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Individual Repairs */}
          {repairs.length > 0 && (
            <Card className="rounded-[28px] border-slate-200 p-6 shadow-sm shadow-slate-200/40">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-sky-600" />
                <h2 className="text-lg font-semibold text-slate-900">Individual Repairs</h2>
              </div>

              <div className="space-y-3">
                {repairs.map((repair, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-3xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{repair.repairNumber}</p>
                      <div className="mt-1 flex gap-4 text-sm text-slate-600">
                        <span>{repair.productName}</span>
                        <span>Qty: {repair.repairQuantity}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          stepStyles[repair.status] || 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {repair.status}
                      </span>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => router.push(`/warranty/${repair._id}`)}
                    >
                      View
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
