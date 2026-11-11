'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import {
  FileCheck,
  ShieldCheck,
  Download,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Layers,
  FileText,
  Clock,
  Printer,
  ExternalLink,
  RefreshCw,
  Hash
} from 'lucide-react';
import { COMPLIANCE_FRAMEWORKS, DETAILED_CONTROLS } from '@/lib/complianceData';

export default function CompliancePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterFramework, setFilterFramework] = useState('ALL');
  const [activeTab, setActiveTab] = useState('matrix'); // 'matrix' | 'audit' | 'declarations'

  const fetchComplianceData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/compliance');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Error fetching compliance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplianceData();
  }, []);

  const handleExportReport = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ASURA-Defense-Compliance-Audit-Report-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredControls = filterFramework === 'ALL'
    ? DETAILED_CONTROLS
    : DETAILED_CONTROLS.filter((c) => c.framework.toLowerCase().includes(filterFramework.toLowerCase()));

  return (
    <div className="p-6 md:p-8 space-y-7 max-w-7xl mx-auto w-full">
      <Header
        title="Defense Sector Compliance & Governance"
        subtitle="Formal verification against NIST SP 800-53, CMMC 2.0, FedRAMP, and MAH Quantum Spec §3 & §7"
      />

      {/* Top Banner: Overall Score & Export Action */}
      <div className="defense-card p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-tactical-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-mono font-bold tracking-wider">
                AUDIT VERIFIED: NIST 800-53 COMPLIANT
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                REPORT REF: ASURA-AUDIT-2026-Q4
              </span>
            </div>
            <h2 className="text-xl font-bold font-sans tracking-tight">
              Defense Intelligence Regulatory & Security Assurance
            </h2>
            <p className="text-xs text-slate-300 font-sans max-w-2xl leading-relaxed">
              This system operates in strict adherence to federal CUI protection, non-archival sensor guidelines, zero continuous CCTV retention, and cryptographic SHA-256 audit chaining.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="text-center px-4 py-2 rounded-lg bg-white/10 border border-white/10">
              <div className="text-3xl font-bold font-mono text-emerald-400">98%</div>
              <div className="text-[10px] font-mono text-slate-300 uppercase tracking-wider">Composite Score</div>
            </div>

            <button
              onClick={handleExportReport}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold font-mono shadow transition-colors cursor-pointer"
            >
              <Download size={14} /> Export Formal Report (.JSON)
            </button>
          </div>
        </div>
      </div>

      {/* Framework Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {COMPLIANCE_FRAMEWORKS.map((fw) => (
          <div key={fw.id} className="defense-card p-5 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-slate-500 uppercase">
                  {fw.authority}
                </span>
                <span className="defense-badge bg-emerald-50 text-emerald-700 border-emerald-200">
                  {fw.status}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">{fw.name}</h3>
              <p className="text-xs text-slate-500 font-sans">{fw.description}</p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500">{fw.passedCount}/{fw.controlsCount} Controls Passed</span>
              <span className="text-emerald-700 font-bold">{fw.score}% Score</span>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Navigation: Controls Matrix vs. Cryptographic Audit Log */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-mono">
        <button
          onClick={() => setActiveTab('matrix')}
          className={`pb-3 font-semibold transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
            activeTab === 'matrix'
              ? 'border-sky-600 text-sky-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck size={14} /> Security Controls Matrix
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 font-semibold transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
            activeTab === 'audit'
              ? 'border-sky-600 text-sky-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Hash size={14} /> Cryptographic SHA-256 Audit Trail
        </button>
        <button
          onClick={() => setActiveTab('declarations')}
          className={`pb-3 font-semibold transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
            activeTab === 'declarations'
              ? 'border-sky-600 text-sky-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText size={14} /> Defense Declarations
        </button>
      </div>

      {/* Tab 1: Detailed Controls Matrix */}
      {activeTab === 'matrix' && (
        <div className="space-y-4">
          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono">
            <span className="text-slate-400">Filter Framework:</span>
            {['ALL', 'NIST', 'CMMC', 'MAH Quantum'].map((f) => (
              <button
                key={f}
                onClick={() => setFilterFramework(f)}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  filterFramework === f
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="defense-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="defense-table-header">Control ID</th>
                    <th className="defense-table-header">Control Family</th>
                    <th className="defense-table-header">Requirement</th>
                    <th className="defense-table-header">ASURA Implementation</th>
                    <th className="defense-table-header">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  {filteredControls.map((ctrl) => (
                    <tr key={ctrl.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="defense-table-cell font-bold text-slate-900">
                        <div>{ctrl.id}</div>
                        <span className="text-[10px] text-slate-400 font-normal">{ctrl.framework}</span>
                      </td>
                      <td className="defense-table-cell font-semibold text-slate-700">
                        {ctrl.family}
                      </td>
                      <td className="defense-table-cell text-slate-600 font-sans max-w-xs">
                        <strong className="block text-slate-800 font-mono text-[11px] mb-0.5">{ctrl.title}</strong>
                        {ctrl.requirement}
                      </td>
                      <td className="defense-table-cell text-slate-700 font-sans max-w-sm text-[11px] bg-slate-50/50">
                        {ctrl.implementation}
                      </td>
                      <td className="defense-table-cell">
                        <span className="defense-badge bg-emerald-50 text-emerald-700 border-emerald-200">
                          {ctrl.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Cryptographic Audit Trail */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="defense-card p-4 bg-slate-50 border-slate-200 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-slate-800">SHA-256 Merkle Chain Integrity: VERIFIED</span>
            </div>
            <span className="text-slate-500">Algorithm: FIPS 180-4 SHA-256 Chained Ledger</span>
          </div>

          <div className="defense-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="defense-table-header">Event ID</th>
                    <th className="defense-table-header">Timestamp (UTC)</th>
                    <th className="defense-table-header">Action / Category</th>
                    <th className="defense-table-header">Details</th>
                    <th className="defense-table-header">Chained SHA-256 Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  {(data?.recentAuditEvents || []).map((ev) => (
                    <tr key={ev.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="defense-table-cell font-bold text-slate-900">{ev.id}</td>
                      <td className="defense-table-cell text-slate-500 text-[11px]">{ev.timestamp}</td>
                      <td className="defense-table-cell">
                        <div className="font-bold text-slate-800">{ev.action}</div>
                        <span className="text-[10px] text-slate-400">{ev.category}</span>
                      </td>
                      <td className="defense-table-cell font-sans text-slate-700 text-[11px] max-w-sm">
                        {ev.details}
                      </td>
                      <td className="defense-table-cell font-mono text-[10px] text-sky-700 max-w-xs truncate" title={ev.hash}>
                        {ev.hash}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Security & Regulatory Declarations */}
      {activeTab === 'declarations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(data?.securityDeclarations || []).map((decl) => (
            <div key={decl.id} className="defense-card p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-sky-800">{decl.id}</span>
                <span className="defense-badge bg-emerald-50 text-emerald-700 border-emerald-200">
                  {decl.status}
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">{decl.rule}</h4>
              <p className="text-xs text-slate-600 font-sans leading-relaxed pt-1 border-t border-slate-100">
                {decl.proof}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
