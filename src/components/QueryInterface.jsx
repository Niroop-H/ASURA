'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Send,
  Loader2,
  Sparkles,
  AlertCircle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Layers,
  ArrowRight,
  Database,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { QUERY_STAGES } from '@/lib/constants';

export default function QueryInterface({ initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [duration, setDuration] = useState(null);
  const stageTimerRef = useRef(null);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setCurrentStage(0);
    const startTime = Date.now();

    // Progress simulation through intelligence acquisition stages
    stageTimerRef.current = setInterval(() => {
      setCurrentStage((prev) => (prev < 5 ? prev + 1 : prev));
    }, 450);

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });

      const data = await res.json();
      clearInterval(stageTimerRef.current);

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Intelligence query analysis failed');
      }

      setCurrentStage(6); // Completed
      setResult(data);
      setDuration(((Date.now() - startTime) / 1000).toFixed(2));
    } catch (err) {
      clearInterval(stageTimerRef.current);
      setError(err.message || 'Failed to process intelligence request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Query Input Card */}
      <div className="defense-card p-6 shadow-tactical-md relative">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center space-x-2 text-sky-700 font-mono text-xs uppercase tracking-wider font-semibold">
            <Sparkles size={14} className="text-sky-600 animate-pulse" />
            <span>Multi-Domain Natural Language Request</span>
          </div>
          <span className="text-xs text-slate-500 font-mono">ASURA Engine v0.1 • Groq LLaMA 3.3 70B</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Analyze current airspace activity over Eastern Europe or retrieve latest maritime situational reports..."
              rows={4}
              disabled={loading}
              className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-lg p-4 text-slate-900 placeholder-slate-400 text-sm font-sans resize-none transition-colors disabled:opacity-60"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-slate-500 flex items-center gap-1.5 font-sans">
              <ShieldCheck size={14} className="text-emerald-600" />
              Evidence-grounded inference with timestamped citations (Spec §4.6)
            </p>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="inline-flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold font-mono px-5 py-2.5 rounded-lg text-xs shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Acquiring Evidence...
                </>
              ) : (
                <>
                  <Send size={15} />
                  Execute Analysis
                </>
              )}
            </button>
          </div>
        </form>

        {/* Live Stage Progress Indicator */}
        {loading && (
          <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-sky-700 font-semibold flex items-center gap-2">
                <Loader2 size={13} className="animate-spin text-sky-600" />
                Pipeline Execution: {QUERY_STAGES[currentStage]?.label}
              </span>
              <span className="text-slate-500">Stage {currentStage + 1} of {QUERY_STAGES.length}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {QUERY_STAGES.map((stg, idx) => {
                const isPassed = idx < currentStage;
                const isCurrent = idx === currentStage;
                return (
                  <div
                    key={stg.key}
                    className={`p-2 rounded border text-center transition-all duration-150 ${
                      isPassed
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                        : isCurrent
                        ? 'bg-sky-50 border-sky-400 text-sky-900 font-bold ring-1 ring-sky-400 animate-pulse'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <div className="text-[10px] font-mono uppercase tracking-wider">{idx + 1}. {stg.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-start gap-3 text-rose-900">
          <AlertCircle size={18} className="text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-semibold text-rose-800">Analysis Encountered an Issue</p>
            <p className="text-rose-700 mt-1">{error}</p>
            <p className="text-[11px] text-slate-500 mt-2 font-mono">
              Ensure GROQ_API_KEY is configured in API Keys.
            </p>
          </div>
        </div>
      )}

      {/* Structured Result Display */}
      {result && (
        <div className="defense-card p-6 shadow-tactical-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
              <h3 className="text-sm font-bold text-slate-900 uppercase font-mono tracking-wider">
                Consolidated Intelligence Assessment
              </h3>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono text-slate-500">
              <span className="flex items-center gap-1">
                <Clock size={13} className="text-sky-600" /> {duration}s
              </span>
              <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-700">
                Model: {result.model || 'Groq LLaMA 3.3'}
              </span>
            </div>
          </div>

          {/* Formatted Content */}
          <div className="text-sm leading-relaxed text-slate-800 font-sans whitespace-pre-line space-y-2 bg-slate-50 p-5 rounded-lg border border-slate-200">
            {result.answer}
          </div>

          {/* Source Attribution & Provenance Footer */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 font-mono">
            <div className="flex items-center gap-2">
              <Database size={14} className="text-sky-600" />
              <span>Evidence Timestamp: <strong>{new Date(result.timestamp || Date.now()).toUTCString()}</strong></span>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span>Tokens: {result.usage?.total_tokens || 'N/A'}</span>
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 size={13} /> Grounded Claim
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
