import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import MainLayout from '@/components/Layout/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ActionButton, Button, Input, Card } from '@/components/Common/FormElements';
import toast from 'react-hot-toast';
import { LayoutGrid, Edit, Trash2 } from 'lucide-react';
import { FilterSelect } from '@/components/Common/FilterSelect';

// ── Types ──────────────────────────────────────────────────────────────────
interface Category {
  _id: string;
  name: string;
  description?: string;
}

interface Subcategory {
  _id: string;
  name: string;
  description?: string;
  category: { _id: string; name: string } | string;
}

interface Brand {
  _id: string;
  name: string;
  description?: string;
}

type Tab = 'categories' | 'subcategories' | 'brands';

// ── Confirm Dialog ─────────────────────────────────────────────────────────
function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="mb-3 text-lg font-semibold text-secondary-900">Confirm Delete</h3>
        <p className="mb-6 text-sm text-secondary-600">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-medium text-white hover:bg-red-600 transition"
          >
            Delete
          </button>
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-secondary-700 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Inline Edit Row ────────────────────────────────────────────────────────
function EditableRow({
  name,
  description,
  onSave,
  onCancel,
}: {
  name: string;
  description?: string;
  onSave: (name: string, description: string) => void;
  onCancel: () => void;
}) {
  const [newName, setNewName] = useState(name);
  const [newDesc, setNewDesc] = useState(description || '');

  return (
    <tr className="bg-sky-50">
      <td className="px-4 py-2">
        <input
          className="w-full rounded-lg border border-sky-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
      </td>
      <td className="px-4 py-2">
        <input
          className="w-full rounded-lg border border-sky-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          placeholder="Optional description"
        />
      </td>
      <td className="px-4 py-2 text-right">
        <button
          onClick={() => onSave(newName, newDesc)}
          className="mr-2 rounded-lg bg-sky-500 px-3 py-1 text-xs font-medium text-white hover:bg-sky-600 transition"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg border px-3 py-1 text-xs font-medium text-secondary-600 hover:bg-gray-100 transition"
        >
          Cancel
        </button>
      </td>
    </tr>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function AttributesPage() {
  return (
    <ProtectedRoute requiredRole={['admin', 'manager']}>
      <AttributesContent />
    </ProtectedRoute>
  );
}

function AttributesContent() {
  const [activeTab, setActiveTab] = useState<Tab>('categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  // Add-form state
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newSubcatCategory, setNewSubcatCategory] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);

  // Confirm delete state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: Tab } | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}` };

  // ── Fetch ───────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const [catRes, subRes, brandRes] = await Promise.all([
        axios.get('/api/products/categories', { headers }),
        axios.get('/api/products/subcategories', { headers }),
        axios.get('/api/products/brands', { headers }),
      ]);
      if (catRes.data.success) setCategories(catRes.data.data.categories);
      if (subRes.data.success) setSubcategories(subRes.data.data.subcategories);
      if (brandRes.data.success) setBrands(brandRes.data.data.brands);
    } catch {
      toast.error('Failed to load data');
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Add ─────────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!newName.trim()) return toast.error('Name is required');

    try {
      if (activeTab === 'categories') {
        await axios.post(
          '/api/products/categories',
          { name: newName, description: newDesc },
          { headers }
        );
        toast.success('Category added');
      } else if (activeTab === 'subcategories') {
        if (!newSubcatCategory) return toast.error('Please select a category');
        await axios.post(
          '/api/products/subcategories',
          { name: newName, description: newDesc, category: newSubcatCategory },
          { headers }
        );
        toast.success('Subcategory added');
      } else {
        await axios.post(
          '/api/products/brands',
          { name: newName, description: newDesc },
          { headers }
        );
        toast.success('Brand added');
      }
      setNewName('');
      setNewDesc('');
      setNewSubcatCategory('');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add');
    }
  };

  // ── Update ───────────────────────────────────────────────────────────────
  const handleUpdate = async (id: string, name: string, description: string) => {
    try {
      const endpoint =
        activeTab === 'categories'
          ? `/api/products/categories?id=${id}`
          : activeTab === 'subcategories'
            ? `/api/products/subcategories?id=${id}`
            : `/api/products/brands?id=${id}`;

      await axios.put(endpoint, { name, description }, { headers });
      toast.success('Updated successfully');
      setEditingId(null);
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { id, type } = deleteTarget;
      const endpoint =
        type === 'categories'
          ? `/api/products/categories?id=${id}`
          : type === 'subcategories'
            ? `/api/products/subcategories?id=${id}`
            : `/api/products/brands?id=${id}`;

      await axios.delete(endpoint, { headers });
      toast.success('Deleted successfully');
      setDeleteTarget(null);
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  // ── Table header ──────────────────────────────────────────────────────────
  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'categories', label: 'Categories', count: categories.length },
    { key: 'subcategories', label: 'Subcategories', count: subcategories.length },
    { key: 'brands', label: 'Brands', count: brands.length },
  ];

  const currentItems =
    activeTab === 'categories'
      ? categories
      : activeTab === 'subcategories'
        ? subcategories
        : brands;

  const getCategoryName = (cat: Subcategory['category']) => {
    if (typeof cat === 'object' && cat !== null) return (cat as { _id: string; name: string }).name;
    const found = categories.find((c) => c._id === cat);
    return found?.name || '-';
  };

  return (
    <MainLayout title="Attributes">
      {deleteTarget && (
        <ConfirmDialog
          message={`Are you sure you want to delete this item? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">Attributes</h1>
            <p className="text-secondary-500 mt-1 text-sm">
              Manage Categories, Subcategories, and Brands in one place
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setEditingId(null);
                setNewName('');
                setNewDesc('');
              }}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition border-b-2 -mb-px ${
                activeTab === tab.key
                  ? 'border-sky-500 text-sky-600'
                  : 'border-transparent text-secondary-500 hover:text-secondary-800'
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  activeTab === tab.key
                    ? 'bg-sky-100 text-sky-700'
                    : 'bg-gray-100 text-secondary-500'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Add Form */}
        <Card>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-semibold text-secondary-600 mb-1 uppercase tracking-wider">
                {activeTab === 'categories'
                  ? 'Category Name'
                  : activeTab === 'subcategories'
                    ? 'Subcategory Name'
                    : 'Brand Name'}{' '}
                *
              </label>
              <input
                className="input-field"
                placeholder="Enter name..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
            </div>

            {activeTab === 'subcategories' && (
              <div className="min-w-[180px]">
                <label className="block text-xs font-semibold text-secondary-600 mb-1 uppercase tracking-wider">
                  Parent Category *
                </label>
                <FilterSelect
                  value={newSubcatCategory}
                  onChange={(v) => setNewSubcatCategory(v)}
                  placeholder="Select Category"
                  icon={<LayoutGrid size={15} />}
                  options={categories.map((c) => ({ value: c._id, label: c.name }))}
                />
              </div>
            )}

            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-semibold text-secondary-600 mb-1 uppercase tracking-wider">
                Description
              </label>
              <input
                className="input-field"
                placeholder="Optional description..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </div>

            <button
              onClick={handleAdd}
              className="rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-600 transition shadow-sm"
            >
              + Add
            </button>
          </div>
        </Card>

        {/* Table */}
        <Card>
          {currentItems.length === 0 ? (
            <div className="py-16 text-center text-secondary-400">
              <p className="text-4xl mb-3">📭</p>
              <p className="font-medium">No {activeTab} found. Add one above!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-4 py-3 font-semibold text-secondary-700">Name</th>
                    {activeTab === 'subcategories' && (
                      <th className="px-4 py-3 font-semibold text-secondary-700">Category</th>
                    )}
                    <th className="px-4 py-3 font-semibold text-secondary-700">Description</th>
                    <th className="px-4 py-3 text-right font-semibold text-secondary-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {currentItems.map((item: any) =>
                    editingId === item._id ? (
                      <EditableRow
                        key={item._id}
                        name={item.name}
                        description={item.description}
                        onSave={(name, description) => handleUpdate(item._id, name, description)}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      <tr key={item._id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 font-medium text-secondary-900">{item.name}</td>
                        {activeTab === 'subcategories' && (
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                              {getCategoryName(item.category)}
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-3 text-secondary-500">{item.description || '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <ActionButton
                              variant="edit"
                              onClick={() => setEditingId(item._id)}
                              title="Edit item"
                              icon={<Edit size={14} />}
                            />
                            <ActionButton
                              variant="delete"
                              onClick={() => setDeleteTarget({ id: item._id, type: activeTab })}
                              title="Delete item"
                              icon={<Trash2 size={14} />}
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </MainLayout>
  );
}
