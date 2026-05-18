export interface User {
  _id?: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'cashier';
  branchId?: string;
  branchRoles?: { branchId: string; role: 'manager' | 'cashier' }[];
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Product {
  _id?: string;
  name: string;
  category: string;
  brand: string;
  barcode: string;
  branchId?: string;
  price: number;
  stock: number;
  minStock?: number;
  warranty?: string;
  description?: string;
  image?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Customer {
  _id?: string;
  name: string;
  email?: string;
  phone: string;
  branchId?: string;
  address?: string;
  balance: number;
  totalPurchased: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CartItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface Sale {
  _id?: string;
  saleNumber: string;
  branchId?: string;
  customerId?: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'cheque' | 'mobile';
  paidAmount: number;
  dueAmount: number;
  status: 'completed' | 'pending' | 'cancelled';
  notes?: string;
  cashierId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthResponse {
  token: string;
  user: Omit<User, 'password'>;
}

export interface WarrantyRepair {
  _id?: string;
  repairNumber: string;
  batchId?: string;
  saleId?: string;
  invoiceNumber?: string;
  invoiceItems?: Array<{
    productId?: string;
    productName: string;
    productSku?: string;
    quantity?: number;
    serialNumber?: string;
  }>;
  productId?: string;
  repairQuantity?: number;
  returnableQuantity?: number;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  customerAddress?: string;
  productName: string;
  productSku?: string;
  serialNumber?: string;
  purchaseDate: string;
  warrantyType: string;
  warrantyExpiresAt?: string;
  warrantyValid: boolean;
  issueDescription: string;
  supplierId?: string;
  supplierName?: string;
  purchaseId?: string;
  purchaseNumber?: string;
  attachments?: string[];
  sendToSupplier?: {
    sentAt?: string;
    expectedReturnDate?: string;
    shippingMethod?: string;
    trackingNumber?: string;
    notes?: string;
  };
  status:
    | 'Pending'
    | 'Sent to Supplier'
    | 'In Repair'
    | 'Received from Supplier'
    | 'Ready for Delivery'
    | 'Repaired'
    | 'Returned to Shop'
    | 'Delivered Back to Customer';
  history?: Array<{
    status: string;
    note?: string;
    performedBy?: { id?: string; name?: string; role?: string };
    createdAt?: string;
  }>;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductRepairTracking {
  productId?: string;
  productName: string;
  productSku?: string;
  invoiceQuantity: number;
  totalSentQuantity: number;
  remainingQuantity: number;
  warrantyType: string;
  warrantyExpiresAt?: string;
  warrantyValid: boolean;
  sendHistory?: Array<{
    repairId?: string;
    quantitySent: number;
    sentAt?: string;
    status?: string;
  }>;
}

export interface WarrantyRepairBatch {
  _id?: string;
  batchNumber: string;
  saleId: string;
  invoiceNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress?: string;
  invoicePurchaseDate: string;
  invoiceTotal?: number;
  productRepairTracking: ProductRepairTracking[];
  status: 'Pending' | 'Sent to Supplier' | 'Received from Supplier' | 'Delivered Back to Customer';
  notes?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface DataBackupRecord {
  _id?: string;
  createdBy: string;
  userEmail?: string;
  modules: string[];
  backupType: 'manual' | 'auto';
  format: 'json' | 'csv' | 'zip';
  storageProvider: 'local' | 'drive';
  fileName: string;
  filePath: string;
  fileSize?: number;
  encrypted: boolean;
  status: 'pending' | 'completed' | 'failed';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DataImportRecord {
  _id?: string;
  createdBy: string;
  userEmail?: string;
  sourceFileName: string;
  sourceFormat: 'json' | 'csv' | 'zip';
  module?: string;
  strategy: 'merge' | 'overwrite' | 'skip';
  status: 'pending' | 'running' | 'completed' | 'failed';
  records?: Record<string, number>;
  errors?: string[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DataExportRecord {
  _id?: string;
  createdBy: string;
  userEmail?: string;
  module: string;
  format: 'json' | 'csv' | 'xlsx';
  filters?: Record<string, any>;
  storageProvider: 'local' | 'drive';
  fileName: string;
  filePath: string;
  fileSize?: number;
  status: 'pending' | 'completed' | 'failed';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ScheduledJobRecord {
  _id?: string;
  name: string;
  type: 'backup' | 'export' | 'import';
  payload: Record<string, any>;
  scheduleType: 'cron' | 'once';
  scheduleValue: string;
  timezone: string;
  isRecurring: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  createdBy: string;
  createdByEmail?: string;
  errorMessage?: string;
  result?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}
