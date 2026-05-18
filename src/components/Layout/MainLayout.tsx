import React, { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  List,
  Users,
  Boxes,
  Truck,
  BarChart3,
  TrendingUp,
  Settings,
  Banknote,
  LogOut,
  Wrench,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Database,
  Menu,
  X,
} from 'lucide-react';

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, title }) => {
  const auth = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleRouteChange = () => setMobileMenuOpen(false);
    router.events.on('routeChangeStart', handleRouteChange);
    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router.events]);

  const navigationItems = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'manager', 'cashier'],
    },
    {
      href: '/sales',
      label: 'POS Sales',
      icon: ShoppingCart,
      roles: ['admin', 'manager', 'cashier'],
    },
    {
      href: '/products/attributes',
      label: 'Attributes',
      icon: List,
      roles: ['admin', 'manager'],
    },
    {
      href: '/products',
      label: 'Products',
      icon: Package,
      roles: ['admin', 'manager', 'cashier'],
    },
    { href: '/inventory', label: 'Inventory', icon: Boxes, roles: ['admin', 'manager'] },
    {
      href: '/inventory/suppliers',
      label: 'Suppliers',
      icon: Truck,
      roles: ['admin', 'manager'],
    },
    {
      href: '/warranty',
      label: 'Warranty Repairs',
      icon: Wrench,
      roles: ['admin', 'manager', 'cashier'],
    },
    {
      href: '/sales/history',
      label: 'Sales History',
      icon: BarChart3,
      roles: ['admin', 'manager', 'cashier'],
    },
    {
      href: '/reports',
      label: 'Reports',
      icon: TrendingUp,
      roles: ['admin', 'manager', 'cashier'],
    },
    { href: '/expenses', label: 'Expenses', icon: Banknote, roles: ['admin', 'manager'] },
    {
      href: '/customers',
      label: 'Customers',
      icon: Users,
      roles: ['admin', 'manager', 'cashier'],
    },
    { href: '/investments', label: 'Investments', icon: BookOpen, roles: ['admin'] },
    { href: '/data-management', label: 'Data Management', icon: Database, roles: ['admin'] },
    { href: '/settings', label: 'Settings', icon: Settings, roles: ['admin', 'manager'] },
  ];

  const upcomingItems: any[] = [];

  const pageTitles: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/sales': 'POS Sales',
    '/products': 'Products',
    '/products/attributes': 'Product Attributes',
    '/products/add': 'Add Product',
    '/customers': 'Customers',
    '/customers/add': 'Add Customer',
    '/reports': 'Reports',
  };

  const pageTitle = title || pageTitles[router.pathname] || 'MR Trading POS';

  const handleLogout = () => {
    auth.clearAuth();
    router.push('/auth/login');
  };

  const visibleNavigation = navigationItems.filter((item) =>
    auth.user?.role ? item.roles.includes(auth.user.role) : false
  );

  const isActive = (href: string) =>
    router.pathname === href || router.pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 lg:overflow-x-hidden">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm shadow-slate-200/40 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-950/95">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-slate-950 dark:text-slate-100">
            {pageTitle}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Tap the menu for quick navigation
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex h-11 items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-300 dark:border-rose-900/40 dark:bg-rose-950/90 dark:text-rose-200"
        >
          <LogOut size={18} />
          Logout
        </button>
      </header>

      <div
        className={`fixed inset-0 z-50 transition-all duration-300 lg:hidden ${
          mobileMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        aria-hidden={!mobileMenuOpen}
      >
        <div
          className={`absolute inset-0 bg-slate-950/40 transition-opacity duration-300 ${
            mobileMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setMobileMenuOpen(false)}
        />
        <aside
          className={`absolute inset-y-0 left-0 w-[min(85vw,22rem)] overflow-hidden border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 dark:border-slate-800 dark:bg-slate-950 ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#4968f5] text-white shadow-lg shadow-[#4968f54d]">
                <BookOpen size={20} strokeWidth={2.2} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">
                  MR Trading
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Your quick POS hub</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-3">
            <div className="space-y-1">
              {visibleNavigation.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                      active
                        ? 'bg-slate-100 text-slate-950 dark:bg-slate-900 dark:text-white'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <item.icon size={18} className="shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-200 px-4 py-4 dark:border-slate-800">
            <div className="flex items-center gap-3 rounded-3xl bg-slate-100 p-3 dark:bg-slate-900">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                {auth.user?.firstName?.charAt(0) || 'M'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-100">
                  {auth.user?.firstName} {auth.user?.lastName}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{auth.user?.role}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-300 dark:border-rose-900/40 dark:bg-rose-950/90 dark:text-rose-200"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </aside>
      </div>

      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden overflow-hidden border-r border-[#dedcf7] bg-[#fbfbff] text-[#68778e] shadow-[18px_0_45px_rgba(89,80,190,0.08)] transition-all duration-300 lg:flex lg:flex-col ${
          collapsed ? 'w-[5.25rem]' : 'w-[17.5rem]'
        }`}
      >
        <div
          className={`flex h-24 items-center border-b border-[#dedcf7] px-4 transition-all duration-300 ${
            collapsed ? 'justify-center px-3' : ''
          }`}
        >
          <Link href="/dashboard" className="flex min-w-0 flex-1 items-center gap-3">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] bg-[#4968f5] text-white shadow-[0_14px_24px_rgba(73,104,245,0.2)]">
              <BookOpen size={22} strokeWidth={2.2} />
              <span className="absolute -right-1.5 -top-1.5 h-4 w-4 rounded-full border-[3px] border-[#fbfbff] bg-[#18bf8d]" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-[1.35rem] font-extrabold leading-none tracking-normal text-[#6257cf]">
                  MR Trading
                </p>
                <p className="mt-2 text-[0.72rem] font-extrabold uppercase leading-none tracking-[0.22em] text-[#68778e]">
                  POS Admin
                </p>
              </div>
            )}
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-0 py-3">
          <div className="space-y-1">
            {visibleNavigation.map((item) => {
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={`group relative flex min-h-[3.05rem] items-center gap-3 rounded-none py-2.5 text-sm font-medium leading-none transition-all duration-200 ${
                    active
                      ? 'bg-[#f0efff] text-[#6257cf]'
                      : 'text-[#68778e] hover:bg-[#f4f3ff] hover:text-[#6257cf]'
                  } ${collapsed ? 'justify-center px-0' : 'px-6'}`}
                >
                  {active && (
                    <span className="absolute left-0 top-0 h-full w-[5px] rounded-r-full bg-[#6257cf]" />
                  )}
                  <item.icon
                    size={collapsed ? 21 : 22}
                    strokeWidth={2.15}
                    className={`shrink-0 ${
                      active ? 'text-[#6257cf]' : 'text-[#68778e] group-hover:text-[#6257cf]'
                    } transition-colors duration-200`}
                  />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>

          {upcomingItems.length > 0 && (
            <div>
              <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Coming Next
              </p>
              <div className="mt-3 space-y-1">
                {upcomingItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-white/5 text-[11px] font-bold">
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </nav>

        <div
          className={`border-t border-[#dedcf7] px-4 pb-5 pt-4 transition ${collapsed ? 'px-4' : ''}`}
        >
          <div
            className={`rounded-[0.85rem] border border-[#dedcf7] bg-[#f8f8ff] p-4 ${collapsed ? 'p-3' : ''}`}
          >
            <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#292929] text-base font-bold text-white ring-2 ring-[#dedcf7]">
                {auth.user?.firstName?.charAt(0) || 'M'}
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium leading-tight text-[#201d53]">
                    {auth.user?.firstName} {auth.user?.lastName}
                  </p>
                  <p className="mt-1.5 text-sm font-medium capitalize leading-none text-[#68778e]">
                    {auth.user?.role}
                  </p>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className={`mt-5 flex min-h-10 items-center gap-3 text-sm font-medium text-[#68778e] transition hover:text-[#6257cf] ${
              collapsed ? 'w-full justify-center gap-0' : 'px-4'
            }`}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight size={22} strokeWidth={2.5} />
            ) : (
              <ChevronLeft size={22} strokeWidth={2.5} />
            )}
            {!collapsed && <span>Collapse</span>}
          </button>

          <button
            onClick={handleLogout}
            className={`mt-2 flex min-h-10 items-center gap-3 text-sm font-medium text-[#ff4141] transition hover:text-[#d92c2c] ${
              collapsed ? 'w-full justify-center gap-0' : 'px-4'
            }`}
          >
            <LogOut size={20} strokeWidth={2.25} />
            {!collapsed && 'Logout'}
          </button>
        </div>
      </aside>

      <div className={collapsed ? 'lg:pl-[5.25rem]' : 'lg:pl-[17.5rem]'}>
        <main className="px-3 py-4 sm:px-4 lg:px-5">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
