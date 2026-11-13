'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import SourceCard from '@/components/SourceCard';
import {
  Database,
  Plus,
  RefreshCw,
  Filter,
  CheckCircle,
  Layers,
  AlertCircle,
  X
} from 'lucide-react';
import { DOMAINS } from '@/lib/constants';

export default function SourcesPage() {
  const [sources, setSources] = useState([]);
  const [operationalSources, setOperationalSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDomain, setSelectedDomain] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Source Form State
  const [newSource, setNewSource] = useState({
    name: '',
    domain: 'search',
    type: 'api',
    endpoint: '',
    description: '',
    authRequired: false,
    authEnvVar: '',
    freeTier: '',
  });

  const fetchSources = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sources');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch sources');
      setSources(data.sources || []);
      setOperationalSources(data.operationalSources || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleToggle = async (id) => {
    try {
      const res = await fetch('/api/sources', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (res.ok && data.source) {
        setSources((prev) =>
          prev.map((s) => (s.id === id ? data.source : s))
        );
      }
    } catch (err) {
      console.error('Failed to toggle source:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch('/api/sources', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setSources((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete source:', err);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!newSource.name) return;

    try {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSource),
      });
      const data = await res.json();
      if (res.ok && data.source) {
        setSources((prev) => [...prev, data.source]);
        setShowAddModal(false);
        setNewSource({
          name: '',
          domain: 'search',
          type: 'api',
          endpoint: '',
          description: '',
          authRequired: false,
          authEnvVar: '',
          freeTier: '',
        });
      }
    } catch (err) {
      alert('Error adding source: ' + err.message);
    }
  };

  const filteredSources = selectedDomain === 'all'
    ? sources
    : sources.filter((s) => s.domain === selectedDomain);

  const enabledCount = sources.filter((s) => s.enabled).length;

  return (
    <div className="p-6 md:p-8 space-y-7 max-w-7xl mx-auto w-full">
      <Header
        title="Observation Source Registry"
        subtitle="Manage approved data acquisition connectors, free-tier quotas & sensor endpoints"
      />

      {/* Top Controls Banner */}
      <div className="defense-card p-4 border-sky-200 flex flex-wrap gap-3 justify-between items-center">
       <div>
        <h2 className="text-sm font-bold text-slate-900">Autonomous Defense Tool Registry</h2>
        <p className="text-xs text-slate-500">50 Blue Team integration contracts; verified provider connectivity is reported separately from catalogue entries.</p>
       </div>
       <Link href="/defense" className="bg-slate-900 text-white rounded px-4 py-2 text-xs font-semibold">Open Defense Matrix</Link>
      </div>
      <div className="defense-card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-mono uppercase">
            <Database size={16} className="text-sky-600" />
            Connected Observation Feeds
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">
            <span className="text-emerald-700 font-bold">{enabledCount}</span> of {sources.length} sources enabled (not connectivity-tested)
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold font-mono text-xs shadow transition-colors cursor-pointer"
          >
            <Plus size={14} /> Add Connector
          </button>
          <button
            onClick={fetchSources}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            title="Refresh Sources"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <section className="defense-card p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-sm text-slate-900">Official public source contracts ({operationalSources.length})</h2>
            <p className="text-xs text-slate-600 mt-1">
              These are implemented read-only adapters, not continuously monitored or certified live feeds.
              Licence-gated and unconfigured sources may return BLOCKED.
            </p>
          </div>
          <Link href="/readiness" className="px-3 py-2 rounded bg-slate-900 text-white text-xs font-semibold">
            Probe source health
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {operationalSources.map(src => (
            <article key={src.id} className="border border-slate-200 rounded p-3 space-y-1 text-xs">
              <p className="font-semibold text-slate-900">{src.label}</p>
              <p className="text-slate-600">{src.scope}</p>
              <p className="font-mono text-slate-500">ID: {src.id} · Expected poll: {src.cadenceMinutes} min</p>
              <p className="font-mono text-slate-500">Licence: {src.licenseStatus}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Domain Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 text-xs font-mono">
        <button
          onClick={() => setSelectedDomain('all')}
          className={`px-3 py-1.5 rounded-lg border whitespace-nowrap transition-colors cursor-pointer ${
            selectedDomain === 'all'
              ? 'bg-slate-900 border-slate-900 text-white font-semibold'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Feeds ({sources.length})
        </button>
        {Object.entries(DOMAINS).map(([key, meta]) => {
          const count = sources.filter((s) => s.domain === key).length;
          if (count === 0) return null;
          return (
            <button
              key={key}
              onClick={() => setSelectedDomain(key)}
              className={`px-3 py-1.5 rounded-lg border whitespace-nowrap transition-colors cursor-pointer ${
                selectedDomain === key
                  ? 'bg-slate-900 border-slate-900 text-white font-semibold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {meta.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Source Cards Grid */}
      {loading && sources.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-xs font-mono">
          <RefreshCw size={24} className="animate-spin mx-auto text-sky-600 mb-2" />
          Loading acquisition registry...
        </div>
      ) : filteredSources.length === 0 ? (
        <div className="defense-card p-8 text-center text-slate-500 text-xs font-mono">
          No observation connectors found in this domain.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSources.map((src) => (
            <SourceCard
              key={src.id}
              source={src}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Add Source Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="defense-card max-w-lg w-full p-6 shadow-tactical-lg relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-mono uppercase">
                <Plus size={16} className="text-sky-600" />
                Register New Source Connector
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Source Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FlightRadar24 Unofficial Feed"
                  value={newSource.name}
                  onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:border-sky-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Domain</label>
                  <select
                    value={newSource.domain}
                    onChange={(e) => setNewSource({ ...newSource, domain: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:border-sky-500 font-mono text-xs"
                  >
                    {Object.entries(DOMAINS).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Connector Type</label>
                  <select
                    value={newSource.type}
                    onChange={(e) => setNewSource({ ...newSource, type: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:border-sky-500 font-mono text-xs"
                  >
                    <option value="api">REST API</option>
                    <option value="rss">RSS/Atom Feed</option>
                    <option value="websocket">WebSocket Stream</option>
                    <option value="crawler">Web Crawler</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Endpoint URL</label>
                <input
                  type="url"
                  placeholder="https://api.example.com/v1/feed"
                  value={newSource.endpoint}
                  onChange={(e) => setNewSource({ ...newSource, endpoint: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono text-[11px] focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description / Scope</label>
                <textarea
                  rows={2}
                  placeholder="Primary coverage scope, data types provided, license terms..."
                  value={newSource.description}
                  onChange={(e) => setNewSource({ ...newSource, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:border-sky-500 font-sans"
                />
              </div>

              <div className="flex items-center gap-2 pt-1 font-sans">
                <input
                  type="checkbox"
                  id="authReq"
                  checked={newSource.authRequired}
                  onChange={(e) => setNewSource({ ...newSource, authRequired: e.target.checked })}
                  className="rounded border-slate-300 text-sky-600 focus:ring-0"
                />
                <label htmlFor="authReq" className="text-slate-700 font-medium">Requires API Key / Auth Token</label>
              </div>

              {newSource.authRequired && (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Associated Env Var</label>
                  <input
                    type="text"
                    placeholder="e.g. CUSTOM_FEED_KEY"
                    value={newSource.authEnvVar}
                    onChange={(e) => setNewSource({ ...newSource, authEnvVar: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono text-[11px]"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2 font-mono">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow cursor-pointer"
                >
                  Save Connector
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
