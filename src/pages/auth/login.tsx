import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { useAuth } from '@/hooks/useAuth';

export default function Login() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const auth = useAuth();

  useEffect(() => {
    if (auth.isInitialized && auth.isAuthenticated) {
      router.push('/dashboard');
    }
  }, [auth.isInitialized, auth.isAuthenticated, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/api/auth/login', formData);
      auth.setAuth(response.data.data.user, response.data.data.token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-slate-100 dark:bg-slate-950 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="hidden bg-slate-950 px-12 py-10 text-white dark:bg-slate-900 lg:flex lg:flex-col lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-sky-300">
            MR Trading POS
          </p>
          <h1 className="mt-8 max-w-xl text-5xl font-bold leading-tight">
            Faster checkout, cleaner inventory, calmer daily operations.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
            A focused admin workspace for sales, products, customers, dues, and reports.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            ['3', 'Demo roles'],
            ['POS', 'Sales ready'],
            ['JWT', 'Secure login'],
          ].map(([value, label]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/10 p-4">
              <p className="text-2xl font-bold">{value}</p>
              <p className="mt-1 text-sm text-slate-300">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <main className="relative flex items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/70">
          <div className="mb-8">
            <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">
              MR
            </div>
            <h1 className="text-3xl font-bold text-slate-950 dark:text-slate-100">Welcome back</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Sign in to continue to the POS admin panel.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="mb-4">
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <p className="font-semibold text-slate-900 dark:text-slate-100">Demo credentials</p>
            <p className="mt-2">admin@mrtrade.com</p>
            <p>demo123</p>
          </div>
        </div>
      </main>
    </div>
  );
}
