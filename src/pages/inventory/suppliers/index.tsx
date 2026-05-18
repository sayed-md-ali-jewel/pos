import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Link from 'next/link';
import MainLayout from '@/components/Layout/MainLayout';
import { Card, Button, ActionButton } from '@/components/Common/FormElements';
import {
  Truck,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Star,
  ArrowRight,
  X,
  Building2,
  User,
  Pencil,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/utils/format';

const EMPTY_FORM = {
  name: '',
  phone: '',
  email: '',
  contactPerson: '',
  address: '',
  city: '',
  creditLimit: '',
  notes: '',
};

export default function SupplierList() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSuppliers();
  }, [pagination.page]);

  useEffect(() => {
    if (isModalOpen) {
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
  }, [isModalOpen]);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(
        `/api/inventory/suppliers?page=${pagination.page}&limit=20&search=${search}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setSuppliers(res.data.data.suppliers);
        setPagination({
          page: res.data.data.page,
          pages: res.data.data.pages,
          total: res.data.data.total,
        });
      }
    } catch {
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((p) => ({ ...p, page: 1 }));
    fetchSuppliers();
  };

  const handleOpenModal = () => {
    setEditingSupplier(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (supplier: any) => {
    setEditingSupplier(supplier);
    setForm({
      name: supplier.name || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      contactPerson: supplier.contactPerson || '',
      address: supplier.address || '',
      city: supplier.city || '',
      creditLimit: supplier.creditLimit?.toString() || '',
      notes: supplier.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (saving) return;
    setIsModalOpen(false);
    setEditingSupplier(null);
  };

  const handleFormChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Supplier name is required');
      return;
    }
    if (!form.phone.trim()) {
      toast.error('Phone number is required');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        contactPerson: form.contactPerson.trim() || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        creditLimit: form.creditLimit ? Number(form.creditLimit) : 0,
        notes: form.notes.trim() || undefined,
      };

      if (editingSupplier) {
        const res = await axios.put(`/api/inventory/suppliers?id=${editingSupplier._id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) {
          toast.success('Supplier updated successfully!');
          setIsModalOpen(false);
          fetchSuppliers();
        }
      } else {
        const res = await axios.post('/api/inventory/suppliers', payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) {
          toast.success(`Supplier "${form.name}" added successfully!`);
          setIsModalOpen(false);
          fetchSuppliers();
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save supplier');
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout title="Supplier Management">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Suppliers</h1>
          <p className="mt-1 text-sm text-slate-500">
            {pagination.total} supplier{pagination.total !== 1 ? 's' : ''} registered
          </p>
        </div>
        <Button onClick={handleOpenModal} className="gap-2 self-start sm:self-auto">
          <Plus size={18} /> Add Supplier
        </Button>
      </div>

      {/* ── Search ──────────────────────────────────────────────────────────── */}
      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by name, phone, or code..."
            className="input-field w-full pl-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button type="submit" variant="secondary" size="sm">
          Search
        </Button>
      </form>

      {/* ── Supplier Grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-slate-200" />
                  <div className="h-3 w-1/2 rounded bg-slate-200" />
                </div>
              </div>
              <div className="mt-6 space-y-2">
                <div className="h-3 w-full rounded bg-slate-100" />
                <div className="h-3 w-2/3 rounded bg-slate-100" />
              </div>
            </div>
          ))
        ) : suppliers.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Truck size={32} />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-700">No suppliers yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Click &quot;Add Supplier&quot; to get started
            </p>
            <Button onClick={handleOpenModal} className="mt-4 gap-2" size="sm">
              <Plus size={16} /> Add First Supplier
            </Button>
          </div>
        ) : (
          suppliers.map((supplier) => (
            <div
              key={supplier._id}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:border-indigo-200 hover:shadow-lg hover:-translate-y-0.5"
            >
              {/* Top gradient banner */}
              <div className="h-1.5 w-full bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500" />

              <div className="flex flex-1 flex-col p-5">
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-md shadow-indigo-200">
                      <Truck size={20} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate font-bold text-slate-900 leading-tight">
                        {supplier.name}
                      </h3>
                      <p className="mt-0.5 text-[11px] font-mono text-slate-400">
                        {supplier.supplierCode}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-1 ring-1 ring-amber-100">
                    <Star size={11} fill="#f59e0b" className="text-amber-500" />
                    <span className="text-xs font-bold text-amber-600">{supplier.rating || 5}</span>
                  </div>
                </div>

                {/* Contact info */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100">
                      <Phone size={11} className="text-slate-500" />
                    </div>
                    <span className="text-sm text-slate-600">{supplier.phone}</span>
                  </div>
                  {supplier.email && (
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100">
                        <Mail size={11} className="text-slate-500" />
                      </div>
                      <span className="truncate text-sm text-slate-600">{supplier.email}</span>
                    </div>
                  )}
                  {supplier.city && (
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100">
                        <MapPin size={11} className="text-slate-500" />
                      </div>
                      <span className="text-sm text-slate-600">{supplier.city}</span>
                    </div>
                  )}
                </div>

                {/* Financial stats */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-gradient-to-br from-sky-50 to-indigo-50 p-3 ring-1 ring-indigo-100">
                    <div className="flex items-center gap-1 mb-1">
                      <TrendingUp size={11} className="text-indigo-500" />
                      <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                        Purchased
                      </p>
                    </div>
                    <p className="text-sm font-extrabold text-indigo-700">
                      {formatCurrency(supplier.totalPurchased || 0)}
                    </p>
                  </div>
                  <div
                    className={`rounded-xl p-3 ring-1 ${
                      supplier.dueAmount > 0
                        ? 'bg-gradient-to-br from-rose-50 to-red-50 ring-rose-100'
                        : 'bg-gradient-to-br from-emerald-50 to-teal-50 ring-emerald-100'
                    }`}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <AlertCircle
                        size={11}
                        className={supplier.dueAmount > 0 ? 'text-rose-500' : 'text-emerald-500'}
                      />
                      <p
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          supplier.dueAmount > 0 ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        Due
                      </p>
                    </div>
                    <p
                      className={`text-sm font-extrabold ${
                        supplier.dueAmount > 0 ? 'text-rose-700' : 'text-emerald-700'
                      }`}
                    >
                      {formatCurrency(supplier.dueAmount || 0)}
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/inventory/suppliers/${supplier._id}`}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 py-2.5 text-xs font-bold text-white shadow-sm shadow-indigo-200 transition hover:from-sky-700 hover:to-indigo-700 hover:shadow-md"
                  >
                    View Ledger <ArrowRight size={13} />
                  </Link>
                  <ActionButton
                    variant="secondary"
                    onClick={() => handleOpenEditModal(supplier)}
                    title="Edit supplier"
                    icon={<Pencil size={13} />}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Pagination ──────────────────────────────────────────────────────── */}
      {pagination.pages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={pagination.page === 1}
            onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
          >
            Previous
          </Button>
          <span className="flex items-center px-3 text-sm text-slate-500">
            Page {pagination.page} of {pagination.pages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={pagination.page === pagination.pages}
            onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
          >
            Next
          </Button>
        </div>
      )}

      {/* ── Add Supplier Modal ───────────────────────────────────────────────── */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseModal();
          }}
        >
          <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-sky-600 to-indigo-600 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white">
                  {editingSupplier ? <Pencil size={20} /> : <Truck size={20} />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {editingSupplier ? `Edit — ${editingSupplier.name}` : 'Add New Supplier'}
                  </h2>
                  <p className="text-xs text-sky-200">
                    {editingSupplier
                      ? 'Update the supplier details below'
                      : 'Fill in the supplier details below'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/20 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto">
              <div className="space-y-5 p-6">
                {/* Business Details */}
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <Building2 size={14} /> Business Details
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Supplier Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        ref={firstInputRef}
                        type="text"
                        placeholder="e.g. ABC Trading Co."
                        className="input-field w-full"
                        value={form.name}
                        onChange={(e) => handleFormChange('name', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        City
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Dhaka"
                        className="input-field w-full"
                        value={form.city}
                        onChange={(e) => handleFormChange('city', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Credit Limit (৳)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="input-field w-full"
                        value={form.creditLimit}
                        onChange={(e) => handleFormChange('creditLimit', e.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Address
                      </label>
                      <input
                        type="text"
                        placeholder="Street address"
                        className="input-field w-full"
                        value={form.address}
                        onChange={(e) => handleFormChange('address', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Details */}
                <div className="border-t border-slate-100 pt-5">
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <User size={14} /> Contact Details
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Phone <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        placeholder="e.g. 01700000000"
                        className="input-field w-full"
                        value={form.phone}
                        onChange={(e) => handleFormChange('phone', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Email
                      </label>
                      <input
                        type="email"
                        placeholder="supplier@email.com"
                        className="input-field w-full"
                        value={form.email}
                        onChange={(e) => handleFormChange('email', e.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Contact Person
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Mr. Rahman"
                        className="input-field w-full"
                        value={form.contactPerson}
                        onChange={(e) => handleFormChange('contactPerson', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="border-t border-slate-100 pt-5">
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Any additional notes..."
                    className="input-field w-full resize-none"
                    value={form.notes}
                    onChange={(e) => handleFormChange('notes', e.target.value)}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCloseModal}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={saving}
                  className="gap-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 border-0 shadow-lg shadow-sky-200"
                >
                  {editingSupplier ? <Pencil size={16} /> : <Plus size={16} />}
                  {editingSupplier ? 'Save Changes' : 'Add Supplier'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
