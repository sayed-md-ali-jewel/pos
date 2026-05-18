import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import MainLayout from '@/components/Layout/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Card, Button } from '@/components/Common/FormElements';
import { ArrowLeft, AlertCircle, CheckCircle, Search } from 'lucide-react';

interface ProductRepairData {
  productId: string;
  productName: string;
  productSku: string;
  warrantyType: string;
  warrantyExpiresAt?: string;
  warrantyValid: boolean;
  invoiceQuantity: number;
  totalSentQuantity: number;
  remainingQuantity: number;
  sendNowQuantity: number;
  suggestedSupplier?: { _id: string; name: string };
}

export default function DynamicWarrantyNew() {
  const router = useRouter();
  const [invoiceId, setInvoiceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');
  const [invoice, setInvoice] = useState<any>(null);
  const [products, setProducts] = useState<ProductRepairData[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [issueDescription, setIssueDescription] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');

  const handleInvoiceLookup = async () => {
    setError('');
    if (!invoiceId.trim()) {
      setError('Please enter an invoice ID');
      return;
    }

    try {
      setFetching(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/warranty?invoiceId=${encodeURIComponent(invoiceId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        setInvoice(res.data.data.invoice);
        setSuppliers(res.data.data.supplierOptions);
        const productsWithZero = res.data.data.productOptions.map((p: any) => ({
          ...p,
          sendNowQuantity: 0,
        }));
        setProducts(productsWithZero);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch invoice details');
      setInvoice(null);
      setProducts([]);
    } finally {
      setFetching(false);
    }
  };

  const updateSendQuantity = (index: number, quantity: number) => {
    const updated = [...products];
    updated[index].sendNowQuantity = Math.max(
      0,
      Math.min(quantity, updated[index].remainingQuantity)
    );
    setProducts(updated);
  };

  const getTotalSendingQuantity = () => {
    return products.reduce((sum, p) => sum + p.sendNowQuantity, 0);
  };

  const getValidationErrors = (): string[] => {
    const errors: string[] = [];

    if (!invoice) {
      errors.push('No invoice selected');
    }

    if (!issueDescription.trim()) {
      errors.push('Issue description is required');
    }

    const productsToSend = products.filter((p) => p.sendNowQuantity > 0);
    if (productsToSend.length === 0) {
      errors.push('Select at least one product to send for repair');
    }

    // Check warranty validity
    const expiredProducts = productsToSend.filter((p) => !p.warrantyValid);
    if (expiredProducts.length > 0) {
      errors.push(`Warranty expired for: ${expiredProducts.map((p) => p.productName).join(', ')}`);
    }

    // Check quantity validity
    const invalidQtyProducts = productsToSend.filter(
      (p) => p.sendNowQuantity > p.remainingQuantity
    );
    if (invalidQtyProducts.length > 0) {
      errors.push('Invalid quantity for some products');
    }

    return errors;
  };

  const handleSubmit = async () => {
    const validationErrors = getValidationErrors();
    if (validationErrors.length > 0) {
      setError(validationErrors.join('\n'));
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const productsToSend = products
        .filter((p) => p.sendNowQuantity > 0)
        .map((p) => ({
          productId: p.productId,
          productName: p.productName,
          productSku: p.productSku,
          quantity: p.sendNowQuantity,
          warrantyType: p.warrantyType,
          warrantyExpiresAt: p.warrantyExpiresAt,
          warrantyValid: p.warrantyValid,
          supplierId: selectedSupplier || p.suggestedSupplier?._id,
          totalInvoiceQty: p.invoiceQuantity,
          issueDescription,
        }));

      const res = await axios.post(
        '/api/warranty',
        {
          saleId: invoice.id,
          invoiceNumber: invoice.saleNumber,
          invoiceDate: invoice.date,
          customerName: invoice.customer?.name,
          customerEmail: invoice.customer?.email,
          customerPhone: invoice.customer?.phone,
          customerAddress: invoice.customer?.address,
          productRepairs: productsToSend,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        router.push(`/warranty/batch/${res.data.data.batch._id}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create warranty repairs');
    } finally {
      setLoading(false);
    }
  };

  const validationErrors = getValidationErrors();
  const hasErrors = validationErrors.length > 0;

  return (
    <ProtectedRoute requiredRole={['admin', 'manager', 'cashier']}>
      <MainLayout title="Create Dynamic Warranty Repair">
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                New request
              </p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900">Dynamic Warranty Repair</h1>
            </div>
            <Button variant="secondary" size="md" onClick={() => router.push('/warranty')}>
              <ArrowLeft size={16} /> Back to list
            </Button>
          </div>

          {/* Invoice Lookup Section */}
          <Card className="rounded-[28px] border-slate-200 p-6 shadow-sm shadow-slate-200/40">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Step 1: Find Invoice</h2>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Enter invoice ID"
                    value={invoiceId}
                    onChange={(e) => setInvoiceId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleInvoiceLookup();
                    }}
                    className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
                  />
                </div>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleInvoiceLookup}
                  isLoading={fetching}
                >
                  <Search size={16} /> Search
                </Button>
              </div>
            </div>
          </Card>

          {invoice && (
            <>
              {/* Invoice Summary */}
              <Card className="rounded-[28px] border-slate-200 p-6 shadow-sm shadow-slate-200/40">
                <h3 className="mb-4 text-lg font-semibold text-slate-900">Invoice Summary</h3>
                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">Invoice</p>
                    <p className="mt-1 text-slate-900">{invoice.saleNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-500">Customer</p>
                    <p className="mt-1 text-slate-900">{invoice.customer?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-500">Date</p>
                    <p className="mt-1 text-slate-900">
                      {new Date(invoice.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-500">Total</p>
                    <p className="mt-1 text-slate-900">${invoice.total?.toFixed(2)}</p>
                  </div>
                </div>
              </Card>

              {/* Product Selection Table */}
              <Card className="rounded-[28px] border-slate-200 p-6 shadow-sm shadow-slate-200/40">
                <h3 className="mb-4 text-lg font-semibold text-slate-900">
                  Step 2: Select Products
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">
                          Product
                        </th>
                        <th className="px-4 py-3 text-center font-semibold text-slate-700">
                          Purchased
                        </th>
                        <th className="px-4 py-3 text-center font-semibold text-slate-700">
                          Already Sent
                        </th>
                        <th className="px-4 py-3 text-center font-semibold text-slate-700">
                          Remaining
                        </th>
                        <th className="px-4 py-3 text-center font-semibold text-slate-700">
                          Warranty
                        </th>
                        <th className="px-4 py-3 text-center font-semibold text-slate-700">
                          Send Now
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((product, index) => (
                        <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-semibold text-slate-900">{product.productName}</p>
                              <p className="text-xs text-slate-500">SKU: {product.productSku}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-semibold text-slate-900">
                              {product.invoiceQuantity}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-slate-700">{product.totalSentQuantity}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-semibold text-slate-900">
                              {product.remainingQuantity}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {product.warrantyValid ? (
                                <>
                                  <CheckCircle size={16} className="text-emerald-600" />
                                  <span className="text-xs font-semibold text-emerald-700">
                                    Valid
                                  </span>
                                </>
                              ) : (
                                <>
                                  <AlertCircle size={16} className="text-rose-600" />
                                  <span className="text-xs font-semibold text-rose-700">
                                    Expired
                                  </span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <input
                                type="number"
                                min="0"
                                max={product.remainingQuantity}
                                value={product.sendNowQuantity}
                                onChange={(e) =>
                                  updateSendQuantity(index, parseInt(e.target.value) || 0)
                                }
                                disabled={!product.warrantyValid}
                                className="h-9 w-16 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-1 text-center text-sm outline-none disabled:opacity-50"
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-700">
                    Total Quantity to Send:{' '}
                    <span className="text-sky-600">{getTotalSendingQuantity()}</span>
                  </p>
                </div>
              </Card>

              {/* Details Section */}
              <Card className="rounded-[28px] border-slate-200 p-6 shadow-sm shadow-slate-200/40">
                <h3 className="mb-4 text-lg font-semibold text-slate-900">
                  Step 3: Repair Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Issue Description *
                    </label>
                    <textarea
                      value={issueDescription}
                      onChange={(e) => setIssueDescription(e.target.value)}
                      rows={4}
                      className="input-field w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
                      placeholder="Describe the issue with the product(s)"
                    />
                  </div>

                  {suppliers.length > 0 && (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Supplier
                      </label>
                      <select
                        value={selectedSupplier}
                        onChange={(e) => setSelectedSupplier(e.target.value)}
                        className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
                      >
                        <option value="">Auto-detect from product</option>
                        {suppliers.map((supplier) => (
                          <option key={supplier._id} value={supplier._id}>
                            {supplier.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </Card>

              {/* Validation Errors */}
              {hasErrors && (
                <Card className="rounded-[28px] border-rose-200 bg-rose-50 p-6">
                  <div className="flex gap-3">
                    <AlertCircle size={20} className="flex-shrink-0 text-rose-600" />
                    <div>
                      <p className="font-semibold text-rose-900">Cannot proceed:</p>
                      <ul className="mt-2 space-y-1">
                        {validationErrors.map((err, i) => (
                          <li key={i} className="text-sm text-rose-800">
                            • {err}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              )}

              {error && !hasErrors && (
                <Card className="rounded-[28px] border-rose-200 bg-rose-50 p-4">
                  <p className="text-sm font-medium text-rose-700">{error}</p>
                </Card>
              )}

              {/* Submit Button */}
              <div className="flex gap-3">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleSubmit}
                  isLoading={loading}
                  disabled={hasErrors || getTotalSendingQuantity() === 0}
                >
                  Create Warranty Repairs
                </Button>
                <Button variant="secondary" size="lg" onClick={() => router.push('/warranty')}>
                  Cancel
                </Button>
              </div>
            </>
          )}

          {error && !invoice && (
            <Card className="rounded-[28px] border-rose-200 bg-rose-50 p-6">
              <div className="flex gap-3">
                <AlertCircle size={20} className="flex-shrink-0 text-rose-600" />
                <p className="text-sm font-medium text-rose-700">{error}</p>
              </div>
            </Card>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
