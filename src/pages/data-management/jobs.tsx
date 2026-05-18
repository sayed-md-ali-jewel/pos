import axios from 'axios';
import { FormEvent, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import MainLayout from '@/components/Layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';

const MODULE_OPTIONS = [
  'all',
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
  'branches',
];
const AVAILABLE_MODULES = MODULE_OPTIONS.filter((moduleName) => moduleName !== 'all');

const JOB_TYPES = ['backup', 'export'] as const;
const FORMAT_OPTIONS = ['json', 'csv', 'zip'] as const;
const SCHEDULE_TYPES = ['cron', 'once'] as const;
type StorageProvider = 'local' | 'drive';

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export default function DataManagementJobsPage() {
  const auth = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [type, setType] = useState<(typeof JOB_TYPES)[number]>('backup');
  const [name, setName] = useState('');
  const [scheduleType, setScheduleType] = useState<(typeof SCHEDULE_TYPES)[number]>('cron');
  const [scheduleValue, setScheduleValue] = useState('daily');
  const [timezone, setTimezone] = useState('UTC');
  const [isRecurring, setIsRecurring] = useState(true);
  const [moduleName, setModuleName] = useState('products');
  const [selectedModules, setSelectedModules] = useState<string[]>(AVAILABLE_MODULES);
  const [format, setFormat] = useState<(typeof FORMAT_OPTIONS)[number]>('json');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [role, setRole] = useState('');
  const [storageProvider, setStorageProvider] = useState<StorageProvider>('local');
  const [driveEmail, setDriveEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!auth.token) return;
    fetchJobs();
  }, [auth.token]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/data-management/jobs', {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      setJobs(response.data.response || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleModuleToggle = (module: string) => {
    if (module === 'all') {
      setSelectedModules(AVAILABLE_MODULES);
      return;
    }

    setSelectedModules((current) => {
      const next = current.includes(module)
        ? current.filter((item) => item !== module)
        : [...current.filter((item) => item !== 'all'), module];
      return next.length ? next : AVAILABLE_MODULES;
    });
  };

  const handleSelectAll = () => setSelectedModules(AVAILABLE_MODULES);
  const handleDeselectAll = () => setSelectedModules([]);

  const handleCreateJob = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!auth.token) {
      toast.error('Authentication required.');
      return;
    }
    if (storageProvider === 'drive' && !isValidEmail(driveEmail)) {
      toast.error('Enter a valid Drive email address.');
      return;
    }
    if (storageProvider === 'drive' && format === 'json') {
      toast.error(
        `Drive Storage ${type}s cannot use JSON format. Choose CSV${type === 'backup' ? ' or ZIP' : ''}.`
      );
      return;
    }
    if (type === 'backup' && format === 'csv' && selectedModules.length !== 1) {
      toast.error('CSV backups support one module at a time. Choose ZIP for multiple modules.');
      return;
    }
    if (type === 'backup' && !selectedModules.length) {
      toast.error('Select at least one module to back up.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {};
      if (type === 'backup') {
        payload.modules = selectedModules.includes('all') ? AVAILABLE_MODULES : selectedModules;
        payload.format = format;
        payload.storageProvider = storageProvider;
        if (storageProvider === 'drive') payload.driveEmail = driveEmail.trim();
      } else {
        payload.module = moduleName;
        payload.format = format;
        payload.filters = {} as any;
        if (fromDate) payload.filters.fromDate = fromDate;
        if (toDate) payload.filters.toDate = toDate;
        if (role) payload.filters.role = role;
        payload.storageProvider = storageProvider;
        if (storageProvider === 'drive') payload.driveEmail = driveEmail.trim();
      }

      await axios.post(
        '/api/data-management/jobs',
        {
          type,
          name: name || `${type.charAt(0).toUpperCase() + type.slice(1)} job`,
          scheduleType,
          scheduleValue,
          timezone,
          isRecurring,
          payload,
        },
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        }
      );

      toast.success('Scheduled job created successfully');
      setName('');
      fetchJobs();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create job');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MainLayout title="Data Management — Scheduled Jobs">
      <section className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold text-slate-900">Scheduled Jobs</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-600">
            Create and review scheduled backup and export jobs for the POS system.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <form
            onSubmit={handleCreateJob}
            className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
          >
            <h2 className="text-xl font-semibold text-slate-900">New scheduled job</h2>
            <div className="mt-6 space-y-5">
              <label className="block text-sm font-medium text-slate-700">
                Job name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Optional custom name"
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Job type
                  <select
                    value={type}
                    onChange={(event) => setType(event.target.value as typeof type)}
                    className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  >
                    {JOB_TYPES.map((option) => (
                      <option key={option} value={option}>
                        {option.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </label>

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
              </div>

              <label className="block text-sm font-medium text-slate-700">
                Schedule value
                <input
                  value={scheduleValue}
                  onChange={(event) => setScheduleValue(event.target.value)}
                  placeholder="daily, hourly, or cron expression"
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Timezone
                <input
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </label>

              <div>
                <label className="block text-sm font-medium text-slate-700">Storage</label>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {[
                    ['local', 'Local Storage', 'Save to the configured backup folder.'],
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

              {type === 'backup' ? (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="block text-sm font-medium text-slate-700">Modules</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAll}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {MODULE_OPTIONS.map((module) => (
                      <label
                        key={module}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition hover:border-slate-300"
                      >
                        <input
                          type="checkbox"
                          checked={
                            module === 'all'
                              ? selectedModules.includes('all') ||
                                AVAILABLE_MODULES.every((moduleName) =>
                                  selectedModules.includes(moduleName)
                                )
                              : selectedModules.includes(module)
                          }
                          onChange={() => handleModuleToggle(module)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{module === 'all' ? 'All modules' : module}</span>
                      </label>
                    ))}
                  </div>

                  <label className="mt-4 block text-sm font-medium text-slate-700">
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
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Module
                    <select
                      value={moduleName}
                      onChange={(event) => setModuleName(event.target.value)}
                      className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    >
                      {MODULE_OPTIONS.filter((item) => item !== 'all').map((module) => (
                        <option key={module} value={module}>
                          {module}
                        </option>
                      ))}
                    </select>
                  </label>
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
                    Role (users exports)
                    <input
                      value={role}
                      onChange={(event) => setRole(event.target.value)}
                      placeholder="admin, manager, cashier"
                      className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </label>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Creating job...' : 'Create scheduled job'}
            </button>
          </form>

          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Scheduled jobs</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Track all scheduled backup/export jobs.
                </p>
              </div>
              <button
                type="button"
                onClick={fetchJobs}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Refresh
              </button>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Schedule</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-sm text-slate-500">
                        Loading scheduled jobs...
                      </td>
                    </tr>
                  ) : jobs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-sm text-slate-500">
                        No scheduled jobs configured yet.
                      </td>
                    </tr>
                  ) : (
                    jobs.map((job) => (
                      <tr key={job._id} className="hover:bg-slate-50">
                        <td className="px-4 py-4 text-slate-700">
                          {new Date(job.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-4 text-slate-700">{job.name}</td>
                        <td className="px-4 py-4 text-slate-700 capitalize">{job.type}</td>
                        <td className="px-4 py-4 text-slate-700">
                          {job.scheduleType}: {job.scheduleValue}
                        </td>
                        <td className="px-4 py-4 text-slate-700 capitalize">{job.status}</td>
                        <td className="px-4 py-4 text-slate-700">
                          <pre className="max-h-28 overflow-auto text-xs text-slate-600">
                            {JSON.stringify(job.payload || {}, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>
    </MainLayout>
  );
}
