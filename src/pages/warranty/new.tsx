import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import MainLayout from '@/components/Layout/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Card, Button } from '@/components/Common/FormElements';
import { Calendar, Box, ShieldCheck, ShieldOff, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { calculateWarrantyExpiry } from '@/utils/warranty';

const warrantyOptions = [
  'None',
  '1 Month',
  '3 Months',
  '6 Months',
  '1 Year',
  '2 Years',
  '3 Years',
  '4 Years',
  '5 Years',
  '6 Years',
  '7 Years',
  '8 Years',
  '9 Years',
  '10 Years',
  '11 Years',
  '12 Years',
  '13 Years',
  '14 Years',
  '15 Years',
];

type ProductOption = {
  productId: string;
  productName: string;
  productSku: string;
  warrantyType: string;
  invoiceQuantity: number;
  totalSentQuantity: number;
  remainingQuantity: number;
  warrantyValid: boolean;
  suggestedSupplier?: { _id: string; name: string };
};

type InvoiceSummary = {
  id: string;
  saleNumber: string;
  date: string;
  customer?: { name?: string; phone?: string; email?: string; address?: string };
  total: number;
  status: string;
  notes?: string;
};

export default function WarrantyNew() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [invoiceQuery, setInvoiceQuery] = useState('');
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceSummary | null>(null);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<any>({
    saleId: '',
    invoiceNumber: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    productName: '',
    productSku: '',
    serialNumber: '',
    purchaseDate: '',
    warrantyType: '6 Months',
    issueDescription: '',
    supplierId: '',
    purchaseNumber: '',
    invoiceItems: [],
    attachments: [],
  });

  const selectedProduct = useMemo(
    () => productOptions.find((item) => item.productId === selectedProductId) ?? productOptions[0],
    [productOptions, selectedProductId]
  );

  const warrantyExpiry = useMemo(() => {
    return calculateWarrantyExpiry(form.purchaseDate, form.warrantyType);
  }, [form.purchaseDate, form.warrantyType]);

  const warrantyValid = useMemo(() => {
    return warrantyExpiry ? warrantyExpiry >= new Date() : false;
  }, [warrantyExpiry]);

  const canSubmitWarranty = useMemo(() => {
    return (
      !!selectedProduct &&
      selectedProduct.remainingQuantity > 0 &&
      selectedProduct.warrantyType !== 'None' &&
      warrantyValid &&
      !!form.customerName.trim() &&
      !!form.customerPhone.trim() &&
      !!form.productName.trim() &&
      !!form.purchaseDate &&
      !!form.issueDescription.trim() &&
      selectedQuantity >= 1 &&
      selectedQuantity <= selectedProduct.remainingQuantity
    );
  }, [selectedProduct, warrantyValid, form, selectedQuantity]);

  useEffect(() => {
    async function loadSuppliers() {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/inventory/suppliers?limit=100', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) {
          setSuppliers(res.data.data.suppliers || []);
        }
      } catch (err) {
        console.error('Failed to load suppliers', err);
      }
    }
    loadSuppliers();
  }, []);

  useEffect(() => {
    if (!selectedProduct) {
      return;
    }

    setSelectedQuantity(1); // Reset quantity when product changes
    setForm((prev: any) => ({
      ...prev,
      productName: selectedProduct.productName,
      productSku: selectedProduct.productSku,
      warrantyType: selectedProduct.warrantyType || prev.warrantyType,
      invoiceItems: [
        {
          productId: selectedProduct.productId,
          productName: selectedProduct.productName,
          productSku: selectedProduct.productSku,
          quantity: selectedProduct.invoiceQuantity,
        },
      ],
      supplierId: selectedProduct.suggestedSupplier?._id || prev.supplierId,
    }));
  }, [selectedProduct]);

  const handleChange = (key: string, value: string | string[]) => {
    setForm((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleFetchInvoice = async () => {
    if (!invoiceQuery.trim()) {
      setError('Please enter a valid invoice ID');
      return;
    }

    try {
      setError('');
      setInvoiceLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/warranty', {
        headers: { Authorization: `Bearer ${token}` },
        params: { invoiceId: invoiceQuery.trim() },
      });

      if (!res.data.success) {
        setError(res.data.message || 'Invoice lookup failed');
        return;
      }

      const payload = res.data.data;
      const availableProducts = (payload.productOptions || []).filter(
        (p: ProductOption) => p.remainingQuantity > 0
      );
      setInvoiceData(payload.invoice);
      setProductOptions(availableProducts);
      setSelectedProductId(availableProducts[0]?.productId || '');
      setForm((prev: any) => ({
        ...prev,
        saleId: payload.invoice.id,
        invoiceNumber: payload.invoice.saleNumber,
        customerName: payload.invoice.customer?.name || prev.customerName,
        customerPhone: payload.invoice.customer?.phone || prev.customerPhone,
        customerEmail: payload.invoice.customer?.email || prev.customerEmail,
        customerAddress: payload.invoice.customer?.address || prev.customerAddress,
        purchaseDate: payload.invoice.date
          ? new Date(payload.invoice.date).toISOString().slice(0, 10)
          : prev.purchaseDate,
      }));
    } catch (err) {
      console.error('Invoice lookup failed', err);
      setError('Unable to fetch invoice. Please verify the invoice ID and try again.');
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleAttachments = (files: FileList | null) => {
    const attachmentFiles = Array.from(files || []);
    setForm((prev: any) => ({
      ...prev,
      attachments: attachmentFiles.map((file) => file.name),
    }));
  };

  const handleSubmit = async () => {
    setError('');
    if (!canSubmitWarranty) {
      setError(
        'Please complete all required fields, select a valid warranty product, and ensure quantity is within the remaining available amount.'
      );
      return;
    }

    if (!selectedProduct) {
      setError('Please select a product to create a repair request.');
      return;
    }

    try {
      setIsSaving(true);
      const token = localStorage.getItem('token');
      await axios.post(
        '/api/warranty',
        {
          ...form,
          productId: selectedProductId,
          quantity: selectedQuantity,
          supplierId: form.supplierId || undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      router.push('/warranty');
    } catch (err) {
      console.error('Failed to create warranty request', err);
      setError('Unable to save repair request. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ProtectedRoute requiredRole={['admin', 'manager', 'cashier']}>
      <MainLayout title="New Warranty Repair">
        <div className="space-y-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                Warranty Repair
              </p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900">New Repair Request</h1>
              <p className="mt-2 text-slate-600 max-w-2xl">
                Capture warranty return details, validate coverage, and connect repairs with your
                supplier workflow.
              </p>
            </div>
            <Button variant="secondary" size="md" onClick={() => router.push('/warranty')}>
              Back to repair list
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <Card className="rounded-[28px] border-slate-200 p-6 shadow-sm shadow-slate-200/40">
              <div className="grid gap-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">Customer Name</label>
                  <input
                    value={form.customerName}
                    onChange={(e) => handleChange('customerName', e.target.value)}
                    className="input-field w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
                    placeholder="Customer name"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">Phone</label>
                  <input
                    value={form.customerPhone}
                    onChange={(e) => handleChange('customerPhone', e.target.value)}
                    className="input-field w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
                    placeholder="Phone number"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">Email</label>
                  <input
                    value={form.customerEmail}
                    onChange={(e) => handleChange('customerEmail', e.target.value)}
                    className="input-field w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
                    placeholder="Customer email"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">Address</label>
                  <input
                    value={form.customerAddress}
                    onChange={(e) => handleChange('customerAddress', e.target.value)}
                    className="input-field w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
                    placeholder="Customer address"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">Product Name</label>
                  <input
                    value={form.productName}
                    onChange={(e) => handleChange('productName', e.target.value)}
                    className="input-field w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
                    placeholder="Product name"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">SKU</label>
                  <input
                    value={form.productSku}
                    onChange={(e) => handleChange('productSku', e.target.value)}
                    className="input-field w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
                    placeholder="Product SKU"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">Serial Number</label>
                  <input
                    value={form.serialNumber}
                    onChange={(e) => handleChange('serialNumber', e.target.value)}
                    className="input-field w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
                    placeholder="Serial number"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">Purchase Date</label>
                  <input
                    type="date"
                    value={form.purchaseDate}
                    onChange={(e) => handleChange('purchaseDate', e.target.value)}
                    className="input-field w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">Warranty Type</label>
                  <select
                    value={form.warrantyType}
                    onChange={(e) => handleChange('warrantyType', e.target.value)}
                    className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
                  >
                    {warrantyOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">Supplier</label>
                  <select
                    value={form.supplierId}
                    onChange={(e) => handleChange('supplierId', e.target.value)}
                    className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier._id} value={supplier._id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Purchase Number
                  </label>
                  <input
                    value={form.purchaseNumber}
                    onChange={(e) => handleChange('purchaseNumber', e.target.value)}
                    className="input-field w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
                    placeholder="Optional purchase number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Issue / Defect Description
                  </label>
                  <textarea
                    value={form.issueDescription}
                    onChange={(e) => handleChange('issueDescription', e.target.value)}
                    rows={5}
                    className="input-field w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
                    placeholder="Describe the defect, symptoms, or repair request"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Attachments</label>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => handleAttachments(e.target.files)}
                    className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none"
                  />
                  {form.attachments.length > 0 && (
                    <p className="mt-2 text-sm text-slate-500">
                      Attached: {form.attachments.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </Card>

            <Card className="rounded-[28px] border-slate-200 p-6 shadow-sm shadow-slate-200/40">
              <div className="space-y-6">
                <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-700">Invoice Lookup</p>
                  <div className="flex gap-3">
                    <input
                      value={invoiceQuery}
                      onChange={(e) => setInvoiceQuery(e.target.value)}
                      placeholder="Invoice ID or barcode"
                      className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                    />
                    <Button
                      variant="primary"
                      size="md"
                      isLoading={invoiceLoading}
                      onClick={handleFetchInvoice}
                    >
                      Fetch
                    </Button>
                  </div>
                  <p className="text-sm text-slate-500">
                    Enter the invoice number to auto-load customer, product, warranty, and supplier
                    suggestions.
                  </p>
                </div>

                {invoiceData && (
                  <div className="rounded-3xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-500">Invoice</p>
                        <p className="text-lg font-semibold text-slate-900">
                          {invoiceData.saleNumber}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500">Date</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {new Date(invoiceData.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-slate-600">
                      <p>Customer: {invoiceData.customer?.name || 'Unknown'}</p>
                      <p>Phone: {invoiceData.customer?.phone || 'Not available'}</p>
                      <p>Email: {invoiceData.customer?.email || 'Not available'}</p>
                      <p>Status: {invoiceData.status}</p>
                      <p>Total: {invoiceData.total.toFixed(2)}</p>
                    </div>

                    {productOptions.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Invoice Products
                          </p>
                          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600">
                            {productOptions.filter((p) => p.remainingQuantity > 0).length} available
                          </span>
                        </div>

                        {productOptions.map((item) => {
                          const isSelectable = item.remainingQuantity > 0;
                          const warrantyLabel =
                            item.warrantyType === 'None'
                              ? 'No warranty'
                              : item.warrantyValid
                                ? 'Valid'
                                : 'Expired';
                          const badgeStyles =
                            item.warrantyType === 'None'
                              ? 'bg-slate-100 text-slate-700 ring-slate-200'
                              : item.warrantyValid
                                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                : 'bg-rose-50 text-rose-600 ring-rose-200';

                          return (
                            <button
                              key={item.productId}
                              onClick={() => setSelectedProductId(item.productId)}
                              className={`w-full text-left rounded-xl border px-3.5 py-3 transition ${
                                selectedProductId === item.productId
                                  ? 'border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200'
                                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-[12px] font-bold text-slate-800">
                                    {item.productName}
                                  </p>
                                  {item.productSku && (
                                    <p className="text-[10px] font-mono text-slate-400">
                                      {item.productSku}
                                    </p>
                                  )}
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-1">
                                  <span
                                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${badgeStyles}`}
                                  >
                                    {warrantyLabel}
                                  </span>
                                  <span className="text-[10px] text-slate-500">
                                    {isSelectable
                                      ? `${item.remainingQuantity} remaining`
                                      : 'No units remaining'}
                                  </span>
                                </div>
                              </div>
                            </button>
                          );
                        })}

                        {selectedProduct && (
                          <div className="mt-1 rounded-xl border border-indigo-100 bg-indigo-50 px-3.5 py-3">
                            <label className="block text-[11px] font-bold text-indigo-600 mb-1">
                              Quantity to Send
                            </label>
                            <input
                              type="number"
                              min="1"
                              max={selectedProduct.remainingQuantity}
                              value={selectedQuantity}
                              onChange={(e) =>
                                setSelectedQuantity(
                                  Math.min(
                                    parseInt(e.target.value) || 1,
                                    selectedProduct.remainingQuantity
                                  )
                                )
                              }
                              className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-indigo-400"
                            />
                            <p className="mt-1 text-[10px] text-indigo-500">
                              Max {selectedProduct.remainingQuantity} units (bought{' '}
                              {selectedProduct.invoiceQuantity}, sent{' '}
                              {selectedProduct.totalSentQuantity})
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {selectedProduct?.suggestedSupplier && (
                      <div className="mt-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                        Suggested supplier: {selectedProduct.suggestedSupplier.name}
                      </div>
                    )}
                  </div>
                )}

                <div className="rounded-3xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-sky-600" />
                    <p className="text-sm font-semibold text-slate-900">Warranty validation</p>
                  </div>
                  <div className="mt-4 grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">Warranty Status</span>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          warrantyValid
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {warrantyValid ? 'Valid' : 'Expired'}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-slate-600">
                      <div>Type: {form.warrantyType}</div>
                      <div>Purchase date: {form.purchaseDate || 'Not set'}</div>
                      <div>
                        Expires: {warrantyExpiry ? warrantyExpiry.toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
                {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
                {selectedProduct && !warrantyValid && (
                  <p className="text-sm text-amber-700">
                    The selected product warranty has expired or is not valid for repair.
                  </p>
                )}
                <Button
                  variant="primary"
                  size="lg"
                  isLoading={isSaving}
                  onClick={handleSubmit}
                  disabled={!canSubmitWarranty || isSaving}
                >
                  Save repair request
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
