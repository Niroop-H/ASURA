'use client';

import { useState, useEffect } from 'react';
import {
  Key,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Layers,
  Info,
  Server
} from 'lucide-react';
import { DOMAINS, PRIORITY_BADGES } from '@/lib/constants';

export default function KeyStatusPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchKeys = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/keys');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch key status');
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  if (loading && !data) {
    return (
      <div className="defense-card p-8 text-center text-slate-500 font-mono text-xs">
        <RefreshCw size={24} className="animate-spin mx-auto text-sky-600 mb-3" />
        <p>Auditing registered server-side API keyholders...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="defense-card p-5 bg-rose-50 border-rose-200 text-rose-900">
        <p className="font-semibold text-xs">Failed to load key statuses</p>
        <p className="text-xs text-rose-700 mt-1">{error}</p>
        <button
          onClick={fetchKeys}
          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-100 border border-rose-300 text-xs font-mono text-rose-900 hover:bg-rose-200"
        >
          <RefreshCw size={12} /> Retry
        </button>
      </div>
    );
  }

  const { keys = [], summary = {}, problems = [] } = data || {};

  // Group keys by domain
  const byDomain = keys.reduce((acc, k) => {
    (acc[k.domain] = acc[k.domain] || []).push(k);
    return acc;
  }, {});

  const percentConfigured = summary.total > 0
    ? Math.round((summary.configured / summary.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Summary Banner */}
      <div className="defense-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase font-mono tracking-wider flex items-center gap-2">
              <Key size={16} className="text-sky-600" />
              API Key & Provider Status Inventory
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-sans">
              Server-side secrets management • Zero client leakage • FIPS & ITAR compliant memory storage
            </p>
          </div>
          <button
            onClick={fetchKeys}
            disabled={loading}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 text-xs font-mono transition-colors cursor-pointer"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh Audit
          </button>
        </div>

        {/* Progress Bar & Badges */}
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-700">
              Configured: <strong className="text-sky-700">{summary.configured}</strong> / {summary.total}
            </span>
            <span className="text-slate-500">{percentConfigured}% Ready</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
            <div
              className="bg-sky-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${percentConfigured}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-4 pt-2 text-xs font-mono">
            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
              <CheckCircle size={13} /> {summary.configured} Configured
            </span>
            <span className="inline-flex items-center gap-1 text-rose-700 font-semibold">
              <XCircle size={13} /> {summary.missing_required || 0} Missing Required
            </span>
            <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
              <AlertTriangle size={13} /> {summary.missing_recommended || 0} Missing Recommended
            </span>
          </div>
        </div>
      </div>

      {/* Problems Callout if any */}
      {problems && problems.length > 0 && (
        <div className="defense-card p-4 bg-amber-50 border-amber-200 text-xs font-mono space-y-1.5">
          <p className="font-semibold text-amber-900 flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-amber-700" /> Operational Advisories ({problems.length})
          </p>
          <ul className="list-disc list-inside text-amber-800 space-y-1 pl-1 text-[11px]">
            {problems.map((p, idx) => (
              <li key={idx}>{p.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Grouped Domain Lists */}
      <div className="space-y-4">
        {Object.entries(byDomain).map(([domain, keyList]) => {
          const domInfo = DOMAINS[domain] || { label: domain, color: '#475569' };
          return (
            <div key={domain} className="defense-card overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: domInfo.color }} />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">{domInfo.label}</span>
                </div>
                <span className="text-[11px] font-mono text-slate-500">{keyList.length} holder{keyList.length > 1 ? 's' : ''}</span>
              </div>

              <div className="divide-y divide-slate-100">
                {keyList.map((k) => (
                  <div key={k.envVar} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono font-bold text-slate-900">{k.envVar}</code>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                          k.priority === 'required'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : k.priority === 'recommended'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {k.priority}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-sans">
                        {k.provider}
                        {k.freeTier && <span className="text-slate-400 font-mono ml-2">({k.freeTier})</span>}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-auto font-mono text-xs">
                      {k.present ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">
                          <CheckCircle size={12} /> Configured
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded border ${
                          k.priority === 'required'
                            ? 'bg-rose-50 border-rose-200 text-rose-800 font-semibold'
                            : 'bg-slate-100 border-slate-200 text-slate-600'
                        }`}>
                          <XCircle size={12} /> Not Set
                        </span>
                      )}

                      {k.docsUrl && (
                        <a
                          href={k.docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-sky-600 p-1 transition-colors"
                          title="Get API Key Docs"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
