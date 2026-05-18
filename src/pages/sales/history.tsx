import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import MainLayout from '@/components/Layout/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ActionButton, Card, Button, Input } from '@/components/Common/FormElements';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { formatCurrency } from '@/utils/format';
import { Eye, RotateCcw } from 'lucide-react';

interface SaleItem {
  productId: string | { _id: string; name?: string };
  productName?: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface Sale {
  _id: string;
  saleNumber: string;
  total: number;
  paidAmount: number;
  dueAmount: number;
  status: string;
  createdAt: string;
  customerId?: { name: string; phone: string };
  walkinCustomerName?: string;
  walkinCustomerPhone?: string;
  items: SaleItem[];
  returnInfo?: any[];
}

export default function SalesHistoryPage() {
  return (
    <ProtectedRoute requiredRole={['admin', 'manager', 'cashier']}>
      <SalesHistoryContent />
    </ProtectedRoute>
  );
}

function SalesHistoryContent() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Return Modal State
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnItems, setReturnItems] = useState<
    {
      productId: string;
      quantity: number;
      condition: string;
      refundAmount: number;
      reason: string;
      maxQty: number;
    }[]
  >([]);
  const [processingReturn, setProcessingReturn] = useState(false);

  const getProductId = (product: SaleItem['productId']) =>
    typeof product === 'string' ? product : product?._id;

  const getProductName = (item: SaleItem) =>
    (typeof item.productId === 'string' ? '' : item.productId?.name) ||
    item.productName ||
    'Unknown Product';

  const getSaleCustomerInfo = (sale: Sale) => {
    if (sale.customerId?.name) {
      return {
        name: sale.customerId.name,
        phone: sale.customerId.phone,
      };
    }

    return {
      name: sale.walkinCustomerName ? `👤 Walk-in: ${sale.walkinCustomerName}` : '👤 Walk-in',
      phone: sale.walkinCustomerPhone,
    };
  };

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/sales?page=${pagination.page}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setSales(res.data.data.sales);
        setPagination({
          page: res.data.data.page,
          pages: res.data.data.pages,
          total: res.data.data.total,
        });
      }
    } catch (error) {
      toast.error('Failed to load sales history');
    } finally {
      setLoading(false);
    }
  }, [pagination.page]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded text-xs font-bold uppercase">
            Completed
          </span>
        );
      case 'pending':
        return (
          <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-bold uppercase">
            Pending
          </span>
        );
      case 'returned_partial':
        return (
          <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-bold uppercase">
            Partial Return
          </span>
        );
      case 'returned_full':
        return (
          <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-bold uppercase">
            Full Return
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-bold uppercase">
            {status}
          </span>
        );
    }
  };

  const openReturnModal = (sale: Sale) => {
    setSelectedSale(sale);
    // Initialize return items map
    const itemsToReturn = sale.items
      .map((item) => {
        const saleItemProductId = getProductId(item.productId);
        if (!saleItemProductId) return null;

        const previouslyReturned = sale.returnInfo
          ? sale.returnInfo
              .filter((ri) => {
                const returnProductId =
                  typeof ri.productId === 'string' ? ri.productId : ri.productId?._id;
                return returnProductId === saleItemProductId;
              })
              .reduce((sum, ri) => sum + ri.quantity, 0)
          : 0;

        const availableQty = item.quantity - previouslyReturned;
        return {
          productId: saleItemProductId,
          productName: getProductName(item),
          price: item.price,
          maxQty: availableQty,
          quantity: 0,
          condition: 'Good',
          refundAmount: 0,
          reason: '',
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .filter((item) => item.maxQty > 0);

    setReturnItems(itemsToReturn as any);
    setIsReturnModalOpen(true);
  };

  const handleReturnItemChange = (productId: string, field: string, value: any) => {
    setReturnItems((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          const updated = { ...item, [field]: value };
          // Auto calculate refund amount based on price if quantity changes
          if (field === 'quantity') {
            updated.refundAmount = Number(value) * (item as any).price;
          }
          return updated;
        }
        return item;
      })
    );
  };

  const submitReturn = async () => {
    const itemsToProcess = returnItems.filter((item) => item.quantity > 0);
    if (itemsToProcess.length === 0) {
      toast.error('Please specify at least one item to return');
      return;
    }

    // Validate
    for (const item of itemsToProcess) {
      if (item.quantity > item.maxQty) {
        toast.error(`Cannot return more than ${item.maxQty} for ${(item as any).productName}`);
        return;
      }
    }

    setProcessingReturn(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `/api/sales/${selectedSale?._id}/return`,
        {
          returnItems: itemsToProcess,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data.success) {
        toast.success('Return processed successfully!');
        setIsReturnModalOpen(false);
        fetchSales(); // reload table
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to process return');
    } finally {
      setProcessingReturn(false);
    }
  };

  return (
    <MainLayout title="Sales History">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Sales History</h1>
        <p className="text-slate-600 mt-1">Review transactions, returns, and customer payments</p>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Invoice
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="h-8 w-8 border-4 border-slate-200 border-t-primary-600 rounded-full animate-spin"></div>
                    </div>
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="text-center">
                      <svg
                        className="mx-auto h-12 w-12 text-slate-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                        />
                      </svg>
                      <p className="mt-4 text-slate-500 font-medium">No sales found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sales.map((sale, idx) => (
                  <tr key={sale._id} className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-2">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-mono font-bold">
                          {sale.saleNumber}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(sale.saleNumber);
                            toast.success('Invoice number copied!');
                          }}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded"
                          title="Copy invoice number"
                        >
                          📋
                        </button>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div>
                        <p className="font-medium text-slate-900">
                          {new Date(sale.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(sale.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {(() => {
                          const customer = getSaleCustomerInfo(sale);
                          return (
                            <>
                              <p className="font-semibold text-slate-900">{customer.name}</p>
                              {customer.phone && (
                                <p className="text-xs text-slate-500">{customer.phone}</p>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm font-semibold">
                        <span>📦</span>
                        {sale.items.length} item{sale.items.length !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm">
                        <p className="font-bold text-slate-900">{formatCurrency(sale.total)}</p>
                        {sale.dueAmount > 0 && (
                          <p className="text-xs text-red-600">
                            Due: {formatCurrency(sale.dueAmount)}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">{getStatusBadge(sale.status)}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex gap-2 justify-center">
                        <ActionButton
                          variant="view"
                          href={`/sales/receipt/${sale._id}`}
                          label="View"
                          icon={<Eye size={12} />}
                          title="View receipt"
                        />
                        {(sale.status === 'completed' || sale.status === 'returned_partial') && (
                          <ActionButton
                            variant="secondary"
                            onClick={() => openReturnModal(sale)}
                            label="Return"
                            icon={<RotateCcw size={12} />}
                            title="Process return"
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && sales.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-sm text-slate-600">
              Page <span className="font-semibold">{pagination.page}</span> of{' '}
              <span className="font-semibold">{pagination.pages}</span>
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                disabled={pagination.page === 1}
                className="px-3 py-1 border border-slate-300 rounded-lg text-sm font-medium hover:bg-white disabled:opacity-50 transition"
              >
                ← Previous
              </button>
              <button
                onClick={() =>
                  setPagination((p) => ({ ...p, page: Math.min(p.pages, p.page + 1) }))
                }
                disabled={pagination.page === pagination.pages}
                className="px-3 py-1 border border-slate-300 rounded-lg text-sm font-medium hover:bg-white disabled:opacity-50 transition"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Return Modal */}
      {isReturnModalOpen && selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-rose-600 to-rose-700 p-4 text-white flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-bold">↩️ Process Return</h2>
                <p className="text-rose-100 text-sm">Invoice: {selectedSale.saleNumber}</p>
              </div>
              <button
                onClick={() => setIsReturnModalOpen(false)}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {returnItems.length === 0 ? (
                <div className="text-center p-8 text-slate-500 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                  <p className="font-medium">✓ This order has been fully returned.</p>
                  <p className="text-sm">No items available for return.</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">
                          Product
                        </th>
                        <th className="px-4 py-3 text-center font-semibold text-slate-700">
                          Available
                        </th>
                        <th className="px-4 py-3 text-center font-semibold text-slate-700">
                          Return Qty
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">
                          Condition
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700">
                          Refund (৳)
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {returnItems.map((item) => (
                        <tr key={item.productId} className="hover:bg-slate-50 transition">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {(item as any).productName}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full font-bold text-sm">
                              {item.maxQty}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              max={item.maxQty}
                              value={item.quantity}
                              onChange={(e) =>
                                handleReturnItemChange(
                                  item.productId,
                                  'quantity',
                                  Number(e.target.value)
                                )
                              }
                              className="input-field w-20 text-center"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <select
                              className="input-field py-1 px-2 text-sm font-medium"
                              value={item.condition}
                              onChange={(e) =>
                                handleReturnItemChange(item.productId, 'condition', e.target.value)
                              }
                            >
                              <option value="Good">✓ Good</option>
                              <option value="Damaged">✕ Damaged</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.refundAmount}
                              onChange={(e) =>
                                handleReturnItemChange(
                                  item.productId,
                                  'refundAmount',
                                  Number(e.target.value)
                                )
                              }
                              className="input-field w-24 text-right"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              placeholder="Why?"
                              value={item.reason}
                              onChange={(e) =>
                                handleReturnItemChange(item.productId, 'reason', e.target.value)
                              }
                              className="input-field text-sm"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setIsReturnModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-white transition"
              >
                Cancel
              </button>
              <button
                onClick={submitReturn}
                disabled={processingReturn}
                className="px-4 py-2 bg-gradient-to-r from-rose-600 to-rose-700 text-white font-semibold rounded-lg hover:from-rose-700 hover:to-rose-800 disabled:opacity-50 transition flex items-center gap-2"
              >
                {processingReturn ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>✓ Confirm Return & Refund</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
