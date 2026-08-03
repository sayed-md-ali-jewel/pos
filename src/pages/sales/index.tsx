import React, { useState, useEffect } from 'react';
import axios from 'axios';
import MainLayout from '@/components/Layout/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/Common/FormElements';
import { useAppDialog } from '@/components/Common/AppDialog';
import { useCartStore } from '@/store/cartStore';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import {
  CheckCircle2,
  Minus,
  PackageOpen,
  Percent,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import {
  cacheProducts,
  getCachedProducts,
  getQueuedSales,
  queueSale,
  syncQueuedSales,
} from '@/utils/offlineQueue';
import { formatCurrency } from '@/utils/format';

interface Product {
  _id: string;
  name: string;
  price: number;
  stock: number;
  barcode?: string;
  image?: string;
  images?: string[];
  brand?: string | { _id: string; name: string };
  category?: string | { _id: string; name: string };
  subcategory?: string;
}

interface Customer {
  _id: string;
  name: string;
  phone: string;
  balance: number;
}

export default function POSPage() {
  return (
    <ProtectedRoute requiredRole={['cashier', 'admin', 'manager']}>
      <POSContent />
    </ProtectedRoute>
  );
}

function POSContent() {
  const router = useRouter();
  const cartStore = useCartStore();
  const dialog = useAppDialog();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [walkinName, setWalkinName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [walkinAddress, setWalkinAddress] = useState('');
  const [saveWalkinCustomer, setSaveWalkinCustomer] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'cheque' | 'mobile'>('cash');
  const [paidAmount, setPaidAmount] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [taxSettings, setTaxSettings] = useState({
    taxEnabled: false,
    defaultTaxRate: 10,
    taxInclusive: false,
    taxLabel: 'VAT',
  });
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsOnline(typeof navigator === 'undefined' ? true : navigator.onLine);
    fetchProducts();
    refreshPendingSyncCount();

    const handleOnline = async () => {
      setIsOnline(true);
      await syncOfflineSales();
    };
    const handleOffline = () => setIsOnline(false);
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_OFFLINE_SALES') {
        syncOfflineSales();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);

    // Auto-focus search on load for barcode scanner readiness
    if (searchInputRef.current) searchInputRef.current.focus();

    fetchSettings();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
    };
    // Run once on POS boot; the handlers call the latest queue state from IndexedDB.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        const payload = response.data.data;
        setTaxSettings({
          taxEnabled: Boolean(payload.taxEnabled),
          defaultTaxRate: Number(payload.defaultTaxRate) || 0,
          taxInclusive: Boolean(payload.taxInclusive),
          taxLabel: payload.taxLabel || 'VAT',
        });
      }
    } catch (error) {
      console.error('Failed to load tax settings', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/products?limit=100', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setProducts(response.data.data.products);
        await cacheProducts(response.data.data.products);
      }
    } catch (error) {
      const cachedProducts = await getCachedProducts();
      if (cachedProducts?.length) {
        setProducts(cachedProducts);
        toast.success('Loaded cached products for offline mode');
      } else {
        toast.error('Failed to load products');
      }
    }
  };

  const fetchCustomerOptions = async (query = '') => {
    setCustomerSearchLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.set('limit', '10');
      if (query) params.set('search', query);
      const response = await axios.get(`/api/customers?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setCustomerResults(response.data.data.customers);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load customers');
    } finally {
      setCustomerSearchLoading(false);
    }
  };

  const openCustomerModal = async () => {
    setIsCustomerModalOpen(true);
    await fetchCustomerOptions();
  };

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setWalkinName('');
    setWalkinPhone('');
    setWalkinAddress('');
    setSaveWalkinCustomer(false);
    setIsCustomerModalOpen(false);
    setCustomerSearch('');
    toast.success(`${customer.name} selected`);
  };

  const setWalkIn = () => {
    setSelectedCustomer(null);
    setSaveWalkinCustomer(false);
    setIsCustomerModalOpen(false);
    toast.success('Sale switched to walk-in (no customer)');
  };

  const refreshPendingSyncCount = async () => {
    const queuedSales = await getQueuedSales();
    setPendingSyncCount(queuedSales.length);
  };

  const syncOfflineSales = async () => {
    const result = await syncQueuedSales();
    await refreshPendingSyncCount();
    if (result.synced > 0) toast.success(`${result.synced} offline sale(s) synced`);
    if (result.failed > 0) toast.error(`${result.failed} offline sale(s) need review`);
  };

  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      toast.error('Product out of stock');
      return;
    }

    cartStore.addItem({
      productId: product._id,
      productName: product.name,
      price: product.price,
      quantity: 1,
      subtotal: product.price,
    });

    toast.success(`${product.name} added to cart`);
  };

  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      cartStore.removeItem(productId);
      return;
    }
    const product = products.find((p) => p._id === productId);
    if (product && newQuantity > product.stock) {
      toast.error(`Only ${product.stock} items available`);
      return;
    }
    cartStore.updateQuantity(productId, newQuantity);
  };

  const handleSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      // Intercept Barcode Scanner (which usually ends with Enter)
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`/api/products?exactBarcode=${searchQuery.trim()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success && res.data.data.products.length > 0) {
          const product = res.data.data.products[0];
          handleAddToCart(product);
          setSearchQuery(''); // clear for next scan
        } else {
          // It might just be a regular search term, don't show error if it's not a strict barcode scan
        }
      } catch (err) {
        console.error('Barcode lookup failed');
      }
    }
  };

  const handleCheckout = async () => {
    if (cartStore.items.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setProcessing(true);

    try {
      const subtotal = cartStore.getSubtotal();
      let finalDiscount = 0;

      if (discountType === 'percent') {
        finalDiscount = (subtotal * discount) / 100;
      } else {
        finalDiscount = discount;
      }

      const taxPercent = taxSettings.taxEnabled ? Number(taxSettings.defaultTaxRate) : 0;
      const taxableAmount = subtotal - finalDiscount;
      let tax = 0;
      let total = taxableAmount;

      if (taxSettings.taxEnabled) {
        if (taxSettings.taxInclusive) {
          tax = taxableAmount - taxableAmount / (1 + taxPercent / 100);
          total = taxableAmount;
        } else {
          tax = (taxableAmount * taxPercent) / 100;
          total = taxableAmount + tax;
        }
      }

      const token = localStorage.getItem('token');
      const trimmedWalkinName = walkinName.trim();
      const trimmedWalkinPhone = walkinPhone.trim();
      const trimmedWalkinAddress = walkinAddress.trim();

      if (!selectedCustomer && saveWalkinCustomer) {
        if (!navigator.onLine) {
          toast.error('Connect to the internet to save a walk-in customer');
          return;
        }
        if (trimmedWalkinName.length < 2) {
          toast.error('Enter a customer name to save this walk-in');
          return;
        }
        if (trimmedWalkinPhone.length < 10) {
          toast.error('Enter a valid phone number to save this walk-in');
          return;
        }
      }

      let saleCustomerId = selectedCustomer?._id;
      if (!selectedCustomer && saveWalkinCustomer) {
        const customerResponse = await axios.post(
          '/api/customers',
          {
            name: trimmedWalkinName,
            phone: trimmedWalkinPhone,
            address: trimmedWalkinAddress,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (customerResponse.data.success) {
          saleCustomerId = customerResponse.data.data._id;
        }

        if (!saleCustomerId) {
          throw new Error('Customer could not be saved');
        }
      }

      const salePayload = {
        clientSaleId: `pos-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        items: cartStore.items,
        subtotal,
        discount: finalDiscount,
        discountPercent: discountType === 'percent' ? discount : 0,
        tax,
        taxPercent,
        total,
        paymentMethod,
        paidAmount: Number(paidAmount) || total,
        customerId: saleCustomerId ?? undefined,
        walkinCustomerName: !saleCustomerId && trimmedWalkinName ? trimmedWalkinName : undefined,
        walkinCustomerPhone: !saleCustomerId && trimmedWalkinPhone ? trimmedWalkinPhone : undefined,
        walkinCustomerAddress:
          !saleCustomerId && trimmedWalkinAddress ? trimmedWalkinAddress : undefined,
        notes: '',
      };

      if (!navigator.onLine) {
        await queueSale(salePayload, token);
        await refreshPendingSyncCount();
        await navigator.serviceWorker?.ready.then((registration: any) =>
          registration.sync?.register('sync-offline-sales')
        );
        toast.success('Sale saved offline and queued for sync');
        cartStore.clearCart();
        setDiscount(0);
        setPaidAmount(0);
        setSelectedCustomer(null);
        setWalkinName('');
        setWalkinPhone('');
        setWalkinAddress('');
        setSaveWalkinCustomer(false);
        setPaymentMethod('cash');
        setIsCheckoutModalOpen(false);
        return;
      }

      const response = await axios.post('/api/sales', salePayload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        toast.success('Sale completed successfully');
        cartStore.clearCart();
        setDiscount(0);
        setPaidAmount(0);
        setSelectedCustomer(null);
        setWalkinName('');
        setWalkinPhone('');
        setWalkinAddress('');
        setSaveWalkinCustomer(false);
        setPaymentMethod('cash');
        setIsCheckoutModalOpen(false);

        // Show receipt/invoice
        const saleId = response.data.data._id;
        router.push(`/sales/receipt/${saleId}`);
      }
    } catch (error: any) {
      if (!selectedCustomer && saveWalkinCustomer) {
        toast.error(
          error.response?.data?.message ||
            error.response?.data?.error ||
            'Failed to save walk-in customer'
        );
        return;
      }

      if (!navigator.onLine || !error.response) {
        const token = localStorage.getItem('token');
        const trimmedWalkinName = walkinName.trim();
        const trimmedWalkinPhone = walkinPhone.trim();
        const trimmedWalkinAddress = walkinAddress.trim();
        await queueSale(
          {
            clientSaleId: `pos-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            items: cartStore.items,
            subtotal,
            discount: finalDiscount,
            discountPercent: discountType === 'percent' ? discount : 0,
            tax,
            taxPercent,
            total,
            paymentMethod,
            paidAmount: Number(paidAmount) || total,
            customerId: selectedCustomer?._id ?? undefined,
            walkinCustomerName:
              !selectedCustomer && trimmedWalkinName ? trimmedWalkinName : undefined,
            walkinCustomerPhone:
              !selectedCustomer && trimmedWalkinPhone ? trimmedWalkinPhone : undefined,
            walkinCustomerAddress:
              !selectedCustomer && trimmedWalkinAddress ? trimmedWalkinAddress : undefined,
            notes: '',
          },
          token
        );
        await refreshPendingSyncCount();
        toast.success('Network failed. Sale saved offline for sync');
        cartStore.clearCart();
        setDiscount(0);
        setPaidAmount(0);
        setSelectedCustomer(null);
        setWalkinName('');
        setWalkinPhone('');
        setWalkinAddress('');
        setSaveWalkinCustomer(false);
        setPaymentMethod('cash');
        setIsCheckoutModalOpen(false);
      } else {
        toast.error(error.response?.data?.message || 'Sale failed');
      }
    } finally {
      setProcessing(false);
    }
  };

  const subtotal = cartStore.getSubtotal();
  const finalDiscount = discountType === 'percent' ? (subtotal * discount) / 100 : discount;
  const taxPercent = taxSettings.taxEnabled ? Number(taxSettings.defaultTaxRate) : 0;
  const taxableAmount = subtotal - finalDiscount;
  const tax = taxSettings.taxEnabled
    ? taxSettings.taxInclusive
      ? taxableAmount - taxableAmount / (1 + taxPercent / 100)
      : (taxableAmount * taxPercent) / 100
    : 0;
  const total = taxSettings.taxEnabled
    ? taxSettings.taxInclusive
      ? taxableAmount
      : taxableAmount + tax
    : taxableAmount;
  const change = Number(paidAmount) - total;
  const dueAmount = Math.max(total - Number(paidAmount), 0);
  const canUsePartialPayment = Boolean(selectedCustomer || saveWalkinCustomer);

  const getCategoryName = (category?: Product['category']) => {
    if (!category) return '';
    return typeof category === 'string' ? category : category.name || '';
  };

  const getBrandName = (brand?: Product['brand']) => {
    if (!brand) return '';
    return typeof brand === 'string' ? brand : brand.name || '';
  };

  const getProductImage = (product: Product) => product.image || product.images?.[0] || '';

  // Get unique categories
  const categories = Array.from(
    new Set(products.map((p) => getCategoryName(p.category)).filter(Boolean))
  ) as string[];
  const popularCategories = categories.slice(0, 5);

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode?.includes(searchQuery);
    const matchesCategory = !selectedCategory || getCategoryName(p.category) === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <MainLayout title="POS - Point of Sale">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Sales POS</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Manage and track point of sale transactions
            </p>
          </div>
          {pendingSyncCount > 0 && (
            <button
              type="button"
              onClick={syncOfflineSales}
              className="flex items-center gap-2 rounded-lg bg-blue-500/20 px-4 py-2 text-sm font-semibold text-blue-700 dark:text-blue-200 hover:bg-blue-500/30 transition"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
              Sync Pending: {pendingSyncCount}
            </button>
          )}
        </div>

        {/* Main Grid Layout */}
        <div className="flex min-h-[calc(100vh-280px)] flex-col">
          <div className="grid flex-1 grid-cols-1 gap-5 overflow-hidden xl:grid-cols-[minmax(0,1fr)_23rem]">
            {/* Left Section: Products & Search */}
            <div className="flex min-w-0 flex-col gap-4 overflow-hidden">
              {/* Enhanced Search & Filters */}
              <div className="space-y-3">
                <div className="relative">
                  <Search
                    size={20}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search by name or scan barcode..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-white px-12 text-base font-medium text-slate-900 shadow-sm shadow-slate-200/70 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  />
                  <Search
                    size={22}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>

                {/* Category Quick Filter */}
                {popularCategories.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedCategory('')}
                      className={`min-h-10 rounded-full px-4 text-sm font-semibold transition ${
                        selectedCategory === ''
                          ? 'bg-slate-950 text-white shadow-sm shadow-slate-300'
                          : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      All ({products.length})
                    </button>
                    {popularCategories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
                        className={`min-h-10 rounded-full px-4 text-sm font-semibold transition ${
                          selectedCategory === cat
                            ? 'bg-sky-600 text-white shadow-sm shadow-sky-200'
                            : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                    {categories.length > popularCategories.length && (
                      <button
                        onClick={() => setShowCategoryFilter(!showCategoryFilter)}
                        className="min-h-10 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        More...
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Products Grid - Responsive and optimized */}
              <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
                {filteredProducts.length > 0 ? (
                  <div className="grid auto-rows-fr grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
                    {filteredProducts.map((product) => (
                      <button
                        key={product._id}
                        onClick={() => handleAddToCart(product)}
                        disabled={product.stock <= 0}
                        className={`group relative flex min-h-[8.25rem] overflow-hidden rounded-xl border p-3 text-left transition-all duration-200 ${
                          product.stock > 0
                            ? 'cursor-pointer border-slate-200 bg-white hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-lg hover:shadow-sky-100'
                            : 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-60'
                        }`}
                      >
                        {product.stock <= 0 && (
                          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/70 backdrop-blur-[1px]">
                            <span className="rounded-full bg-rose-600 px-3 py-1 text-xs font-bold text-white">
                              Out
                            </span>
                          </div>
                        )}
                        <div className="flex h-full w-full gap-3">
                          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                            {getProductImage(product) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={getProductImage(product)}
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <PackageOpen size={30} className="text-slate-300" />
                            )}
                          </div>

                          <div className="flex min-w-0 flex-1 flex-col justify-between">
                            <div>
                              <p className="line-clamp-2 text-sm font-bold leading-snug text-slate-950">
                                {product.name}
                              </p>
                              <p className="mt-1 truncate text-xs font-medium text-slate-500">
                                {getBrandName(product.brand) ||
                                  getCategoryName(product.category) ||
                                  'No brand'}
                              </p>
                            </div>

                            <div className="flex items-end justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xl font-extrabold leading-none text-sky-600">
                                  {formatCurrency(product.price)}
                                </p>
                                <span
                                  className={`mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
                                    product.stock > 10
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : product.stock > 0
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-rose-100 text-rose-700'
                                  }`}
                                >
                                  Stock: {product.stock}
                                </span>
                              </div>
                              {product.stock > 0 && (
                                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-sky-100 bg-sky-50 text-sky-600 transition group-hover:scale-105 group-hover:border-sky-200 group-hover:bg-sky-100">
                                  <ShoppingCart size={19} />
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <PackageOpen size={48} className="mb-3 text-slate-300" />
                    <p className="text-lg font-semibold text-slate-600">No products found</p>
                    <p className="text-sm text-slate-500 mt-1">
                      {searchQuery ? 'Try adjusting your search' : 'Try selecting a category'}
                    </p>
                  </div>
                )}
              </div>

              {/* Product Count */}
              <p className="text-xs text-slate-500 text-center font-medium">
                Showing {filteredProducts.length} of {products.length} products
              </p>
            </div>

            {/* Right Section: Cart & Actions */}
            <div className="flex min-w-0 flex-col gap-4 overflow-hidden">
              {/* Customer Card */}
              <div
                className={`overflow-hidden rounded-2xl border p-4 shadow-sm transition ${
                  selectedCustomer
                    ? 'border-sky-200 bg-sky-50 shadow-sky-100'
                    : 'border-amber-200 bg-amber-50 shadow-amber-100'
                }`}
              >
                {selectedCustomer ? (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-950">{selectedCustomer.name}</p>
                        <p className="mt-1 text-xs font-medium text-slate-600">
                          {selectedCustomer.phone}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          (selectedCustomer.balance ?? 0) > 0
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {formatCurrency(selectedCustomer.balance ?? 0)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={openCustomerModal}
                        className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm transition hover:bg-slate-50"
                      >
                        Change
                      </button>
                      <button
                        onClick={setWalkIn}
                        className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm transition hover:bg-slate-50"
                      >
                        Walk-in
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-amber-950">No Customer</p>
                        <p className="mt-1 text-xs font-medium text-amber-700">
                          Walk-in transaction
                        </p>
                      </div>
                      <UserPlus size={20} className="text-amber-600" />
                    </div>

                    <div className="space-y-2 pt-1">
                      <input
                        type="text"
                        placeholder="Walk-in Name (Optional)"
                        value={walkinName}
                        onChange={(e) => setWalkinName(e.target.value)}
                        className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                      />
                      <input
                        type="text"
                        placeholder="Phone Number (Optional)"
                        value={walkinPhone}
                        onChange={(e) => setWalkinPhone(e.target.value)}
                        className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                      />
                    </div>

                    <button
                      onClick={openCustomerModal}
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-3 text-sm font-bold text-white shadow-sm transition hover:bg-amber-700 mt-1"
                    >
                      <UserPlus size={16} />
                      Select Customer
                    </button>
                  </div>
                )}
              </div>

              {/* Cart Display - Expandable */}
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/70">
                <div className="flex items-center justify-between bg-sky-600 px-4 py-3 text-white">
                  <h3 className="inline-flex items-center gap-2 text-sm font-bold">
                    <ShoppingCart size={17} />
                    Cart
                  </h3>
                  <span className="rounded-full bg-white/25 px-2.5 py-0.5 text-xs font-bold text-white">
                    {cartStore.items.length}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                  {cartStore.items.length === 0 ? (
                    <div className="flex h-full min-h-32 flex-col items-center justify-center text-center">
                      <ShoppingBag size={42} className="mb-3 text-slate-300" />
                      <p className="text-sm font-medium text-slate-500">Cart empty</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {cartStore.items.map((item) => (
                        <div
                          key={item.productId}
                          className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 transition hover:bg-white"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-slate-950">
                              {item.productName}
                            </p>
                            <div className="mt-2 flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateQuantity(item.productId, item.quantity - 1)
                                }
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                              >
                                <Minus size={13} />
                              </button>
                              <span className="w-7 text-center text-xs font-bold">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateQuantity(item.productId, item.quantity + 1)
                                }
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-slate-950">
                              {formatCurrency(item.subtotal)}
                            </p>
                            <button
                              type="button"
                              onClick={() => cartStore.removeItem(item.productId)}
                              className="mt-2 inline-flex h-7 w-7 items-center justify-center rounded-lg text-rose-600 transition hover:bg-rose-50"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Discount Input */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
                <label className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-950">
                  <Percent size={16} className="text-slate-400" />
                  Discount
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="input-field min-h-12 flex-1 text-sm"
                  />
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'fixed' | 'percent')}
                    className="input-field min-h-12 w-20 text-center text-sm font-bold"
                  >
                    <option value="fixed">৳</option>
                    <option value="percent">%</option>
                  </select>
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(subtotal)}</span>
                </div>
                {finalDiscount > 0 && (
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-sm">
                    <span className="text-red-600 font-medium">Discount</span>
                    <span className="font-semibold text-red-600">
                      −{formatCurrency(finalDiscount)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Tax ({taxPercent}%)</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(tax)}</span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t-2 border-slate-200 pt-3 text-xl font-bold">
                  <span className="text-slate-900">Total</span>
                  <span className="text-sky-600">{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    if (cartStore.items.length === 0) {
                      toast.error('Cart is empty');
                      return;
                    }
                    setPaidAmount(total);
                    setIsCheckoutModalOpen(true);
                  }}
                  disabled={cartStore.items.length === 0}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-sm font-bold text-white shadow-sm shadow-emerald-200 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCircle2 size={17} />
                  Checkout
                </button>
                <button
                  onClick={async () => {
                    const confirmed = await dialog.confirm({
                      title: 'Clear cart?',
                      message: 'All cart items and the selected customer will be removed.',
                      confirmText: 'Clear',
                      variant: 'danger',
                    });
                    if (confirmed) {
                      cartStore.clearCart();
                      setDiscount(0);
                      setSelectedCustomer(null);
                      setWalkinName('');
                      setWalkinPhone('');
                      setWalkinAddress('');
                      setSaveWalkinCustomer(false);
                    }
                  }}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  <Trash2 size={16} />
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 p-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Select Customer</h3>
                <p className="text-sm text-slate-500">Search and choose a customer</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(false)}
                className="text-slate-500 hover:text-slate-900"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4 p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input-field flex-1"
                  placeholder="Search by name, phone, email..."
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    fetchCustomerOptions(e.target.value);
                  }}
                />
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 max-h-96 overflow-y-auto">
                {customerSearchLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900" />
                  </div>
                ) : customerResults.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">No customers found</div>
                ) : (
                  <div className="space-y-2">
                    {customerResults.map((customer) => (
                      <button
                        key={customer._id}
                        type="button"
                        onClick={() => selectCustomer(customer)}
                        className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left hover:border-primary-400 hover:bg-primary-50 transition text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">{customer.name}</p>
                            <p className="text-xs text-slate-500">{customer.phone}</p>
                          </div>
                          <span className="text-xs font-bold text-slate-600">
                            {formatCurrency(customer.balance)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={setWalkIn}
                className="w-full rounded-lg bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-200 transition"
              >
                Continue as Walk-in
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-4">
          <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)]">
            <div className="shrink-0 bg-gradient-to-r from-primary-600 to-primary-700 p-4 text-white">
              <h2 className="text-xl font-bold">✓ Complete Sale</h2>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
              <div className="bg-gradient-to-br from-primary-50 to-primary-100 p-4 rounded-xl text-center border border-primary-200">
                <p className="text-xs text-primary-600 uppercase font-semibold tracking-wide">
                  Total Amount
                </p>
                <p className="text-4xl font-bold text-primary-700 mt-1">{formatCurrency(total)}</p>
              </div>

              <div className="space-y-4">
                {!selectedCustomer && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                    <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">
                      Walk-in Customer Details (Optional)
                    </p>
                    <input
                      type="text"
                      placeholder="Name"
                      value={walkinName}
                      onChange={(e) => setWalkinName(e.target.value)}
                      className="input-field w-full text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Phone Number"
                      value={walkinPhone}
                      onChange={(e) => setWalkinPhone(e.target.value)}
                      className="input-field w-full text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Address"
                      value={walkinAddress}
                      onChange={(e) => setWalkinAddress(e.target.value)}
                      className="input-field w-full text-sm"
                    />
                    <label className="flex items-start gap-3 rounded-lg border border-amber-200 bg-white px-3 py-2.5 text-sm font-semibold text-amber-900">
                      <input
                        type="checkbox"
                        checked={saveWalkinCustomer}
                        onChange={(e) => setSaveWalkinCustomer(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                      />
                      <span>
                        Save as customer
                        <span className="block text-xs font-medium text-amber-700">
                          Requires name and phone. Partial due will be saved to this customer.
                        </span>
                      </span>
                    </label>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="input-field w-full"
                  >
                    <option value="cash">💵 Cash</option>
                    <option value="card">💳 Card</option>
                    <option value="mobile">📱 Mobile</option>
                    <option value="cheque">📋 Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Amount Paid (৳)
                  </label>
                  <input
                    type="number"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="0.00"
                    step="0.01"
                    className="input-field w-full text-lg font-bold"
                  />
                </div>

                {paidAmount > 0 && (
                  <div
                    className={`p-3 rounded-lg border-2 text-center font-bold transition ${
                      change >= 0
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-red-50 border-red-300 text-red-900'
                    }`}
                  >
                    {change >= 0 ? (
                      <>
                        <p className="text-xs">Change Due</p>
                        <p className="text-2xl">{formatCurrency(change)}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs">
                          {canUsePartialPayment ? 'Customer Due' : 'Amount Remaining'}
                        </p>
                        <p className="text-2xl">{formatCurrency(dueAmount)}</p>
                      </>
                    )}
                  </div>
                )}
                {!canUsePartialPayment && change < 0 && (
                  <p className="text-xs text-red-600 font-medium">
                    Select a customer to allow partial payment and save due.
                  </p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 gap-3 border-t bg-slate-50 p-4">
              <button
                onClick={() => setIsCheckoutModalOpen(false)}
                disabled={processing}
                className="flex-1 px-4 py-3 border-2 border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-100 disabled:opacity-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCheckout}
                disabled={(change < 0 && !canUsePartialPayment) || processing}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold rounded-lg hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing
                  </>
                ) : (
                  <>✓ Complete</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
