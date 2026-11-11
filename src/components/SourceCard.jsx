'use client';

import { useState } from 'react';
import {
  Globe,
  Radio,
  Trash2,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Check,
  Power,
  RefreshCw,
  Cpu
} from 'lucide-react';
import { DOMAINS } from '@/lib/constants';

export default function SourceCard({ source, onToggle, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const domainMeta = DOMAINS[source.domain] || { label: source.domain, color: '#0284c7' };

  const handleToggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onToggle(source.id);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onDelete(source.id);
    } finally {
      setBusy(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className={`defense-card p-5 flex flex-col justify-between ${
      source.enabled ? 'border-slate-200' : 'opacity-60 bg-slate-50/50'
    }`}>
      <div className="space-y-3">
        {/* Header: Domain Badge + Status */}
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border font-semibold"
            style={{
              borderColor: `${domainMeta.color}30`,
              backgroundColor: `${domainMeta.color}10`,
              color: domainMeta.color,
            }}
          >
            {domainMeta.label}
          </span>

          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className={`w-2 h-2 rounded-full ${source.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span className="text-slate-600 font-semibold capitalize">
              {source.enabled ? 'Active' : 'Disabled'}
            </span>
          </div>
        </div>

        {/* Source Name & Description */}
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            {source.name}
          </h3>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2 font-sans">
            {source.description || 'Configured acquisition connector for ASURA defense platform.'}
          </p>
        </div>

        {/* Technical Metadata */}
        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1 text-[11px] font-mono text-slate-600">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Access Method:</span>
            <span className="text-slate-800 font-semibold uppercase">{source.type || 'REST API'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Auth Requirement:</span>
            <span className={source.authRequired ? 'text-amber-700 font-semibold' : 'text-emerald-700 font-semibold'}>
              {source.authRequired ? `Key Required (${source.authEnvVar || 'Secret'})` : 'Public (Free Tier)'}
            </span>
          </div>
          {source.freeTier && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Quota Limit:</span>
              <span className="text-slate-700">{source.freeTier}</span>
            </div>
          )}
        </div>

        {/* Endpoint */}
        {source.endpoint && (
          <div className="truncate text-[10px] font-mono text-slate-500 bg-white px-2 py-1 rounded border border-slate-200" title={source.endpoint}>
            {source.endpoint}
          </div>
        )}
      </div>

      {/* Card Actions Footer */}
      <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
        <button
          onClick={handleToggle}
          disabled={busy}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono font-medium transition-colors border cursor-pointer ${
            source.enabled
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
              : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Power size={11} />
          {source.enabled ? 'Enabled' : 'Activate'}
        </button>

        <div className="flex items-center gap-1">
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                onClick={handleDelete}
                disabled={busy}
                className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-mono"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-1.5 py-0.5 rounded text-slate-500 hover:text-slate-700 text-[11px]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
              title="Delete connector"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
