import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
import MainLayout from '@/components/Layout/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ActionButton, Button, Card } from '@/components/Common/FormElements';
import { FilterSelect } from '@/components/Common/FilterSelect';
import { LayoutGrid, Tag, Boxes, Eye, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { useAppDialog } from '@/components/Common/AppDialog';
import { formatCurrency } from '@/utils/format';

interface Product {
  _id: string;
  name: string;
  image?: string;
  category: { _id: string; name: string };
  subcategory?: { _id: string; name: string };
  brand?: { _id: string; name: string };
  price: number;
  stock: number;
  minStock: number;
  barcode?: string;
  sku?: string;
  warranty: string;
}

interface Category {
  _id: string;
  name: string;
}

interface Brand {
  _id: string;
  name: string;
}

export default function ProductsPage() {
  return (
    <ProtectedRoute requiredRole={['admin', 'manager', 'cashier']}>
      <ProductsContent />
    </ProtectedRoute>
  );
}

function ProductsContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterStockStatus, setFilterStockStatus] = useState('');
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const auth = useAuthStore();
  const dialog = useAppDialog();

  // Fetch filter options once
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        const [catRes, brandRes] = await Promise.all([
          axios.get('/api/products/categories', { headers }),
          axios.get('/api/products/brands', { headers }),
        ]);
        if (catRes.data.success) setCategories(catRes.data.data.categories);
        if (brandRes.data.success) setBrands(brandRes.data.data.brands);
      } catch {
        // silently fail
      }
    };
    fetchOptions();
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterCategory) params.set('category', filterCategory);
      if (filterBrand) params.set('brand', filterBrand);
      if (filterStockStatus) params.set('stockStatus', filterStockStatus);
      if (filterMinPrice) params.set('minPrice', filterMinPrice);
      if (filterMaxPrice) params.set('maxPrice', filterMaxPrice);
      params.set('page', String(page));
      params.set('limit', '20');

      const response = await axios.get(`/api/products?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setProducts(response.data.data.products);
        setTotalPages(response.data.data.pages);
        setTotal(response.data.data.total);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, [
    search,
    filterCategory,
    filterBrand,
    filterStockStatus,
    filterMinPrice,
    filterMaxPrice,
    page,
  ]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleReset = () => {
    setSearch('');
    setFilterCategory('');
    setFilterBrand('');
    setFilterStockStatus('');
    setFilterMinPrice('');
    setFilterMaxPrice('');
    setPage(1);
  };

  const handleDeleteProduct = async (id: string) => {
    const confirmed = await dialog.confirm({
      title: 'Delete product?',
      message: 'This product will be removed from active inventory records.',
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/products?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Product deleted successfully');
      fetchProducts();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete product');
    }
  };

  const activeFilters = [
    filterCategory,
    filterBrand,
    filterStockStatus,
    filterMinPrice,
    filterMaxPrice,
    search,
  ].filter(Boolean).length;

  return (
    <MainLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">Products</h1>
            {!loading && (
              <p className="text-sm text-secondary-500 mt-1">
                {total} product{total !== 1 ? 's' : ''} found
              </p>
            )}
          </div>
          {(auth.user?.role === 'admin' || auth.user?.role === 'manager') && (
            <Link href="/products/add">
              <Button size="md">+ Add Product</Button>
            </Link>
          )}
        </div>

        {/* Search & Filters */}
        <Card>
          <div className="space-y-4">
            {/* Text Search */}
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="🔍  Search by name, barcode, or SKU..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="input-field flex-1"
              />
              {activeFilters > 0 && (
                <button
                  onClick={handleReset}
                  className="rounded-lg border border-gray-200 px-4 text-sm font-medium text-secondary-600 hover:bg-gray-50 transition whitespace-nowrap"
                >
                  Clear All ({activeFilters})
                </button>
              )}
            </div>

            {/* Filter Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <FilterSelect
                value={filterCategory}
                onChange={(v) => {
                  setFilterCategory(v);
                  setPage(1);
                }}
                placeholder="All Categories"
                icon={<LayoutGrid size={15} />}
                options={categories.map((c) => ({ value: c._id, label: c.name }))}
              />

              <FilterSelect
                value={filterBrand}
                onChange={(v) => {
                  setFilterBrand(v);
                  setPage(1);
                }}
                placeholder="All Brands"
                icon={<Tag size={15} />}
                options={brands.map((b) => ({ value: b._id, label: b.name }))}
              />

              <FilterSelect
                value={filterStockStatus}
                onChange={(v) => {
                  setFilterStockStatus(v);
                  setPage(1);
                }}
                placeholder="All Stock"
                icon={<Boxes size={15} />}
                options={[
                  { value: 'inStock', label: 'In Stock' },
                  { value: 'lowStock', label: 'Low Stock' },
                  { value: 'outOfStock', label: 'Out of Stock' },
                ]}
              />

              {/* Min Price */}
              <input
                type="number"
                placeholder="Min Price"
                value={filterMinPrice}
                onChange={(e) => {
                  setFilterMinPrice(e.target.value);
                  setPage(1);
                }}
                className="input-field text-sm"
                min="0"
              />

              {/* Max Price */}
              <input
                type="number"
                placeholder="Max Price"
                value={filterMaxPrice}
                onChange={(e) => {
                  setFilterMaxPrice(e.target.value);
                  setPage(1);
                }}
                className="input-field text-sm"
                min="0"
              />
            </div>
          </div>
        </Card>

        {/* Products Table */}
        <Card>
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 text-secondary-400">
              <p className="text-5xl mb-3">📭</p>
              <p className="font-medium text-secondary-600">No products found</p>
              <p className="text-sm mt-1">Try adjusting your search or filters</p>
              {activeFilters > 0 && (
                <button
                  onClick={handleReset}
                  className="mt-4 text-sky-600 text-sm font-medium hover:underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-3 text-left font-semibold text-secondary-600">
                        Product
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-secondary-600">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-secondary-600">
                        Brand
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-secondary-600">
                        Price
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-secondary-600">
                        Stock
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-secondary-600">
                        Warranty
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-secondary-600">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {products.map((product) => (
                      <tr key={product._id} className="hover:bg-slate-50 transition">
                        {/* Product Name + Image */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100 relative">
                              {product.image ? (
                                <Image
                                  src={product.image}
                                  alt={product.name}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-lg">
                                  📦
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-secondary-900 leading-tight">
                                {product.name}
                              </p>
                              {product.barcode && (
                                <p className="text-xs text-secondary-400">{product.barcode}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <span className="text-secondary-800 font-medium">
                              {product.category?.name}
                            </span>
                            {product.subcategory && (
                              <p className="text-xs text-secondary-400">
                                {product.subcategory.name}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-secondary-700">
                          {product.brand?.name || '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-secondary-900">
                          ৳{product.price.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              product.stock === 0
                                ? 'bg-red-100 text-red-700'
                                : product.stock <= product.minStock
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {product.stock}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-secondary-600 text-xs">
                          {product.warranty}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex gap-1.5 justify-center">
                            <ActionButton
                              variant="view"
                              href={`/products/${product._id}`}
                              label="View"
                              icon={<Eye size={12} />}
                            />
                            {(auth.user?.role === 'admin' || auth.user?.role === 'manager') && (
                              <>
                                <ActionButton
                                  variant="edit"
                                  href={`/products/${product._id}/edit`}
                                  label="Edit"
                                  icon={<Pencil size={12} />}
                                />
                                <ActionButton
                                  variant="delete"
                                  onClick={() => handleDeleteProduct(product._id)}
                                  label="Delete"
                                  icon={<Trash2 size={12} />}
                                />
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-secondary-500">
                    Page {page} of {totalPages} · {total} total
                  </p>
                  <div className="flex gap-2">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                      className="rounded-lg border px-3 py-1.5 text-sm font-medium text-secondary-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      ← Prev
                    </button>
                    <button
                      disabled={page === totalPages}
                      onClick={() => setPage(page + 1)}
                      className="rounded-lg border px-3 py-1.5 text-sm font-medium text-secondary-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </MainLayout>
  );
}
