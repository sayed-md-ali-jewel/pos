const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

dotenv.config({ path: '.env.local' });
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'mr-trading';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

const validateMongoUri = () => {
  let parsedUri;

  try {
    parsedUri = new URL(MONGODB_URI);
  } catch {
    throw new Error('MONGODB_URI must be a valid MongoDB connection string');
  }

  if (
    parsedUri.hostname === 'cluster.mongodb.net' ||
    parsedUri.hostname.includes('xxxxx') ||
    parsedUri.hostname.includes('abc12')
  ) {
    throw new Error(
      'MONGODB_URI still uses an example Atlas host. Copy the exact connection string from Atlas Database > Connect > Drivers and replace <password> with your database user password.'
    );
  }
};

const defineModels = () => {
  const objectId = mongoose.Schema.Types.ObjectId;

  const userSchema = new mongoose.Schema(
    {
      email: { type: String, required: true, unique: true, lowercase: true },
      password: { type: String, required: true },
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      role: { type: String, enum: ['admin', 'manager', 'cashier'], default: 'cashier' },
      branchId: { type: objectId },
      branchRoles: [
        {
          branchId: { type: objectId, required: true },
          role: { type: String, enum: ['manager', 'cashier'], required: true },
        },
      ],
      isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
  );

  const categorySchema = new mongoose.Schema(
    {
      name: { type: String, required: true, unique: true, trim: true },
      description: String,
      isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
  );

  const subcategorySchema = new mongoose.Schema(
    {
      name: { type: String, required: true, trim: true },
      description: String,
      category: { type: objectId, ref: 'Category', required: true },
      isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
  );
  subcategorySchema.index({ name: 1, category: 1 }, { unique: true });

  const brandSchema = new mongoose.Schema(
    {
      name: { type: String, required: true, unique: true, trim: true },
      description: String,
      isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
  );

  const productSchema = new mongoose.Schema(
    {
      name: { type: String, required: true, trim: true },
      branchId: { type: objectId, index: true },
      description: String,
      category: { type: objectId, ref: 'Category', required: true },
      subcategory: { type: objectId, ref: 'Subcategory' },
      brand: { type: objectId, ref: 'Brand' },
      barcode: { type: String, sparse: true },
      sku: { type: String, sparse: true },
      price: { type: Number, required: true, min: 0 },
      cost: { type: Number, min: 0 },
      stock: { type: Number, required: true, default: 0, min: 0 },
      defectiveStock: { type: Number, default: 0, min: 0 },
      minStock: { type: Number, default: 5, min: 0 },
      warranty: {
        type: String,
        enum: [
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
        ],
        default: 'None',
      },
      image: String,
      images: { type: [String], default: [] },
      isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
  );

  const customerSchema = new mongoose.Schema(
    {
      customerCode: String,
      branchId: { type: objectId, index: true },
      name: { type: String, required: true, trim: true },
      email: { type: String, sparse: true, lowercase: true },
      phone: { type: String, required: true },
      address: String,
      city: String,
      avatar: String,
      dateOfBirth: Date,
      gender: { type: String, enum: ['Male', 'Female', 'Other'] },
      balance: { type: Number, default: 0, min: 0 },
      dueAmount: { type: Number, default: 0, min: 0 },
      totalPurchased: { type: Number, default: 0, min: 0 },
      totalTransactions: { type: Number, default: 0, min: 0 },
      lastPurchaseDate: Date,
      loyaltyPoints: { type: Number, default: 0, min: 0 },
      notes: String,
      isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
  );

  const supplierSchema = new mongoose.Schema(
    {
      supplierCode: { type: String, unique: true },
      name: { type: String, required: true, trim: true },
      contactPerson: String,
      email: { type: String, unique: true, sparse: true, lowercase: true },
      phone: { type: String, required: true },
      address: String,
      city: String,
      dueAmount: { type: Number, default: 0, min: 0 },
      totalPurchased: { type: Number, default: 0, min: 0 },
      creditLimit: { type: Number, default: 0, min: 0 },
      rating: { type: Number, default: 5, min: 1, max: 5 },
      lastTransactionDate: Date,
      isActive: { type: Boolean, default: true },
      notes: String,
    },
    { timestamps: true }
  );

  const saleSchema = new mongoose.Schema(
    {
      saleNumber: { type: String, unique: true, required: true },
      branchId: { type: objectId, index: true },
      customerId: { type: objectId, ref: 'Customer' },
      items: [
        {
          productId: { type: objectId, ref: 'Product', required: true },
          productName: String,
          price: Number,
          quantity: { type: Number, required: true, min: 1 },
          subtotal: Number,
        },
      ],
      subtotal: { type: Number, required: true, default: 0 },
      discount: { type: Number, default: 0, min: 0 },
      discountPercent: { type: Number, default: 0, min: 0, max: 100 },
      tax: { type: Number, default: 0, min: 0 },
      taxPercent: { type: Number, default: process.env.STORE_TAX_RATE || 10 },
      total: { type: Number, required: true },
      paymentMethod: { type: String, enum: ['cash', 'card', 'cheque', 'mobile'], required: true },
      paidAmount: { type: Number, required: true },
      dueAmount: { type: Number, default: 0 },
      status: {
        type: String,
        enum: ['completed', 'pending', 'cancelled', 'returned_partial', 'returned_full'],
        default: 'completed',
      },
      returnInfo: [
        {
          productId: { type: objectId, ref: 'Product' },
          quantity: Number,
          reason: String,
          condition: { type: String, enum: ['Good', 'Damaged'], default: 'Good' },
          refundAmount: Number,
          date: { type: Date, default: Date.now },
        },
      ],
      notes: String,
      cashierId: { type: objectId, ref: 'User', required: true },
      reference: { type: String, sparse: true },
    },
    { timestamps: true }
  );

  const purchaseSchema = new mongoose.Schema(
    {
      purchaseNumber: { type: String, unique: true },
      supplierId: { type: objectId, ref: 'Supplier', required: true },
      items: [
        {
          productId: { type: objectId, ref: 'Product', required: true },
          productName: String,
          costPrice: { type: Number, required: true },
          quantity: { type: Number, required: true, min: 1 },
          subtotal: Number,
        },
      ],
      totalAmount: { type: Number, required: true, default: 0 },
      paidAmount: { type: Number, required: true, default: 0 },
      dueAmount: { type: Number, default: 0 },
      status: {
        type: String,
        enum: ['draft', 'completed', 'pending', 'cancelled'],
        default: 'completed',
      },
      paymentStatus: { type: String, enum: ['paid', 'partial', 'due'], default: 'paid' },
      notes: String,
      createdBy: { type: objectId, ref: 'User', required: true },
    },
    { timestamps: true }
  );

  const stockMovementSchema = new mongoose.Schema(
    {
      type: {
        type: String,
        enum: ['sale', 'purchase', 'return', 'adjustment', 'transfer_in', 'transfer_out'],
        required: true,
      },
      branchId: { type: objectId, index: true },
      productId: { type: objectId, ref: 'Product', required: true },
      quantity: { type: Number, required: true },
      previousStock: { type: Number, required: true },
      newStock: { type: Number, required: true },
      referenceId: { type: objectId },
      referenceModel: {
        type: String,
        enum: ['Sale', 'Purchase', 'StockTransfer', 'None'],
        default: 'None',
      },
      notes: String,
      performedBy: { type: objectId, ref: 'User', required: true },
    },
    { timestamps: true }
  );

  const stockTransferSchema = new mongoose.Schema(
    {
      transferNumber: { type: String, unique: true, required: true },
      fromBranchId: { type: objectId, required: true },
      toBranchId: { type: objectId, required: true },
      productId: { type: objectId, ref: 'Product', required: true },
      quantity: { type: Number, required: true, min: 1 },
      status: { type: String, enum: ['completed', 'cancelled'], default: 'completed' },
      notes: String,
      performedBy: { type: objectId, ref: 'User', required: true },
    },
    { timestamps: true }
  );

  const settingsSchema = new mongoose.Schema(
    {
      storeName: { type: String, required: true, default: 'MR Trading POS', trim: true },
      storeTagline: String,
      storeEmail: String,
      storePhone: String,
      storeAddress: String,
      logo: String,
      currency: { type: String, default: 'BDT' },
      currencySymbol: { type: String, default: '৳' },
      timezone: { type: String, default: 'Asia/Dhaka' },
      dateFormat: { type: String, default: 'DD/MM/YYYY' },
      defaultTaxRate: { type: Number, default: 0, min: 0, max: 100 },
      taxLabel: { type: String, default: 'VAT' },
      taxInclusive: { type: Boolean, default: false },
      taxEnabled: { type: Boolean, default: false },
      invoicePrefix: { type: String, default: 'INV' },
      invoiceFooter: { type: String, default: 'Thank you for your business!' },
      invoiceShowLogo: { type: Boolean, default: true },
      invoiceShowTax: { type: Boolean, default: true },
      invoiceShowCustomerInfo: { type: Boolean, default: true },
      globalLowStockThreshold: { type: Number, default: 5, min: 0 },
      autoLowStockAlert: { type: Boolean, default: true },
      features: {
        posEnabled: { type: Boolean, default: true },
        inventoryEnabled: { type: Boolean, default: true },
        suppliersEnabled: { type: Boolean, default: true },
        reportsEnabled: { type: Boolean, default: true },
        customersEnabled: { type: Boolean, default: true },
      },
    },
    { timestamps: true }
  );

  const auditLogSchema = new mongoose.Schema(
    {
      userId: { type: objectId, ref: 'User', required: true },
      userEmail: String,
      action: { type: String, required: true },
      module: {
        type: String,
        required: true,
        enum: [
          'sale',
          'product',
          'customer',
          'supplier',
          'purchase',
          'user',
          'settings',
          'inventory',
          'auth',
        ],
      },
      targetId: objectId,
      targetModel: String,
      changes: mongoose.Schema.Types.Mixed,
      ipAddress: String,
      userAgent: String,
      status: { type: String, enum: ['success', 'failure'], default: 'success' },
      notes: String,
    },
    { timestamps: true }
  );

  return {
    User: mongoose.models.User || mongoose.model('User', userSchema),
    Category: mongoose.models.Category || mongoose.model('Category', categorySchema),
    Subcategory: mongoose.models.Subcategory || mongoose.model('Subcategory', subcategorySchema),
    Brand: mongoose.models.Brand || mongoose.model('Brand', brandSchema),
    Product: mongoose.models.Product || mongoose.model('Product', productSchema),
    Customer: mongoose.models.Customer || mongoose.model('Customer', customerSchema),
    Supplier: mongoose.models.Supplier || mongoose.model('Supplier', supplierSchema),
    Sale: mongoose.models.Sale || mongoose.model('Sale', saleSchema),
    Purchase: mongoose.models.Purchase || mongoose.model('Purchase', purchaseSchema),
    StockMovement:
      mongoose.models.StockMovement || mongoose.model('StockMovement', stockMovementSchema),
    StockTransfer:
      mongoose.models.StockTransfer || mongoose.model('StockTransfer', stockTransferSchema),
    Settings: mongoose.models.Settings || mongoose.model('Settings', settingsSchema),
    AuditLog: mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema),
  };
};

const dbConnect = async () => {
  validateMongoUri();

  await mongoose.connect(MONGODB_URI, {
    bufferCommands: false,
    dbName: MONGODB_DB_NAME,
  });
  console.log('✓ Database connected successfully');
};

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const upsertOne = async (Model, filter, data) => {
  return Model.findOneAndUpdate(filter, { $set: data }, { new: true, upsert: true });
};

const makeSale = ({
  saleNumber,
  branchId,
  customerId,
  cashierId,
  items,
  discount = 0,
  taxPercent = 10,
  paymentMethod,
  paidAmount,
  status = 'completed',
  notes,
}) => {
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = Number(((subtotal - discount) * (taxPercent / 100)).toFixed(2));
  const total = Number((subtotal - discount + tax).toFixed(2));

  return {
    saleNumber,
    branchId,
    customerId,
    cashierId,
    items,
    subtotal,
    discount,
    discountPercent: 0,
    tax,
    taxPercent,
    total,
    paymentMethod,
    paidAmount,
    dueAmount: Number((total - paidAmount).toFixed(2)),
    status,
    notes,
    reference: `seed-${saleNumber}`,
  };
};

// ==================== Seed Data Structures ====================
const CATEGORIES = [
  {
    name: 'Refrigerators',
    description: 'Large home appliances for food storage and preservation',
  },
  {
    name: 'Air Conditioners',
    description: 'Cooling and air quality solutions for homes and offices',
  },
  {
    name: 'Washing Machines',
    description: 'Automatic and semi-automatic laundry solutions',
  },
  {
    name: 'Televisions',
    description: 'Smart and HD televisions for entertainment',
  },
  {
    name: 'Microwave Ovens',
    description: 'Quick heating and cooking appliances',
  },
  {
    name: 'Water Purifiers',
    description: 'Water filtration and purification systems',
  },
  {
    name: 'Kitchen Appliances',
    description: 'Small and large kitchen cooking appliances',
  },
  {
    name: 'Heating & Cooling',
    description: 'Heaters, coolers, and thermal appliances',
  },
];

const SUBCATEGORIES = [
  { name: 'French Door Refrigerator', category: 'Refrigerators' },
  { name: 'Double Door Refrigerator', category: 'Refrigerators' },
  { name: 'Side-by-Side Refrigerator', category: 'Refrigerators' },
  { name: 'Top Freezer Refrigerator', category: 'Refrigerators' },
  { name: 'Single Door Refrigerator', category: 'Refrigerators' },
  { name: 'Split Air Conditioner', category: 'Air Conditioners' },
  { name: 'Window Air Conditioner', category: 'Air Conditioners' },
  { name: 'Portable Air Conditioner', category: 'Air Conditioners' },
  { name: 'Inverter Air Conditioner', category: 'Air Conditioners' },
  { name: 'Front Load Washing Machine', category: 'Washing Machines' },
  { name: 'Top Load Washing Machine', category: 'Washing Machines' },
  { name: 'Semi-Automatic Washing Machine', category: 'Washing Machines' },
  { name: 'Fully Automatic Washing Machine', category: 'Washing Machines' },
  { name: 'LED Television', category: 'Televisions' },
  { name: 'Smart Television', category: 'Televisions' },
  { name: '4K Television', category: 'Televisions' },
  { name: 'Convection Microwave', category: 'Microwave Ovens' },
  { name: 'Solo Microwave', category: 'Microwave Ovens' },
  { name: 'Grill Microwave', category: 'Microwave Ovens' },
  { name: 'RO Water Purifier', category: 'Water Purifiers' },
  { name: 'UV Water Purifier', category: 'Water Purifiers' },
  { name: 'UF Water Purifier', category: 'Water Purifiers' },
  { name: 'Electric Cooker', category: 'Kitchen Appliances' },
  { name: 'Electric Kettle', category: 'Kitchen Appliances' },
  { name: 'Table Fan', category: 'Heating & Cooling' },
  { name: 'Pedestal Fan', category: 'Heating & Cooling' },
  { name: 'Ceiling Fan', category: 'Heating & Cooling' },
  { name: 'Room Heater', category: 'Heating & Cooling' },
];

const BRANDS = [
  { name: 'Samsung', description: 'South Korean electronics manufacturer' },
  { name: 'LG', description: 'South Korean consumer electronics company' },
  { name: 'Whirlpool', description: 'American appliance manufacturer' },
  { name: 'Godrej', description: 'Indian home appliance brand' },
  { name: 'Walton', description: 'Bangladeshi consumer electronics brand' },
  { name: 'Haier', description: 'Chinese appliance manufacturer' },
  { name: 'Bosch', description: 'German home appliance brand' },
  { name: 'Daikin', description: 'Japanese air conditioning specialist' },
  { name: 'Voltas', description: 'Indian cooling and HVAC solutions' },
  { name: 'Carrier', description: 'Global HVAC and appliance brand' },
  { name: 'IFB', description: 'Indian kitchen and laundry appliances' },
  { name: 'BPL', description: 'Indian consumer electronics company' },
  { name: 'Midea', description: 'Chinese appliance manufacturer' },
  { name: 'Panasonic', description: 'Japanese electronics corporation' },
];

const PRODUCTS_DATA = [
  // Refrigerators
  {
    name: 'Samsung French Door Refrigerator RF28R7201SR',
    category: 'Refrigerators',
    subcategory: 'French Door Refrigerator',
    brand: 'Samsung',
    barcode: '8806090850001',
    sku: 'SAM-REF-FD-28-SR',
    price: 185000,
    cost: 156000,
    stock: 8,
    minStock: 2,
    warranty: '2 Years',
    specifications: {
      capacity: '645L',
      energyRating: '5 Star',
      doorType: 'French Door',
      features: ['Twin Cooling', 'Digital Inverter', 'Water Dispenser'],
    },
  },
  {
    name: 'LG Double Door Refrigerator GN-B292SQCB',
    category: 'Refrigerators',
    subcategory: 'Double Door Refrigerator',
    brand: 'LG',
    barcode: '8806060870002',
    sku: 'LG-REF-DD-270-CB',
    price: 95000,
    cost: 78000,
    stock: 12,
    minStock: 3,
    warranty: '2 Years',
    specifications: {
      capacity: '270L',
      energyRating: '3 Star',
      doorType: 'Double Door',
      features: ['Inverter', 'Stabilizer Free Operation', 'Door Alarm'],
    },
  },
  {
    name: 'Godrej Single Door Refrigerator RD EDGEPRO 205D 43',
    category: 'Refrigerators',
    subcategory: 'Single Door Refrigerator',
    brand: 'Godrej',
    barcode: '8904008250001',
    sku: 'GDJ-REF-SD-205-43',
    price: 32000,
    cost: 26000,
    stock: 18,
    minStock: 5,
    warranty: '1 Year',
    specifications: {
      capacity: '205L',
      energyRating: '2 Star',
      doorType: 'Single Door',
      features: ['Direct Cool', 'Mechanical Control'],
    },
  },

  // Air Conditioners
  {
    name: 'Daikin Inverter Split AC FTKM50TV 1.8 Ton',
    category: 'Air Conditioners',
    subcategory: 'Split Air Conditioner',
    brand: 'Daikin',
    barcode: '4938604412003',
    sku: 'DAI-AC-SPLIT-1.8-TV',
    price: 78000,
    cost: 62000,
    stock: 6,
    minStock: 2,
    warranty: '3 Years',
    specifications: {
      tonnage: '1.8 Ton',
      starRating: '5 Star',
      type: 'Inverter Split',
      coolingCapacity: '6000 BTU',
      features: ['Inverter Technology', 'WiFi Control', 'Coanda Airflow'],
    },
  },
  {
    name: 'Voltas Window AC 1.5 Ton 153V',
    category: 'Air Conditioners',
    subcategory: 'Window Air Conditioner',
    brand: 'Voltas',
    barcode: '8904008250002',
    sku: 'VOL-AC-WIN-1.5-153',
    price: 35000,
    cost: 27000,
    stock: 10,
    minStock: 3,
    warranty: '1 Year',
    specifications: {
      tonnage: '1.5 Ton',
      starRating: '3 Star',
      type: 'Window',
      coolingCapacity: '5000 BTU',
      features: ['Energy Efficient', 'Quick Cool'],
    },
  },

  // Washing Machines
  {
    name: 'Samsung Fully Automatic Front Load WF90F5E6U4W',
    category: 'Washing Machines',
    subcategory: 'Front Load Washing Machine',
    brand: 'Samsung',
    barcode: '8806090850003',
    sku: 'SAM-WM-FL-9-U4W',
    price: 65000,
    cost: 52000,
    stock: 7,
    minStock: 2,
    warranty: '2 Years',
    specifications: {
      capacity: '9 Kg',
      loadType: 'Front Load',
      automation: 'Fully Automatic',
      starRating: '5 Star',
      features: ['Inverter Direct Drive', 'Auto Restart', 'Noise Reduction'],
    },
  },
  {
    name: 'IFB Fully Automatic Top Load SENATOR AQUA VX',
    category: 'Washing Machines',
    subcategory: 'Top Load Washing Machine',
    brand: 'IFB',
    barcode: '8904008250003',
    sku: 'IFB-WM-TL-7-VX',
    price: 38000,
    cost: 30000,
    stock: 9,
    minStock: 2,
    warranty: '2 Years',
    specifications: {
      capacity: '7 Kg',
      loadType: 'Top Load',
      automation: 'Fully Automatic',
      starRating: '4 Star',
      features: ['Dual Vortex Wash', 'Soft Care Technology'],
    },
  },
  {
    name: 'Walton Semi-Automatic Washing Machine WSDT-7000',
    category: 'Washing Machines',
    subcategory: 'Semi-Automatic Washing Machine',
    brand: 'Walton',
    barcode: '8906009700001',
    sku: 'WAL-WM-SA-6.5',
    price: 14500,
    cost: 11000,
    stock: 16,
    minStock: 4,
    warranty: '1 Year',
    specifications: {
      capacity: '6.5 Kg',
      loadType: 'Top Load',
      automation: 'Semi-Automatic',
      features: ['Dual Barrel', 'Reinforced Plastic'],
    },
  },

  // Televisions
  {
    name: 'Samsung 55 inch 4K Smart TV UA55AU8000K',
    category: 'Televisions',
    subcategory: '4K Television',
    brand: 'Samsung',
    barcode: '8806090850004',
    sku: 'SAM-TV-55-4K-K',
    price: 125000,
    cost: 98000,
    stock: 5,
    minStock: 1,
    warranty: '2 Years',
    specifications: {
      screenSize: '55 inch',
      resolution: '4K Ultra HD',
      type: 'Smart TV',
      panelType: 'UHD',
      features: ['HDR', 'Smart Hub', 'Voice Assistant', 'Gaming Hub'],
    },
  },
  {
    name: 'LG 43 inch Full HD Smart TV 43LQ575BPTC',
    category: 'Televisions',
    subcategory: 'Smart Television',
    brand: 'LG',
    barcode: '8806060870003',
    sku: 'LG-TV-43-FHD-TC',
    price: 38000,
    cost: 29500,
    stock: 8,
    minStock: 2,
    warranty: '1 Year',
    specifications: {
      screenSize: '43 inch',
      resolution: 'Full HD',
      type: 'Smart TV',
      panelType: 'IPS',
      features: ['webOS', 'WiFi', 'HDMI 2.0'],
    },
  },

  // Microwave Ovens
  {
    name: 'Samsung 23L Convection Microwave MC23A5013CV',
    category: 'Microwave Ovens',
    subcategory: 'Convection Microwave',
    brand: 'Samsung',
    barcode: '8806090850005',
    sku: 'SAM-MW-CONV-23-CV',
    price: 18000,
    cost: 13500,
    stock: 14,
    minStock: 3,
    warranty: '1 Year',
    specifications: {
      capacity: '23L',
      type: 'Convection',
      power: '800W',
      features: ['Auto Cook', 'Defrost', 'Convection Mode'],
    },
  },

  // Water Purifiers
  {
    name: 'Godrej Edge Pro RO+UV Water Purifier GWEDSXEWQT',
    category: 'Water Purifiers',
    subcategory: 'RO Water Purifier',
    brand: 'Godrej',
    barcode: '8904008250004',
    sku: 'GDJ-WP-RO-UV-PRO',
    price: 28000,
    cost: 21000,
    stock: 11,
    minStock: 3,
    warranty: '1 Year',
    specifications: {
      purificationType: 'RO + UV',
      capacity: '7L',
      purificationProcess: 'Multi-Stage',
      features: ['Mineral RO', 'UV Protection', 'TDS Control'],
    },
  },

  // Kitchen Appliances
  {
    name: 'Walton Electric Cooker 2.0L WRC-20U0',
    category: 'Kitchen Appliances',
    subcategory: 'Electric Cooker',
    brand: 'Walton',
    barcode: '8906009700002',
    sku: 'WAL-COOKER-2.0-U0',
    price: 5600,
    cost: 4200,
    stock: 25,
    minStock: 5,
    warranty: '1 Year',
    specifications: {
      capacity: '2.0L',
      power: '700W',
      features: ['Automatic Temperature Control', 'Portable'],
    },
  },

  // Fans
  {
    name: 'Walton Table Fan 12 Inch RFTF-12AD',
    category: 'Heating & Cooling',
    subcategory: 'Table Fan',
    brand: 'Walton',
    barcode: '8906009700003',
    sku: 'WAL-FAN-TABLE-12',
    price: 2890,
    cost: 2300,
    stock: 20,
    minStock: 5,
    warranty: '1 Year',
    specifications: {
      bladeSize: '12 inch',
      type: 'Table Fan',
      power: '55W',
      features: ['3-Speed Control', 'Oscillation'],
    },
  },
  {
    name: 'Havells Pedestal Fan Vitals Air 400mm',
    category: 'Heating & Cooling',
    subcategory: 'Pedestal Fan',
    brand: 'BPL',
    barcode: '8904000250001',
    sku: 'HAV-FAN-PEDS-400',
    price: 4200,
    cost: 3200,
    stock: 15,
    minStock: 3,
    warranty: '1 Year',
    specifications: {
      bladeSize: '400mm',
      type: 'Pedestal',
      power: '55W',
      features: ['3-Speed', 'Height Adjustable', 'Tilting Head'],
    },
  },
];

const SUPPLIERS_DATA = [
  {
    supplierCode: 'SUP-MAJOR-001',
    name: 'Major Appliance Wholesale Ltd',
    contactPerson: 'Karim Hassan',
    email: 'sales@majorappliance.test',
    phone: '01712345678',
    address: 'Block C, Gulshan Business Complex, Dhaka',
    city: 'Dhaka',
    creditLimit: 2000000,
    rating: 5,
    notes: 'Primary supplier for major appliances',
  },
  {
    supplierCode: 'SUP-COOLING-001',
    name: 'Cooling Solutions Bangladesh',
    contactPerson: 'Nasir Uddin',
    email: 'supply@coolingsol.test',
    phone: '01867654321',
    address: 'Kawran Bazar, Dhaka',
    city: 'Dhaka',
    creditLimit: 1500000,
    rating: 5,
    notes: 'Specializes in AC and cooling appliances',
  },
  {
    supplierCode: 'SUP-ELECTRO-001',
    name: 'Electronics Import Traders',
    contactPerson: 'Fatima Begum',
    email: 'imports@electrotrader.test',
    phone: '01512121212',
    address: 'Motijheel, Dhaka',
    city: 'Dhaka',
    creditLimit: 1800000,
    rating: 4,
    notes: 'Import and distribution of home electronics',
  },
  {
    supplierCode: 'SUP-LOCAL-001',
    name: 'Local Manufacturing Co-op',
    contactPerson: 'Ahmed Siddiqui',
    email: 'orders@localmanufact.test',
    phone: '01666666666',
    address: 'Ashulia, Dhaka',
    city: 'Dhaka',
    creditLimit: 800000,
    rating: 4,
    notes: 'Local appliance manufacturer',
  },
];

const CUSTOMERS_DATA = [
  {
    customerCode: 'CUS-RETAIL-001',
    name: 'Walk-in Retail Customer',
    email: 'retail@mrtrade.local',
    phone: '01700000000',
    address: 'Store Counter',
    city: 'Dhaka',
    gender: 'Other',
    notes: 'Default walk-in customer for retail transactions',
  },
  {
    customerCode: 'CUS-DEALER-001',
    name: 'Prime Electronics Dealer',
    email: 'dealer@primeelectro.test',
    phone: '01811111111',
    address: 'Gulshan Market, Dhaka',
    city: 'Dhaka',
    gender: 'Male',
    notes: 'Major dealer account',
  },
  {
    customerCode: 'CUS-HOTEL-001',
    name: 'Grand Hotel Group',
    email: 'procurement@grandhotel.test',
    phone: '01922222222',
    address: 'Hotel Complex, Dhanmondi',
    city: 'Dhaka',
    gender: 'Other',
    notes: 'Corporate bulk buyer',
  },
  {
    customerCode: 'CUS-RESTAURANT-001',
    name: 'Modern Restaurant Chain',
    email: 'supplies@modernrest.test',
    phone: '01833333333',
    address: 'Mirpur, Dhaka',
    city: 'Dhaka',
    gender: 'Other',
    notes: 'Restaurant equipment buyer',
  },
];

// ==================== Main Seed Function ====================
const seed = async () => {
  const {
    User,
    Category,
    Subcategory,
    Brand,
    Product,
    Customer,
    Supplier,
    Sale,
    Purchase,
    StockMovement,
    StockTransfer,
    Settings,
    AuditLog,
  } = defineModels();

  await dbConnect();

  console.log('🌱 Starting comprehensive electronics store database seed...\n');

  // ==================== Seed Users ====================
  console.log('👥 Seeding users...');
  const defaultBranchId = new mongoose.Types.ObjectId('64f000000000000000000001');
  const password = await hashPassword('demo123');
  const [adminUser, managerUser, cashierUser] = await Promise.all([
    upsertOne(
      User,
      { email: 'admin@mrtrade.com' },
      {
        email: 'admin@mrtrade.com',
        password,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        branchId: defaultBranchId,
        branchRoles: [{ branchId: defaultBranchId, role: 'manager' }],
        isActive: true,
      }
    ),
    upsertOne(
      User,
      { email: 'manager@mrtrade.com' },
      {
        email: 'manager@mrtrade.com',
        password,
        firstName: 'Manager',
        lastName: 'User',
        role: 'manager',
        branchId: defaultBranchId,
        branchRoles: [{ branchId: defaultBranchId, role: 'manager' }],
        isActive: true,
      }
    ),
    upsertOne(
      User,
      { email: 'cashier@mrtrade.com' },
      {
        email: 'cashier@mrtrade.com',
        password,
        firstName: 'Cashier',
        lastName: 'User',
        role: 'cashier',
        branchId: defaultBranchId,
        branchRoles: [{ branchId: defaultBranchId, role: 'cashier' }],
        isActive: true,
      }
    ),
  ]);

  // ==================== Seed Categories ====================
  console.log('📂 Seeding categories...');
  const categories = {};
  for (const cat of CATEGORIES) {
    categories[cat.name] = await upsertOne(
      Category,
      { name: cat.name },
      {
        name: cat.name,
        description: cat.description,
        isActive: true,
      }
    );
  }

  // ==================== Seed Subcategories ====================
  console.log('📋 Seeding subcategories...');
  const subcategories = {};
  for (const subcat of SUBCATEGORIES) {
    const key = `${subcat.name}-${subcat.category}`;
    subcategories[key] = await upsertOne(
      Subcategory,
      { name: subcat.name, category: categories[subcat.category]._id },
      {
        name: subcat.name,
        category: categories[subcat.category]._id,
        description: `${subcat.name} products and solutions`,
        isActive: true,
      }
    );
  }

  // ==================== Seed Brands ====================
  console.log('🏢 Seeding brands...');
  const brands = {};
  for (const brand of BRANDS) {
    brands[brand.name] = await upsertOne(
      Brand,
      { name: brand.name },
      {
        name: brand.name,
        description: brand.description,
        isActive: true,
      }
    );
  }

  // ==================== Seed Products ====================
  console.log('📦 Seeding products...');
  const products = {};
  for (const product of PRODUCTS_DATA) {
    const key = product.sku;
    const subcatKey = `${product.subcategory}-${product.category}`;
    products[key] = await upsertOne(
      Product,
      { sku: product.sku, branchId: defaultBranchId },
      {
        name: product.name,
        branchId: defaultBranchId,
        category: categories[product.category]._id,
        subcategory: subcategories[subcatKey]._id,
        brand: brands[product.brand]._id,
        barcode: product.barcode,
        sku: product.sku,
        price: product.price,
        cost: product.cost,
        stock: product.stock,
        minStock: product.minStock,
        warranty: product.warranty,
        specifications: product.specifications,
        description: `Professional grade ${product.name} - Quality appliance for home/commercial use`,
        defectiveStock: 0,
        isActive: true,
      }
    );
  }

  // ==================== Seed Customers ====================
  console.log('👨‍💼 Seeding customers...');
  const customers = {};
  for (const cust of CUSTOMERS_DATA) {
    customers[cust.customerCode] = await upsertOne(
      Customer,
      { customerCode: cust.customerCode, branchId: defaultBranchId },
      {
        ...cust,
        branchId: defaultBranchId,
        lastPurchaseDate: new Date(),
        isActive: true,
      }
    );
  }

  // ==================== Seed Suppliers ====================
  console.log('🚚 Seeding suppliers...');
  const suppliers = {};
  for (const supp of SUPPLIERS_DATA) {
    suppliers[supp.supplierCode] = await upsertOne(
      Supplier,
      { supplierCode: supp.supplierCode },
      {
        ...supp,
        lastTransactionDate: new Date(),
        isActive: true,
      }
    );
  }

  // ==================== Seed Purchases ====================
  console.log('📥 Seeding purchases...');
  const purchaseItems = [
    { sku: 'SAM-REF-FD-28-SR', quantity: 4 },
    { sku: 'LG-REF-DD-270-CB', quantity: 6 },
    { sku: 'GDJ-REF-SD-205-43', quantity: 8 },
    { sku: 'DAI-AC-SPLIT-1.8-TV', quantity: 3 },
    { sku: 'SAM-WM-FL-9-U4W', quantity: 5 },
  ].map(({ sku, quantity }) => {
    const product = products[sku];
    return {
      productId: product._id,
      productName: product.name,
      costPrice: product.cost,
      quantity,
      subtotal: product.cost * quantity,
    };
  });

  const purchaseTotal = purchaseItems.reduce((sum, item) => sum + item.subtotal, 0);

  const purchase = await upsertOne(
    Purchase,
    { purchaseNumber: 'PO-ELECTRONICS-001' },
    {
      purchaseNumber: 'PO-ELECTRONICS-001',
      supplierId: suppliers['SUP-MAJOR-001']._id,
      items: purchaseItems,
      totalAmount: purchaseTotal,
      paidAmount: purchaseTotal * 0.7,
      dueAmount: purchaseTotal * 0.3,
      status: 'completed',
      paymentStatus: 'partial',
      notes: 'Initial stock purchase for electronics store',
      createdBy: adminUser._id,
    }
  );

  // ==================== Seed Sales ====================
  console.log('💰 Seeding sales...');
  const sale1 = makeSale({
    saleNumber: 'INV-ELC-001',
    branchId: defaultBranchId,
    customerId: customers['CUS-DEALER-001']._id,
    cashierId: cashierUser._id,
    items: [
      {
        productId: products['SAM-WM-FL-9-U4W']._id,
        productName: products['SAM-WM-FL-9-U4W'].name,
        price: 65000,
        quantity: 1,
        subtotal: 65000,
      },
      {
        productId: products['DAI-AC-SPLIT-1.8-TV']._id,
        productName: products['DAI-AC-SPLIT-1.8-TV'].name,
        price: 78000,
        quantity: 1,
        subtotal: 78000,
      },
    ],
    discount: 5000,
    paymentMethod: 'card',
    paidAmount: 145600,
    notes: 'Dealer bulk purchase',
  });

  const sale2 = makeSale({
    saleNumber: 'INV-ELC-002',
    branchId: defaultBranchId,
    customerId: customers['CUS-HOTEL-001']._id,
    cashierId: managerUser._id,
    items: [
      {
        productId: products['LG-REF-DD-270-CB']._id,
        productName: products['LG-REF-DD-270-CB'].name,
        price: 95000,
        quantity: 2,
        subtotal: 190000,
      },
      {
        productId: products['GDJ-WP-RO-UV-PRO']._id,
        productName: products['GDJ-WP-RO-UV-PRO'].name,
        price: 28000,
        quantity: 3,
        subtotal: 84000,
      },
    ],
    discount: 10000,
    paymentMethod: 'cheque',
    paidAmount: 280400,
    notes: 'Corporate hotel equipment purchase',
  });

  const [savedSale1, savedSale2] = await Promise.all([
    upsertOne(Sale, { saleNumber: sale1.saleNumber }, sale1),
    upsertOne(Sale, { saleNumber: sale2.saleNumber }, sale2),
  ]);

  // ==================== Seed Stock Movements ====================
  console.log('📊 Seeding stock movements...');
  const movementData = [
    ...purchaseItems.map((item) => ({
      type: 'purchase',
      branchId: defaultBranchId,
      productId: item.productId,
      quantity: item.quantity,
      previousStock: 0,
      newStock: item.quantity,
      referenceId: purchase._id,
      referenceModel: 'Purchase',
      performedBy: adminUser._id,
      notes: 'Seed purchase stock movement',
    })),
    ...savedSale1.items.map((item) => ({
      type: 'sale',
      branchId: defaultBranchId,
      productId: item.productId,
      quantity: -item.quantity,
      previousStock: 10,
      newStock: 10 - item.quantity,
      referenceId: savedSale1._id,
      referenceModel: 'Sale',
      performedBy: savedSale1.cashierId,
      notes: 'Seed sale stock movement',
    })),
    ...savedSale2.items.map((item) => ({
      type: 'sale',
      branchId: defaultBranchId,
      productId: item.productId,
      quantity: -item.quantity,
      previousStock: 10,
      newStock: 10 - item.quantity,
      referenceId: savedSale2._id,
      referenceModel: 'Sale',
      performedBy: savedSale2.cashierId,
      notes: 'Seed sale stock movement',
    })),
  ];
  await StockMovement.insertMany(movementData);

  // ==================== Seed Settings ====================
  console.log('⚙️ Seeding settings...');
  await upsertOne(
    Settings,
    { storeName: 'MR Trading Electronics' },
    {
      storeName: 'MR Trading Electronics',
      storeTagline: 'Premium Home & Commercial Appliances',
      storeEmail: 'support@mrtradeelectro.com',
      storePhone: '+8801711000001',
      storeAddress: 'Gulshan Electronics Market, Plot 10, Dhaka',
      currency: 'BDT',
      currencySymbol: '৳',
      timezone: 'Asia/Dhaka',
      dateFormat: 'DD/MM/YYYY',
      defaultTaxRate: Number(process.env.STORE_TAX_RATE || 10),
      taxLabel: 'VAT',
      taxInclusive: false,
      taxEnabled: true,
      invoicePrefix: 'INV',
      invoiceFooter: 'Thank you for choosing MR Trading Electronics!',
      invoiceShowLogo: true,
      invoiceShowTax: true,
      invoiceShowCustomerInfo: true,
      globalLowStockThreshold: 3,
      autoLowStockAlert: true,
      features: {
        posEnabled: true,
        inventoryEnabled: true,
        suppliersEnabled: true,
        reportsEnabled: true,
        customersEnabled: true,
      },
    }
  );

  // ==================== Seed Audit Logs ====================
  console.log('📝 Seeding audit logs...');
  await AuditLog.deleteMany({ notes: /^Seed / });
  await AuditLog.insertMany([
    {
      userId: adminUser._id,
      userEmail: adminUser.email,
      action: 'SEED_DATABASE',
      module: 'settings',
      status: 'success',
      notes: 'Seed electronics store database initialized',
    },
    {
      userId: adminUser._id,
      userEmail: adminUser.email,
      action: 'CREATE_PURCHASE',
      module: 'purchase',
      targetId: purchase._id,
      targetModel: 'Purchase',
      status: 'success',
      notes: 'Seed initial purchase order',
    },
  ]);

  // ==================== Print Summary ====================
  console.log('\n✅ Seed completed successfully!\n');

  const counts = await Promise.all([
    User.countDocuments(),
    Category.countDocuments(),
    Subcategory.countDocuments(),
    Brand.countDocuments(),
    Product.countDocuments(),
    Customer.countDocuments(),
    Supplier.countDocuments(),
    Purchase.countDocuments(),
    Sale.countDocuments(),
    StockMovement.countDocuments(),
  ]);

  console.log('📊 Database Summary:');
  console.table({
    users: counts[0],
    categories: counts[1],
    subcategories: counts[2],
    brands: counts[3],
    products: counts[4],
    customers: counts[5],
    suppliers: counts[6],
    purchases: counts[7],
    sales: counts[8],
    stockMovements: counts[9],
  });

  console.log('\n🔐 Demo Credentials:');
  console.log('   Email: admin@mrtrade.com');
  console.log('   Password: demo123\n');
};

seed()
  .catch((error) => {
    console.error('✗ Seed error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
