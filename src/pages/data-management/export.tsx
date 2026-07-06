import axios from 'axios';
import { useState } from 'react';
import toast from 'react-hot-toast';
import MainLayout from '@/components/Layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';

const MODULE_OPTIONS = [
  'users',
  'products',
  'sales',
  'investments',
  'expenses',
  'purchases',
  'suppliers',
  'customers',
  'stockmovements',
  'stocktransfers',
  'warrantyrepairs',
  'warrantyrepairbatches',
  'categories',
  'brands',
  'subcategories',
];

const FORMAT_OPTIONS = ['json', 'csv'] as const;
const SCHEDULE_TYPES = ['cron', 'once'] as const;
type StorageProvider = 'local' | 'drive';

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export default function DataManagementExportPage() {
  const auth = useAuth();
  const [moduleName, setModuleName] = useState('products');
  const [format, setFormat] = useState<(typeof FORMAT_OPTIONS)[number]>('json');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [role, setRole] = useState('');
  const [scheduleType, setScheduleType] = useState<(typeof SCHEDULE_TYPES)[number]>('cron');
  const [scheduleValue, setScheduleValue] = useState('daily');
  const [timezone, setTimezone] = useState('UTC');
  const [isRecurring, setIsRecurring] = useState(true);
  const [storageProvider, setStorageProvider] = useState<StorageProvider>('local');
  const [driveEmail, setDriveEmail] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExportNow = async () => {
    if (!auth.token) {
      toast.error('Authentication required.');
      return;
    }
    if (!moduleName) {
      toast.error('Please select a module to export.');
      return;
    }
    if (storageProvider === 'drive' && !isValidEmail(driveEmail)) {
      toast.error('Enter a valid Drive email address.');
      return;
    }
    if (storageProvider === 'drive' && format === 'json') {
      toast.error('Drive Storage exports cannot use JSON format. Choose CSV.');
      return;
    }

    setExporting(true);
    try {
      const params: any = {
        module: moduleName,
        format,
        storageProvider,
      };
      if (storageProvider === 'drive') params.driveEmail = driveEmail.trim();
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      if (role) params.role = role;

      const response = await axios.get('/api/data-management/export', {
        headers: { Authorization: `Bearer ${auth.token}` },
        responseType: 'blob',
        params,
      });

      const contentDisposition = response.headers['content-disposition'] || '';
      const downloadName =
        contentDisposition.match(/filename="(.+)"/)?.[1] || `export-${moduleName}.${format}`;
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', downloadName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(
        storageProvider === 'drive'
          ? 'Export saved to Drive Storage and verified.'
          : 'Export downloaded successfully'
      );
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleScheduleExport = async () => {
    if (!auth.token) {
      toast.error('Authentication required.');
      return;
    }
    if (!moduleName) {
      toast.error('Please select a module to schedule.');
      return;
    }
    if (storageProvider === 'drive' && !isValidEmail(driveEmail)) {
      toast.error('Enter a valid Drive email address.');
      return;
    }
    if (storageProvider === 'drive' && format === 'json') {
      toast.error('Drive Storage exports cannot use JSON format. Choose CSV.');
      return;
    }

    setScheduling(true);
    try {
      const filters: any = {};
      if (fromDate) filters.fromDate = fromDate;
      if (toDate) filters.toDate = toDate;
      if (role) filters.role = role;

      await axios.post(
        '/api/data-management/export',
        {
          module: moduleName,
          format,
          scheduleType,
          scheduleValue,
          timezone,
          isRecurring,
          filters,
          storageProvider,
          driveEmail: storageProvider === 'drive' ? driveEmail.trim() : undefined,
          notes: 'Scheduled export created from UI',
        },
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        }
      );

      toast.success('Export scheduled successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Scheduling failed');
    } finally {
      setScheduling(false);
    }
  };

  return (
    <MainLayout title="Data Management — Export">
      <section className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold text-slate-900">Export</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-600">
            Export module data as JSON or CSV, filter by date range and role, and schedule exports
            for later delivery.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Instant export</h2>
            <div className="mt-6 space-y-5">
              <label className="block text-sm font-medium text-slate-700">
                Module
                <select
                  value={moduleName}
                  onChange={(event) => setModuleName(event.target.value)}
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                >
                  {MODULE_OPTIONS.map((module) => (
                    <option key={module} value={module}>
                      {module}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Format
                <select
                  value={format}
                  onChange={(event) => setFormat(event.target.value as typeof format)}
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                >
                  {FORMAT_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <label className="block text-sm font-medium text-slate-700">Storage</label>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {[
                    ['local', 'Local Storage', 'Download and save locally.'],
                    ['drive', 'Drive Storage', 'Save to the target email drive.'],
                  ].map(([value, label, description]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setStorageProvider(value as StorageProvider)}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        storageProvider === value
                          ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <span className="block text-sm font-semibold text-slate-900">{label}</span>
                      <span className="mt-1 block text-xs text-slate-500">{description}</span>
                    </button>
                  ))}
                </div>
                <div
                  className={`grid transition-all duration-200 ${
                    storageProvider === 'drive'
                      ? 'mt-3 grid-rows-[1fr] opacity-100'
                      : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <input
                      type="email"
                      value={driveEmail}
                      onChange={(event) => setDriveEmail(event.target.value)}
                      placeholder="owner@example.com"
                      className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                    {driveEmail && !isValidEmail(driveEmail) && (
                      <p className="mt-2 text-xs font-medium text-red-600">
                        Enter a valid Drive email address.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  From date
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(event) => setFromDate(event.target.value)}
                    className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  To date
                  <input
                    type="date"
                    value={toDate}
                    onChange={(event) => setToDate(event.target.value)}
                    className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
              </div>

              <label className="block text-sm font-medium text-slate-700">
                Role (users only)
                <input
                  type="text"
                  placeholder="admin, manager, cashier"
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={handleExportNow}
              disabled={exporting}
              className="mt-6 inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting ? 'Exporting...' : 'Download export'}
            </button>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Schedule export</h2>
            <div className="mt-6 space-y-5">
              <label className="block text-sm font-medium text-slate-700">
                Schedule type
                <select
                  value={scheduleType}
                  onChange={(event) => setScheduleType(event.target.value as typeof scheduleType)}
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                >
                  {SCHEDULE_TYPES.map((option) => (
                    <option key={option} value={option}>
                      {option.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Schedule value
                <input
                  type="text"
                  value={scheduleValue}
                  onChange={(event) => setScheduleValue(event.target.value)}
                  placeholder="daily, hourly, 0 0 * * *"
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Timezone
                <input
                  type="text"
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </label>

              <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(event) => setIsRecurring(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Recurring schedule
              </label>
            </div>
            <button
              type="button"
              onClick={handleScheduleExport}
              disabled={scheduling}
              className="mt-6 inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {scheduling ? 'Scheduling...' : 'Schedule export'}
            </button>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
