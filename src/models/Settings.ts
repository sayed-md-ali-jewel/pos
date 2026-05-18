import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    // Store Identity
    storeName: {
      type: String,
      required: true,
      default: 'MR Trading POS',
      trim: true,
    },
    storeTagline: {
      type: String,
      trim: true,
    },
    storeEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    storePhone: {
      type: String,
      trim: true,
    },
    storeAddress: {
      type: String,
      trim: true,
    },
    logo: {
      type: String, // URL / path
    },

    // Currency & Locale
    currency: {
      type: String,
      default: 'BDT',
    },
    currencySymbol: {
      type: String,
      default: '৳',
    },
    timezone: {
      type: String,
      default: 'Asia/Dhaka',
    },
    dateFormat: {
      type: String,
      default: 'DD/MM/YYYY',
    },

    // Tax Engine
    defaultTaxRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    taxLabel: {
      type: String,
      default: 'VAT',
      trim: true,
    },
    taxInclusive: {
      type: Boolean,
      default: false, // false = exclusive (added on top), true = inclusive (already in price)
    },
    taxEnabled: {
      type: Boolean,
      default: false,
    },

    // Invoice Settings
    invoicePrefix: {
      type: String,
      default: 'INV',
      trim: true,
    },
    invoiceFooter: {
      type: String,
      default: 'Thank you for your business!',
      trim: true,
    },
    invoiceShowLogo: {
      type: Boolean,
      default: true,
    },
    invoiceShowTax: {
      type: Boolean,
      default: true,
    },
    invoiceShowCustomerInfo: {
      type: Boolean,
      default: true,
    },

    // Inventory Thresholds
    globalLowStockThreshold: {
      type: Number,
      default: 5,
      min: 0,
    },
    autoLowStockAlert: {
      type: Boolean,
      default: true,
    },

    // Backup & Storage
    backup: {
      enabled: {
        type: Boolean,
        default: false,
      },
      mode: {
        type: String,
        enum: ['manual', 'automatic'],
        default: 'manual',
      },
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
        default: 'daily',
      },
      targets: {
        local: {
          type: Boolean,
          default: true,
        },
        database: {
          type: Boolean,
          default: true,
        },
        email: {
          type: Boolean,
          default: false,
        },
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
      },
    },

    // Feature Flags
    features: {
      posEnabled: { type: Boolean, default: true },
      inventoryEnabled: { type: Boolean, default: true },
      suppliersEnabled: { type: Boolean, default: true },
      reportsEnabled: { type: Boolean, default: true },
      customersEnabled: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
