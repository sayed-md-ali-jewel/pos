import Link from 'next/link';
import MainLayout from '@/components/Layout/MainLayout';

export default function DataManagementPage() {
  return (
    <MainLayout title="Data Management">
      <section className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold text-slate-900">Data Management</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-600">
            Manage backups, imports, exports, and scheduled jobs for your POS system. Only admin
            users can access this section.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {[
            {
              href: '/data-management/backup',
              title: 'Backup',
              description: 'Create and view backups of database modules.',
            },
            {
              href: '/data-management/import',
              title: 'Import',
              description: 'Upload JSON/CSV/ZIP files to import data.',
            },
            {
              href: '/data-management/export',
              title: 'Export',
              description: 'Export module data with filters and formats.',
            },
            {
              href: '/data-management/jobs',
              title: 'Scheduled Jobs',
              description: 'Create and track backup/import/export jobs.',
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-3xl border border-slate-200 bg-white p-6 text-left transition hover:border-slate-300 hover:shadow-sm"
            >
              <h2 className="text-xl font-semibold text-slate-900">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </MainLayout>
  );
}
