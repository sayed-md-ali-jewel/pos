import React, { useCallback, useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import MainLayout from '@/components/Layout/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ActionButton, Card, Button } from '@/components/Common/FormElements';
import { Eye } from 'lucide-react';
import toast from 'react-hot-toast';

interface StockMovement {
  _id: string;
  type: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  productId: { name: string; sku: string };
  performedBy: { firstName: string; lastName: string };
  referenceId?: string;
  referenceModel?: string;
  createdAt: string;
}

export default function StockHistory() {
  return (
    <ProtectedRoute requiredRole={['admin', 'manager']}>
      <HistoryContent />
    </ProtectedRoute>
  );
}

function HistoryContent() {
  const [history, setHistory] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      let url = `/api/inventory/history?page=${pagination.page}&limit=20`;
      if (typeFilter) url += `&type=${typeFilter}`;

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        setHistory(res.data.data.history);
        setPagination({
          page: res.data.data.page,
          pages: res.data.data.pages,
          total: res.data.data.total,
        });
      }
    } catch (error) {
      toast.error('Failed to load stock history');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, typeFilter]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'purchase':
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-bold uppercase">
            Purchase
          </span>
        );
      case 'sale':
        return (
          <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-md text-xs font-bold uppercase">
            Sale
          </span>
        );
      case 'return':
        return (
          <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-md text-xs font-bold uppercase">
            Return
          </span>
        );
      case 'adjustment':
        return (
          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-md text-xs font-bold uppercase">
            Adjustment
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-md text-xs font-bold uppercase">
            {type}
          </span>
        );
    }
  };

  return (
    <MainLayout title="Stock Movement History">
      <Card>
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Audit Trail</h2>
            <p className="text-sm text-gray-500 mt-1">Immutable record of all inventory changes.</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-600">Filter Type:</label>
            <select
              className="input-field py-1 px-3"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
            >
              <option value="">All Movements</option>
              <option value="sale">Sales</option>
              <option value="purchase">Purchases</option>
              <option value="return">Returns</option>
              <option value="adjustment">Adjustments</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
                <th className="p-4 font-semibold rounded-tl-lg">Date & Time</th>
                <th className="p-4 font-semibold">Product</th>
                <th className="p-4 font-semibold">Type</th>
                <th className="p-4 font-semibold text-center">Qty Change</th>
                <th className="p-4 font-semibold text-center">New Stock</th>
                <th className="p-4 font-semibold rounded-tr-lg">Performed By</th>
                <th className="p-4 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    Loading history...
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    No stock movements found.
                  </td>
                </tr>
              ) : (
                history.map((record) => (
                  <tr
                    key={record._id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition"
                  >
                    <td className="p-4">
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(record.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(record.createdAt).toLocaleTimeString()}
                      </p>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-gray-900">{record.productId?.name}</p>
                      <p className="text-xs font-mono text-gray-500">{record.productId?.sku}</p>
                    </td>
                    <td className="p-4">{getTypeBadge(record.type)}</td>
                    <td className="p-4 text-center">
                      <span
                        className={`font-bold ${record.quantity > 0 ? 'text-emerald-600' : 'text-red-600'}`}
                      >
                        {record.quantity > 0 ? '+' : ''}
                        {record.quantity}
                      </span>
                    </td>
                    <td className="p-4 text-center font-semibold text-gray-900">
                      {record.newStock}
                    </td>
                    <td className="p-4">
                      {record.performedBy?.firstName} {record.performedBy?.lastName}
                    </td>
                    <td className="p-4 text-center">
                      {record.referenceModel === 'Purchase' && record.referenceId ? (
                        <ActionButton
                          variant="view"
                          href={`/inventory/purchases/${record.referenceId}`}
                          label="View"
                          icon={<Eye size={14} />}
                          title="View purchase"
                        />
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex justify-between items-center mt-6 pt-4 border-t">
            <span className="text-sm text-gray-500">
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
      </Card>
    </MainLayout>
  );
}
