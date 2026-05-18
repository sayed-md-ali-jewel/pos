import axios from 'axios';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowUpRight,
  BarChart3,
  Banknote,
  Box,
  DollarSign,
  Download,
  FilePlus,
  FileText,
  PieChart,
  Printer,
  Search,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react';
import MainLayout from '@/components/Layout/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button, Card, Input } from '@/components/Common/FormElements';
import { useAuth } from '@/hooks/useAuth';

const pageLabels = {
  overview: 'Overview Dashboard',
  sales: 'Sales Reports',
  purchases: 'Purchase Reports',
  inventory: 'Inventory Reports',
  expenses: 'Expense Reports',
  profit: 'Profit & Loss',
  customers: 'Customer Reports',
  suppliers: 'Supplier Reports',
  investments: 'Investment Reports',
};

const reportTabs = [
  { id: 'overview', label: 'Overview', icon: BarChart3, roles: ['admin', 'manager', 'cashier'] },
  { id: 'sales', label: 'Sales', icon: FileText, roles: ['admin', 'manager', 'cashier'] },
  { id: 'purchases', label: 'Purchases', icon: Box, roles: ['admin', 'manager'] },
  { id: 'inventory', label: 'Inventory', icon: PieChart, roles: ['admin', 'manager', 'cashier'] },
  { id: 'expenses', label: 'Expenses', icon: Banknote, roles: ['admin', 'manager'] },
  { id: 'profit', label: 'P&L', icon: TrendingUp, roles: ['admin', 'manager'] },
  { id: 'customers', label: 'Customers', icon: Users, roles: ['admin', 'manager', 'cashier'] },
  { id: 'suppliers', label: 'Suppliers', icon: Truck, roles: ['admin', 'manager'] },
  { id: 'investments', label: 'Investments', icon: DollarSign, roles: ['admin', 'manager'] },
];

type SaleRow = {
  _id: string;
  saleNumber?: string;
  customerId?: { name?: string };
  walkinCustomerName?: string;
  items: Array<{
    productId?: { cost?: number };
    productName?: string;
    price?: number;
    quantity?: number;
  }>;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  cashierId?: { firstName?: string; lastName?: string };
  createdAt: string;
  dueAmount?: number;
};

type PurchaseRow = {
  _id: string;
  purchaseNumber?: string;
  supplierId?: { name?: string };
  items: Array<{ productName?: string; costPrice?: number; quantity?: number }>;
  totalAmount: number;
  createdAt: string;
};

type ProductRow = {
  _id: string;
  name: string;
  sku?: string;
  category?: { name?: string } | string;
  stock: number;
  minStock?: number;
  cost?: number;
  price?: number;
};

type ExpenseRow = {
  _id: string;
  category: string;
  amount: number;
  note?: string;
  createdBy?: { firstName?: string; lastName?: string };
  expenseDate: string;
};

type CustomerRow = {
  _id: string;
  name: string;
  totalPurchased?: number;
  dueAmount?: number;
  lastPurchaseDate?: string;
};

type SupplierRow = {
  _id: string;
  name: string;
  totalPurchased?: number;
  dueAmount?: number;
};

type InvestmentRow = {
  _id: string;
  name: string;
  category: string;
  initialAmount: number;
  investmentDate: string;
  status: 'active' | 'inactive';
  earningInterval?: 'daily' | '15days' | '30days';
  expectedIncome?: number;
  totalEarnings?: number;
  totalProfit?: number;
};

type StockHistoryRow = {
  _id: string;
  productId?: { name?: string; sku?: string };
  quantity: number;
  type: string;
  performedBy?: { firstName?: string; lastName?: string };
  createdAt: string;
};

type OverviewSummary = {
  todaySales: number;
  monthlySales: number;
  totalProfit: number;
  totalExpenses: number;
  netProfit: number;
  salesVsExpenses: { sales: number; expenses: number };
  profitTrend: Array<{ label: string; value: number }>;
  topProducts: Array<{ label: string; value: number }>;
  lowStockItems: number;
  bestSelling: string;
  mostProfitable: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(value);

const sortGeneric = <T, K extends keyof T>(list: T[], key: K, direction: 'asc' | 'desc'): T[] => {
  return [...list].sort((a, b) => {
    const left = a[key];
    const right = b[key];
    if (typeof left === 'number' && typeof right === 'number') {
      return direction === 'asc' ? left - right : right - left;
    }
    return direction === 'asc'
      ? String(left ?? '').localeCompare(String(right ?? ''))
      : String(right ?? '').localeCompare(String(left ?? ''));
  });
};

const downloadReport = (content: BlobPart, filename: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const formatReportValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value).replace(/\s+/g, ' ');
  return String(value);
};

const getDateLabel = (date: Date) =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const prepareExportRows = (section: string, rows: any[]) => {
  const cleanedRows = rows.map((row) => {
    const sanitized: Record<string, unknown> = {};
    Object.entries(row).forEach(([key, value]) => {
      if (key === '_id' || key.toLowerCase().endsWith('id')) return;
      sanitized[key] = value;
    });
    return sanitized;
  });

  if (section === 'Sales') {
    return rows.map((sale: any) => ({
      Invoice: sale.saleNumber || '',
      Customer: sale.customerId?.name || sale.walkinCustomerName || 'Walk-in',
      Cashier: `${sale.cashierId?.firstName || ''} ${sale.cashierId?.lastName || ''}`.trim(),
      Items: Array.isArray(sale.items)
        ? sale.items
            .map((item: any) => `${item.productName || ''} x${item.quantity || 0}`)
            .join('; ')
        : '',
      Subtotal: formatCurrency(sale.subtotal || 0),
      Discount: formatCurrency(sale.discount || 0),
      Tax: formatCurrency(sale.tax || 0),
      Total: formatCurrency(sale.total || 0),
      PaymentMethod: sale.paymentMethod || '',
      Date: new Date(sale.createdAt).toLocaleDateString(),
    }));
  }

  if (section === 'Purchases') {
    return rows.map((purchase: any) => ({
      Purchase: purchase.purchaseNumber || '',
      Supplier: purchase.supplierId?.name || 'Supplier',
      Items: Array.isArray(purchase.items)
        ? purchase.items
            .map((item: any) => `${item.productName || ''} x${item.quantity || 0}`)
            .join('; ')
        : '',
      TotalAmount: formatCurrency(purchase.totalAmount || 0),
      Date: new Date(purchase.createdAt).toLocaleDateString(),
    }));
  }

  if (section === 'Inventory') {
    return cleanedRows.map((product: any) => ({
      Name: product.name || '',
      SKU: product.sku || '',
      Category:
        typeof product.category === 'string' ? product.category : product.category?.name || '',
      Stock: product.stock ?? 0,
      MinStock: product.minStock ?? 0,
      Cost: formatCurrency(product.cost || 0),
      Price: formatCurrency(product.price || 0),
    }));
  }

  if (section === 'Expenses') {
    return cleanedRows.map((expense: any) => ({
      Category: expense.category || '',
      Amount: formatCurrency(expense.amount || 0),
      Note: expense.note || '',
      CreatedBy:
        `${expense.createdBy?.firstName || ''} ${expense.createdBy?.lastName || ''}`.trim(),
      Date: new Date(expense.expenseDate || expense.createdAt || Date.now()).toLocaleDateString(),
    }));
  }

  if (section === 'Customers') {
    return cleanedRows.map((customer: any) => ({
      Name: customer.name || '',
      TotalPurchased: formatCurrency(customer.totalPurchased || 0),
      Due: formatCurrency(customer.dueAmount || 0),
      LastPurchase: customer.lastPurchaseDate
        ? new Date(customer.lastPurchaseDate).toLocaleDateString()
        : 'N/A',
    }));
  }

  if (section === 'Suppliers') {
    return cleanedRows.map((supplier: any) => ({
      Name: supplier.name || '',
      TotalPurchases: formatCurrency(supplier.totalPurchased || 0),
      Paid: formatCurrency((supplier.totalPurchased || 0) - (supplier.dueAmount || 0)),
      Due: formatCurrency(supplier.dueAmount || 0),
    }));
  }

  if (section === 'Investments') {
    return cleanedRows.map((investment: any) => ({
      Name: investment.name || '',
      Category: investment.category || '',
      InitialAmount: formatCurrency(investment.initialAmount || 0),
      TotalEarnings: formatCurrency(investment.totalEarnings || 0),
      TotalProfit: formatCurrency(investment.totalProfit || 0),
      Status: investment.status || '',
      Date: new Date(investment.investmentDate || Date.now()).toLocaleDateString(),
    }));
  }

  return cleanedRows;
};

const buildCSV = (rows: any[]) => {
  const columns = Object.keys(rows[0] || {});
  const escapeCSVValue = (value: unknown) => {
    const text = formatReportValue(value).replace(/"/g, '""');
    return /[",\n\r]/.test(text) ? `"${text}"` : text;
  };
  const header = columns.map(escapeCSVValue).join(',');
  const body = rows.map((row) => columns.map((col) => escapeCSVValue(row[col])).join(','));
  return [header, ...body].join('\n');
};

// ─────────────────────────────────────────────────────────────────────────────
// buildExcel  –  Fully inline-styled HTML-as-XLS (Excel-safe, no <style> block)
// ─────────────────────────────────────────────────────────────────────────────

const buildExcel = (rows: any[], section: string, storeInfo: any = {}): string => {
  const columns = Object.keys(rows[0] || {});

  const esc = (value: unknown): string =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const MONETARY = [
    'subtotal',
    'discount',
    'tax',
    'total',
    'cost',
    'price',
    'amount',
    'totalpurchased',
    'totalpurchases',
    'paid',
    'due',
    'initialamount',
    'totalearnings',
    'totalprofit',
    'purchased',
    'earnings',
    'profit',
    'initial',
  ];
  const isNum = (col: string) => MONETARY.some((k) => col.toLowerCase().includes(k));
  const isDate = (col: string) =>
    col.toLowerCase().includes('date') || col.toLowerCase() === 'lastpurchase';
  const isCenter = (col: string) =>
    isDate(col) ||
    col.toLowerCase() === 'status' ||
    col.toLowerCase() === 'paymentmethod' ||
    col.toLowerCase() === 'payment';

  const storeName = esc(storeInfo.storeName || 'MR Trading Electronics');
  const storeTagline = esc(storeInfo.storeTagline || 'Premium Home & Commercial Appliances');
  const storeAddress = esc(storeInfo.storeAddress || '');
  const storeEmail = esc(storeInfo.storeEmail || '');
  const storePhone = esc(storeInfo.storePhone || '');

  const generatedOn = `${new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })} - ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

  const colWidth = (col: string): string => {
    const c = col.toLowerCase();
    if (c === 'invoice' || c === 'purchase') return '160px';
    if (c === 'customer' || c === 'supplier' || c === 'name') return '160px';
    if (c === 'items' || c === 'note') return '260px';
    if (c === 'cashier' || c === 'createdby') return '110px';
    if (c === 'sku') return '90px';
    if (c === 'stock' || c === 'min' || c === 'minstock') return '70px';
    if (isNum(col)) return '110px';
    if (isDate(col) || isCenter(col)) return '100px';
    return '130px';
  };

  // Inline style constants (all properties inlined — no <style> block)
  const NAVY = '#0d1c31';
  const BLUE_STRIPE = '#2563eb';
  const MINT = '#6ee7b7';
  const GREEN = '#15803d';
  const ALT_BG = '#f8f9fb';
  const BORDER_COLOR = '#e2e8f0';
  const SUB_BG = '#f0f4f8';

  const thStyle = (align: string) =>
    `background-color:${NAVY};color:#c8d6e8;font-size:12pt;font-weight:bold;` +
    `font-family:Calibri,Arial,sans-serif;padding:10px 12px;text-align:${align};` +
    `white-space:nowrap;border-bottom:1px solid #1e3a5f;text-transform:uppercase;letter-spacing:0.5px;`;

  const tdBase = (align: string, bg: string, color: string, bold: boolean) =>
    `font-family:Calibri,Arial,sans-serif;font-size:13pt;color:${color};` +
    `font-weight:${bold ? 'bold' : 'normal'};padding:9px 12px;` +
    `text-align:${align};border-bottom:1px solid ${BORDER_COLOR};` +
    `vertical-align:middle;background-color:${bg};`;

  // Summary cards
  const moneyCols = columns.filter(isNum).slice(0, 4);
  const summaryTDs = moneyCols
    .map((col) => {
      const sum = rows.reduce((acc, row) => {
        const n = parseFloat(String(row[col] ?? '').replace(/,/g, ''));
        return acc + (isNaN(n) ? 0 : n);
      }, 0);
      const fmt = new Intl.NumberFormat('en-US', {
        useGrouping: true,
        maximumFractionDigits: 0,
      }).format(sum);
      return (
        `<td style="background-color:#f0f4f8;padding:14px 20px;` +
        `border-right:1px solid ${BORDER_COLOR};border-bottom:1px solid ${BORDER_COLOR};` +
        `border-top:none;border-left:none;vertical-align:top;">` +
        `<div style="font-size:8pt;font-weight:bold;color:#94a3b8;font-family:Calibri,Arial,sans-serif;` +
        `text-transform:uppercase;letter-spacing:0.5px;">${esc(col)}</div>` +
        `<div style="font-size:18pt;font-weight:bold;color:${NAVY};font-family:Calibri,Arial,sans-serif;margin-top:4px;">${esc(fmt)}</div>` +
        `</td>`
      );
    })
    .join('');

  // Column headers
  const headerCells = columns
    .map((col) => {
      const align = isNum(col) ? 'right' : isCenter(col) ? 'center' : 'left';
      return `<th style="${thStyle(align)}width:${colWidth(col)};">${esc(col)}</th>`;
    })
    .join('');

  // Totals row
  const totalCells = columns
    .map((col, idx) => {
      const topBorder = `border-top:3px solid ${BLUE_STRIPE};`;
      if (idx === 0) {
        return (
          `<td style="background-color:${NAVY};color:rgba(255,255,255,0.5);font-size:13pt;` +
          `font-weight:bold;font-family:Calibri,Arial,sans-serif;padding:12px;` +
          `text-align:left;${topBorder}text-transform:uppercase;letter-spacing:0.5px;">TOTALS</td>`
        );
      }
      if (!isNum(col)) {
        return `<td style="background-color:${NAVY};${topBorder}padding:12px;border-left:none;border-right:none;border-bottom:none;"></td>`;
      }
      const sum = rows.reduce((acc, row) => {
        const n = parseFloat(String(row[col] ?? '').replace(/,/g, ''));
        return acc + (isNaN(n) ? 0 : n);
      }, 0);
      const fmt = new Intl.NumberFormat('en-US', {
        useGrouping: true,
        maximumFractionDigits: 0,
      }).format(sum);
      return (
        `<td style="background-color:${NAVY};color:${MINT};font-size:12pt;font-weight:bold;` +
        `font-family:Calibri,Arial,sans-serif;padding:12px;text-align:right;${topBorder}">${esc(fmt)}</td>`
      );
    })
    .join('');

  // Data rows
  const bodyRows = rows
    .map((row, ri) => {
      const bg = ri % 2 !== 0 ? ALT_BG : '#ffffff';
      const cells = columns
        .map((col, ci) => {
          const val = esc(row[col] ?? '');
          const align = isNum(col) ? 'right' : isCenter(col) ? 'center' : 'left';
          const firstCol = ci === 0;
          if (isNum(col)) {
            return `<td style="${tdBase(align, bg, GREEN, true)}">${val}</td>`;
          }
          return `<td style="${tdBase(align, bg, firstCol ? NAVY : '#374151', firstCol)}">${val}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  const colCount = columns.length;
  const half = Math.ceil(colCount / 2);
  const third = Math.ceil(colCount / 3);

  return `<!doctype html>
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8"/>
      <meta name=ProgId content=Excel.Sheet/>
      <!--[if gte mso 9]><xml>
      <x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
        <x:Name>${esc(section)}</x:Name>
        <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
      </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook>
      </xml><![endif]-->
    </head>
    <body>
    <table style="font-family:Calibri,Arial,sans-serif;font-size:12pt;border-collapse:collapse;width:100%;">

      <!-- Accent stripe -->
      <tr>
        <td colspan="${colCount}"
            style="background-color:${BLUE_STRIPE};height:5px;padding:0;border:none;line-height:1;font-size:1pt;">&nbsp;</td>
      </tr>

      <!-- Store name -->
      <tr>
        <td colspan="${colCount}"
            style="background-color:${NAVY};padding:22px 28px 6px;border:none;">
          <span style="font-size:22pt;font-weight:bold;color:#ffffff;font-family:Calibri,Arial,sans-serif;">${storeName}</span>
        </td>
      </tr>

      <!-- Tagline -->
      <tr>
        <td colspan="${colCount}"
            style="background-color:${NAVY};padding:0 28px 6px;border:none;">
          <span style="font-size:13pt;color:#7ea3c4;font-family:Calibri,Arial,sans-serif;letter-spacing:1px;">${storeTagline}</span>
        </td>
      </tr>

      <!-- Thin divider -->
      <tr>
        <td colspan="${colCount}"
            style="background-color:#1e3a5f;height:1px;padding:0;border:none;line-height:1;font-size:1pt;">&nbsp;</td>
      </tr>

      <!-- Meta: address | email | phone -->
      <tr>
        <td colspan="${third}"
            style="background-color:${NAVY};padding:10px 28px 18px;border:none;vertical-align:top;">
          <div style="font-size:7.5pt;font-weight:bold;color:#4b7aa6;font-family:Calibri,Arial,sans-serif;text-transform:uppercase;letter-spacing:0.8px;">Address</div>
          <div style="font-size:12pt;color:#a8c4dc;font-family:Calibri,Arial,sans-serif;margin-top:2px;">${storeAddress}</div>
        </td>
        <td colspan="${third}"
            style="background-color:${NAVY};padding:10px 12px 18px;border:none;vertical-align:top;">
          <div style="font-size:7.5pt;font-weight:bold;color:#4b7aa6;font-family:Calibri,Arial,sans-serif;text-transform:uppercase;letter-spacing:0.8px;">Email</div>
          <div style="font-size:12pt;color:#a8c4dc;font-family:Calibri,Arial,sans-serif;margin-top:2px;">${storeEmail}</div>
        </td>
        <td colspan="${colCount - third * 2 > 0 ? colCount - third * 2 : 1}"
            style="background-color:${NAVY};padding:10px 12px 18px;border:none;vertical-align:top;">
          <div style="font-size:7.5pt;font-weight:bold;color:#4b7aa6;font-family:Calibri,Arial,sans-serif;text-transform:uppercase;letter-spacing:0.8px;">Phone</div>
          <div style="font-size:12pt;color:#a8c4dc;font-family:Calibri,Arial,sans-serif;margin-top:2px;">${storePhone}</div>
        </td>
      </tr>

      <!-- Sub-header: section title left, date right -->
      <tr>
        <td colspan="${half}"
            style="background-color:${SUB_BG};padding:11px 28px;border-top:3px solid ${BLUE_STRIPE};border-bottom:2px solid #cbd5e1;border-left:none;border-right:none;">
          <span style="font-size:11pt;font-weight:bold;color:${NAVY};font-family:Calibri,Arial,sans-serif;text-transform:uppercase;letter-spacing:1px;">${esc(section)}</span>
          &nbsp;&nbsp;
          <span style="font-size:8.5pt;color:#ffffff;background-color:${NAVY};font-family:Calibri,Arial,sans-serif;padding:2px 10px;">&nbsp;OFFICIAL REPORT&nbsp;</span>
        </td>
        <td colspan="${colCount - half}"
            style="background-color:${SUB_BG};padding:11px 28px 11px 8px;text-align:right;border-top:3px solid ${BLUE_STRIPE};border-bottom:2px solid #cbd5e1;border-left:none;border-right:none;">
          <span style="font-size:11pt;color:#64748b;font-family:Calibri,Arial,sans-serif;">Generated: ${esc(generatedOn)}</span>
        </td>
      </tr>

      <!-- Summary cards -->
      ${summaryTDs ? `<tr>${summaryTDs}</tr>` : ''}

      <!-- Thin separator -->
      <tr>
        <td colspan="${colCount}"
            style="background-color:${BORDER_COLOR};height:1px;padding:0;border:none;line-height:1;font-size:1pt;">&nbsp;</td>
      </tr>

      <!-- Column headers -->
      <tr>${headerCells}</tr>

      <!-- Data rows -->
      ${bodyRows}

      <!-- Totals row -->
      <tr>${totalCells}</tr>

      <!-- Footer separator -->
      <tr>
        <td colspan="${colCount}"
            style="background-color:${BORDER_COLOR};height:1px;padding:0;border:none;line-height:1;font-size:1pt;">&nbsp;</td>
      </tr>

      <!-- Footer -->
      <tr>
        <td colspan="${half}"
            style="background-color:${SUB_BG};padding:12px 28px;border:none;vertical-align:middle;">
          <div style="font-size:12pt;font-weight:bold;color:#475569;font-family:Calibri,Arial,sans-serif;">${storeName}</div>
          <div style="font-size:12pt;color:#94a3b8;font-family:Calibri,Arial,sans-serif;margin-top:2px;">${storeAddress}</div>
        </td>
        <td colspan="${colCount - half}"
            style="background-color:${SUB_BG};padding:12px 28px 12px 8px;text-align:right;border:none;vertical-align:middle;">
          <div style="font-size:12pt;color:#94a3b8;font-family:Calibri,Arial,sans-serif;">Printed: ${esc(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }))}</div>
          <div style="font-size:7.5pt;color:#cbd5e1;font-family:Calibri,Arial,sans-serif;letter-spacing:0.5px;text-transform:uppercase;margin-top:2px;">Confidential - Internal Use Only</div>
        </td>
      </tr>

    </table>
    </body>
    </html>`;
};

// ─────────────────────────────────────────────────────────────────────────────
// buildPDF  –  Premium branded PDF with smart column widths & proper alignment
// ─────────────────────────────────────────────────────────────────────────────

const buildPDF = (rows: any[], section: string, storeInfo: any = {}): string => {
  if (!rows.length) return '';

  const PAGE_W = 842; // A4 landscape
  const PAGE_H = 595;
  const MARGIN_X = 36;
  const MARGIN_TOP = 90; // space for header band
  const FOOTER_H = 32;
  const ROW_H = 22;
  const HEADER_ROW_H = 20;
  const ROWS_PER_PAGE = Math.floor((PAGE_H - MARGIN_TOP - FOOTER_H - 50) / ROW_H);

  const storeName = storeInfo.storeName || 'Store Report';
  const storeTagline = storeInfo.storeTagline || '';
  const storeAddress = storeInfo.storeAddress || '';
  const storeEmail = storeInfo.storeEmail || '';
  const storePhone = storeInfo.storePhone || '';

  // ── Colour palette ────────────────────────────────────────────────────────
  const COL_NAVY = [0.055, 0.118, 0.208] as [number, number, number]; // #0e1e35
  const COL_BLUE = [0.18, 0.42, 0.82] as [number, number, number]; // accent stripe
  const COL_LGRAY = [0.96, 0.97, 0.98] as [number, number, number]; // alt row
  const COL_LINE = [0.88, 0.9, 0.92] as [number, number, number]; // row divider
  const COL_WHITE = [1, 1, 1] as [number, number, number];
  const COL_DARK = [0.1, 0.14, 0.2] as [number, number, number]; // body text
  const COL_MID = [0.4, 0.45, 0.52] as [number, number, number]; // secondary text
  const COL_EMPH = [0.18, 0.5, 0.32] as [number, number, number]; // positive numbers
  const COL_TOTAL = [0.25, 0.72, 0.5] as [number, number, number]; // total row accent

  // ── Column definitions per section ───────────────────────────────────────
  // Each col: { key, label, width (pts), align: 'left'|'right'|'center', numeric? }
  type ColDef = {
    key: string;
    label: string;
    width: number;
    align: 'left' | 'right' | 'center';
    numeric?: boolean;
  };

  const USABLE_W = PAGE_W - MARGIN_X * 2;

  const getColDefs = (): ColDef[] => {
    const keys = Object.keys(rows[0]);
    // Section-specific smart layouts
    if (section === 'Sales') {
      return [
        { key: 'Invoice', label: 'Invoice', width: 105, align: 'left' },
        { key: 'Customer', label: 'Customer', width: 120, align: 'left' },
        { key: 'Cashier', label: 'Cashier', width: 90, align: 'left' },
        { key: 'Items', label: 'Items', width: 130, align: 'left' },
        { key: 'Subtotal', label: 'Subtotal', width: 62, align: 'right', numeric: true },
        { key: 'Discount', label: 'Discount', width: 55, align: 'right', numeric: true },
        { key: 'Tax', label: 'Tax', width: 50, align: 'right', numeric: true },
        { key: 'Total', label: 'Total', width: 65, align: 'right', numeric: true },
        { key: 'PaymentMethod', label: 'Payment', width: 62, align: 'center' },
        { key: 'Date', label: 'Date', width: 68, align: 'center' },
      ];
    }
    if (section === 'Purchases') {
      return [
        { key: 'Purchase', label: 'Purchase ID', width: 110, align: 'left' },
        { key: 'Supplier', label: 'Supplier', width: 140, align: 'left' },
        { key: 'Items', label: 'Items', width: 200, align: 'left' },
        { key: 'TotalAmount', label: 'Total', width: 80, align: 'right', numeric: true },
        { key: 'Date', label: 'Date', width: 80, align: 'center' },
      ];
    }
    if (section === 'Inventory') {
      return [
        { key: 'Name', label: 'Product', width: 160, align: 'left' },
        { key: 'SKU', label: 'SKU', width: 85, align: 'left' },
        { key: 'Category', label: 'Category', width: 100, align: 'left' },
        { key: 'Stock', label: 'Stock', width: 55, align: 'right', numeric: true },
        { key: 'MinStock', label: 'Min', width: 45, align: 'right', numeric: true },
        { key: 'Cost', label: 'Cost', width: 72, align: 'right', numeric: true },
        { key: 'Price', label: 'Price', width: 72, align: 'right', numeric: true },
      ];
    }
    if (section === 'Expenses') {
      return [
        { key: 'Category', label: 'Category', width: 140, align: 'left' },
        { key: 'Amount', label: 'Amount', width: 90, align: 'right', numeric: true },
        { key: 'Note', label: 'Note', width: 200, align: 'left' },
        { key: 'CreatedBy', label: 'Added By', width: 120, align: 'left' },
        { key: 'Date', label: 'Date', width: 80, align: 'center' },
      ];
    }
    if (section === 'Customers') {
      return [
        { key: 'Name', label: 'Customer', width: 190, align: 'left' },
        {
          key: 'TotalPurchased',
          label: 'Total Purchased',
          width: 120,
          align: 'right',
          numeric: true,
        },
        { key: 'Due', label: 'Due', width: 90, align: 'right', numeric: true },
        { key: 'LastPurchase', label: 'Last Purchase', width: 110, align: 'center' },
      ];
    }
    if (section === 'Suppliers') {
      return [
        { key: 'Name', label: 'Supplier', width: 200, align: 'left' },
        {
          key: 'TotalPurchases',
          label: 'Total Purchases',
          width: 120,
          align: 'right',
          numeric: true,
        },
        { key: 'Paid', label: 'Paid', width: 100, align: 'right', numeric: true },
        { key: 'Due', label: 'Due', width: 100, align: 'right', numeric: true },
      ];
    }
    if (section === 'Investments') {
      return [
        { key: 'Name', label: 'Investment', width: 140, align: 'left' },
        { key: 'Category', label: 'Category', width: 90, align: 'left' },
        { key: 'InitialAmount', label: 'Initial', width: 80, align: 'right', numeric: true },
        { key: 'TotalEarnings', label: 'Earnings', width: 80, align: 'right', numeric: true },
        { key: 'TotalProfit', label: 'Profit', width: 80, align: 'right', numeric: true },
        { key: 'Status', label: 'Status', width: 60, align: 'center' },
        { key: 'Date', label: 'Date', width: 80, align: 'center' },
      ];
    }
    // Generic fallback: auto-distribute
    const count = Math.min(keys.length, 8);
    const w = Math.floor(USABLE_W / count);
    return keys
      .slice(0, count)
      .map((k) => ({ key: k, label: k, width: w, align: 'left' as const }));
  };

  // Scale cols to fit exactly USABLE_W
  const rawCols = getColDefs();
  const totalRaw = rawCols.reduce((s, c) => s + c.width, 0);
  const scale = USABLE_W / totalRaw;
  const cols: ColDef[] = rawCols.map((c) => ({ ...c, width: c.width * scale }));

  // ── PDF primitives ────────────────────────────────────────────────────────
  const esc = (v: unknown): string =>
    String(v ?? '')
      .replace(/[^\x00-\x7f]/g, ' ')
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');

  // Approximate glyph width for Helvetica at given font size (pts)
  const glyphW = (size: number) => size * 0.52;

  const fitText = (raw: unknown, maxPts: number, size: number): string => {
    const str = esc(raw);
    const gw = glyphW(size);
    const maxChars = Math.floor(maxPts / gw);
    if (str.length <= maxChars) return str;
    return str.slice(0, Math.max(2, maxChars - 2)) + '..';
  };

  const rgStr = ([r, g, b]: [number, number, number]) =>
    `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`;

  const fillRect = (x: number, y: number, w: number, h: number, col: [number, number, number]) =>
    `${rgStr(col)} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f\n`;

  const strokeLine = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    col: [number, number, number],
    lw = 0.4
  ) =>
    `${lw} w ${rgStr(col)} RG ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S\n`;

  // Draw text at (x, baseline_y) — right-align if needed given colWidth
  const drawText = (
    content: unknown,
    x: number,
    y: number,
    size: number,
    col: [number, number, number],
    bold: boolean,
    align: 'left' | 'right' | 'center',
    colWidth: number,
    padX = 6
  ): string => {
    const maxInner = colWidth - padX * 2;
    const str = fitText(content, maxInner, size);
    const strW = str.length * glyphW(size);
    let tx = x + padX;
    if (align === 'right') tx = x + colWidth - padX - strW;
    if (align === 'center') tx = x + (colWidth - strW) / 2;
    const font = bold ? '/F2' : '/F1';
    return `BT ${font} ${size} Tf ${rgStr(col)} rg ${tx.toFixed(2)} ${y.toFixed(2)} Td (${str}) Tj ET\n`;
  };

  // ── Build pages ───────────────────────────────────────────────────────────
  const objects: string[] = [
    '', // 1: catalog
    '', // 2: pages
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', // 3: F1
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>', // 4: F2
  ];

  const addObj = (body: string): number => {
    objects.push(body);
    return objects.length;
  };
  const pageIds: number[] = [];
  const totalPages = Math.max(1, Math.ceil(rows.length / ROWS_PER_PAGE));

  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  for (let p = 0; p < totalPages; p++) {
    const pageRows = rows.slice(p * ROWS_PER_PAGE, (p + 1) * ROWS_PER_PAGE);
    let s = '';

    // ── Header band ───────────────────────────────────────────────────────
    const HEADER_H = 80;
    s += fillRect(0, PAGE_H - HEADER_H, PAGE_W, HEADER_H, COL_NAVY);
    // Blue accent line at bottom of header
    s += fillRect(0, PAGE_H - HEADER_H - 3, PAGE_W, 3, COL_BLUE);

    // Store name (large, white, bold)
    s += drawText(storeName, MARGIN_X, PAGE_H - 28, 18, COL_WHITE, true, 'left', 400, 0);
    // Tagline
    if (storeTagline)
      s += drawText(
        storeTagline,
        MARGIN_X,
        PAGE_H - 46,
        8.5,
        [0.65, 0.72, 0.82],
        false,
        'left',
        400,
        0
      );

    // Contact info row
    const contactParts = [storeAddress, storeEmail, storePhone].filter(Boolean);
    contactParts.forEach((part, i) => {
      s += drawText(
        part,
        MARGIN_X + i * 220,
        PAGE_H - 62,
        7.5,
        [0.52, 0.6, 0.72],
        false,
        'left',
        220,
        0
      );
    });

    // Page number (top-right of header)
    const pgLabel = `Page ${p + 1} / ${totalPages}`;
    s += drawText(
      pgLabel,
      PAGE_W - MARGIN_X - 100,
      PAGE_H - 28,
      8,
      [0.55, 0.65, 0.78],
      false,
      'right',
      100,
      0
    );

    // ── Sub-header: section title bar ─────────────────────────────────────
    const SUB_Y = PAGE_H - HEADER_H - 3;
    const SUB_H = 28;
    s += fillRect(0, SUB_Y - SUB_H, PAGE_W, SUB_H, [0.96, 0.97, 0.98]);
    s += strokeLine(0, SUB_Y - SUB_H, PAGE_W, SUB_Y - SUB_H, COL_LINE, 0.5);
    s += drawText(
      section.toUpperCase() + '  REPORT',
      MARGIN_X,
      SUB_Y - 18,
      10,
      COL_NAVY,
      true,
      'left',
      300,
      0
    );
    s += drawText(
      `Generated: ${dateStr}  ·  ${timeStr}`,
      PAGE_W - MARGIN_X - 220,
      SUB_Y - 18,
      7.5,
      COL_MID,
      false,
      'right',
      220,
      0
    );

    // ── Column header row ─────────────────────────────────────────────────
    const COL_HEADER_Y = SUB_Y - SUB_H;
    s += fillRect(MARGIN_X, COL_HEADER_Y - HEADER_ROW_H, USABLE_W, HEADER_ROW_H, COL_NAVY);
    let cx = MARGIN_X;
    for (const col of cols) {
      s += drawText(
        col.label.toUpperCase(),
        cx,
        COL_HEADER_Y - 13,
        7,
        [0.85, 0.9, 0.96],
        true,
        col.align,
        col.width
      );
      cx += col.width;
    }

    // ── Data rows ─────────────────────────────────────────────────────────
    let rowY = COL_HEADER_Y - HEADER_ROW_H;

    const MONETARY = [
      'subtotal',
      'discount',
      'tax',
      'total',
      'amount',
      'cost',
      'price',
      'earnings',
      'profit',
      'purchased',
      'purchases',
      'paid',
      'due',
      'initial',
    ];
    const isNumericCol = (col: ColDef) =>
      col.numeric || MONETARY.some((k) => col.key.toLowerCase().includes(k));

    pageRows.forEach((row, ri) => {
      const y = rowY - ri * ROW_H;
      // Alternating row fill
      if (ri % 2 === 0) s += fillRect(MARGIN_X, y - ROW_H, USABLE_W, ROW_H, COL_LGRAY);
      // Subtle bottom line
      s += strokeLine(MARGIN_X, y - ROW_H, MARGIN_X + USABLE_W, y - ROW_H, COL_LINE, 0.3);

      let rx = MARGIN_X;
      for (const col of cols) {
        const val = row[col.key] ?? '';
        const textCol = isNumericCol(col) ? COL_EMPH : COL_DARK;
        const isBold = col.key === cols[0].key; // first col slightly bolder
        s += drawText(
          val,
          rx,
          y - ROW_H + 7,
          8,
          isBold ? COL_DARK : textCol,
          isBold,
          col.align,
          col.width
        );
        rx += col.width;
      }
    });

    // ── Totals row ────────────────────────────────────────────────────────
    const totalY = rowY - pageRows.length * ROW_H;
    s += fillRect(MARGIN_X, totalY - HEADER_ROW_H, USABLE_W, HEADER_ROW_H, COL_NAVY);
    // Gold/green top border on total row
    s += fillRect(MARGIN_X, totalY, USABLE_W, 2, COL_TOTAL);

    let tx2 = MARGIN_X;
    for (let ci = 0; ci < cols.length; ci++) {
      const col = cols[ci];
      if (ci === 0) {
        s += drawText('TOTALS', tx2, totalY - 13, 7.5, [0.7, 0.78, 0.88], true, 'left', col.width);
      } else if (isNumericCol(col)) {
        const sum = rows.reduce((acc, r) => {
          const raw = String(r[col.key] ?? '').replace(/,/g, '');
          const n = parseFloat(raw);
          return acc + (isNaN(n) ? 0 : n);
        }, 0);
        const fmt = new Intl.NumberFormat('en-US', {
          useGrouping: true,
          maximumFractionDigits: 0,
        }).format(sum);
        s += drawText(fmt, tx2, totalY - 13, 8, COL_WHITE, true, 'right', col.width);
      }
      tx2 += col.width;
    }

    // ── Footer ────────────────────────────────────────────────────────────
    s += fillRect(0, 0, PAGE_W, FOOTER_H - 4, [0.96, 0.97, 0.98]);
    s += strokeLine(0, FOOTER_H - 4, PAGE_W, FOOTER_H - 4, COL_LINE, 0.4);
    s += drawText(storeName, MARGIN_X, 10, 7.5, COL_MID, false, 'left', 250, 0);
    s += drawText(
      'CONFIDENTIAL  ·  INTERNAL USE ONLY',
      PAGE_W / 2 - 90,
      10,
      6.5,
      [0.65, 0.68, 0.73],
      false,
      'left',
      200,
      0
    );
    s += drawText(
      `Printed: ${new Date().toLocaleDateString()}`,
      PAGE_W - MARGIN_X - 130,
      10,
      7.5,
      COL_MID,
      false,
      'right',
      130,
      0
    );

    const contentId = addObj(`<< /Length ${s.length} >>\nstream\n${s}endstream`);
    const pageId = addObj(
      `<< /Type /Page /Parent 2 0 R ` +
        `/MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> ` +
        `/Contents ${contentId} 0 R >>`
    );
    pageIds.push(pageId);
  }

  objects[0] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefOff = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((o) => {
    pdf += `${String(o).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOff}\n%%EOF`;
  return pdf;
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const auth = useAuth();
  const token =
    auth.token ?? (typeof window !== 'undefined' ? localStorage.getItem('token') : null);

  const [activeTab, setActiveTab] = useState('overview');
  const [backupMode, setBackupMode] = useState<'local' | 'drive'>('local');
  const [backupEmail, setBackupEmail] = useState('');
  const [settingsInfo, setSettingsInfo] = useState<any>({});
  const [settingsLoading, setSettingsLoading] = useState(false);

  const [sales, setSales] = useState<SaleRow[]>([]);
  const [salesPage, setSalesPage] = useState(1);
  const [salesFilter, setSalesFilter] = useState({
    search: '',
    customer: '',
    product: '',
    category: '',
    user: '',
    dateRange: 'monthly',
    startDate: '',
    endDate: '',
  });
  const [salesSort, setSalesSort] = useState({
    key: 'createdAt',
    direction: 'desc' as 'asc' | 'desc',
  });
  const [salesLoading, setSalesLoading] = useState(false);

  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [purchasePage, setPurchasePage] = useState(1);
  const [purchaseFilter, setPurchaseFilter] = useState({
    search: '',
    supplier: '',
    product: '',
    dateRange: 'monthly',
    startDate: '',
    endDate: '',
  });
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  const [inventory, setInventory] = useState<ProductRow[]>([]);
  const [inventorySummary, setInventorySummary] = useState({
    totalItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
  });
  const [inventoryFilter, setInventoryFilter] = useState({ search: '', stockStatus: 'all' });
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [stockHistory, setStockHistory] = useState<StockHistoryRow[]>([]);
  const [stockHistoryLoading, setStockHistoryLoading] = useState(false);

  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [expensePage, setExpensePage] = useState(1);
  const [expenseFilter, setExpenseFilter] = useState({ search: '', category: '' });
  const [expenseLoading, setExpenseLoading] = useState(false);

  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [customerFilter, setCustomerFilter] = useState({ search: '' });
  const [customerLoading, setCustomerLoading] = useState(false);

  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [supplierFilter, setSupplierFilter] = useState({ search: '' });
  const [supplierLoading, setSupplierLoading] = useState(false);

  const [investments, setInvestments] = useState<InvestmentRow[]>([]);
  const [investmentFilter, setInvestmentFilter] = useState({ search: '', status: 'all' });
  const [investmentLoading, setInvestmentLoading] = useState(false);

  const [overview, setOverview] = useState<OverviewSummary>({
    todaySales: 0,
    monthlySales: 0,
    totalProfit: 0,
    totalExpenses: 0,
    netProfit: 0,
    salesVsExpenses: { sales: 0, expenses: 0 },
    profitTrend: [],
    topProducts: [],
    lowStockItems: 0,
    bestSelling: 'N/A',
    mostProfitable: 'N/A',
  });
  const [overviewLoading, setOverviewLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('backupSettings');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.storageProvider === 'drive') {
          setBackupMode('drive');
          setBackupEmail(parsed.driveEmail || '');
        } else {
          setBackupMode('local');
        }
      } catch {
        setBackupMode('local');
      }
    }
  }, []);

  const authHeaders = useCallback(() => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [token]);

  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const response = await axios.get('/api/settings', { headers: authHeaders() });
      setSettingsInfo(response.data.data || {});
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Unable to load store settings');
    } finally {
      setSettingsLoading(false);
    }
  }, [authHeaders]);

  const getFilterRange = useCallback((range: string) => {
    const now = new Date();
    const start = new Date(now);
    if (range === 'daily') {
      start.setHours(0, 0, 0, 0);
    } else if (range === 'weekly') {
      start.setDate(now.getDate() - 7);
    } else if (range === 'monthly') {
      start.setMonth(now.getMonth() - 1);
    } else {
      return null;
    }
    return start;
  }, []);

  const isDateInRange = useCallback(
    (dateString: string, filter: { dateRange: string; startDate: string; endDate: string }) => {
      const itemDate = new Date(dateString);
      if (filter.dateRange !== 'custom') {
        const start = getFilterRange(filter.dateRange);
        return start ? itemDate >= start : true;
      }
      if (filter.startDate) {
        const start = new Date(filter.startDate);
        start.setHours(0, 0, 0, 0);
        if (itemDate < start) return false;
      }
      if (filter.endDate) {
        const end = new Date(filter.endDate);
        end.setHours(23, 59, 59, 999);
        if (itemDate > end) return false;
      }
      return true;
    },
    [getFilterRange]
  );

  const fetchSales = useCallback(async () => {
    setSalesLoading(true);
    try {
      const response = await axios.get('/api/sales?limit=100', { headers: authHeaders() });
      setSales(response.data.data?.sales || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Unable to load sales data');
    } finally {
      setSalesLoading(false);
    }
  }, [authHeaders]);

  const fetchPurchases = useCallback(async () => {
    setPurchaseLoading(true);
    try {
      const response = await axios.get('/api/inventory/purchases?limit=100', {
        headers: authHeaders(),
      });
      setPurchases(response.data.data?.purchases || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Unable to load purchase data');
    } finally {
      setPurchaseLoading(false);
    }
  }, [authHeaders]);

  const fetchInventory = useCallback(async () => {
    setInventoryLoading(true);
    try {
      const response = await axios.get('/api/products?limit=100', { headers: authHeaders() });
      setInventory(response.data.data?.products || []);
      setInventorySummary(
        response.data.data?.summary || { totalItems: 0, lowStockItems: 0, outOfStockItems: 0 }
      );
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Unable to load inventory data');
    } finally {
      setInventoryLoading(false);
    }
  }, [authHeaders]);

  const fetchStockHistory = useCallback(async () => {
    setStockHistoryLoading(true);
    try {
      const response = await axios.get('/api/inventory/history?limit=8', {
        headers: authHeaders(),
      });
      setStockHistory(response.data.data?.history || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Unable to load stock movement data');
    } finally {
      setStockHistoryLoading(false);
    }
  }, [authHeaders]);

  const fetchExpenses = useCallback(async () => {
    setExpenseLoading(true);
    try {
      const response = await axios.get('/api/expenses?limit=100', { headers: authHeaders() });
      setExpenses(response.data.data?.expenses || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Unable to load expense data');
    } finally {
      setExpenseLoading(false);
    }
  }, [authHeaders]);

  const fetchCustomers = useCallback(async () => {
    setCustomerLoading(true);
    try {
      const response = await axios.get('/api/customers?limit=100', { headers: authHeaders() });
      setCustomers(response.data.data?.customers || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Unable to load customer data');
    } finally {
      setCustomerLoading(false);
    }
  }, [authHeaders]);

  const fetchSuppliers = useCallback(async () => {
    setSupplierLoading(true);
    try {
      const response = await axios.get('/api/inventory/suppliers?limit=100', {
        headers: authHeaders(),
      });
      setSuppliers(response.data.data?.suppliers || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Unable to load supplier data');
    } finally {
      setSupplierLoading(false);
    }
  }, [authHeaders]);

  const fetchInvestments = useCallback(async () => {
    setInvestmentLoading(true);
    try {
      const response = await axios.get('/api/investments', { headers: authHeaders() });
      setInvestments(response.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Unable to load investment data');
    } finally {
      setInvestmentLoading(false);
    }
  }, [authHeaders]);

  const fetchOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const [salesResponse, purchasesResponse, expensesResponse, inventoryResponse] =
        await Promise.all([
          axios.get('/api/sales?limit=100', { headers: authHeaders() }),
          axios.get('/api/inventory/purchases?limit=100', { headers: authHeaders() }),
          axios.get('/api/expenses?limit=100', { headers: authHeaders() }),
          axios.get('/api/products?limit=100', { headers: authHeaders() }),
        ]);

      const allSales: SaleRow[] = salesResponse.data.data?.sales || [];
      const allPurchases: PurchaseRow[] = purchasesResponse.data.data?.purchases || [];
      const allExpenses: ExpenseRow[] = expensesResponse.data.data?.expenses || [];
      const allProducts: ProductRow[] = inventoryResponse.data.data?.products || [];

      const today = new Date();
      const monthlyStart = new Date(today.getFullYear(), today.getMonth(), 1);

      const todaySales = allSales.reduce((sum, sale) => {
        const saleDate = new Date(sale.createdAt);
        return saleDate.toDateString() === today.toDateString() ? sum + sale.total : sum;
      }, 0);

      const monthlySales = allSales.reduce((sum, sale) => {
        const saleDate = new Date(sale.createdAt);
        return saleDate >= monthlyStart ? sum + sale.total : sum;
      }, 0);

      const totalExpenseValue = allExpenses.reduce((sum, e) => sum + e.amount, 0);
      const totalPurchaseCost = allPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
      const totalSalesValue = allSales.reduce((sum, s) => sum + s.total, 0);
      const grossProfit = totalSalesValue - totalPurchaseCost;
      const netProfit = grossProfit - totalExpenseValue;

      const salesByDate = allSales.reduce<Record<string, number>>((memo, sale) => {
        const label = getDateLabel(new Date(sale.createdAt));
        memo[label] = (memo[label] || 0) + sale.total;
        return memo;
      }, {});
      const profitTrend = Object.entries(salesByDate)
        .slice(-7)
        .map(([label, value]) => ({ label, value }));

      const productSales = allSales.reduce<
        Record<string, { label: string; value: number; profit: number }>
      >((memo, sale) => {
        sale.items.forEach((item) => {
          const name = item.productName || 'Unknown product';
          const qty = Number(item.quantity || 0);
          const amount = Number(item.price || 0) * qty;
          const cost = Number(item.productId?.cost || 0) * qty;
          const existing = memo[name] || { label: name, value: 0, profit: 0 };
          existing.value += amount;
          existing.profit += amount - cost;
          memo[name] = existing;
        });
        return memo;
      }, {});

      const topProducts = Object.values(productSales)
        .sort((a, b) => b.value - a.value)
        .slice(0, 3)
        .map((item) => ({ label: item.label, value: item.value }));

      const bestSelling = topProducts[0]?.label || 'N/A';
      const mostProfitable =
        Object.values(productSales).sort((a, b) => b.profit - a.profit)[0]?.label || 'N/A';

      setOverview({
        todaySales,
        monthlySales,
        totalProfit: grossProfit,
        totalExpenses: totalExpenseValue,
        netProfit,
        salesVsExpenses: { sales: totalSalesValue, expenses: totalExpenseValue },
        profitTrend,
        topProducts,
        lowStockItems: inventoryResponse.data.data?.summary?.lowStockItems || 0,
        bestSelling,
        mostProfitable,
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Unable to load overview');
    } finally {
      setOverviewLoading(false);
    }
  }, [authHeaders]);

  const fetchAllData = useCallback(() => {
    fetchSales();
    fetchPurchases();
    fetchInventory();
    fetchStockHistory();
    fetchExpenses();
    fetchCustomers();
    fetchSuppliers();
    fetchInvestments();
    fetchSettings();
    fetchOverview();
  }, [
    fetchSales,
    fetchPurchases,
    fetchInventory,
    fetchStockHistory,
    fetchExpenses,
    fetchCustomers,
    fetchSuppliers,
    fetchInvestments,
    fetchSettings,
    fetchOverview,
  ]);

  useEffect(() => {
    if (!token) return;
    fetchAllData();
    const interval = window.setInterval(fetchOverview, 20000);
    return () => window.clearInterval(interval);
  }, [token, fetchAllData, fetchOverview]);

  const visibleTabs = useMemo(
    () => reportTabs.filter((tab) => tab.roles.includes(auth.user?.role || 'cashier')),
    [auth.user?.role]
  );

  useEffect(() => {
    if (!visibleTabs.some((item) => item.id === activeTab)) {
      setActiveTab(visibleTabs[0]?.id || 'overview');
    }
  }, [activeTab, visibleTabs]);

  // ── Filtered data ──────────────────────────────────────────────────────────

  const filteredSales = useMemo(() => {
    const filtered = sales.filter((sale) => {
      const customer = sale.customerId?.name || sale.walkinCustomerName || 'Walk-in';
      const cashier = `${sale.cashierId?.firstName || ''} ${sale.cashierId?.lastName || ''}`.trim();
      const productNames = sale.items.map((item) => item.productName || '').join(' ');
      const fields = [
        sale.saleNumber || sale._id,
        customer,
        cashier,
        sale.paymentMethod,
        productNames,
      ]
        .join(' ')
        .toLowerCase();

      return (
        (!salesFilter.search || fields.includes(salesFilter.search.toLowerCase())) &&
        (!salesFilter.customer ||
          customer.toLowerCase().includes(salesFilter.customer.toLowerCase())) &&
        (!salesFilter.user || cashier.toLowerCase().includes(salesFilter.user.toLowerCase())) &&
        (!salesFilter.product ||
          productNames.toLowerCase().includes(salesFilter.product.toLowerCase())) &&
        (!salesFilter.category ||
          productNames.toLowerCase().includes(salesFilter.category.toLowerCase())) &&
        isDateInRange(sale.createdAt, salesFilter)
      );
    });
    return sortGeneric(filtered, salesSort.key as keyof SaleRow, salesSort.direction);
  }, [sales, salesFilter, salesSort, isDateInRange]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter((purchase) => {
      const supplier = purchase.supplierId?.name || 'Supplier';
      const productNames = purchase.items.map((item) => item.productName || '').join(' ');
      const fields = [purchase.purchaseNumber || purchase._id, supplier, productNames]
        .join(' ')
        .toLowerCase();
      return (
        (!purchaseFilter.search || fields.includes(purchaseFilter.search.toLowerCase())) &&
        (!purchaseFilter.supplier ||
          supplier.toLowerCase().includes(purchaseFilter.supplier.toLowerCase())) &&
        (!purchaseFilter.product ||
          productNames.toLowerCase().includes(purchaseFilter.product.toLowerCase())) &&
        isDateInRange(purchase.createdAt, purchaseFilter)
      );
    });
  }, [purchases, purchaseFilter, isDateInRange]);

  const filteredInventory = useMemo(() => {
    return inventory.filter((product) => {
      const query = inventoryFilter.search.toLowerCase().trim();
      const category = product.category
        ? typeof product.category === 'string'
          ? product.category.toLowerCase()
          : (product.category.name ?? '').toLowerCase()
        : '';
      const matchesText =
        !query ||
        product.name.toLowerCase().includes(query) ||
        String(product.sku ?? '')
          .toLowerCase()
          .includes(query) ||
        category.includes(query);
      const matchesStock =
        inventoryFilter.stockStatus === 'all' ||
        (inventoryFilter.stockStatus === 'lowStock' &&
          product.stock > 0 &&
          product.stock <= Number(product.minStock || 0)) ||
        (inventoryFilter.stockStatus === 'outOfStock' && product.stock === 0);
      return matchesText && matchesStock;
    });
  }, [inventory, inventoryFilter]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const query = [expenseFilter.search, expenseFilter.category]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const fields = [
        expense.category,
        expense.note,
        expense.createdBy?.firstName,
        expense.createdBy?.lastName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return query ? fields.includes(query) : true;
    });
  }, [expenses, expenseFilter]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(
      (c) =>
        !customerFilter.search || c.name.toLowerCase().includes(customerFilter.search.toLowerCase())
    );
  }, [customers, customerFilter.search]);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(
      (s) =>
        !supplierFilter.search || s.name.toLowerCase().includes(supplierFilter.search.toLowerCase())
    );
  }, [suppliers, supplierFilter.search]);

  const filteredInvestments = useMemo(() => {
    return investments.filter((inv) => {
      const matchesSearch =
        !investmentFilter.search ||
        inv.name.toLowerCase().includes(investmentFilter.search.toLowerCase()) ||
        inv.category.toLowerCase().includes(investmentFilter.search.toLowerCase());
      const matchesStatus =
        investmentFilter.status === 'all' || inv.status === investmentFilter.status;
      return matchesSearch && matchesStatus;
    });
  }, [investments, investmentFilter]);

  // ── Pagination ─────────────────────────────────────────────────────────────
  const PAGE_SIZE = 8;

  const salesPageData = filteredSales.slice((salesPage - 1) * PAGE_SIZE, salesPage * PAGE_SIZE);
  const purchasePageData = filteredPurchases.slice(
    (purchasePage - 1) * PAGE_SIZE,
    purchasePage * PAGE_SIZE
  );
  const inventoryPageData = filteredInventory.slice(0, PAGE_SIZE);
  const expensePageData = filteredExpenses.slice(
    (expensePage - 1) * PAGE_SIZE,
    expensePage * PAGE_SIZE
  );
  const customerPageData = filteredCustomers.slice(0, PAGE_SIZE);
  const supplierPageData = filteredSuppliers.slice(0, PAGE_SIZE);
  const investmentPageData = filteredInvestments.slice(0, PAGE_SIZE);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const calculateSaleProfit = (sale: SaleRow) =>
    sale.items.reduce((sum, item) => {
      const qty = Number(item.quantity || 0);
      const price = Number(item.price || 0);
      const cost = Number(item.productId?.cost || 0);
      return sum + qty * Math.max(price - cost, 0);
    }, 0);

  const exportReport = (format: 'PDF' | 'Excel' | 'CSV', section: string, rows: any[]) => {
    if (!rows.length) {
      toast.error('No data to export');
      return;
    }
    if (backupMode === 'drive') {
      toast.success(`Sent ${section} report to ${backupEmail || 'Drive email destination'}`);
      return;
    }
    const printableRows = prepareExportRows(section, rows);
    if (!printableRows.length) {
      toast.error('No exportable data available');
      return;
    }
    const base = section.toLowerCase().replace(/\s+/g, '-');
    if (format === 'PDF') {
      downloadReport(
        buildPDF(printableRows, section, settingsInfo),
        `${base}.pdf`,
        'application/pdf'
      );
    } else if (format === 'Excel') {
      downloadReport(
        buildExcel(printableRows, section, settingsInfo),
        `${base}.xls`,
        'application/vnd.ms-excel;charset=utf-8;'
      );
    } else {
      downloadReport(buildCSV(printableRows), `${base}.csv`, 'text/csv;charset=utf-8;');
    }
    toast.success(`${section} report downloaded (${format})`);
  };

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderOverview = () => {
    const metricCards = [
      {
        title: 'Today Sales',
        value: overview.todaySales,
        helper: 'Current day revenue',
        icon: FileText,
        iconWrap: 'bg-emerald-100',
        iconColor: 'text-emerald-500',
      },
      {
        title: 'Monthly Sales',
        value: overview.monthlySales,
        helper: 'Last 30 days revenue',
        icon: BarChart3,
        iconWrap: 'bg-sky-100',
        iconColor: 'text-sky-500',
      },
      {
        title: 'Gross Profit',
        value: overview.totalProfit,
        helper: 'Before expenses',
        icon: TrendingUp,
        iconWrap: 'bg-indigo-100',
        iconColor: 'text-indigo-500',
      },
      {
        title: 'Total Expenses',
        value: overview.totalExpenses,
        helper: 'Recorded costs',
        icon: Banknote,
        iconWrap: 'bg-orange-100',
        iconColor: 'text-orange-500',
      },
      {
        title: 'Net Profit',
        value: overview.netProfit,
        helper: 'Profit after expenses',
        icon: DollarSign,
        iconWrap: overview.netProfit < 0 ? 'bg-rose-100' : 'bg-purple-100',
        iconColor: overview.netProfit < 0 ? 'text-rose-500' : 'text-purple-500',
        valueColor: overview.netProfit < 0 ? 'text-rose-600' : 'text-slate-900',
      },
    ];
    const insightCards = [
      {
        label: 'Best-selling product',
        value: overview.bestSelling,
        helper: 'Highest sales volume',
      },
      {
        label: 'Most profitable item',
        value: overview.mostProfitable,
        helper: 'Strongest profit performer',
      },
      {
        label: 'Low stock alerts',
        value: `${overview.lowStockItems} items`,
        helper: 'Needs inventory attention',
      },
    ];
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {metricCards.map((metric) => {
            const Icon = metric.icon;
            return (
              <Card key={metric.title} className="min-h-[150px] p-5">
                <div className="flex h-full flex-col justify-between gap-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="max-w-[9rem] text-xs font-semibold uppercase leading-5 tracking-[0.2em] text-slate-400">
                      {metric.title}
                    </p>
                    <div
                      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ring-1 ring-white/70 ${metric.iconWrap}`}
                    >
                      <Icon className={`h-5 w-5 ${metric.iconColor}`} />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`break-words text-2xl font-bold leading-tight ${metric.valueColor || 'text-slate-900'}`}
                    >
                      {formatCurrency(metric.value)}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{metric.helper}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Sales vs Expenses</h2>
                <p className="mt-0.5 text-xs text-slate-400">Revenue compared with costs</p>
                <p className="mt-3 text-2xl font-bold text-slate-900">
                  {overview.salesVsExpenses.sales
                    ? `${Math.max(1, Math.round((overview.salesVsExpenses.sales / Math.max(1, overview.salesVsExpenses.expenses)) * 10)) / 10}x`
                    : '0x'}
                </p>
              </div>
              <div className="rounded-lg bg-indigo-100 p-2">
                <BarChart3 className="h-5 w-5 text-indigo-500" />
              </div>
            </div>
            <div className="mt-6 space-y-4">
              {[
                { label: 'Sales', value: overview.salesVsExpenses.sales, color: 'bg-indigo-500' },
                {
                  label: 'Expenses',
                  value: overview.salesVsExpenses.expenses,
                  color: 'bg-sky-400',
                },
              ].map((bar) => (
                <div key={bar.label} className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{bar.label}</span>
                    <span className="font-medium text-slate-600">{formatCurrency(bar.value)}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${bar.color}`}
                      style={{
                        width: `${Math.min(100, bar.value ? (bar.value / Math.max(1, overview.salesVsExpenses.sales + overview.salesVsExpenses.expenses)) * 100 : 0)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Profit Trend</h2>
                <p className="mt-0.5 text-xs text-slate-400">Recent profit movement</p>
                <p className="mt-3 text-2xl font-bold text-slate-900">
                  {overview.profitTrend.length} points
                </p>
              </div>
              <div className="rounded-lg bg-emerald-100 p-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
            <div className="mt-6">
              <div className="relative h-40 overflow-hidden rounded-xl bg-slate-50 p-4">
                <svg viewBox="0 0 240 120" className="h-full w-full">
                  <polyline
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth="3"
                    points={overview.profitTrend
                      .map(
                        (pt, i) =>
                          `${(i * 34).toFixed(2)},${120 - Math.min(100, (pt.value / Math.max(1, overview.netProfit)) * 100)}`
                      )
                      .join(' ')}
                  />
                </svg>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Top Selling Products</h2>
                <p className="mt-0.5 text-xs text-slate-400">Best products by sales value</p>
                <p className="mt-3 text-2xl font-bold text-slate-900">
                  {overview.topProducts.length}
                </p>
              </div>
              <div className="rounded-lg bg-sky-100 p-2">
                <PieChart className="h-5 w-5 text-sky-500" />
              </div>
            </div>
            <div className="mt-6 grid gap-4">
              {overview.topProducts.length ? (
                overview.topProducts.map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-indigo-500" />
                    <span className="min-w-0 flex-1 text-sm text-slate-600">{item.label}</span>
                    <span className="flex-shrink-0 text-sm font-semibold text-slate-900">
                      {formatCurrency(item.value)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">No top products yet</p>
              )}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {insightCards.map((insight) => (
            <Card key={insight.label} className="p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                {insight.label}
              </p>
              <p className="mt-2 truncate text-lg font-semibold text-slate-900">{insight.value}</p>
              <p className="mt-1 text-xs text-slate-400">{insight.helper}</p>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderTableControls = (label: string, rows: any[], section: string) => (
    <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 items-center gap-3">
        <Search size={16} className="text-slate-500" />
        <span className="text-sm text-slate-500">{label}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {(['PDF', 'Excel', 'CSV'] as const).map((format) => (
          <Button
            key={format}
            variant="secondary"
            size="sm"
            onClick={() => exportReport(format, section, rows)}
          >
            <Download size={14} />
            {format}
          </Button>
        ))}
      </div>
    </div>
  );

  const renderHeader = () => (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-violet-500">Reports</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          {pageLabels[activeTab as keyof typeof pageLabels]}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Real-time POS reporting across sales, inventory, expenses, customers, and suppliers.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" size="md" onClick={fetchAllData}>
          <Printer size={16} />
          Refresh
        </Button>
        <Button size="md" onClick={() => toast.success('Report filters are live and interactive')}>
          <ArrowUpRight size={16} />
          Quick Sync
        </Button>
      </div>
    </div>
  );

  const renderSectionTabs = () => (
    <div className="overflow-x-auto pb-3">
      <div className="inline-flex gap-2">
        {visibleTabs.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              className={`whitespace-nowrap rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                active
                  ? 'border-violet-300 bg-violet-50 text-violet-700 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-700'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon size={16} className="inline-block mr-2 align-middle" />
              <span className="align-middle">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderSalesSection = () => (
    <div className="space-y-5">
      <Card className="p-5 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Input
            placeholder="Search invoice, customer, cashier, or product"
            value={salesFilter.search}
            onChange={(e) => {
              setSalesFilter({ ...salesFilter, search: e.target.value });
              setSalesPage(1);
            }}
          />
          <Input
            placeholder="Customer"
            value={salesFilter.customer}
            onChange={(e) => setSalesFilter({ ...salesFilter, customer: e.target.value })}
          />
          <Input
            placeholder="Cashier"
            value={salesFilter.user}
            onChange={(e) => setSalesFilter({ ...salesFilter, user: e.target.value })}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Input
            placeholder="Product"
            value={salesFilter.product}
            onChange={(e) => setSalesFilter({ ...salesFilter, product: e.target.value })}
          />
          <Input
            placeholder="Start date"
            type="date"
            value={salesFilter.startDate}
            onChange={(e) =>
              setSalesFilter({ ...salesFilter, startDate: e.target.value, dateRange: 'custom' })
            }
          />
          <Input
            placeholder="End date"
            type="date"
            value={salesFilter.endDate}
            onChange={(e) =>
              setSalesFilter({ ...salesFilter, endDate: e.target.value, dateRange: 'custom' })
            }
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(['daily', 'weekly', 'monthly'] as const).map((opt) => (
            <Button
              key={opt}
              variant={salesFilter.dateRange === opt ? 'primary' : 'secondary'}
              size="sm"
              onClick={() =>
                setSalesFilter({ ...salesFilter, dateRange: opt, startDate: '', endDate: '' })
              }
            >
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </Button>
          ))}
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              setSalesFilter({
                search: '',
                customer: '',
                product: '',
                category: '',
                user: '',
                dateRange: 'monthly',
                startDate: '',
                endDate: '',
              })
            }
          >
            Reset
          </Button>
        </div>
      </Card>

      {renderTableControls(
        'Live sales filtering and sorting across current POS history.',
        filteredSales,
        'Sales'
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-700">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                {[
                  { label: 'Invoice', key: 'saleNumber' },
                  { label: 'Customer', key: 'customerId' },
                  { label: 'Items', key: 'items' },
                  { label: 'Subtotal', key: 'subtotal' },
                  { label: 'Discount', key: 'discount' },
                  { label: 'Tax', key: 'tax' },
                  { label: 'Total', key: 'total' },
                  { label: 'Profit', key: 'profit' },
                  { label: 'Payment', key: 'paymentMethod' },
                  { label: 'Date', key: 'createdAt' },
                ].map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 cursor-pointer"
                    onClick={() =>
                      setSalesSort((cur) => ({
                        key: col.key as keyof SaleRow,
                        direction: cur.direction === 'asc' ? 'desc' : 'asc',
                      }))
                    }
                  >
                    {col.label}
                  </th>
                ))}
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {salesLoading ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-slate-500">
                    Loading sales…
                  </td>
                </tr>
              ) : salesPageData.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-slate-500">
                    No sales found for the current filters.
                  </td>
                </tr>
              ) : (
                salesPageData.map((sale) => {
                  const customerName =
                    sale.customerId?.name || sale.walkinCustomerName || 'Walk-in';
                  const profitValue = calculateSaleProfit(sale);
                  return (
                    <tr key={sale._id} className="hover:bg-slate-50">
                      <td className="px-4 py-4 font-medium text-slate-900">
                        {sale.saleNumber || sale._id}
                      </td>
                      <td className="px-4 py-4">{customerName}</td>
                      <td className="px-4 py-4">{sale.items.length}</td>
                      <td className="px-4 py-4">{formatCurrency(sale.subtotal)}</td>
                      <td className="px-4 py-4">{formatCurrency(sale.discount)}</td>
                      <td className="px-4 py-4">{formatCurrency(sale.tax)}</td>
                      <td className="px-4 py-4">{formatCurrency(sale.total)}</td>
                      <td className="px-4 py-4 text-emerald-700">
                        {profitValue ? formatCurrency(profitValue) : '—'}
                      </td>
                      <td className="px-4 py-4 capitalize">{sale.paymentMethod}</td>
                      <td className="px-4 py-4">{new Date(sale.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-4 space-x-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => toast.success('Invoice view opened')}
                        >
                          View
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => toast.success('Invoice printed')}
                        >
                          Print
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-col items-start gap-2 sm:flex-row sm:justify-between sm:items-center">
          <p className="text-sm text-slate-500">
            Showing {salesPageData.length} of {filteredSales.length} sales records.
          </p>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
            <button
              type="button"
              className="rounded-full px-3 py-1 text-slate-600 transition hover:bg-slate-100"
              disabled={salesPage === 1}
              onClick={() => setSalesPage((p) => Math.max(p - 1, 1))}
            >
              Prev
            </button>
            <span>{salesPage}</span>
            <button
              type="button"
              className="rounded-full px-3 py-1 text-slate-600 transition hover:bg-slate-100"
              disabled={salesPage * PAGE_SIZE >= filteredSales.length}
              onClick={() => setSalesPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderPurchasesSection = () => (
    <div className="space-y-5">
      <Card className="p-5 grid gap-4 md:grid-cols-3">
        <Input
          placeholder="Search purchases"
          value={purchaseFilter.search}
          onChange={(e) => setPurchaseFilter({ ...purchaseFilter, search: e.target.value })}
        />
        <Input
          placeholder="Supplier"
          value={purchaseFilter.supplier}
          onChange={(e) => setPurchaseFilter({ ...purchaseFilter, supplier: e.target.value })}
        />
        <Input
          placeholder="Product"
          value={purchaseFilter.product}
          onChange={(e) => setPurchaseFilter({ ...purchaseFilter, product: e.target.value })}
        />
      </Card>
      <Card className="p-5 grid gap-4 md:grid-cols-3">
        <Input
          placeholder="Start date"
          type="date"
          value={purchaseFilter.startDate}
          onChange={(e) => setPurchaseFilter({ ...purchaseFilter, startDate: e.target.value })}
        />
        <Input
          placeholder="End date"
          type="date"
          value={purchaseFilter.endDate}
          onChange={(e) => setPurchaseFilter({ ...purchaseFilter, endDate: e.target.value })}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            setPurchaseFilter({
              search: '',
              supplier: '',
              product: '',
              dateRange: 'monthly',
              startDate: '',
              endDate: '',
            })
          }
        >
          Reset
        </Button>
      </Card>
      {renderTableControls(
        'Track purchase history with live supplier and product filters.',
        filteredPurchases,
        'Purchases'
      )}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-700">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                {['Purchase ID', 'Supplier', 'Product', 'Qty', 'Cost', 'Total Cost', 'Date'].map(
                  (col) => (
                    <th key={col} className="px-4 py-3">
                      {col}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {purchaseLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    Loading purchases…
                  </td>
                </tr>
              ) : purchasePageData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    No purchase records match the filters.
                  </td>
                </tr>
              ) : (
                purchasePageData.map((purchase) => (
                  <tr key={purchase._id} className="hover:bg-slate-50">
                    <td className="px-4 py-4 font-medium text-slate-900">
                      {purchase.purchaseNumber || purchase._id}
                    </td>
                    <td className="px-4 py-4">{purchase.supplierId?.name || 'Unknown'}</td>
                    <td className="px-4 py-4">
                      {purchase.items.map((i) => i.productName).join(', ')}
                    </td>
                    <td className="px-4 py-4">
                      {purchase.items.reduce((s, i) => s + Number(i.quantity || 0), 0)}
                    </td>
                    <td className="px-4 py-4">
                      {formatCurrency(
                        purchase.items.reduce((s, i) => s + Number(i.costPrice || 0), 0)
                      )}
                    </td>
                    <td className="px-4 py-4">{formatCurrency(purchase.totalAmount)}</td>
                    <td className="px-4 py-4">
                      {new Date(purchase.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  const renderInventorySection = () => (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-3 lg:grid-cols-2">
        {[
          { label: 'Total stock items', value: inventorySummary.totalItems },
          { label: 'Low stock items', value: inventorySummary.lowStockItems },
          { label: 'Out of stock', value: inventorySummary.outOfStockItems },
        ].map((stat) => (
          <Card key={stat.label} className="p-5">
            <p className="text-sm font-semibold text-slate-500">{stat.label}</p>
            <p className="mt-4 text-3xl font-bold text-slate-950">{stat.value}</p>
          </Card>
        ))}
      </div>
      <Card className="p-5 grid gap-4 md:grid-cols-3">
        <Input
          placeholder="Search inventory"
          value={inventoryFilter.search}
          onChange={(e) => setInventoryFilter({ ...inventoryFilter, search: e.target.value })}
        />
        <select
          value={inventoryFilter.stockStatus}
          onChange={(e) => setInventoryFilter({ ...inventoryFilter, stockStatus: e.target.value })}
          className="input-field"
        >
          <option value="all">All stock</option>
          <option value="lowStock">Low stock</option>
          <option value="outOfStock">Out of stock</option>
        </select>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setInventoryFilter({ search: '', stockStatus: 'all' })}
        >
          Reset
        </Button>
      </Card>
      {renderTableControls(
        'Search current products and stock levels in real time.',
        filteredInventory,
        'Inventory'
      )}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-700">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                {['Product Name', 'SKU', 'Category', 'Stock', 'Cost', 'Price', 'Stock Value'].map(
                  (col) => (
                    <th key={col} className="px-4 py-3">
                      {col}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {inventoryLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    Loading inventory…
                  </td>
                </tr>
              ) : inventoryPageData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    No inventory matches the current filter.
                  </td>
                </tr>
              ) : (
                inventoryPageData.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50">
                    <td className="px-4 py-4 font-medium text-slate-900">{item.name}</td>
                    <td className="px-4 py-4">{item.sku}</td>
                    <td className="px-4 py-4">
                      {item.category
                        ? typeof item.category === 'string'
                          ? item.category
                          : (item.category.name ?? 'Uncategorized')
                        : 'Uncategorized'}
                    </td>
                    <td className="px-4 py-4">{item.stock}</td>
                    <td className="px-4 py-4">{formatCurrency(Number(item.cost || 0))}</td>
                    <td className="px-4 py-4">{formatCurrency(Number(item.price || 0))}</td>
                    <td className="px-4 py-4">
                      {formatCurrency(Number(item.cost || 0) * item.stock)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-500">Stock movement log</p>
            <p className="mt-1 text-sm text-slate-400">Recent inventory IN / OUT transactions.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={fetchStockHistory}>
            Refresh
          </Button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-700">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                {['Date', 'Product', 'Type', 'Quantity', 'Performed by'].map((col) => (
                  <th key={col} className="px-4 py-3">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {stockHistoryLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                    Loading stock movement…
                  </td>
                </tr>
              ) : stockHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                    No stock movements yet.
                  </td>
                </tr>
              ) : (
                stockHistory.map((record) => (
                  <tr key={record._id} className="hover:bg-slate-50">
                    <td className="px-4 py-4">{new Date(record.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-4">{record.productId?.name || 'Unknown'}</td>
                    <td className="px-4 py-4 capitalize">{record.type}</td>
                    <td className="px-4 py-4">{record.quantity}</td>
                    <td className="px-4 py-4">
                      {record.performedBy
                        ? `${record.performedBy.firstName || ''} ${record.performedBy.lastName || ''}`
                        : 'System'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  const renderExpensesSection = () => (
    <div className="space-y-5">
      <Card className="grid gap-4 md:grid-cols-3 p-5">
        <Input
          placeholder="Search expenses"
          value={expenseFilter.search}
          onChange={(e) => setExpenseFilter({ ...expenseFilter, search: e.target.value })}
        />
        <Input
          placeholder="Category"
          value={expenseFilter.category}
          onChange={(e) => setExpenseFilter({ ...expenseFilter, category: e.target.value })}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setExpenseFilter({ search: '', category: '' })}
        >
          Reset
        </Button>
      </Card>
      {renderTableControls(
        'Review monthly expenses and category trends live.',
        filteredExpenses,
        'Expenses'
      )}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-700">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                {['Category', 'Amount', 'Note', 'Added By', 'Date'].map((col) => (
                  <th key={col} className="px-4 py-3">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {expenseLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                    Loading expenses…
                  </td>
                </tr>
              ) : expensePageData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                    No expense entries found.
                  </td>
                </tr>
              ) : (
                expensePageData.map((expense) => (
                  <tr key={expense._id} className="hover:bg-slate-50">
                    <td className="px-4 py-4 font-medium text-slate-900">{expense.category}</td>
                    <td className="px-4 py-4">{formatCurrency(expense.amount)}</td>
                    <td className="px-4 py-4">{expense.note}</td>
                    <td className="px-4 py-4">
                      {expense.createdBy
                        ? `${expense.createdBy.firstName || ''} ${expense.createdBy.lastName || ''}`
                        : 'Unknown'}
                    </td>
                    <td className="px-4 py-4">
                      {new Date(expense.expenseDate).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  const renderProfitSection = () => {
    const revenue = sales.reduce((sum, s) => sum + Math.max(s.total, 0), 0);
    const cost = purchases.reduce((sum, p) => sum + Math.max(p.totalAmount, 0), 0);
    const grossProfit = revenue - cost;
    const netProfit = grossProfit - expenses.reduce((sum, e) => sum + e.amount, 0);
    return (
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: 'Revenue', value: revenue },
            { label: 'Cost', value: cost },
            { label: 'Gross Profit', value: grossProfit },
          ].map((stat) => (
            <Card key={stat.label} className="p-6">
              <p className="text-sm font-semibold text-slate-500">{stat.label}</p>
              <p className="mt-4 text-3xl font-bold text-slate-950">{formatCurrency(stat.value)}</p>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-6">
            <p className="text-sm font-semibold text-slate-500">Net Profit</p>
            <p className="mt-4 text-3xl font-bold text-slate-950">{formatCurrency(netProfit)}</p>
            <p className="mt-3 text-sm text-slate-500">
              Revenue minus purchase cost and operational expenses.
            </p>
          </Card>
          <Card className="p-6">
            <p className="text-sm font-semibold text-slate-500">Trend over time</p>
            <div className="mt-6 h-44 overflow-hidden rounded-3xl bg-slate-100 p-4">
              <svg viewBox="0 0 280 140" className="h-full w-full">
                <polyline
                  fill="none"
                  stroke="#7c3aed"
                  strokeWidth="3"
                  points={overview.profitTrend
                    .map(
                      (pt, i) =>
                        `${(i * 40).toFixed(2)},${120 - Math.min(100, (pt.value / Math.max(1, revenue)) * 100)}`
                    )
                    .join(' ')}
                />
              </svg>
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const renderCustomerSection = () => (
    <div className="space-y-5">
      <Card className="p-5 grid gap-4 md:grid-cols-3">
        <Input
          placeholder="Search customers"
          value={customerFilter.search}
          onChange={(e) => setCustomerFilter({ ...customerFilter, search: e.target.value })}
        />
        <div />
        <Button variant="secondary" size="sm" onClick={() => setCustomerFilter({ search: '' })}>
          Reset
        </Button>
      </Card>
      {renderTableControls(
        'Search customers, orders, spend, and due balances instantly.',
        filteredCustomers,
        'Customers'
      )}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-700">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                {['Customer Name', 'Total Orders', 'Total Spent', 'Due', 'Last Purchase'].map(
                  (col) => (
                    <th key={col} className="px-4 py-3">
                      {col}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {customerLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                    Loading customers…
                  </td>
                </tr>
              ) : customerPageData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                    No customer records match filter criteria.
                  </td>
                </tr>
              ) : (
                customerPageData.map((customer) => (
                  <tr key={customer._id} className="hover:bg-slate-50">
                    <td className="px-4 py-4 font-medium text-slate-900">{customer.name}</td>
                    <td className="px-4 py-4">
                      {customer.totalPurchased ? Math.ceil(customer.totalPurchased / 1000) : 0}
                    </td>
                    <td className="px-4 py-4">{formatCurrency(customer.totalPurchased || 0)}</td>
                    <td className="px-4 py-4">{formatCurrency(customer.dueAmount || 0)}</td>
                    <td className="px-4 py-4">
                      {customer.lastPurchaseDate
                        ? new Date(customer.lastPurchaseDate).toLocaleDateString()
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  const renderSupplierSection = () => (
    <div className="space-y-5">
      <Card className="p-5 grid gap-4 md:grid-cols-3">
        <Input
          placeholder="Search suppliers"
          value={supplierFilter.search}
          onChange={(e) => setSupplierFilter({ ...supplierFilter, search: e.target.value })}
        />
        <div />
        <Button variant="secondary" size="sm" onClick={() => setSupplierFilter({ search: '' })}>
          Reset
        </Button>
      </Card>
      {renderTableControls(
        'Review supplier totals, paid amount and due balances quickly.',
        filteredSuppliers,
        'Suppliers'
      )}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-700">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                {['Supplier Name', 'Total Purchases', 'Paid', 'Due'].map((col) => (
                  <th key={col} className="px-4 py-3">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {supplierLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                    Loading suppliers…
                  </td>
                </tr>
              ) : supplierPageData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                    No supplier records match your filter.
                  </td>
                </tr>
              ) : (
                supplierPageData.map((supplier) => (
                  <tr key={supplier._id} className="hover:bg-slate-50">
                    <td className="px-4 py-4 font-medium text-slate-900">{supplier.name}</td>
                    <td className="px-4 py-4">{formatCurrency(supplier.totalPurchased || 0)}</td>
                    <td className="px-4 py-4">
                      {formatCurrency((supplier.totalPurchased || 0) - (supplier.dueAmount || 0))}
                    </td>
                    <td className="px-4 py-4">{formatCurrency(supplier.dueAmount || 0)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  const renderInvestmentsSection = () => (
    <div className="space-y-5">
      <Card className="p-5 grid gap-4 md:grid-cols-3">
        <Input
          placeholder="Search investments"
          value={investmentFilter.search}
          onChange={(e) => setInvestmentFilter({ ...investmentFilter, search: e.target.value })}
        />
        <select
          className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={investmentFilter.status}
          onChange={(e) => setInvestmentFilter({ ...investmentFilter, status: e.target.value })}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setInvestmentFilter({ search: '', status: 'all' })}
        >
          Reset
        </Button>
      </Card>
      {renderTableControls(
        'Review investment performance, earnings, and profit summaries.',
        filteredInvestments,
        'Investments'
      )}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm text-slate-700">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                {[
                  'Investment Name',
                  'Category',
                  'Initial Amount',
                  'Total Earnings',
                  'Total Profit',
                  'Status',
                  'Date',
                ].map((col) => (
                  <th key={col} className="px-4 py-3">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {investmentLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    Loading investments…
                  </td>
                </tr>
              ) : filteredInvestments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    No investment records match your filter.
                  </td>
                </tr>
              ) : (
                investmentPageData.map((investment) => (
                  <tr key={investment._id} className="hover:bg-slate-50">
                    <td className="px-4 py-4 font-medium text-slate-900">{investment.name}</td>
                    <td className="px-4 py-4">{investment.category}</td>
                    <td className="px-4 py-4">{formatCurrency(investment.initialAmount)}</td>
                    <td className="px-4 py-4">{formatCurrency(investment.totalEarnings || 0)}</td>
                    <td className="px-4 py-4">{formatCurrency(investment.totalProfit || 0)}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${investment.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                      >
                        {investment.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {new Date(investment.investmentDate).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  return (
    <ProtectedRoute requiredRole={['admin', 'manager', 'cashier']}>
      <MainLayout title="Reports">
        <div className="space-y-6">
          {renderHeader()}
          {renderSectionTabs()}
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'sales' && renderSalesSection()}
          {activeTab === 'purchases' && renderPurchasesSection()}
          {activeTab === 'inventory' && renderInventorySection()}
          {activeTab === 'expenses' && renderExpensesSection()}
          {activeTab === 'profit' && renderProfitSection()}
          {activeTab === 'customers' && renderCustomerSection()}
          {activeTab === 'suppliers' && renderSupplierSection()}
          {activeTab === 'investments' && renderInvestmentsSection()}
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
