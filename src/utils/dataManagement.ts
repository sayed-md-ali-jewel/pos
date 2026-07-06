import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { format } from 'date-fns';
import AdmZip from 'adm-zip';
import { Model } from 'mongoose';
import dbConnect from '@/config/database';
import User from '@/models/User';
import Product from '@/models/Product';
import Sale from '@/models/Sale';
import Investment from '@/models/Investment';
import Expense from '@/models/Expense';
import Purchase from '@/models/Purchase';
import Supplier from '@/models/Supplier';
import Customer from '@/models/Customer';
import StockMovement from '@/models/StockMovement';
import StockTransfer from '@/models/StockTransfer';
import WarrantyRepair from '@/models/WarrantyRepair';
import WarrantyRepairBatch from '@/models/WarrantyRepairBatch';
import Category from '@/models/Category';
import Brand from '@/models/Brand';
import Subcategory from '@/models/Subcategory';
import DataBackup from '@/models/DataBackup';
import DataImport from '@/models/DataImport';
import DataExport from '@/models/DataExport';
import { isValidEmail, saveFile, StorageProvider } from '@/utils/fileStorage';
import logger from '@/utils/logger';

export type BackupFormat = 'json' | 'csv' | 'zip';
export type ImportStrategy = 'merge' | 'overwrite' | 'skip';

const ENCRYPTION_KEY = process.env.BACKUP_ENCRYPTION_KEY;
const SUPPORTED_MODULES: Record<string, Model<any>> = {
  users: User,
  products: Product,
  sales: Sale,
  investments: Investment,
  expenses: Expense,
  purchases: Purchase,
  suppliers: Supplier,
  customers: Customer,
  stockmovements: StockMovement,
  stocktransfers: StockTransfer,
  warrantyrepairs: WarrantyRepair,
  warrantyrepairbatches: WarrantyRepairBatch,
  categories: Category,
  brands: Brand,
  subcategories: Subcategory,
};

const KEY_MODULES = Object.keys(SUPPORTED_MODULES);

function ensureModuleName(moduleName: string): string {
  const normalized = moduleName?.toLowerCase();
  if (!normalized) {
    throw new Error('Module name is required.');
  }
  if (!KEY_MODULES.includes(normalized)) {
    throw new Error(`Unsupported module: ${moduleName}`);
  }
  return normalized;
}

function normalizeList(modules?: string | string[]): string[] {
  if (!modules) {
    return KEY_MODULES;
  }

  if (typeof modules === 'string') {
    if (modules.toLowerCase() === 'all') {
      return KEY_MODULES;
    }
    return modules.split(',').map((item) => item.trim().toLowerCase());
  }

  return modules.map((item) => item.trim().toLowerCase());
}

function safeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9-_\.]/g, '-').replace(/-+/g, '-');
}

function buildFileName(prefix: string, ext: string): string {
  const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
  return `${safeFileName(prefix)}_${timestamp}.${ext}`;
}

function isGoogleDriveDestination(destinationPath?: string): boolean {
  return Boolean(destinationPath?.toLowerCase().includes('google drive'));
}

function assertDriveEmail(storageProvider: StorageProvider, driveEmail?: string) {
  if (storageProvider === 'drive' && !isValidEmail(driveEmail)) {
    throw new Error('A valid Drive email address is required.');
  }
}

function buildCsv(rows: any[]): string {
  if (!rows.length) {
    return '';
  }

  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const lines = [headers.join(',')];

  rows.forEach((row) => {
    const line = headers
      .map((header) => {
        let value = row[header];
        if (value === null || value === undefined) {
          return '';
        }
        if (typeof value === 'object') {
          value = JSON.stringify(value);
        }
        const stringValue = String(value).replace(/"/g, '""');
        return `"${stringValue}"`;
      })
      .join(',');
    lines.push(line);
  });

  return lines.join('\n');
}

function parseCsv(data: string): Record<string, any>[] {
  const normalized = data.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n').filter(Boolean);

  if (!lines.length) {
    return [];
  }

  const headers = lines[0].split(',').map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const columns = line.split(',');
    const record: Record<string, any> = {};
    headers.forEach((header, index) => {
      let cell = columns[index] ?? '';
      if (cell.startsWith('"') && cell.endsWith('"')) {
        cell = cell.slice(1, -1).replace(/""/g, '"');
      }
      record[header] = cell;
    });
    return record;
  });
}

function encryptBuffer(content: Buffer): Buffer {
  if (!ENCRYPTION_KEY) {
    throw new Error('Encryption key is not configured for backup encryption.');
  }

  const iv = crypto.randomBytes(16);
  const key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(content), cipher.final()]);
  return Buffer.concat([iv, encrypted]);
}

async function parseZipContent(buffer: Buffer, moduleName?: string): Promise<Record<string, any>> {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  const parsed: Record<string, any> = {};

  for (const entry of entries) {
    if (entry.isDirectory) {
      continue;
    }

    const entryName = entry.entryName.toLowerCase();
    const content = entry.getData().toString('utf8');
    const inferredKey = Object.keys(SUPPORTED_MODULES).find((module) =>
      entryName.startsWith(module)
    );
    const effectiveModule = moduleName || inferredKey;

    if (entryName.endsWith('.json')) {
      const parsedJson = JSON.parse(content);
      if (Array.isArray(parsedJson) && effectiveModule) {
        parsed[effectiveModule] = parsedJson;
      } else {
        Object.assign(parsed, parsedJson);
      }
      continue;
    }

    if (entryName.endsWith('.csv')) {
      const rows = parseCsv(content);
      if (effectiveModule) {
        parsed[effectiveModule] = rows;
      }
    }
  }

  return parsed;
}

function modelForModule(moduleName: string): Model<any> {
  const normalized = ensureModuleName(moduleName);
  return SUPPORTED_MODULES[normalized];
}

async function fetchModuleRecords(
  moduleName: string,
  filters: Record<string, any> = {}
): Promise<any[]> {
  const model = modelForModule(moduleName);
  const query: Record<string, any> = {};

  if (filters.fromDate || filters.toDate) {
    query.createdAt = {};
    if (filters.fromDate) {
      query.createdAt.$gte = new Date(filters.fromDate);
    }
    if (filters.toDate) {
      query.createdAt.$lte = new Date(filters.toDate);
    }
  }

  if (moduleName === 'users' && filters.role) {
    query.role = filters.role;
  }

  return model.find(query).lean();
}

function determineUniqueFilter(moduleName: string, item: any): Record<string, any> | null {
  if (item._id) {
    return { _id: item._id };
  }
  switch (moduleName) {
    case 'users':
      if (item.email) return { email: String(item.email).toLowerCase() };
      break;
    case 'products':
      if (item.sku) return { sku: item.sku };
      if (item.productSku) return { sku: item.productSku };
      break;
    case 'customers':
      if (item.phone) return { phone: item.phone };
      if (item.email) return { email: item.email };
      break;
    case 'suppliers':
    case 'brands':
    case 'categories':
    case 'subcategories':
      if (item.name) return { name: item.name };
      break;
    case 'sales':
      if (item.invoiceNumber) return { invoiceNumber: item.invoiceNumber };
      break;
    case 'purchases':
      if (item.invoiceNumber) return { invoiceNumber: item.invoiceNumber };
      break;
    default:
      if (item._id) return { _id: item._id };
  }

  return null;
}

function normalizeImportData(data: any, moduleName?: string): Record<string, any[]> {
  if (Array.isArray(data)) {
    if (!moduleName) {
      throw new Error('CSV import requires module to be specified when the payload is an array.');
    }
    return { [moduleName]: data };
  }

  if (typeof data !== 'object' || data === null) {
    throw new Error('Import payload must be an object or array.');
  }

  const normalized: Record<string, any[]> = {};
  for (const key of Object.keys(data)) {
    if (KEY_MODULES.includes(key.toLowerCase()) && Array.isArray(data[key])) {
      normalized[key.toLowerCase()] = data[key];
    }
  }

  if (!Object.keys(normalized).length && moduleName && Array.isArray(data)) {
    normalized[moduleName] = data;
  }

  return normalized;
}

export async function createBackup(options: {
  modules?: string | string[];
  format?: BackupFormat;
  encrypt?: boolean;
  storageProvider?: StorageProvider;
  destinationPath?: string;
  driveEmail?: string;
  type?: 'manual' | 'auto';
  userId: string;
  userEmail?: string;
  filters?: Record<string, any>;
  notes?: string;
}): Promise<{
  backupLog: any;
  filePath: string;
  fileName: string;
  fileSize: number;
}> {
  await dbConnect();

  const modules = normalizeList(options.modules);
  const formatType = options.format || 'json';
  const provider = options.storageProvider || 'local';
  const omitJsonFiles =
    provider === 'drive' ||
    (provider === 'local' && isGoogleDriveDestination(options.destinationPath));
  assertDriveEmail(provider, options.driveEmail);
  if (omitJsonFiles && formatType === 'json') {
    throw new Error('Google Drive backups cannot be stored as JSON files. Choose CSV or ZIP.');
  }
  const fileName = buildFileName(
    `backup-${modules.join('+')}`,
    formatType === 'zip' ? 'zip' : formatType
  );

  const payload: Record<string, any> = {};
  for (const moduleName of modules) {
    payload[moduleName] = await fetchModuleRecords(moduleName, options.filters || {});
  }

  let archiveBuffer: Buffer;
  if (formatType === 'json') {
    archiveBuffer = Buffer.from(JSON.stringify(payload, null, 2), 'utf8');
  } else if (formatType === 'csv') {
    if (modules.length !== 1) {
      throw new Error('CSV backup only supports a single module at a time.');
    }
    archiveBuffer = Buffer.from(buildCsv(payload[modules[0]]), 'utf8');
  } else {
    const zip = new AdmZip();
    if (!omitJsonFiles) {
      zip.addFile('backup.json', Buffer.from(JSON.stringify(payload, null, 2), 'utf8'));
    }
    for (const moduleName of modules) {
      const csv = buildCsv(payload[moduleName]);
      zip.addFile(`${moduleName}.csv`, Buffer.from(csv, 'utf8'));
    }
    archiveBuffer = zip.toBuffer();
  }

  let finalBuffer = archiveBuffer;
  let encrypted = false;
  if (options.encrypt) {
    finalBuffer = encryptBuffer(archiveBuffer);
    encrypted = true;
  }

  const { filePath, fileSize, verification } = await saveFile(
    fileName,
    finalBuffer,
    provider,
    options.destinationPath,
    options.driveEmail
  );
  const backupLog = await DataBackup.create({
    createdBy: options.userId,
    userEmail: options.userEmail,
    modules,
    backupType: options.type || 'manual',
    format: formatType,
    storageProvider: provider,
    fileName,
    filePath,
    fileSize,
    encrypted,
    status: 'completed',
    notes: options.notes,
    destinationPath: options.destinationPath,
    meta: {
      driveEmail: options.driveEmail,
      verification,
    },
  });

  return { backupLog, filePath, fileName, fileSize };
}

export async function listBackups(filters: Record<string, any> = {}) {
  await dbConnect();
  const query: Record<string, any> = {};
  if (filters.userId) query.createdBy = filters.userId;
  if (filters.status) query.status = filters.status;
  if (filters.module) query.modules = filters.module;
  return DataBackup.find(query).sort({ createdAt: -1 }).lean();
}

export async function parseImportFile(
  buffer: Buffer,
  fileName: string,
  moduleName?: string,
  strategy: ImportStrategy = 'merge',
  validateOnly = false,
  userId?: string,
  userEmail?: string
): Promise<any> {
  await dbConnect();

  const lowerName = fileName.toLowerCase();
  let payload: Record<string, any> = {};

  if (lowerName.endsWith('.json')) {
    payload = JSON.parse(buffer.toString('utf8'));
  } else if (lowerName.endsWith('.csv')) {
    payload = normalizeImportData(parseCsv(buffer.toString('utf8')), moduleName);
  } else if (lowerName.endsWith('.zip')) {
    payload = await parseZipContent(buffer, moduleName);
  } else {
    throw new Error('Unsupported import format. Allowed types: JSON, CSV, ZIP.');
  }

  const normalized = normalizeImportData(payload, moduleName);
  if (!Object.keys(normalized).length) {
    throw new Error('Import file did not contain valid module arrays.');
  }

  const importLog = await DataImport.create({
    createdBy: userId!,
    userEmail,
    sourceFileName: fileName,
    sourceFormat: lowerName.endsWith('.csv') ? 'csv' : lowerName.endsWith('.zip') ? 'zip' : 'json',
    module: moduleName,
    strategy,
    status: validateOnly ? 'completed' : 'running',
    records: validateOnly ? { validatedModules: Object.keys(normalized).length } : {},
  });

  if (validateOnly) {
    return {
      valid: true,
      modules: Object.keys(normalized),
      counts: Object.fromEntries(
        Object.entries(normalized).map(([key, list]) => [key, list.length])
      ),
    };
  }

  const result = {
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [] as string[],
    details: {} as Record<string, any>,
  };

  try {
    for (const key of Object.keys(normalized)) {
      const moduleItems = normalized[key];
      const model = modelForModule(key);
      const moduleResult = await importModuleData(model, key, moduleItems, strategy);
      result.processed += moduleResult.processed;
      result.created += moduleResult.created;
      result.updated += moduleResult.updated;
      result.skipped += moduleResult.skipped;
      result.details[key] = moduleResult;
    }

    importLog.status = 'completed';
    importLog.records = {
      processed: result.processed,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
    };
    importLog.meta = result.details;
    await importLog.save();

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import failed';
    logger.error({ err: error, fileName }, 'Import failed');
    importLog.status = 'failed';
    importLog.errors = [message];
    importLog.meta = { processed: result.processed };
    await importLog.save();
    throw error;
  }
}

export async function importFromFilePath(
  filePath: string,
  moduleName?: string,
  strategy: ImportStrategy = 'merge',
  userId?: string,
  userEmail?: string
) {
  const buffer = await fs.readFile(filePath);
  return parseImportFile(
    buffer,
    path.basename(filePath),
    moduleName,
    strategy,
    false,
    userId,
    userEmail
  );
}

async function importModuleData(
  model: Model<any>,
  moduleName: string,
  items: any[],
  strategy: ImportStrategy
): Promise<{ processed: number; created: number; updated: number; skipped: number }> {
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const rawItem of items) {
    const item = { ...rawItem };
    const query = determineUniqueFilter(moduleName, item);
    let existing = null;

    if (query) {
      existing = await model.findOne(query);
    }

    if (existing) {
      if (strategy === 'skip') {
        skipped += 1;
        continue;
      }
      if (strategy === 'overwrite') {
        await model.replaceOne({ _id: existing._id }, item);
        updated += 1;
      } else {
        await model.updateOne({ _id: existing._id }, { $set: item });
        updated += 1;
      }
    } else {
      await model.create(item);
      created += 1;
    }
  }

  return { processed: items.length, created, updated, skipped };
}

export async function listImports(filters: Record<string, any> = {}) {
  await dbConnect();
  const query: Record<string, any> = {};
  if (filters.userId) query.createdBy = filters.userId;
  if (filters.status) query.status = filters.status;
  return DataImport.find(query).sort({ createdAt: -1 }).lean();
}

export async function exportData(
  moduleName: string,
  format: BackupFormat,
  filters: Record<string, any> = {}
): Promise<{
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  filePath?: string;
  fileSize?: number;
}> {
  await dbConnect();
  const normalizedModule = ensureModuleName(moduleName);
  const records = await fetchModuleRecords(normalizedModule, filters);
  const safeName = safeFileName(`export-${normalizedModule}`);

  if (format !== 'json' && format !== 'csv') {
    throw new Error('Unsupported export format. Allowed formats are json and csv.');
  }

  const ext = format === 'csv' ? 'csv' : 'json';
  const fileName = buildFileName(safeName, ext);

  if (format === 'csv') {
    return {
      buffer: Buffer.from(buildCsv(records), 'utf8'),
      fileName,
      mimeType: 'text/csv',
    };
  }

  return {
    buffer: Buffer.from(JSON.stringify(records, null, 2), 'utf8'),
    fileName,
    mimeType: 'application/json',
  };
}

export async function createExportRecord(options: {
  module: string;
  format: BackupFormat;
  filters?: Record<string, any>;
  storageProvider?: StorageProvider;
  driveEmail?: string;
  buffer: Buffer;
  fileName: string;
  userId: string;
  userEmail?: string;
  notes?: string;
}) {
  const provider = options.storageProvider || 'local';
  assertDriveEmail(provider, options.driveEmail);
  if (provider === 'drive' && options.format === 'json') {
    throw new Error('Drive exports cannot be stored as JSON files. Choose CSV.');
  }
  const { filePath, fileSize, verification } = await saveFile(
    options.fileName,
    options.buffer,
    provider,
    undefined,
    options.driveEmail
  );
  return DataExport.create({
    createdBy: options.userId,
    userEmail: options.userEmail,
    module: options.module,
    format: options.format,
    filters: options.filters || {},
    storageProvider: provider,
    fileName: options.fileName,
    filePath,
    fileSize,
    status: 'completed',
    notes: options.notes,
    meta: {
      driveEmail: options.driveEmail,
      verification,
    },
  });
}

export async function listExports(filters: Record<string, any> = {}) {
  await dbConnect();
  const query: Record<string, any> = {};
  if (filters.userId) query.createdBy = filters.userId;
  if (filters.status) query.status = filters.status;
  if (filters.module) query.module = filters.module;
  return DataExport.find(query).sort({ createdAt: -1 }).lean();
}

export async function resolveCronExpression(scheduleValue: string): Promise<string> {
  const normalized = scheduleValue.trim().toLowerCase();
  switch (normalized) {
    case 'hourly':
      return '0 * * * *';
    case 'daily':
      return '0 0 * * *';
    case 'weekly':
      return '0 0 * * 0';
    case 'monthly':
      return '0 0 1 * *';
    default:
      return scheduleValue;
  }
}
