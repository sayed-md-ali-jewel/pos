import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import MainLayout from '@/components/Layout/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ActionButton, Card, Button, Input } from '@/components/Common/FormElements';
import { useAuth } from '@/hooks/useAuth';
import {
  Store,
  Receipt,
  Percent,
  Users,
  Save,
  Shield,
  CheckCircle,
  XCircle,
  ToggleLeft,
  ToggleRight,
  UserPlus,
  Pencil,
  Trash2,
  X,
  Settings,
} from 'lucide-react';
import toast from 'react-hot-toast';

type Tab = 'general' | 'tax' | 'invoice' | 'users' | 'features';
type UserRole = 'admin' | 'manager' | 'cashier';

type UserFormState = {
  _id?: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
};

const TABS = [
  { id: 'general', label: 'General', icon: Store },
  { id: 'tax', label: 'Tax Engine', icon: Percent },
  { id: 'invoice', label: 'Invoice', icon: Receipt },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'features', label: 'Feature Flags', icon: Shield },
] as const;

const emptyUserForm: UserFormState = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: 'cashier',
  isActive: true,
};

export default function SettingsPage() {
  return (
    <ProtectedRoute requiredRole={['admin', 'manager']}>
      <SettingsContent />
    </ProtectedRoute>
  );
}

function SettingsContent() {
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [settings, setSettings] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userSaving, setUserSaving] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState<UserFormState>(emptyUserForm);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const isAdmin = auth.user?.role === 'admin';
  const visibleTabs = isAdmin
    ? TABS
    : TABS.filter((tab) => !['users', 'features'].includes(tab.id));

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const settingsRes = await axios.get('/api/settings', { headers });
      if (settingsRes.data.success) setSettings(settingsRes.data.data);

      if (isAdmin) {
        const usersRes = await axios.get('/api/settings/users', { headers });
        if (usersRes.data.success) setUsers(usersRes.data.data);
      }
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.patch('/api/settings', settings, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setSettings(res.data.data);
        toast.success('Settings saved successfully!');
      }
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const syncCurrentUser = (updatedUser: any) => {
    const token = localStorage.getItem('token');
    if (updatedUser?._id === auth.user?._id && token) {
      auth.setAuth({ ...auth.user, ...updatedUser } as any, token);
    }
  };

  const handleUserUpdate = async (userId: string, field: string, value: any) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.patch(
        '/api/settings/users',
        { userId, [field]: value },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.data.success) {
        setUsers((prev) => prev.map((u) => (u._id === userId ? res.data.data : u)));
        syncCurrentUser(res.data.data);
        toast.success('User updated');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update user');
    }
  };

  const openCreateUser = () => {
    setUserForm(emptyUserForm);
    setIsUserModalOpen(true);
  };

  const openEditUser = (user: any) => {
    setUserForm({
      _id: user._id,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      password: '',
      role: user.role || 'cashier',
      isActive: user.isActive !== false,
    });
    setIsUserModalOpen(true);
  };

  const handleUserFormChange = (field: keyof UserFormState, value: any) => {
    setUserForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleUserFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserSaving(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const payload = {
        firstName: userForm.firstName.trim(),
        lastName: userForm.lastName.trim(),
        email: userForm.email.trim(),
        role: userForm.role,
        isActive: userForm.isActive,
        ...(userForm.password ? { password: userForm.password } : {}),
      };

      const res = userForm._id
        ? await axios.patch(
            '/api/settings/users',
            { userId: userForm._id, ...payload },
            { headers }
          )
        : await axios.post(
            '/api/settings/users',
            { ...payload, password: userForm.password },
            { headers }
          );

      if (res.data.success) {
        if (userForm._id) {
          setUsers((prev) => prev.map((u) => (u._id === userForm._id ? res.data.data : u)));
          syncCurrentUser(res.data.data);
          toast.success('User profile updated');
        } else {
          setUsers((prev) => [...prev, res.data.data]);
          toast.success('User added');
        }
        setIsUserModalOpen(false);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save user');
    } finally {
      setUserSaving(false);
    }
  };

  const handleDeleteUser = async (user: any) => {
    if (!window.confirm(`Delete ${user.firstName} ${user.lastName}? This cannot be undone.`)) {
      return;
    }

    setDeletingUserId(user._id);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.delete(`/api/settings/users?userId=${user._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setUsers((prev) => prev.filter((u) => u._id !== user._id));
        toast.success('User deleted');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete user');
    } finally {
      setDeletingUserId(null);
    }
  };

  const set = (path: string, value: any) => {
    setSettings((prev: any) => {
      const keys = path.split('.');
      const next = { ...prev };
      let ref: any = next;
      for (let i = 0; i < keys.length - 1; i++) {
        ref[keys[i]] = { ...ref[keys[i]] };
        ref = ref[keys[i]];
      }
      ref[keys[keys.length - 1]] = value;
      return next;
    });
  };

  if (loading || !settings) {
    return (
      <MainLayout title="Settings">
        <div className="flex h-64 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-sky-600" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Settings & Configuration">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
          <Settings size={18} className="text-slate-500" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">
          Settings & Configuration
        </h1>
      </div>
      <p className="mb-6 ml-12 text-sm text-slate-500">
        Manage your store preferences, tax rules, invoice settings, users, and feature flags.
      </p>
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar Tabs */}
        <aside className="w-full lg:w-56 shrink-0">
          <nav className="space-y-1">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {/* GENERAL TAB */}
          {activeTab === 'general' && (
            <Card title="Store Information">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Input
                  label="Store Name"
                  value={settings.storeName || ''}
                  onChange={(e) => set('storeName', e.target.value)}
                />
                <Input
                  label="Tagline"
                  value={settings.storeTagline || ''}
                  onChange={(e) => set('storeTagline', e.target.value)}
                />
                <Input
                  label="Email"
                  type="email"
                  value={settings.storeEmail || ''}
                  onChange={(e) => set('storeEmail', e.target.value)}
                />
                <Input
                  label="Phone"
                  value={settings.storePhone || ''}
                  onChange={(e) => set('storePhone', e.target.value)}
                />
                <div className="md:col-span-2">
                  <Input
                    label="Address"
                    value={settings.storeAddress || ''}
                    onChange={(e) => set('storeAddress', e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3 border-t border-slate-100 pt-6">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Currency Code
                  </label>
                  <select
                    className="input-field w-full"
                    value={settings.currency || 'BDT'}
                    onChange={(e) => set('currency', e.target.value)}
                  >
                    <option value="BDT">BDT — Bangladeshi Taka</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="GBP">GBP — British Pound</option>
                    <option value="INR">INR — Indian Rupee</option>
                  </select>
                </div>
                <Input
                  label="Currency Symbol"
                  value={settings.currencySymbol || '৳'}
                  onChange={(e) => set('currencySymbol', e.target.value)}
                />
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Timezone
                  </label>
                  <select
                    className="input-field w-full"
                    value={settings.timezone || 'Asia/Dhaka'}
                    onChange={(e) => set('timezone', e.target.value)}
                  >
                    <option value="Asia/Dhaka">Asia/Dhaka (UTC+6)</option>
                    <option value="Asia/Kolkata">Asia/Kolkata (UTC+5:30)</option>
                    <option value="Asia/Dubai">Asia/Dubai (UTC+4)</option>
                    <option value="Europe/London">Europe/London (UTC+0)</option>
                    <option value="America/New_York">America/New_York (UTC-5)</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-6">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Low Stock Alert Threshold (Global Default)
                </label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    min="0"
                    value={settings.globalLowStockThreshold ?? 5}
                    onChange={(e) => set('globalLowStockThreshold', Number(e.target.value))}
                    className="max-w-xs"
                  />
                  <p className="text-sm text-slate-500">
                    Products with stock at or below this value will be flagged as &quot;Low
                    Stock&quot;
                  </p>
                </div>
              </div>

              {isAdmin && (
                <div className="mt-6 flex justify-end">
                  <Button onClick={handleSave} isLoading={saving} className="gap-2">
                    <Save size={16} /> Save General Settings
                  </Button>
                </div>
              )}
            </Card>
          )}

          {/* TAX TAB */}
          {activeTab === 'tax' && (
            <Card title="VAT / Tax Engine">
              <div className="flex items-start gap-4 p-4 rounded-lg bg-amber-50 border border-amber-200 mb-6">
                <Percent size={20} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  Configure your default tax rules here. These will apply to all new invoices unless
                  overridden at the product or category level.
                </p>
              </div>

              {/* Enable/Disable Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 mb-6">
                <div>
                  <p className="font-semibold text-slate-900">Enable Tax</p>
                  <p className="text-sm text-slate-500">Apply tax to all sales transactions</p>
                </div>
                <button
                  onClick={() => set('taxEnabled', !settings.taxEnabled)}
                  className={`text-2xl transition ${settings.taxEnabled ? 'text-emerald-500' : 'text-slate-400'}`}
                >
                  {settings.taxEnabled ? <ToggleRight size={40} /> : <ToggleLeft size={40} />}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <Input
                  label="Default Tax Rate (%)"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={settings.defaultTaxRate ?? 0}
                  onChange={(e) => set('defaultTaxRate', Number(e.target.value))}
                  disabled={!settings.taxEnabled}
                />
                <Input
                  label="Tax Label (e.g. VAT, GST)"
                  value={settings.taxLabel || 'VAT'}
                  onChange={(e) => set('taxLabel', e.target.value)}
                  disabled={!settings.taxEnabled}
                />
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Tax Type
                  </label>
                  <select
                    className="input-field w-full"
                    value={settings.taxInclusive ? 'inclusive' : 'exclusive'}
                    onChange={(e) => set('taxInclusive', e.target.value === 'inclusive')}
                    disabled={!settings.taxEnabled}
                  >
                    <option value="exclusive">Exclusive (Added on top of price)</option>
                    <option value="inclusive">Inclusive (Already in price)</option>
                  </select>
                </div>
              </div>

              {/* Tax Preview */}
              {settings.taxEnabled && (
                <div className="mt-6 rounded-lg bg-slate-900 p-4 text-sm text-white">
                  <p className="font-semibold text-slate-300 mb-2">
                    Tax Preview Example (Item Price: ৳100)
                  </p>
                  {settings.taxInclusive ? (
                    <>
                      <p>
                        Price (inclusive):{' '}
                        <span className="font-bold text-emerald-400">৳100.00</span>
                      </p>
                      <p>
                        Tax Portion:{' '}
                        <span className="font-bold text-amber-400">
                          ৳
                          {(
                            (100 * (settings.defaultTaxRate || 0)) /
                            (100 + (settings.defaultTaxRate || 0))
                          ).toFixed(2)}
                        </span>
                      </p>
                      <p>
                        Base Price:{' '}
                        <span className="font-bold text-sky-400">
                          ৳{(100 / (1 + (settings.defaultTaxRate || 0) / 100)).toFixed(2)}
                        </span>
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        Base Price: <span className="font-bold text-sky-400">৳100.00</span>
                      </p>
                      <p>
                        {settings.taxLabel} ({settings.defaultTaxRate}%):{' '}
                        <span className="font-bold text-amber-400">
                          ৳{((100 * (settings.defaultTaxRate || 0)) / 100).toFixed(2)}
                        </span>
                      </p>
                      <p>
                        Total:{' '}
                        <span className="font-bold text-emerald-400">
                          ৳{(100 + (100 * (settings.defaultTaxRate || 0)) / 100).toFixed(2)}
                        </span>
                      </p>
                    </>
                  )}
                </div>
              )}

              {isAdmin && (
                <div className="mt-6 flex justify-end">
                  <Button onClick={handleSave} isLoading={saving} className="gap-2">
                    <Save size={16} /> Save Tax Settings
                  </Button>
                </div>
              )}
            </Card>
          )}

          {/* INVOICE TAB */}
          {activeTab === 'invoice' && (
            <Card title="Invoice Configuration">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Input
                  label="Invoice Number Prefix"
                  value={settings.invoicePrefix || 'INV'}
                  onChange={(e) => set('invoicePrefix', e.target.value)}
                />
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Example Invoice Number
                  </label>
                  <p className="input-field bg-slate-50 text-slate-600 cursor-not-allowed">
                    {settings.invoicePrefix || 'INV'}-20260504-0001
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Invoice Footer Message
                  </label>
                  <textarea
                    className="input-field h-24 w-full resize-none"
                    placeholder="e.g. Thank you for your business! Goods once sold are not returned."
                    value={settings.invoiceFooter || ''}
                    onChange={(e) => set('invoiceFooter', e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-6 space-y-3 border-t border-slate-100 pt-6">
                <p className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                  Invoice Display Options
                </p>
                {[
                  { key: 'invoiceShowLogo', label: 'Show Store Logo on Invoice' },
                  { key: 'invoiceShowTax', label: 'Show Tax Breakdown' },
                  { key: 'invoiceShowCustomerInfo', label: 'Show Customer Information' },
                ].map((opt) => (
                  <div
                    key={opt.key}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-sky-200 transition"
                  >
                    <span className="text-sm font-medium text-slate-700">{opt.label}</span>
                    <button
                      onClick={() => set(opt.key, !settings[opt.key])}
                      className={`transition ${settings[opt.key] ? 'text-emerald-500' : 'text-slate-400'}`}
                    >
                      {settings[opt.key] ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                    </button>
                  </div>
                ))}
              </div>

              {isAdmin && (
                <div className="mt-6 flex justify-end">
                  <Button onClick={handleSave} isLoading={saving} className="gap-2">
                    <Save size={16} /> Save Invoice Settings
                  </Button>
                </div>
              )}
            </Card>
          )}

          {/* USERS TAB */}
          {activeTab === 'users' && (
            <Card>
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-950">User Management</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Add users, update profile details, assign roles, and manage access.
                  </p>
                </div>
                <Button onClick={openCreateUser} className="gap-2">
                  <UserPlus size={16} /> Add User
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-100 text-xs uppercase text-slate-400">
                      <th className="p-4 font-semibold">User</th>
                      <th className="p-4 font-semibold">Email</th>
                      <th className="p-4 font-semibold text-center">Role</th>
                      <th className="p-4 font-semibold text-center">Status</th>
                      <th className="p-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {users.map((user) => (
                      <tr key={user._id} className="hover:bg-slate-50 transition">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-700">
                              {user.firstName[0]}
                              {user.lastName[0]}
                            </div>
                            <p className="font-semibold text-slate-900">
                              {user.firstName} {user.lastName}
                            </p>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-slate-600">{user.email}</td>
                        <td className="p-4 text-center">
                          <select
                            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm font-medium"
                            value={user.role}
                            onChange={(e) => handleUserUpdate(user._id, 'role', e.target.value)}
                          >
                            <option value="admin">Admin</option>
                            <option value="manager">Manager</option>
                            <option value="cashier">Cashier</option>
                          </select>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleUserUpdate(user._id, 'isActive', !user.isActive)}
                            className={`flex items-center justify-center gap-1.5 mx-auto rounded-full px-3 py-1 text-xs font-bold ${
                              user.isActive
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-rose-100 hover:text-rose-700'
                                : 'bg-rose-100 text-rose-700 hover:bg-emerald-100 hover:text-emerald-700'
                            } transition`}
                          >
                            {user.isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
                            {user.isActive ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            <ActionButton
                              variant="secondary"
                              onClick={() => openEditUser(user)}
                              title={`Edit ${user.firstName} ${user.lastName}`}
                              icon={<Pencil size={15} />}
                            />
                            <ActionButton
                              variant="danger"
                              onClick={() => handleDeleteUser(user)}
                              disabled={deletingUserId === user._id}
                              title={`Delete ${user.firstName} ${user.lastName}`}
                              icon={<Trash2 size={15} />}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* FEATURE FLAGS TAB */}
          {activeTab === 'features' && (
            <Card title="Feature Flags">
              <p className="mb-6 text-sm text-slate-500">
                Enable or disable modules dynamically. Disabled modules will be hidden from the
                navigation and all their API endpoints will return 403.
              </p>

              <div className="space-y-3">
                {[
                  {
                    key: 'features.posEnabled',
                    label: 'POS Sales Module',
                    desc: 'Allow users to process sales via the POS terminal',
                  },
                  {
                    key: 'features.inventoryEnabled',
                    label: 'Inventory Module',
                    desc: 'Stock management, purchase orders, and movement history',
                  },
                  {
                    key: 'features.suppliersEnabled',
                    label: 'Suppliers Module',
                    desc: 'Supplier management and ledger tracking',
                  },
                  {
                    key: 'features.reportsEnabled',
                    label: 'Reports Module',
                    desc: 'Analytics and business intelligence dashboard',
                  },
                  {
                    key: 'features.customersEnabled',
                    label: 'Customers Module',
                    desc: 'Customer management and transaction history',
                  },
                ].map((flag) => {
                  const isEnabled = flag.key.split('.').reduce((obj: any, k) => obj?.[k], settings);
                  return (
                    <div
                      key={flag.key}
                      className={`flex items-center justify-between rounded-xl border p-4 transition ${isEnabled ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{flag.label}</p>
                        <p className="text-sm text-slate-500">{flag.desc}</p>
                      </div>
                      <button
                        onClick={() => set(flag.key, !isEnabled)}
                        className={`ml-4 shrink-0 transition ${isEnabled ? 'text-emerald-500' : 'text-slate-400'}`}
                      >
                        {isEnabled ? <ToggleRight size={44} /> : <ToggleLeft size={44} />}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex justify-end">
                <Button onClick={handleSave} isLoading={saving} className="gap-2">
                  <Save size={16} /> Save Feature Flags
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm">
          <form
            onSubmit={handleUserFormSubmit}
            className="w-full max-w-2xl rounded-xl bg-white shadow-2xl shadow-slate-950/20"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {userForm._id ? 'Edit User' : 'Add User'}
                </p>
                <h3 className="mt-1 text-xl font-bold text-slate-950">
                  {userForm._id ? 'Update Profile Information' : 'Create New User'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsUserModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close user form"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-5 px-6 py-5 md:grid-cols-2">
              <Input
                label="First Name"
                value={userForm.firstName}
                onChange={(e) => handleUserFormChange('firstName', e.target.value)}
                required
              />
              <Input
                label="Last Name"
                value={userForm.lastName}
                onChange={(e) => handleUserFormChange('lastName', e.target.value)}
                required
              />
              <Input
                label="Email"
                type="email"
                value={userForm.email}
                onChange={(e) => handleUserFormChange('email', e.target.value)}
                required
              />
              <Input
                label={userForm._id ? 'New Password (Optional)' : 'Password'}
                type="password"
                value={userForm.password}
                onChange={(e) => handleUserFormChange('password', e.target.value)}
                required={!userForm._id}
                minLength={6}
              />
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Role</label>
                <select
                  className="input-field w-full"
                  value={userForm.role}
                  onChange={(e) => handleUserFormChange('role', e.target.value as UserRole)}
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="cashier">Cashier</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Status</label>
                <button
                  type="button"
                  onClick={() => handleUserFormChange('isActive', !userForm.isActive)}
                  className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border px-4 text-sm font-bold transition ${
                    userForm.isActive
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-rose-200 bg-rose-50 text-rose-700'
                  }`}
                >
                  {userForm.isActive ? <CheckCircle size={16} /> : <XCircle size={16} />}
                  {userForm.isActive ? 'Active' : 'Inactive'}
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsUserModalOpen(false)}
                disabled={userSaving}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={userSaving} className="gap-2">
                <Save size={16} />
                {userForm._id ? 'Save User' : 'Add User'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </MainLayout>
  );
}
