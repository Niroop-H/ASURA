import Header from '@/components/Header';

export default function CompliancePage() {
  return <div className="p-6 md:p-8 space-y-7 max-w-7xl mx-auto w-full">
    <Header title="Assessment status" subtitle="No certification claims" />
    <section className="defense-card p-6 space-y-3">
      <h2 className="font-semibold text-slate-900">Not assessed</h2>
      <p className="text-sm text-slate-600">No verified control assessment, certification, or operational readiness report is available. The previous sample percentages and compliance declarations have been withdrawn.</p>
      <p className="text-sm text-slate-600">Classification markings require an authorized determination and are not assigned by this application.</p>
    </section>
  </div>;
}
