import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import MainLayout from '@/components/Layout/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Card, Button, Input } from '@/components/Common/FormElements';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/utils/format';

interface Product {
  _id: string;
  name: string;
  sku: string;
  price: number;
  cost?: number;
}

interface Supplier {
  _id: string;
  name: string;
}

interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;
  subtotal: number;
}

export default function PurchaseEntry() {
  return (
    <ProtectedRoute requiredRole={['admin', 'manager']}>
      <PurchaseContent />
    </ProtectedRoute>
  );
}

function PurchaseContent() {
  const router = useRouter();
  const { supplierId: supplierIdQuery } = router.query;
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [paidAmount, setPaidAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // New item form
  const [selectedProductId, setSelectedProductId] = useState('');
  const [qty, setQty] = useState(1);
  const [costPrice, setCostPrice] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!supplierIdQuery || Array.isArray(supplierIdQuery)) return;
    setSupplierId(supplierIdQuery);
  }, [supplierIdQuery]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      // Fetch suppliers
      const supRes = await axios.get('/api/inventory/suppliers?limit=100', {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Fetch products
      const prodRes = await axios.get('/api/products?limit=500', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (supRes.data.success) setSuppliers(supRes.data.data.suppliers);
      if (prodRes.data.success) setProducts(prodRes.data.data.products);
    } catch (error) {
      toast.error('Failed to load initial data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    if (!selectedProductId || qty <= 0 || costPrice <= 0) {
      toast.error('Please select a product and enter valid quantity/price');
      return;
    }

    const product = products.find((p) => p._id === selectedProductId);
    if (!product) return;

    // Check if already in list
    if (items.some((i) => i.productId === selectedProductId)) {
      toast.error('Product already in the list. Please remove and re-add to change.');
      return;
    }

    setItems([
      ...items,
      {
        productId: product._id,
        productName: product.name,
        quantity: Number(qty),
        costPrice: Number(costPrice),
        subtotal: Number(qty) * Number(costPrice),
      },
    ]);

    // Reset item form
    setSelectedProductId('');
    setQty(1);
    setCostPrice(0);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((i) => i.productId !== id));
  };

  const selectedProduct = products.find((p) => p._id === selectedProductId);

  const getSuggestedProductPricing = (product: Product, newCost: number) => {
    const existingCost = product.cost ?? 0;
    const existingPrice = product.price ?? 0;
    const updateNeeded = newCost > existingCost;
    let suggestedPrice = existingPrice;

    if (!updateNeeded) {
      return { updateNeeded, suggestedCost: newCost, suggestedPrice };
    }

    if (existingCost > 0) {
      const currentMargin = (existingPrice - existingCost) / existingCost;
      suggestedPrice = Number((newCost * (1 + currentMargin)).toFixed(2));
      if (suggestedPrice <= existingPrice) {
        suggestedPrice = existingPrice;
      }
    } else if (existingPrice <= newCost) {
      suggestedPrice = Number((newCost * 1.1).toFixed(2));
    }

    return { updateNeeded, suggestedCost: newCost, suggestedPrice };
  };

  const suggestedPricing =
    selectedProduct && costPrice > 0
      ? getSuggestedProductPricing(selectedProduct, costPrice)
      : null;

  const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);
  const dueAmount = totalAmount - paidAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) return toast.error('Please select a supplier');
    if (items.length === 0) return toast.error('Please add at least one item');
    if (paidAmount < 0 || paidAmount > totalAmount) return toast.error('Invalid paid amount');

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        '/api/inventory/purchases',
        {
          supplierId,
          items,
          paidAmount,
          notes,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data.success) {
        toast.success('Purchase recorded successfully');
        router.push(`/inventory/purchases/${res.data.data._id}`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit purchase');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <MainLayout title="Add Purchase">
        <div className="p-8 text-center">Loading...</div>
      </MainLayout>
    );

  const selectedSupplier = suppliers.find((sup) => sup._id === supplierId);

  return (
    <MainLayout title="Create Purchase Order">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Entry Area */}
          <div className="lg:col-span-2 space-y-6">
            <Card title="Supplier Details">
              <select
                className="input-field w-full"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
              >
                <option value="">Select a Supplier</option>
                {suppliers.map((sup) => (
                  <option key={sup._id} value={sup._id}>
                    {sup.name}
                  </option>
                ))}
              </select>
              {selectedSupplier && (
                <p className="text-xs text-emerald-600 mt-2 font-medium">
                  Purchase will be recorded under: {selectedSupplier.name}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                * Required to track dues and purchase history.
              </p>
            </Card>

            <Card title="Add Products">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Product
                  </label>
                  <select
                    className="input-field w-full"
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                  >
                    <option value="">Choose...</option>
                    {products.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Input
                    label="Qty"
                    type="number"
                    min="1"
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Input
                    label="Unit Cost (৳)"
                    type="number"
                    min="0"
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(Number(e.target.value))}
                  />
                </div>
              </div>
              {selectedProduct && suggestedPricing?.updateNeeded && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-4 text-sm text-amber-900">
                  <p>
                    Current cost for <strong>{selectedProduct.name}</strong> is{' '}
                    {formatCurrency(selectedProduct.cost ?? 0)} and selling price is{' '}
                    {formatCurrency(selectedProduct.price)}.
                  </p>
                  <p className="mt-2">
                    Suggested updated cost:{' '}
                    <strong>{formatCurrency(suggestedPricing.suggestedCost)}</strong>.
                  </p>
                  <p className="mt-1">
                    Suggested selling price:{' '}
                    <strong>{formatCurrency(suggestedPricing.suggestedPrice)}</strong>.
                  </p>
                  <p className="mt-2 text-xs text-amber-700">
                    This purchase will update the product cost and selling price automatically when
                    saved.
                  </p>
                </div>
              )}
              <Button
                type="button"
                variant="secondary"
                className="w-full mb-6"
                onClick={handleAddItem}
              >
                + Add Item to PO
              </Button>

              {/* Items List */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-100">
                    <tr className="text-sm uppercase text-gray-600">
                      <th className="p-3 font-semibold">Product</th>
                      <th className="p-3 font-semibold text-center">Qty</th>
                      <th className="p-3 font-semibold text-right">Cost</th>
                      <th className="p-3 font-semibold text-right">Total</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-gray-500">
                          No products added yet.
                        </td>
                      </tr>
                    ) : (
                      items.map((item, index) => (
                        <tr key={index} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="p-3 font-medium">{item.productName}</td>
                          <td className="p-3 text-center">{item.quantity}</td>
                          <td className="p-3 text-right">{formatCurrency(item.costPrice)}</td>
                          <td className="p-3 text-right font-bold">
                            {formatCurrency(item.subtotal)}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.productId)}
                              className="text-red-500 hover:text-red-700 font-bold"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purchase Notes (Optional)
              </label>
              <textarea
                className="input-field w-full h-24 resize-none"
                placeholder="e.g., Delivered via transport..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Card>
          </div>

          {/* Payment & Summary Sidebar */}
          <div className="space-y-6">
            <Card title="Payment Summary" className="bg-gray-50">
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center text-lg">
                  <span className="text-gray-600">Total Amount</span>
                  <span className="font-bold text-gray-900">{formatCurrency(totalAmount)}</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Paid Amount (৳)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max={totalAmount}
                    step="0.01"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                  />
                </div>

                <div
                  className={`p-4 rounded-lg flex justify-between items-center font-bold ${dueAmount > 0 ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}
                >
                  <span>Due Amount</span>
                  <span className="text-xl">{formatCurrency(dueAmount)}</span>
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" isLoading={submitting}>
                Complete Purchase
              </Button>
            </Card>
          </div>
        </div>
      </form>
    </MainLayout>
  );
}
