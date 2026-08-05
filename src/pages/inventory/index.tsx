import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  AlertTriangle,
  History,
  Package,
  Plus,
  Search,
  ShoppingBag,
  XCircle,
  Eye,
  X,
  TrendingUp,
  Calendar,
  User,
  CreditCard,
  Truck,
  Hash,
} from 'lucide-react';
import MainLayout from '@/components/Layout/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button, ActionButton } from '@/components/Common/FormElements';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/utils/format';
import { FilterSelect } from '@/components/Common/FilterSelect';
import { Boxes } from 'lucide-react';

interface Product {
  _id: string;
  name: string;
  sku: string;
  stock: number;
  minStock: number;
  price: number;
  category?: { name: string };
  brand?: { name: string };
}

interface InventorySummary {
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
}

interface ProductPurchase {
  _id: string;
  purchaseNumber: string;
  supplier?: { _id: string; name: string; phone?: string; supplierCode?: string };
  date: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  notes?: string;
  createdBy?: { firstName: string; lastName: string };
  item?: { costPrice: number; quantity: number; subtotal: number };
}

export default function InventoryDashboard() {
  return (
    <ProtectedRoute requiredRole={['admin', 'manager']}>
      <InventoryContent />
    </ProtectedRoute>
  );
}

function StatBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span className="text-xs font-bold text-slate-700">{value}</span>
    </div>
  );
}

function DetailDrawer({ product, onClose }: { product: Product; onClose: () => void }) {
  const [purchases, setPurchases] = useState<ProductPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const currencyFmt = useMemo(
    () =>
      new Intl.NumberFormat('en-BD', {
        style: 'currency',
        currency: 'BDT',
        maximumFractionDigits: 0,
      }),
    []
  );

  const fetchPurchases = useCallback(
    async (p = 1) => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(
          `/api/inventory/product-purchases?productId=${product._id}&page=${p}&limit=8`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (res.data.success) {
          setPurchases(res.data.data.purchases);
          setPages(res.data.data.pages || 1);
          setTotal(res.data.data.total || 0);
        }
      } catch {
        toast.error('Failed to load purchase history');
      } finally {
        setLoading(false);
      }
    },
    [product._id]
  );

  useEffect(() => {
    fetchPurchases(page);
  }, [fetchPurchases, page]);

  const totalSpend = purchases.reduce((acc, p) => acc + (p.item?.subtotal || 0), 0);
  const totalQtyReceived = purchases.reduce((acc, p) => acc + (p.item?.quantity || 0), 0);

  const statusColor = (s: string) =>
    s === 'completed'
      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
      : s === 'pending'
        ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
        : s === 'draft'
          ? 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
          : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200';

  const payStatusColor = (s: string) =>
    s === 'paid' ? 'text-emerald-600' : s === 'partial' ? 'text-amber-600' : 'text-rose-600';

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-2xl shadow-slate-900/20 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Inventory Detail
            </p>
            <h2 className="mt-0.5 text-lg font-bold text-slate-900 leading-tight">
              {product.name}
            </h2>
            {product.sku && (
              <p className="mt-0.5 text-xs font-mono text-slate-400">{product.sku}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-3 border-b border-slate-100 px-6 py-4">
          {[
            {
              icon: Package,
              label: 'Stock',
              value: String(product.stock),
              color: 'text-indigo-600',
              bg: 'bg-indigo-50',
            },
            {
              icon: TrendingUp,
              label: 'Orders',
              value: String(total),
              color: 'text-sky-600',
              bg: 'bg-sky-50',
            },
            {
              icon: ShoppingBag,
              label: 'Received',
              value: String(totalQtyReceived),
              color: 'text-emerald-600',
              bg: 'bg-emerald-50',
            },
            {
              icon: CreditCard,
              label: 'Spent',
              value: `৳${(totalSpend / 1000).toFixed(1)}k`,
              color: 'text-purple-600',
              bg: 'bg-purple-50',
            },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div
              key={label}
              className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-center shadow-sm"
            >
              <div
                className={`mx-auto mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg ${bg}`}
              >
                <Icon size={14} className={color} />
              </div>
              <p className="text-base font-extrabold text-slate-800">{value}</p>
              <p className="text-[10px] font-medium text-slate-400">{label}</p>
            </div>
          ))}
        </div>

        {/* Info row */}
        <div className="flex flex-wrap gap-2 border-b border-slate-100 px-6 py-3">
          {product.brand?.name && <StatBadge label="Brand" value={product.brand.name} />}
          {product.category?.name && <StatBadge label="Category" value={product.category.name} />}
          <StatBadge label="Min Stock" value={String(product.minStock)} />
          <StatBadge label="Price" value={formatCurrency(product.price)} />
        </div>

        {/* Purchase History */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Purchase History
            </h3>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
              {total}
            </span>
          </div>

          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" />
            </div>
          ) : purchases.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-center">
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                <ShoppingBag size={20} className="text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-500">No purchase records</p>
              <p className="mt-0.5 text-xs text-slate-400">
                This product has not been purchased yet
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {purchases.map((p) => (
                <div
                  key={p._id}
                  className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm hover:border-slate-200 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Hash size={11} className="text-slate-400" />
                        <Link
                          href={`/inventory/purchases/${p._id}`}
                          className="text-xs font-bold font-mono text-slate-700 transition hover:text-sky-700"
                        >
                          {p.purchaseNumber}
                        </Link>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1">
                        <Calendar size={10} className="text-slate-400" />
                        <span className="text-[10px] text-slate-400">
                          {new Date(p.date).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ${statusColor(p.status)}`}
                    >
                      {p.status}
                    </span>
                  </div>

                  {/* Item figures */}
                  <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-2.5 mb-2.5">
                    {[
                      {
                        label: 'Cost/Unit',
                        value: formatCurrency(p.item?.costPrice),
                      },
                      { label: 'Qty', value: String(p.item?.quantity ?? '—') },
                      { label: 'Subtotal', value: formatCurrency(p.item?.subtotal) },
                    ].map(({ label, value }) => (
                      <div key={label} className="text-center">
                        <p className="text-[10px] font-medium text-slate-400">{label}</p>
                        <p className="text-xs font-bold text-slate-800">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1 text-slate-500">
                      <Truck size={10} />
                      {p.supplier?._id ? (
                        <Link
                          href={`/inventory/suppliers/${p.supplier._id}`}
                          className="font-medium transition hover:text-sky-700"
                        >
                          {p.supplier.name}
                        </Link>
                      ) : (
                        <span className="font-medium">{p.supplier?.name ?? '—'}</span>
                      )}
                    </div>
                    <div className={`font-bold ${payStatusColor(p.paymentStatus)}`}>
                      {p.paymentStatus === 'paid'
                        ? '✓ Paid'
                        : p.paymentStatus === 'partial'
                          ? '⚡ Partial'
                          : '⚠ Due'}
                    </div>
                  </div>

                  {p.createdBy && (
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-400">
                      <User size={9} />
                      <span>
                        {p.createdBy.firstName} {p.createdBy.lastName}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-[11px] text-slate-400">
                Page {page} of {pages}
              </span>
              <div className="flex gap-1.5">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
                >
                  ← Prev
                </button>
                <button
                  disabled={page === pages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function InventoryContent() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'lowStock' | 'outOfStock' | 'inStock'>(
    'all'
  );
  const [summary, setSummary] = useState<InventorySummary>({
    totalItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
  });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-BD', {
        style: 'currency',
        currency: 'BDT',
        maximumFractionDigits: 0,
      }),
    []
  );

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ page: String(pagination.page), limit: '20' });
      if (search) params.set('search', search);
      if (stockFilter !== 'all') params.set('stockStatus', stockFilter);

      const res = await axios.get(`/api/products?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setProducts(res.data.data.products);
        setSummary(
          res.data.data.summary || {
            totalItems: res.data.data.total,
            lowStockItems: 0,
            outOfStockItems: 0,
          }
        );
        setPagination({
          page: res.data.data.page,
          pages: res.data.data.pages,
          total: res.data.data.total,
        });
      }
    } catch {
      toast.error('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, search, stockFilter]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  useEffect(() => {
    const productId = router.query.productId;
    if (!router.isReady || !productId || Array.isArray(productId)) return;

    const fetchProductDetail = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`/api/products?id=${productId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) {
          setSelectedProduct(res.data.data);
        }
      } catch {
        toast.error('Failed to load product details');
      }
    };

    fetchProductDetail();
  }, [router.isReady, router.query.productId]);

  const closeProductDetail = () => {
    setSelectedProduct(null);
    if (router.query.productId) {
      router.replace('/inventory', undefined, { shallow: true });
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const getStockStatus = (stock: number, minStock: number) => {
    if (stock <= 0)
      return {
        label: 'Out of Stock',
        badge: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
        number: 'text-rose-600',
      };
    if (stock <= minStock)
      return {
        label: 'Low Stock',
        badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
        number: 'text-rose-600',
      };
    return {
      label: 'In Stock',
      badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
      number: 'text-slate-950',
    };
  };

  const statCards = [
    {
      title: 'Total Items',
      value: summary.totalItems,
      suffix: '',
      icon: Package,
      accent: 'border-l-[#6b5ff6]',
      iconClass: 'bg-indigo-50 text-indigo-600',
      valueClass: 'text-slate-950',
    },
    {
      title: 'Low Stock',
      value: summary.lowStockItems,
      suffix: summary.lowStockItems === 1 ? ' item' : ' items',
      icon: AlertTriangle,
      accent: 'border-l-[#f0b95b]',
      iconClass: 'bg-amber-50 text-amber-600',
      valueClass: 'text-amber-700',
    },
    {
      title: 'Out of Stock',
      value: summary.outOfStockItems,
      suffix: summary.outOfStockItems === 1 ? ' item' : ' items',
      icon: XCircle,
      accent: 'border-l-[#ef5350]',
      iconClass: 'bg-rose-50 text-rose-600',
      valueClass: 'text-rose-700',
    },
  ];

  return (
    <MainLayout title="Inventory Dashboard">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              Stock Control
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950">Inventory</h1>
          </div>
          <div className="flex gap-3">
            <Link href="/inventory/purchase">
              <Button className="gap-2">
                <Plus size={16} />
                Add Purchase
              </Button>
            </Link>
            <Link href="/inventory/purchases">
              <Button variant="secondary" className="gap-2">
                <ShoppingBag size={16} />
                Purchases
              </Button>
            </Link>
            <Link href="/inventory/history">
              <Button variant="secondary" className="gap-2">
                <History size={16} />
                Stock History
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {statCards.map((card) => (
            <div
              key={card.title}
              className={`rounded-2xl border border-slate-200 border-l-4 ${card.accent} bg-white/95 p-6 shadow-sm shadow-slate-200/70`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
                    {card.title}
                  </p>
                  <p className={`mt-4 text-4xl font-extrabold leading-none ${card.valueClass}`}>
                    {card.value}
                    <span className="ml-2 text-3xl">{card.suffix}</span>
                  </p>
                </div>
                <div className={`rounded-2xl p-3 ${card.iconClass}`}>
                  <card.icon size={24} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/70">
          <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <form
              onSubmit={handleSearch}
              className="flex w-full flex-col gap-3 sm:flex-row xl:max-w-2xl"
            >
              <div className="relative flex-1">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Search by name, SKU, or barcode..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-field min-h-12 pl-11"
                />
              </div>
              <Button type="submit" className="min-w-28">
                Search
              </Button>
            </form>
            <div className="min-w-[300px]">
              <label className="block text-xs font-semibold text-secondary-600 mb-1 uppercase tracking-wider">
                Stock Status
              </label>
              <FilterSelect
                value={stockFilter}
                onChange={(v) => {
                  setStockFilter(v as typeof stockFilter);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                placeholder="All Stock Status"
                icon={<Boxes size={15} />}
                options={[
                  { value: 'inStock', label: 'In Stock' },
                  { value: 'lowStock', label: 'Low Stock' },
                  { value: 'outOfStock', label: 'Out of Stock' },
                ]}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3 font-bold">Product</th>
                  <th className="px-3 py-3 font-bold">SKU</th>
                  <th className="px-3 py-3 text-center font-bold">Category</th>
                  <th className="px-3 py-3 text-center font-bold">Current Stock</th>
                  <th className="px-3 py-3 text-center font-bold">Status</th>
                  <th className="px-3 py-3 text-right font-bold">Price</th>
                  <th className="px-3 py-3 text-center font-bold">Single View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-14 text-center text-slate-500">
                      Loading inventory...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-14 text-center text-slate-500">
                      No products found matching criteria.
                    </td>
                  </tr>
                ) : (
                  products.map((product) => {
                    const status = getStockStatus(product.stock, product.minStock);
                    return (
                      <tr key={product._id} className="transition hover:bg-slate-50/80">
                        <td className="px-3 py-3.5">
                          <p className="text-sm font-bold text-slate-950">{product.name}</p>
                          <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                            {product.brand?.name || 'No brand'}
                          </p>
                        </td>
                        <td className="px-3 py-3.5 font-medium text-slate-600">
                          {product.sku || '-'}
                        </td>
                        <td className="px-3 py-3.5 text-center font-medium text-slate-800">
                          {product.category?.name || '-'}
                        </td>
                        <td className="px-3 py-3.5 text-center">
                          <span className={`text-xl font-extrabold ${status.number}`}>
                            {product.stock}
                          </span>
                          <span className="mt-1 block text-xs font-medium text-slate-400">
                            Min: {product.minStock}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 text-center">
                          <span
                            className={`inline-flex min-w-24 justify-center rounded-full px-2.5 py-1 text-[11px] font-bold ${status.badge}`}
                          >
                            {status.label}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 text-right text-sm font-bold text-slate-950">
                          {currencyFormatter.format(product.price || 0)}
                        </td>
                        <td className="px-3 py-3.5 text-center">
                          <ActionButton
                            variant="view"
                            onClick={() => setSelectedProduct(product)}
                            title="View inventory details"
                            icon={<Eye size={13} />}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
              <span className="text-sm text-slate-500">
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
        </section>
      </div>

      {/* Detail Drawer */}
      {selectedProduct && <DetailDrawer product={selectedProduct} onClose={closeProductDetail} />}
    </MainLayout>
  );
}
