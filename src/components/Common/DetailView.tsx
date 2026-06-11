import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BarChart3,
  ClipboardList,
  FileSearch,
  LucideIcon,
  Printer,
} from 'lucide-react';

type Tone = 'slate' | 'sky' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'violet';

const toneStyles: Record<Tone, { soft: string; text: string; ring: string; solid: string }> = {
  slate: {
    soft: 'bg-slate-50',
    text: 'text-slate-700',
    ring: 'ring-slate-200',
    solid: 'bg-slate-900',
  },
  sky: { soft: 'bg-sky-50', text: 'text-sky-700', ring: 'ring-sky-200', solid: 'bg-sky-600' },
  emerald: {
    soft: 'bg-emerald-50',
    text: 'text-emerald-700',
    ring: 'ring-emerald-200',
    solid: 'bg-emerald-600',
  },
  amber: {
    soft: 'bg-amber-50',
    text: 'text-amber-700',
    ring: 'ring-amber-200',
    solid: 'bg-amber-600',
  },
  rose: { soft: 'bg-rose-50', text: 'text-rose-700', ring: 'ring-rose-200', solid: 'bg-rose-600' },
  indigo: {
    soft: 'bg-indigo-50',
    text: 'text-indigo-700',
    ring: 'ring-indigo-200',
    solid: 'bg-indigo-600',
  },
  violet: {
    soft: 'bg-violet-50',
    text: 'text-violet-700',
    ring: 'ring-violet-200',
    solid: 'bg-violet-600',
  },
};

export function DetailPageShell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-7xl space-y-5 px-0 sm:space-y-6">{children}</div>;
}

export function LoadingProfile({ label = 'Loading details...' }: { label?: string }) {
  return (
    <div className="flex h-72 flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white/90">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-sky-600" />
      <p className="text-sm font-semibold text-slate-500">{label}</p>
    </div>
  );
}

export function EmptyState({
  icon: Icon = FileSearch,
  title,
  description,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-10 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-400 ring-1 ring-slate-200">
        <Icon size={20} />
      </div>
      <p className="mt-3 text-sm font-bold text-slate-700">{title}</p>
      {description && <p className="mt-1 max-w-md text-xs font-medium text-slate-400">{description}</p>}
    </div>
  );
}

export function StatusBadge({
  children,
  tone = 'slate',
}: {
  children: React.ReactNode;
  tone?: Tone;
}) {
  const toneClass = toneStyles[tone];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ${toneClass.soft} ${toneClass.text} ${toneClass.ring}`}
    >
      {children}
    </span>
  );
}

export function IconButtonLink({
  href,
  icon: Icon,
  label,
  tone = 'slate',
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  tone?: Tone;
}) {
  const toneClass = toneStyles[tone];
  return (
    <Link
      href={href}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition hover:-translate-y-0.5 ${toneClass.soft} ${toneClass.text} ring-1 ${toneClass.ring}`}
    >
      <Icon size={16} />
      {label}
    </Link>
  );
}

export function IconButton({
  icon: Icon,
  label,
  tone = 'slate',
  onClick,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  tone?: Tone;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const toneClass = toneStyles[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${toneClass.soft} ${toneClass.text} ring-1 ${toneClass.ring}`}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

export function DetailToolbar({
  backLabel,
  onBack,
  actions,
}: {
  backLabel: string;
  onBack: () => void;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-10 w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:-translate-y-0.5 hover:bg-slate-50"
      >
        <ArrowLeft size={16} />
        {backLabel}
      </button>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function ProfileHero({
  icon: Icon = ClipboardList,
  title,
  subtitle,
  meta,
  badges,
  avatar,
  actions,
  tone = 'sky',
}: {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  meta?: React.ReactNode;
  badges?: React.ReactNode;
  avatar?: React.ReactNode;
  actions?: React.ReactNode;
  tone?: Tone;
}) {
  const toneClass = toneStyles[tone];
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
      <div className={`h-1.5 ${toneClass.solid}`} />
      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
          {avatar || (
            <div
              className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl ${toneClass.soft} ${toneClass.text} ring-1 ${toneClass.ring}`}
            >
              <Icon size={30} />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-extrabold text-slate-950">{title}</h1>
              {badges}
            </div>
            {subtitle && <p className="mt-1 text-sm font-semibold text-slate-500">{subtitle}</p>}
            {meta && <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">{meta}</div>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2 lg:justify-end">{actions}</div>}
      </div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  description,
  icon: Icon = BarChart3,
  tone = 'slate',
}: {
  label: string;
  value: React.ReactNode;
  description?: string;
  icon?: LucideIcon;
  tone?: Tone;
}) {
  const toneClass = toneStyles[tone];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-1 text-xl font-extrabold text-slate-950">{value}</p>
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${toneClass.soft} ${toneClass.text} ring-1 ${toneClass.ring}`}
        >
          <Icon size={18} />
        </div>
      </div>
      {description && <p className="mt-2 text-xs font-semibold text-slate-400">{description}</p>}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className = '',
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50 ${className}`}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          {Icon && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-600 ring-1 ring-slate-200">
              <Icon size={17} />
            </div>
          )}
          <div>
            <h2 className="text-base font-extrabold text-slate-950">{title}</h2>
            {description && <p className="mt-0.5 text-sm font-medium text-slate-500">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

export function InfoGrid({
  items,
}: {
  items: { label: string; value?: React.ReactNode; wide?: boolean }[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.label}
          className={`rounded-lg bg-slate-50 px-4 py-3 ring-1 ring-slate-100 ${item.wide ? 'sm:col-span-2' : ''}`}
        >
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{item.label}</p>
          <div className="mt-1 break-words text-sm font-bold text-slate-800">{item.value || '—'}</div>
        </div>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: T; label: string; icon?: LucideIcon; count?: number }[];
  active: T;
  onChange: (tab: T) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1">
      <div className="flex min-w-max gap-1">
        {tabs.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition ${
              active === key
                ? 'bg-white text-slate-950 shadow-sm ring-1 ring-slate-200'
                : 'text-slate-500 hover:bg-white/70 hover:text-slate-800'
            }`}
          >
            {Icon && <Icon size={16} />}
            {label}
            {count !== undefined && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PrintButton({ label = 'Print', onClick }: { label?: string; onClick: () => void }) {
  return <IconButton icon={Printer} label={label} onClick={onClick} tone="slate" />;
}
