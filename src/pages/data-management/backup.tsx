'use client';

import axios from 'axios';
import { FormEvent, useCallback, useEffect, useState } from 'react';
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
];
const AVAILABLE_MODULES = MODULE_OPTIONS.filter((m) => m !== 'all');

const FORMAT_OPTIONS = ['json', 'csv', 'zip'] as const;
type StorageProvider = 'local' | 'drive';

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const MODULE_ICONS: Record<string, string> = {
  all: '⊞',
  users: '👤',
  products: '📦',
  sales: '💳',
  investments: '📈',
  expenses: '💸',
  purchases: '🛒',
  suppliers: '🏭',
  customers: '🤝',
  stockmovements: '🔄',
  stocktransfers: '↔️',
  warrantyrepairs: '🔧',
  warrantyrepairbatches: '🗂',
  categories: '🏷',
  brands: '✦',
  subcategories: '◈',
};

const formatBackupDate = (value?: string) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(value));
};

const formatBackupTime = (value?: string) => {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(value));
};

const statusConfig: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  success: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    border: 'border-emerald-200',
  },
  failed: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', border: 'border-red-200' },
  pending: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-400',
    border: 'border-amber-200',
  },
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10.5px] font-semibold tracking-widest uppercase text-slate-400 mb-2.5">
      {children}
    </p>
  );
}

function Toggle({
  on,
  onClick,
  label,
  description,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
  description?: string;
}) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 cursor-pointer select-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 hover:border-indigo-200 hover:bg-indigo-50/40 transition-all duration-150"
    >
      <div
        className={`relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0 ${on ? 'bg-indigo-500' : 'bg-slate-200'}`}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${on ? 'translate-x-4' : 'translate-x-0.5'}`}
        />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-700 leading-tight">{label}</p>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
    </div>
  );
}

export default function DataManagementBackupPage() {
  const auth = useAuth();
  const [selectedModules, setSelectedModules] = useState<string[]>(AVAILABLE_MODULES);
  const [format, setFormat] = useState<'json' | 'csv' | 'zip'>('json');
  const [storageProvider, setStorageProvider] = useState<StorageProvider>('local');
  const [destinationPath, setDestinationPath] = useState('backups');
  const [driveEmail, setDriveEmail] = useState('');
  const [selectedDirHandle, setSelectedDirHandle] = useState<any>(null);
  const [encrypt, setEncrypt] = useState(false);
  const [notes, setNotes] = useState('');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleValue, setScheduleValue] = useState('0 0 * * *');
  const [timezone, setTimezone] = useState('UTC');
  const [isRecurring, setIsRecurring] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [canUseDirectoryPicker, setCanUseDirectoryPicker] = useState(false);

  useEffect(() => {
    setCanUseDirectoryPicker('showDirectoryPicker' in window);
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/data-management/backup', {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      setHistory(res.data.response || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load backup history');
    } finally {
      setLoading(false);
    }
  }, [auth.token]);

  useEffect(() => {
    if (!auth.token) return;
    fetchHistory();
  }, [auth.token, fetchHistory]);

  const handleModuleToggle = (mod: string) => {
    if (mod === 'all') {
      setSelectedModules(AVAILABLE_MODULES);
      return;
    }
    setSelectedModules((cur) => {
      const next = cur.includes(mod)
        ? cur.filter((m) => m !== mod)
        : [...cur.filter((m) => m !== 'all'), mod];
      return next.length ? next : AVAILABLE_MODULES;
    });
  };

  const buildPayload = () => ({
    modules: selectedModules,
    format,
    storageProvider,
    destinationPath: storageProvider === 'local' ? destinationPath : undefined,
    driveEmail: storageProvider === 'drive' ? driveEmail.trim() : undefined,
    encrypt,
    notes,
  });

  const validate = () => {
    if (!selectedModules.length) {
      toast.error('Select at least one module to back up.');
      return false;
    }
    if (storageProvider === 'local' && !destinationPath.trim()) {
      toast.error('Please choose a local save destination.');
      return false;
    }
    if (storageProvider === 'local' && destinationPath.includes('..')) {
      toast.error('Destination path cannot contain ..');
      return false;
    }
    if (storageProvider === 'drive' && !isValidEmail(driveEmail)) {
      toast.error('Enter a valid Drive email address.');
      return false;
    }
    if (storageProvider === 'drive' && format === 'json') {
      toast.error('Drive backups cannot use JSON format. Choose CSV or ZIP.');
      return false;
    }
    if (format === 'csv' && selectedModules.length !== 1) {
      toast.error('CSV backups support one module at a time. Choose ZIP for multiple.');
      return false;
    }
    return true;
  };

  const handleCreateBackup = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth.token) {
      toast.error('Authentication required.');
      return;
    }
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await axios.post('/api/data-management/backup', buildPayload(), {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      const verified = res.data?.response?.meta?.verification?.verified;
      toast.success(
        verified ? 'Backup exported and verified successfully.' : 'Backup created successfully.'
      );
      setNotes('');
      setEncrypt(false);
      fetchHistory();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Backup creation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleScheduleBackup = async () => {
    if (!auth.token) {
      toast.error('Authentication required.');
      return;
    }
    if (!validate()) return;
    if (!scheduleValue.trim()) {
      toast.error('Enter a schedule time or cron expression.');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(
        '/api/data-management/jobs',
        {
          type: 'backup',
          name: `Backup to ${storageProvider === 'drive' ? 'Drive' : 'Local Storage'}`,
          scheduleType: 'cron',
          scheduleValue,
          timezone,
          isRecurring,
          payload: buildPayload(),
        },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      toast.success('Automatic backup scheduled successfully.');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Backup scheduling failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBrowse = async () => {
    if (!canUseDirectoryPicker) {
      toast.error('Directory selection not available in this browser.');
      return;
    }
    try {
      const handle = await (window as any).showDirectoryPicker();
      if (handle?.name) {
        setSelectedDirHandle(handle);
        setDestinationPath(handle.name.trim());
        toast.success(`Selected: ${handle.name}`);
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') toast.error('Unable to select a local destination.');
    }
  };

  const allSelected = AVAILABLE_MODULES.every((m) => selectedModules.includes(m));

  return (
    <MainLayout title="Data Management — Backup">
      <div className="pb-16 font-sans">
        {/* ── Header ── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-[17px] shadow-lg shadow-indigo-200 flex-shrink-0">
              🗄
            </div>
            <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight">Backup</h1>
          </div>
          <p className="text-[13.5px] text-slate-500 pl-12">
            Create manual backups and review history for your POS data.
          </p>
        </div>

        {/* ── Grid ── */}
        <div
          className="grid gap-5"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}
        >
          {/* ── Create Backup ── */}
          <form
            onSubmit={handleCreateBackup}
            className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-sm shadow-slate-100 p-7 flex flex-col gap-6"
          >
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900 mb-0.5">Create Backup</h2>
              <p className="text-xs text-slate-400">Configure and trigger a new backup</p>
            </div>

            {/* Modules */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <SectionLabel>Modules</SectionLabel>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedModules(AVAILABLE_MODULES)}
                    className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-150"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedModules([])}
                    className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-all duration-150"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {MODULE_OPTIONS.map((mod) => {
                  const active = mod === 'all' ? allSelected : selectedModules.includes(mod);
                  return (
                    <button
                      key={mod}
                      type="button"
                      onClick={() => handleModuleToggle(mod)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-medium border transition-all duration-150 select-none
                        ${
                          active
                            ? 'border-indigo-400 bg-indigo-50 text-indigo-700 font-semibold'
                            : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-600'
                        }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? 'bg-indigo-500' : 'bg-slate-300'}`}
                      />
                      <span className="text-[10px]">{MODULE_ICONS[mod]}</span>
                      {mod === 'all' ? 'All' : mod}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Storage Provider */}
            <div>
              <SectionLabel>Storage</SectionLabel>
              <div className="grid grid-cols-2 gap-2.5">
                {(['local', 'drive'] as StorageProvider[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setStorageProvider(p)}
                    className={`text-left border rounded-2xl px-4 py-3.5 transition-all duration-200
                      ${
                        storageProvider === p
                          ? 'border-indigo-400 bg-indigo-50/60 shadow-md shadow-indigo-100'
                          : 'border-slate-200 bg-white hover:border-indigo-200 hover:-translate-y-0.5 hover:shadow-sm'
                      }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className={`w-2 h-2 rounded-full ${storageProvider === p ? 'bg-indigo-500' : 'bg-slate-300'} transition-colors`}
                      />
                      <span className="text-[13px] font-bold text-slate-800">
                        {p === 'local' ? 'Local Storage' : 'Drive Storage'}
                      </span>
                    </div>
                    <p className="text-[11.5px] text-slate-500 leading-relaxed pl-4">
                      {p === 'local'
                        ? 'Save to configured server folder.'
                        : 'Export to Drive via email.'}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Format */}
            <div>
              <SectionLabel>Format</SectionLabel>
              <div className="relative">
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as typeof format)}
                  className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[13.5px] text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer font-medium"
                >
                  {FORMAT_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o.toUpperCase()}
                    </option>
                  ))}
                </select>
                <svg
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none"
                  viewBox="0 0 12 8"
                  fill="none"
                >
                  <path
                    d="M1 1L6 7L11 1"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>

            {/* Local Destination */}
            <div
              className={`overflow-hidden transition-all duration-300 ${storageProvider === 'local' ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}
            >
              <SectionLabel>Destination folder</SectionLabel>
              <div className="flex gap-2 flex-wrap">
                <div className="flex flex-1 min-w-44 items-center border border-slate-200 rounded-xl overflow-hidden focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                  <span className="px-3 py-2.5 text-[12px] text-slate-400 font-mono bg-slate-50 border-r border-slate-200 whitespace-nowrap select-none">
                    ~/
                  </span>
                  <input
                    type="text"
                    value={destinationPath}
                    onChange={(e) => setDestinationPath(e.target.value)}
                    placeholder="Desktop/backups"
                    className="flex-1 px-3 py-2.5 text-[12.5px] font-mono text-slate-800 bg-transparent outline-none placeholder:text-slate-300"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleBrowse}
                  disabled={!canUseDirectoryPicker}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[12.5px] font-medium text-slate-500 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all whitespace-nowrap"
                >
                  Browse
                </button>
              </div>
              {selectedDirHandle && (
                <p className="mt-2 text-[11.5px] text-emerald-600 font-mono flex items-center gap-1">
                  <span className="font-bold">✓</span> {selectedDirHandle.name}
                </p>
              )}
              <p className="text-[11.5px] text-slate-400 mt-1.5">
                Browse to pick a folder, or type a path relative to your home directory.
              </p>
            </div>

            {/* Drive Email */}
            <div
              className={`overflow-hidden transition-all duration-300 ${storageProvider === 'drive' ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}
            >
              <SectionLabel>Drive email</SectionLabel>
              <input
                type="email"
                value={driveEmail}
                onChange={(e) => setDriveEmail(e.target.value)}
                placeholder="owner@example.com"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-[13.5px] text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100 transition-all
                  ${driveEmail && !isValidEmail(driveEmail) ? 'border-red-300 focus:border-red-400' : 'border-slate-200 focus:border-indigo-400'}`}
              />
              {driveEmail && !isValidEmail(driveEmail) && (
                <p className="text-[11.5px] text-red-500 mt-1.5">Enter a valid email address.</p>
              )}
              <p className="text-[11.5px] text-slate-400 mt-1.5">
                The exported file is verified after being saved to the Drive destination.
              </p>
            </div>

            {/* Encrypt */}
            <Toggle
              on={encrypt}
              onClick={() => setEncrypt((v) => !v)}
              label="Encrypt backup"
              description="Files are encrypted before storage"
            />

            {/* Notes */}
            <div>
              <SectionLabel>
                Notes <span className="normal-case font-normal text-slate-300">— optional</span>
              </SectionLabel>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="e.g. Pre-release snapshot, end of month…"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13.5px] text-slate-800 resize-vertical outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-300"
              />
            </div>

            {/* Schedule */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 overflow-hidden">
              <div
                className="flex items-start justify-between gap-3 px-4 py-4 cursor-pointer select-none"
                onClick={() => setScheduleEnabled((v) => !v)}
              >
                <div>
                  <p className="text-[13.5px] font-bold text-slate-900">
                    Automatic scheduled backup
                  </p>
                  <p className="text-[11.5px] text-slate-500 mt-0.5">
                    Run this same configuration at a defined time
                  </p>
                </div>
                <div
                  className={`relative w-9 h-5 rounded-full flex-shrink-0 mt-0.5 transition-colors duration-200 ${scheduleEnabled ? 'bg-indigo-500' : 'bg-slate-200'}`}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${scheduleEnabled ? 'translate-x-4' : 'translate-x-0.5'}`}
                  />
                </div>
              </div>

              <div
                className={`overflow-hidden transition-all duration-300 ${scheduleEnabled ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}`}
              >
                <div className="px-4 pb-4 flex flex-col gap-3 border-t border-slate-200">
                  <div className="mt-3">
                    <SectionLabel>Schedule (cron)</SectionLabel>
                    <input
                      type="text"
                      value={scheduleValue}
                      onChange={(e) => setScheduleValue(e.target.value)}
                      placeholder="0 0 * * *"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[12.5px] font-mono text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <SectionLabel>Timezone</SectionLabel>
                      <input
                        type="text"
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[12.5px] font-mono text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer mt-5 px-1">
                      <input
                        type="checkbox"
                        checked={isRecurring}
                        onChange={(e) => setIsRecurring(e.target.checked)}
                        className="accent-indigo-500 w-3.5 h-3.5"
                      />
                      <span className="text-[12.5px] font-semibold text-slate-600">Recurring</span>
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={handleScheduleBackup}
                    disabled={submitting}
                    className="self-start px-4 py-2 rounded-xl border border-slate-200 bg-white text-[12.5px] font-semibold text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Schedule Backup
                  </button>
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white text-[14px] font-semibold tracking-wide shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="white"
                      strokeWidth="3"
                    />
                    <path
                      className="opacity-75"
                      fill="white"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Creating backup…
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Create Backup
                </>
              )}
            </button>
          </form>

          {/* ── History ── */}
          <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-sm shadow-slate-100 p-7 overflow-hidden">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-[15px] font-semibold text-slate-900 mb-0.5">Backup History</h2>
                <p className="text-xs text-slate-400">Recent backups and audit log</p>
              </div>
              <button
                onClick={fetchHistory}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-[12px] font-medium text-slate-500 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
              >
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M1 4v6h6M23 20v-6h-6" strokeLinecap="round" strokeLinejoin="round" />
                  <path
                    d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Refresh
              </button>
            </div>

            <div className="overflow-x-auto -mx-1">
              {loading ? (
                <div className="py-14 flex flex-col items-center gap-3">
                  <svg
                    className="w-7 h-7 animate-spin text-indigo-400"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-20"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                    <path
                      className="opacity-80"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  <p className="text-[13px] text-slate-400">Loading history…</p>
                </div>
              ) : history.length === 0 ? (
                <div className="py-14 flex flex-col items-center gap-2">
                  <span className="text-3xl">🗃</span>
                  <p className="text-[13.5px] font-medium text-slate-400">No backups yet</p>
                  <p className="text-[12px] text-slate-300">
                    Your backup history will appear here.
                  </p>
                </div>
              ) : (
                <table className="w-full text-[12px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {['Date', 'Modules', 'Destination', 'Provider', 'Enc.', 'Status'].map((h) => (
                        <th
                          key={h}
                          className="pb-3 pt-1 px-2.5 text-left text-[10px] font-semibold text-slate-400 tracking-widest uppercase whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((item) => {
                      const st = statusConfig[item.status] || {
                        bg: 'bg-slate-50',
                        text: 'text-slate-500',
                        dot: 'bg-slate-400',
                        border: 'border-slate-200',
                      };
                      return (
                        <tr
                          key={item._id}
                          className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors"
                        >
                          <td
                            className="px-2.5 py-3 text-slate-500 font-mono whitespace-nowrap"
                            suppressHydrationWarning
                          >
                            <span className="text-[12px]">{formatBackupDate(item.createdAt)}</span>
                            <br />
                            <span className="text-[10.5px] text-slate-400">
                              {formatBackupTime(item.createdAt)}
                            </span>
                          </td>
                          <td className="px-2.5 py-3 max-w-[110px]">
                            <div className="flex flex-wrap gap-1">
                              {(item.modules || []).slice(0, 3).map((m: string) => (
                                <span
                                  key={m}
                                  className="px-1.5 py-0.5 rounded-md bg-slate-100 text-[10px] font-medium text-slate-500"
                                >
                                  {m}
                                </span>
                              ))}
                              {(item.modules || []).length > 3 && (
                                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-[10px] text-slate-400">
                                  +{item.modules.length - 3}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-2.5 py-3 font-mono text-slate-500 max-w-[100px] overflow-hidden text-ellipsis whitespace-nowrap">
                            {item.destinationPath || '—'}
                          </td>
                          <td className="px-2.5 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10.5px] font-semibold border
                              ${
                                item.storageProvider === 'drive'
                                  ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              {(item.storageProvider || '').toUpperCase()}
                            </span>
                          </td>
                          <td className="px-2.5 py-3 text-center text-sm">
                            {item.encrypted ? (
                              '🔒'
                            ) : (
                              <span className="text-slate-300 text-[12px]">—</span>
                            )}
                          </td>
                          <td className="px-2.5 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-semibold uppercase tracking-wide border ${st.bg} ${st.text} ${st.border}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                              {item.status || 'unknown'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
