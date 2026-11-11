import Link from 'next/link';
import Header from '@/components/Header';
import MapView from '@/components/MapView';
import DefenseMetricsChart from '@/components/DefenseMetricsChart';

export default function DashboardPage() {
  return (
    <div className="p-6 md:p-8 space-y-7 max-w-7xl mx-auto w-full">
      <Header title="ASURA Overview" subtitle="Implementation and data availability" />
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 space-y-2">
        <h2 className="font-semibold text-amber-900">Data integrations are incomplete</h2>
        <p className="text-sm text-amber-900">This build has no verified observation feed connected to its dashboard. Credential configuration and enabled source entries do not establish provider availability or data accuracy.</p>
      </section>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MapView />
        <DefenseMetricsChart />
      </div>
      <section className="defense-card p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Workspace</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            ['/sources', 'Source registry', 'Configuration only; retrieval not verified'],
            ['/keys', 'Credential configuration', 'Presence and format checks only'],
            ['/compliance', 'Assessment status', 'No certification or readiness claim'],
          ].map(([href, title, description]) => (
            <Link key={href} href={href} className="rounded-lg border border-slate-200 p-4 hover:border-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600">
              <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-xs text-slate-600">{description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
