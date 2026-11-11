import Header from '@/components/Header';

export default function SettingsPage() {
  return <div className="p-6 md:p-8 space-y-7 max-w-6xl mx-auto w-full">
    <Header title="System governance" subtitle="Requirements and implementation gaps" />
    <section className="defense-card p-6 space-y-3 text-sm text-slate-600">
      <h2 className="font-semibold text-slate-900">Development status</h2>
      <p>Evidence acquisition, expiry-controlled storage, authentication, and role-based authorization remain incomplete. No operational security or compliance assessment is available.</p>
      <h2 className="font-semibold text-slate-900">Retention requirements</h2>
      <p>The project requires no continuous camera recording and no unlimited historical scraped-data archive. These are requirements for future integrations, not evidence of a completed assessment.</p>
      <p>Source registry changes and application audit events currently use process memory and can be lost on restart.</p>
    </section>
  </div>;
}
