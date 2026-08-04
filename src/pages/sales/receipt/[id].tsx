import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import MainLayout from '@/components/Layout/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/Common/FormElements';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/utils/format';

export default function ReceiptPage() {
  return (
    <ProtectedRoute requiredRole={['admin', 'manager', 'cashier']}>
      <ReceiptContent />
    </ProtectedRoute>
  );
}

function ReceiptContent() {
  const router = useRouter();
  const { id } = router.query;
  const [sale, setSale] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');

        // Fetch sale data
        const saleRes = await axios.get(`/api/sales?id=${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Fetch settings data
        const settingsRes = await axios.get('/api/settings', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (saleRes.data.success) {
          setSale(saleRes.data.data);
        }

        if (settingsRes.data.success) {
          setSettings(settingsRes.data.data);
        }
      } catch (error) {
        toast.error('Failed to load receipt data');
        router.push('/sales');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, router]);

  if (loading) {
    return (
      <MainLayout title="Receipt">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600" />
        </div>
      </MainLayout>
    );
  }

  if (!sale) return null;

  const customerInfo = sale.customerId
    ? {
        label: 'Customer',
        name: sale.customerId.name,
        phone: sale.customerId.phone,
      }
    : sale.walkinCustomerName || sale.walkinCustomerPhone
      ? {
          label: 'Walk-in Customer',
          name: sale.walkinCustomerName || 'Walk-in Customer',
          phone: sale.walkinCustomerPhone,
        }
      : null;
  const saleTotal = Number(sale.total || 0);
  const salePaidAmount = Number(sale.paidAmount || 0);
  const saleDueAmount = Math.max(Number(sale.dueAmount || 0), saleTotal - salePaidAmount, 0);

  return (
    <MainLayout title={`Receipt ${sale.saleNumber}`}>
      {/* Actions (Hidden when printing) */}
      <div className="mb-6 flex gap-3 justify-center print:hidden">
        <button
          onClick={() => router.push('/sales')}
          className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition"
        >
          ← Back to POS
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
        >
          🖨️ Print Receipt
        </button>
      </div>

      {/* Receipt Container */}
      <div className="max-w-2xl mx-auto print:max-w-full print:mx-0">
        <div className="bg-white rounded-lg shadow-lg border border-slate-200 print:shadow-none print:border-none print:rounded-none overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-8 print:p-6 text-center">
            <h1 className="text-3xl font-bold mb-2">{settings?.storeName || 'MR Trading'}</h1>
            {settings?.storeAddress && (
              <p className="text-slate-300 text-sm">📍 {settings.storeAddress}</p>
            )}
            {settings?.storePhone && (
              <p className="text-slate-300 text-sm">☎️ {settings.storePhone}</p>
            )}
            {(settings?.storeEmail || settings?.storeTagline) && (
              <p className="text-slate-400 text-xs mt-2">
                {settings.storeTagline && settings.storeTagline}
                {settings.storeTagline && settings.storeEmail && ' | '}
                {settings.storeEmail && settings.storeEmail}
              </p>
            )}
          </div>

          {/* Receipt Details */}
          <div className="px-8 py-6 print:px-6 print:py-4 border-b-2 border-dashed border-slate-300">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500 text-xs font-semibold uppercase">Receipt Number</p>
                <p className="text-lg font-mono font-bold text-slate-900">{sale.saleNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-500 text-xs font-semibold uppercase">Date & Time</p>
                <p className="text-lg font-mono font-bold text-slate-900">
                  {new Date(sale.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs font-semibold uppercase">Cashier</p>
                <p className="font-semibold text-slate-900">
                  {sale.cashierId?.firstName} {sale.cashierId?.lastName}
                </p>
              </div>
              {customerInfo && (
                <div className="text-right">
                  <p className="text-slate-500 text-xs font-semibold uppercase">
                    {customerInfo.label}
                  </p>
                  <p className="font-semibold text-slate-900">{customerInfo.name}</p>
                  {customerInfo.phone && (
                    <p className="mt-0.5 text-xs font-medium text-slate-600">
                      {customerInfo.phone}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="px-8 py-6 print:px-6 print:py-4">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 pb-2 mb-3">
                <tr className="text-left">
                  <th className="pb-2 font-bold text-slate-700 text-xs uppercase">Item</th>
                  <th className="pb-2 font-bold text-slate-700 text-xs uppercase text-center">
                    Qty
                  </th>
                  <th className="pb-2 font-bold text-slate-700 text-xs uppercase text-right">
                    Price
                  </th>
                  <th className="pb-2 font-bold text-slate-700 text-xs uppercase text-right">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sale.items.map((item: any) => (
                  <tr key={item._id} className="hover:bg-slate-50 transition">
                    <td className="py-2 text-slate-900 font-medium">{item.productName}</td>
                    <td className="py-2 text-center text-slate-700">{item.quantity}</td>
                    <td className="py-2 text-right text-slate-700">{formatCurrency(item.price)}</td>
                    <td className="py-2 text-right font-semibold text-slate-900">
                      {formatCurrency(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="px-8 py-6 print:px-6 print:py-4 bg-gradient-to-b from-slate-50 to-white border-t-2 border-dashed border-slate-300 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-700 font-medium">Subtotal:</span>
              <span className="text-slate-900 font-semibold">{formatCurrency(sale.subtotal)}</span>
            </div>

            {sale.discount > 0 && (
              <div className="flex justify-between items-center text-sm bg-red-50 px-3 py-2 rounded border border-red-100">
                <span className="text-red-700 font-medium">Discount:</span>
                <span className="text-red-700 font-semibold">−{formatCurrency(sale.discount)}</span>
              </div>
            )}

            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-700 font-medium">Tax ({sale.taxPercent}%):</span>
              <span className="text-slate-900 font-semibold">{formatCurrency(sale.tax)}</span>
            </div>

            {saleDueAmount > 0 && (
              <div className="flex justify-between items-center text-sm bg-red-50 px-3 py-2 rounded border border-red-100">
                <span className="text-red-700 font-medium">Due Amount:</span>
                <span className="text-red-700 font-semibold">{formatCurrency(saleDueAmount)}</span>
              </div>
            )}

            <div className="flex justify-between items-center text-lg font-bold border-t-2 border-slate-300 pt-3 mt-3">
              <span className="text-slate-900">Grand Total:</span>
              <span className="text-primary-600 text-2xl">{formatCurrency(sale.total)}</span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-700 font-medium">Paid for This Sale:</span>
              <span className="text-emerald-700 font-semibold">
                {formatCurrency(salePaidAmount)}
              </span>
            </div>
          </div>

          {/* Payment Details */}
          <div className="px-8 py-6 print:px-6 print:py-4 border-t-2 border-dashed border-slate-300 space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500 text-xs font-semibold uppercase mb-1">
                  Payment Method
                </p>
                <p className="font-semibold text-slate-900 capitalize">
                  {sale.paymentMethod === 'cash'
                    ? '💵'
                    : sale.paymentMethod === 'card'
                      ? '💳'
                      : sale.paymentMethod === 'mobile'
                        ? '📱'
                        : '📋'}{' '}
                  {sale.paymentMethod}
                </p>
              </div>
              <div className="text-right">
                <p className="text-slate-500 text-xs font-semibold uppercase mb-1">
                  Paid for This Sale
                </p>
                <p className="font-semibold text-slate-900">{formatCurrency(salePaidAmount)}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs font-semibold uppercase mb-1">Remaining Due</p>
                <p
                  className={`font-semibold ${
                    saleDueAmount > 0 ? 'text-red-600' : 'text-emerald-600'
                  }`}
                >
                  {formatCurrency(saleDueAmount)}
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-6 print:px-6 print:py-4 bg-gradient-to-r from-slate-50 to-slate-100 border-t border-slate-200 text-center space-y-3">
            <div>
              <p className="font-bold text-lg text-slate-900 mb-1">✓ Thank You!</p>
              <p className="text-slate-600 text-sm">Please keep this receipt for your records.</p>
            </div>

            {/* Barcode */}
            <div className="py-2">
              <div className="font-barcode text-3xl tracking-widest text-center mx-auto overflow-hidden text-slate-800 select-none">
                ||| |||| || ||| | || |
              </div>
              <p className="text-[10px] text-slate-400 font-mono mt-1">{sale.saleNumber}</p>
            </div>

            <div className="text-xs text-slate-500 space-y-1">
              <p>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</p>
              <p>This is a computer-generated receipt.</p>
              <p>No signature required.</p>
              <p className="text-[9px]">Generated on {new Date(sale.createdAt).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
