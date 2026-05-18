import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import MainLayout from '@/components/Layout/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ActionButton, Button, Card, Input } from '@/components/Common/FormElements';
import { useAppDialog } from '@/components/Common/AppDialog';

type PaymentMethod = 'cash' | 'card' | 'mobile' | 'bank' | 'cheque' | 'other';

interface Expense {
  _id: string;
  expenseNumber?: string;
  title: string;
  category: string;
  amount: number;
  paymentMethod: PaymentMethod;
  expenseDate: string;
  vendor?: string;
  reference?: string;
  notes?: string;
}

interface ExpenseForm {
  title: string;
  category: string;
  amount: string;
  paymentMethod: PaymentMethod;
  expenseDate: string;
  vendor: string;
  reference: string;
  notes: string;
}

const emptyForm: ExpenseForm = {
  title: '',
  category: '',
  amount: '',
  paymentMethod: 'cash',
  expenseDate: new Date().toISOString().slice(0, 10),
  vendor: '',
  reference: '',
  notes: '',
};

const paymentMethods: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'bank', label: 'Bank' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

export default function ExpensesPage() {
  return (
    <ProtectedRoute requiredRole={['admin', 'manager']}>
      <ExpensesContent />
    </ProtectedRoute>
  );
}

function ExpensesContent() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [form, setForm] = useState<ExpenseForm>(emptyForm);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({ totalAmount: 0, totalExpenses: 0 });
  const dialog = useAppDialog();

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-BD', {
        style: 'currency',
        currency: 'BDT',
        maximumFractionDigits: 0,
      }),
    []
  );

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      if (paymentMethod) params.set('paymentMethod', paymentMethod);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      params.set('page', String(page));
      params.set('limit', '20');

      const response = await axios.get(`/api/expenses?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setExpenses(response.data.data.expenses);
        setCategories(response.data.data.categories);
        setSummary(response.data.data.summary);
        setTotal(response.data.data.total);
        setTotalPages(response.data.data.pages || 1);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  }, [category, endDate, page, paymentMethod, search, startDate]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const openCreateForm = () => {
    setEditingExpense(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (expense: Expense) => {
    setEditingExpense(expense);
    setForm({
      title: expense.title,
      category: expense.category,
      amount: String(expense.amount),
      paymentMethod: expense.paymentMethod,
      expenseDate: new Date(expense.expenseDate).toISOString().slice(0, 10),
      vendor: expense.vendor || '',
      reference: expense.reference || '',
      notes: expense.notes || '',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingExpense(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !form.category.trim() || Number(form.amount) <= 0) {
      toast.error('Title, category, and valid amount are required');
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const payload = {
        ...form,
        title: form.title.trim(),
        category: form.category.trim(),
        amount: Number(form.amount),
      };

      if (editingExpense) {
        await axios.put(`/api/expenses?id=${editingExpense._id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Expense updated');
      } else {
        await axios.post('/api/expenses', payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Expense added');
      }

      closeForm();
      fetchExpenses();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (expense: Expense) => {
    const confirmed = await dialog.confirm({
      title: 'Delete expense?',
      message: `Delete "${expense.title}" from expense records?`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/expenses?id=${expense._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Expense deleted');
      fetchExpenses();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete expense');
    }
  };

  const resetFilters = () => {
    setSearch('');
    setCategory('');
    setPaymentMethod('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const activeFilters = [search, category, paymentMethod, startDate, endDate].filter(
    Boolean
  ).length;

  return (
    <MainLayout title="Expenses">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">Expenses</h1>
            <p className="mt-1 text-sm text-secondary-500">
              {total} record{total !== 1 ? 's' : ''} found
            </p>
          </div>
          <Button onClick={openCreateForm} size="md">
            <Plus size={17} />
            Add Expense
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-5">
            <p className="text-sm font-medium text-secondary-500">Total Expense</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">
              {currencyFormatter.format(Number(summary.totalAmount) || 0)}
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-sm font-medium text-secondary-500">Entries</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">
              {Number(summary.totalExpenses) || 0}
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-sm font-medium text-secondary-500">Average</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">
              {currencyFormatter.format(
                Number(summary.totalExpenses)
                  ? Number(summary.totalAmount) / Number(summary.totalExpenses)
                  : 0
              )}
            </p>
          </Card>
        </div>

        <Card>
          <div className="space-y-4">
            <div className="flex gap-3">
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="input-field flex-1"
                placeholder="Search title, category, vendor, reference..."
              />
              {activeFilters > 0 && (
                <button
                  onClick={resetFilters}
                  className="whitespace-nowrap rounded-lg border border-gray-200 px-4 text-sm font-medium text-secondary-600 transition hover:bg-gray-50"
                >
                  Clear ({activeFilters})
                </button>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <select
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value);
                  setPage(1);
                }}
                className="input-field text-sm"
              >
                <option value="">All Categories</option>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <select
                value={paymentMethod}
                onChange={(event) => {
                  setPaymentMethod(event.target.value);
                  setPage(1);
                }}
                className="input-field text-sm"
              >
                <option value="">All Payments</option>
                {paymentMethods.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={startDate}
                onChange={(event) => {
                  setStartDate(event.target.value);
                  setPage(1);
                }}
                className="input-field text-sm"
              />

              <input
                type="date"
                value={endDate}
                onChange={(event) => {
                  setEndDate(event.target.value);
                  setPage(1);
                }}
                className="input-field text-sm"
              />
            </div>
          </div>
        </Card>

        <Card>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-sky-600" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="py-16 text-center text-secondary-400">
              <p className="font-medium text-secondary-600">No expenses found</p>
              <p className="mt-1 text-sm">Add an expense or adjust your filters</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-3 text-left font-semibold text-secondary-600">
                        Expense
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-secondary-600">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-secondary-600">Date</th>
                      <th className="px-4 py-3 text-left font-semibold text-secondary-600">
                        Payment
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-secondary-600">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-secondary-600">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {expenses.map((expense) => (
                      <tr key={expense._id} className="transition hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-secondary-900">{expense.title}</p>
                          <p className="mt-1 text-xs text-secondary-500">
                            {expense.expenseNumber || 'Expense'}
                            {expense.vendor ? ` · ${expense.vendor}` : ''}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-secondary-700">{expense.category}</td>
                        <td className="px-4 py-3 text-secondary-700">
                          {new Date(expense.expenseDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-secondary-700 capitalize">
                          {expense.paymentMethod}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-rose-600">
                          {currencyFormatter.format(expense.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center gap-2">
                            <ActionButton
                              variant="secondary"
                              onClick={() => openEditForm(expense)}
                              title="Edit expense"
                              icon={<Pencil size={16} />}
                            />
                            <ActionButton
                              variant="delete"
                              onClick={() => handleDelete(expense)}
                              title="Delete expense"
                              icon={<Trash2 size={16} />}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                  <p className="text-sm text-secondary-500">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page === totalPages}
                      onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-bold text-secondary-900">
                  {editingExpense ? 'Edit Expense' : 'Add Expense'}
                </h2>
                <button
                  onClick={closeForm}
                  className="rounded-lg p-2 text-secondary-500 transition hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Title"
                    value={form.title}
                    onChange={(event) => setForm({ ...form, title: event.target.value })}
                    placeholder="Office rent"
                    required
                  />
                  <Input
                    label="Category"
                    value={form.category}
                    onChange={(event) => setForm({ ...form, category: event.target.value })}
                    placeholder="Rent, Utility, Salary..."
                    required
                    list="expense-categories"
                  />
                  <datalist id="expense-categories">
                    {categories.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                  <Input
                    label="Amount"
                    type="number"
                    min="1"
                    step="0.01"
                    value={form.amount}
                    onChange={(event) => setForm({ ...form, amount: event.target.value })}
                    required
                  />
                  <Input
                    label="Date"
                    type="date"
                    value={form.expenseDate}
                    onChange={(event) => setForm({ ...form, expenseDate: event.target.value })}
                    required
                  />
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Payment Method
                    </label>
                    <select
                      value={form.paymentMethod}
                      onChange={(event) =>
                        setForm({ ...form, paymentMethod: event.target.value as PaymentMethod })
                      }
                      className="input-field"
                    >
                      {paymentMethods.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Input
                    label="Vendor"
                    value={form.vendor}
                    onChange={(event) => setForm({ ...form, vendor: event.target.value })}
                    placeholder="Optional"
                  />
                  <Input
                    label="Reference"
                    value={form.reference}
                    onChange={(event) => setForm({ ...form, reference: event.target.value })}
                    placeholder="Receipt or invoice no."
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(event) => setForm({ ...form, notes: event.target.value })}
                    className="input-field min-h-24"
                    placeholder="Optional details"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="secondary" onClick={closeForm}>
                    Cancel
                  </Button>
                  <Button type="submit" isLoading={saving}>
                    {editingExpense ? 'Update Expense' : 'Save Expense'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
