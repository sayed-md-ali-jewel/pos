import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import MainLayout from '@/components/Layout/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button, Card } from '@/components/Common/FormElements';
import { ArrowLeft, Printer } from 'lucide-react';
import toast from 'react-hot-toast';

interface LedgerEntry {
  date: string;
  reference: string;
  type: string;
  amount: number;
  paid: number;
  balance: number;
  status: string;
  note?: string;
}

interface SupplierData {
  _id: string;
  name: string;
  supplierCode: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  dueAmount: number;
  totalPurchased: number;
}

export default function SupplierStatementPage() {
  return (
    <ProtectedRoute requiredRole={['admin', 'manager']}>
      <SupplierStatementContent />
    </ProtectedRoute>
  );
}

function SupplierStatementContent() {
  const router = useRouter();
  const { id } = router.query;
  const [supplier, setSupplier] = useState<SupplierData | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || Array.isArray(id)) return;
    fetchStatement(id);
  }, [id]);

  const fetchStatement = async (supplierId: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/inventory/suppliers/${supplierId}/ledger`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setSupplier(res.data.data.supplier);
        setLedger(res.data.data.ledger || []);
      }
    } catch {
      toast.error('Failed to load supplier statement');
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => {
    const totalAmount = ledger.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalPaid = ledger.reduce((sum, item) => sum + Number(item.paid || 0), 0);
    const totalDue = Math.max(totalAmount - totalPaid, 0);
    return { totalAmount, totalPaid, totalDue };
  }, [ledger]);

  if (loading) {
    return (
      <MainLayout title="Supplier Statement">
        <div className="flex h-64 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-sky-600" />
        </div>
      </MainLayout>
    );
  }

  if (!supplier) return null;

  return (
    <MainLayout title={`Statement - ${supplier.name}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="secondary"
            onClick={() => router.push(`/inventory/suppliers/${supplier._id}`)}
            className="gap-2"
          >
            <ArrowLeft size={16} /> Back
          </Button>
          <Button onClick={() => window.print()} className="gap-2">
            <Printer size={16} /> Print Statement
          </Button>
        </div>

        <Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold">Supplier</p>
              <p className="font-bold text-slate-900">{supplier.name}</p>
              <p className="text-sm text-slate-600">{supplier.supplierCode}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold">Contact</p>
              <p className="text-sm text-slate-700">{supplier.phone}</p>
              <p className="text-sm text-slate-700">{supplier.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold">Address</p>
              <p className="text-sm text-slate-700">{supplier.address || 'N/A'}</p>
              <p className="text-sm text-slate-700">{supplier.city || ''}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500 uppercase">Total Purchase</p>
              <p className="text-lg font-bold text-slate-900">৳{totals.totalAmount.toFixed(2)}</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="text-xs text-emerald-600 uppercase">Total Paid</p>
              <p className="text-lg font-bold text-emerald-700">৳{totals.totalPaid.toFixed(2)}</p>
            </div>
            <div className="rounded-lg bg-rose-50 p-3">
              <p className="text-xs text-rose-600 uppercase">Current Due</p>
              <p className="text-lg font-bold text-rose-700">৳{totals.totalDue.toFixed(2)}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Reference</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2 text-right">Paid</th>
                  <th className="px-3 py-2 text-right">Due</th>
                  <th className="px-3 py-2 text-left">Note</th>
                </tr>
              </thead>
              <tbody>
                {ledger.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                      No statement entries found
                    </td>
                  </tr>
                ) : (
                  ledger.map((entry, idx) => (
                    <tr key={`${entry.reference}-${idx}`} className="border-b border-slate-100">
                      <td className="px-3 py-2">{new Date(entry.date).toLocaleDateString()}</td>
                      <td className="px-3 py-2 font-medium text-sky-700">{entry.reference}</td>
                      <td className="px-3 py-2">{entry.type}</td>
                      <td className="px-3 py-2 text-right">
                        ৳{Number(entry.amount || 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        ৳{Number(entry.paid || 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-rose-700">
                        ৳{Number(entry.balance || 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500">{entry.note || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
