import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import MainLayout from '@/components/Layout/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ActionButton, Button, Card } from '@/components/Common/FormElements';
import { useAuthStore } from '@/store/authStore';
import { Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDialog } from '@/components/Common/AppDialog';
import { formatCurrency } from '@/utils/format';

interface Product {
  _id: string;
  name: string;
  description?: string;
  category: { _id: string; name: string };
  subcategory?: { _id: string; name: string };
  brand?: { _id: string; name: string };
  price: number;
  cost?: number;
  stock: number;
  minStock: number;
  barcode?: string;
  sku?: string;
  warranty: string;
  image?: string;
  images?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function StockBadge({ stock, minStock }: { stock: number; minStock: number }) {
  if (stock === 0)
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        Out of Stock
      </span>
    );
  if (stock <= minStock)
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        Low Stock ({stock} left)
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
      <span className="h-2 w-2 rounded-full bg-emerald-500" />
      In Stock ({stock} units)
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between border-b border-gray-100 py-3 last:border-0">
      <span className="text-sm font-medium text-secondary-500 w-40 shrink-0">{label}</span>
      <span className="text-sm font-semibold text-secondary-900 text-right">{value || '—'}</span>
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <ProtectedRoute requiredRole={['admin', 'manager', 'cashier']}>
      <ProductDetailContent />
    </ProtectedRoute>
  );
}

function ProductDetailContent() {
  const router = useRouter();
  const { id } = router.query;
  const auth = useAuthStore();
  const dialog = useAppDialog();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchProduct = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`/api/products?id=${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) {
          const p = res.data.data;
          setProduct(p);
          const imgs = p.images?.length > 0 ? p.images : p.image ? [p.image] : [];
          if (imgs.length > 0) setActiveImg(imgs[0]);
        }
      } catch {
        toast.error('Failed to load product');
        router.push('/products');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id, router]);

  const handleDelete = async () => {
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
      toast.success('Product deleted');
      router.push('/products');
    } catch {
      toast.error('Failed to delete product');
    }
  };

  if (loading) {
    return (
      <MainLayout title="Product Detail">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600" />
        </div>
      </MainLayout>
    );
  }

  if (!product) return null;

  const margin =
    product.cost && product.cost > 0
      ? (((product.price - product.cost) / product.cost) * 100).toFixed(1)
      : null;

  const canManage = auth.user?.role === 'admin' || auth.user?.role === 'manager';

  const allImages =
    product.images && product.images.length > 0
      ? product.images
      : product.image
        ? [product.image]
        : [];

  return (
    <MainLayout title={product.name}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/products')}
              className="rounded-lg border border-gray-200 p-2 text-secondary-500 hover:bg-gray-50 transition"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-2xl font-bold text-secondary-900">{product.name}</h1>
              <p className="text-sm text-secondary-500">
                Added {new Date(product.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          {canManage && (
            <div className="flex gap-2">
              <ActionButton
                variant="secondary"
                href={`/products/${product._id}/edit`}
                title="Edit product"
                icon={<Pencil size={12} />}
              />
              <ActionButton
                variant="danger"
                onClick={handleDelete}
                title="Delete product"
                icon={<Trash2 size={12} />}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Image Gallery & Stock */}
          <div className="space-y-4">
            {/* Image Gallery */}
            <Card>
              <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gray-100">
                {activeImg ? (
                  <Image
                    src={activeImg}
                    alt={product.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center flex-col gap-2 text-secondary-400">
                    <span className="text-6xl">📦</span>
                    <p className="text-sm">No image</p>
                  </div>
                )}
              </div>
              {allImages.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {allImages.map((src, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImg(src)}
                      className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                        activeImg === src ? 'border-sky-500' : 'border-transparent'
                      }`}
                    >
                      <Image
                        src={src}
                        alt={`Thumb ${i + 1}`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </button>
                  ))}
                </div>
              )}
            </Card>

            {/* Stock Status */}
            <Card>
              <h3 className="text-sm font-semibold text-secondary-700 uppercase tracking-wider mb-3">
                Stock Status
              </h3>
              <div className="space-y-3">
                <StockBadge stock={product.stock} minStock={product.minStock} />
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div className="rounded-lg bg-gray-50 p-3 text-center">
                    <p className="text-xs text-secondary-500">Current</p>
                    <p className="text-2xl font-bold text-secondary-900">{product.stock}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3 text-center">
                    <p className="text-xs text-secondary-500">Min Alert</p>
                    <p className="text-2xl font-bold text-amber-600">{product.minStock}</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right: Details */}
          <div className="lg:col-span-2 space-y-4">
            {/* Pricing */}
            <Card>
              <h3 className="text-sm font-semibold text-secondary-700 uppercase tracking-wider mb-4">
                Pricing
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl bg-sky-50 border border-sky-100 p-4 text-center">
                  <p className="text-xs font-medium text-sky-600 uppercase tracking-wider">
                    Selling Price
                  </p>
                  <p className="text-3xl font-bold text-sky-700 mt-1">
                    {formatCurrency(product.price ?? 0)}
                  </p>
                </div>
                {product.cost !== undefined && product.cost !== null && (
                  <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 text-center">
                    <p className="text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Cost Price
                    </p>
                    <p className="text-3xl font-bold text-secondary-700 mt-1">
                      {formatCurrency(product.cost ?? 0)}
                    </p>
                  </div>
                )}
                {margin && (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-center">
                    <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">
                      Profit Margin
                    </p>
                    <p className="text-3xl font-bold text-emerald-700 mt-1">{margin}%</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Product Info */}
            <Card>
              <h3 className="text-sm font-semibold text-secondary-700 uppercase tracking-wider mb-2">
                Product Details
              </h3>
              <InfoRow label="Category" value={product.category?.name} />
              <InfoRow label="Subcategory" value={product.subcategory?.name} />
              <InfoRow label="Brand" value={product.brand?.name} />
              <InfoRow label="Warranty" value={product.warranty} />
              <InfoRow label="Barcode" value={product.barcode} />
              <InfoRow label="SKU" value={product.sku} />
              <InfoRow label="Last Updated" value={new Date(product.updatedAt).toLocaleString()} />
            </Card>

            {/* Description */}
            {product.description && (
              <Card>
                <h3 className="text-sm font-semibold text-secondary-700 uppercase tracking-wider mb-2">
                  Description
                </h3>
                <p className="text-sm text-secondary-600 leading-relaxed">{product.description}</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
