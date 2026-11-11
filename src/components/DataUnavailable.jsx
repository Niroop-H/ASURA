export default function DataUnavailable({ title, children }) {
  return (
    <section className="defense-card p-6 space-y-3" aria-label={title}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <span className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">Unavailable</span>
      </div>
      <p className="text-sm leading-relaxed text-slate-600">{children}</p>
      <p className="text-xs text-slate-500">No observation timestamp or verified source record is available. Missing data does not mean no events occurred.</p>
    </section>
  );
}
