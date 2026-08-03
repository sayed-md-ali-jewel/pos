import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { ArrowLeft, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import MainLayout from '@/components/Layout/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ActionButton, Card } from '@/components/Common/FormElements';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency } from '@/utils/format';

interface Customer {
  _id: string;
  customerCode?: string;
  name: string;
  email?: string;
  phone: string;
  address?: string;
  city?: string;
  avatar?: string;
  dateOfBirth?: string;
  gender?: string;
  dueAmount?: number;
  balance?: number;
  totalPurchased?: number;
  totalTransactions?: number;
  lastPurchaseDate?: string;
  loyaltyPoints?: number;
  notes?: string;
  isActive: boolean;
  createdAt?: string;
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 py-3 last:border-0">
      <span className="shrink-0 text-sm font-medium text-secondary-500">{label}</span>
      <span className="text-right text-sm font-semibold text-secondary-900">{value || '-'}</span>
    </div>
  );
}

export default function CustomerDetailPage() {
  return (
    <ProtectedRoute requiredRole={['admin', 'manager', 'cashier']}>
      <CustomerDetailContent />
    </ProtectedRoute>
  );
}

function CustomerDetailContent() {
  const router = useRouter();
  const { id } = router.query;
  const auth = useAuthStore();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchCustomer = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`/api/customers?id=${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data.success) {
          setCustomer(res.data.data);
        }
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to load customer');
        router.push('/customers');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [id, router]);

  if (loading) {
    return (
      <MainLayout title="Customer Detail">
        <div className="flex h-64 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-sky-600" />
        </div>
      </MainLayout>
    );
  }

  if (!customer) return null;

  const canManage = auth.user?.role === 'admin' || auth.user?.role === 'manager';
  const normalizedDue = Math.max(customer.dueAmount ?? 0, customer.balance ?? 0);

  return (
    <MainLayout title={customer.name}>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => router.push('/customers')}
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-secondary-600 transition hover:bg-gray-50"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          {canManage && (
            <ActionButton
              variant="edit"
              href={`/customers/${customer._id}/edit`}
              label="Edit Customer"
              icon={<Pencil size={12} />}
            />
          )}
        </div>

        <Card>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-sky-100">
              {customer.avatar ? (
                <Image
                  src={customer.avatar}
                  alt={customer.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center text-3xl font-bold text-sky-700">
                  {customer.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-bold text-secondary-900">{customer.name}</h1>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    customer.isActive
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {customer.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium text-secondary-500">
                {customer.customerCode || 'No customer code'}
              </p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs font-bold uppercase text-secondary-400">Purchased</p>
            <p className="mt-1 text-xl font-bold text-secondary-900">
              {formatCurrency(customer.totalPurchased ?? 0)}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-bold uppercase text-secondary-400">Due</p>
            <p className="mt-1 text-xl font-bold text-orange-600">
              {formatCurrency(normalizedDue)}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-bold uppercase text-secondary-400">Transactions</p>
            <p className="mt-1 text-xl font-bold text-secondary-900">
              {customer.totalTransactions ?? 0}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-bold uppercase text-secondary-400">Points</p>
            <p className="mt-1 text-xl font-bold text-secondary-900">
              {customer.loyaltyPoints ?? 0}
            </p>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Contact Information">
            <InfoRow label="Phone" value={customer.phone} />
            <InfoRow label="Email" value={customer.email} />
            <InfoRow label="Address" value={customer.address} />
            <InfoRow label="City" value={customer.city} />
          </Card>

          <Card title="Customer Information">
            <InfoRow label="Gender" value={customer.gender} />
            <InfoRow
              label="Date of Birth"
              value={
                customer.dateOfBirth
                  ? new Date(customer.dateOfBirth).toLocaleDateString()
                  : undefined
              }
            />
            <InfoRow
              label="Last Purchase"
              value={
                customer.lastPurchaseDate
                  ? new Date(customer.lastPurchaseDate).toLocaleDateString()
                  : undefined
              }
            />
            <InfoRow
              label="Created"
              value={
                customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : undefined
              }
            />
          </Card>
        </div>

        {customer.notes && (
          <Card title="Notes">
            <p className="whitespace-pre-wrap text-sm font-medium text-secondary-700">
              {customer.notes}
            </p>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
