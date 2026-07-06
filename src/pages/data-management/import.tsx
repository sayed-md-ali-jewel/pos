import axios from 'axios';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import MainLayout from '@/components/Layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';

const MODULE_OPTIONS = [
  'auto',
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

const STRATEGIES = ['merge', 'overwrite', 'skip'] as const;

export default function DataManagementImportPage() {
  const auth = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [moduleName, setModuleName] = useState('auto');
  const [strategy, setStrategy] = useState<(typeof STRATEGIES)[number]>('merge');
  const [validateOnly, setValidateOnly] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!auth.token) return;

    setLoading(true);
    try {
      const response = await axios.get('/api/data-management/import', {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      setHistory(response.data.response || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load import history');
    } finally {
      setLoading(false);
    }
  }, [auth.token]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!auth.token) {
      toast.error('Authentication required.');
      return;
    }

    if (!file) {
      toast.error('Please select a file to import.');
      return;
    }

    setSubmitting(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (moduleName !== 'auto') {
        formData.append('module', moduleName);
      }
      formData.append('strategy', strategy);
      formData.append('validateOnly', String(validateOnly));

      const response = await axios.post('/api/data-management/import', formData, {
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });

      const data = response.data.response;
      setResult(data);
      toast.success('Import request processed successfully');
      setFile(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Import failed');
    } finally {
      setSubmitting(false);
      fetchHistory();
    }
  };

  return (
    <MainLayout title="Data Management — Import">
      <section className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold text-slate-900">Import</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-600">
            Upload JSON, CSV, or ZIP files to import data into the system. You can validate data
            first or run a real import immediately.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
          >
            <h2 className="text-xl font-semibold text-slate-900">Upload file</h2>
            <div className="mt-6 space-y-5">
              <label className="block text-sm font-medium text-slate-700">
                File
                <input
                  type="file"
                  accept=".json,.csv,.zip"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Module (optional)
                <select
                  value={moduleName}
                  onChange={(event) => setModuleName(event.target.value)}
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                >
                  {MODULE_OPTIONS.map((module) => (
                    <option key={module} value={module}>
                      {module === 'auto' ? 'Auto detect from file' : module}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Strategy
                  <select
                    value={strategy}
                    onChange={(event) => setStrategy(event.target.value as typeof strategy)}
                    className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  >
                    {STRATEGIES.map((option) => (
                      <option key={option} value={option}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={validateOnly}
                    onChange={(event) => setValidateOnly(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Validate only (no changes)
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Importing...' : 'Start Import'}
            </button>
          </form>

          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Import history</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Review completed imports and status details.
                </p>
              </div>
              <button
                onClick={fetchHistory}
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
                    <th className="px-4 py-3 font-semibold">File</th>
                    <th className="px-4 py-3 font-semibold">Module</th>
                    <th className="px-4 py-3 font-semibold">Strategy</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Records</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-sm text-slate-500">
                        Loading import history...
                      </td>
                    </tr>
                  ) : history.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-sm text-slate-500">
                        No import history yet.
                      </td>
                    </tr>
                  ) : (
                    history.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50">
                        <td className="px-4 py-4 text-slate-700">
                          {new Date(item.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-4 text-slate-700">{item.sourceFileName}</td>
                        <td className="px-4 py-4 text-slate-700">{item.module || 'auto'}</td>
                        <td className="px-4 py-4 text-slate-700 capitalize">{item.strategy}</td>
                        <td className="px-4 py-4 text-slate-700 capitalize">{item.status}</td>
                        <td className="px-4 py-4 text-slate-700">
                          {item.records?.processed ?? '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {result && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <h3 className="mb-3 text-base font-semibold text-slate-900">Last import result</h3>
                <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(result, null, 2)}</pre>
              </div>
            )}
          </section>
        </div>
      </section>
    </MainLayout>
  );
}
