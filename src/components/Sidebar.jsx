'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Shield,
  LayoutDashboard,
  MessageSquare,
  Crosshair,
  Database,
  Key,
  Map,
  FileCheck,
  Settings,
  Menu,
  X,
  Radio,
  ExternalLink
} from 'lucide-react';

const NAV_LINKS = [
  { href: '/', label: 'Command Center', icon: LayoutDashboard },
  { href: '/query', label: 'Intelligence Query', icon: MessageSquare },
  { href: '/tracking', label: 'Observations', icon: Crosshair },
  { href: '/map', label: 'Geospatial View', icon: Map },
  { href: '/sources', label: 'Source Registry', icon: Database },
  { href: '/keys', label: 'API Key Holders', icon: Key },
  { href: '/compliance', label: 'Assessment Status', icon: FileCheck },
  { href: '/settings', label: 'System Governance', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-3 left-3 z-50 md:hidden p-2 rounded-lg bg-white border border-slate-200 text-slate-700 shadow-sm"
        aria-label="Toggle navigation"
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col">
          {/* Logo & Header */}
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-slate-900 text-white shadow-xs">
                <Shield size={20} className="text-sky-400" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-base font-bold tracking-tight text-slate-900">ASURA</span>
                  <span className="text-[10px] font-mono font-semibold px-1 py-0.5 rounded bg-sky-100 text-sky-800">
                    v0.1
                  </span>
                </div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                  Defense Intelligence
                </p>
              </div>
            </Link>
          </div>

          {/* Classification Tag */}
          <div className="px-5 py-1.5 bg-slate-100/80 border-b border-slate-200 text-[10px] font-mono text-center text-slate-600 font-semibold tracking-wider">
            DEVELOPMENT BUILD
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {NAV_LINKS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-sky-50 text-sky-900 font-semibold border-l-2 border-sky-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-sky-600' : 'text-slate-400'} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Posture & Readiness */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/60 text-xs font-mono space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span>DATA VERIFICATION</span>
            <span className="flex items-center gap-1 text-amber-700 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              NOT ASSESSED
            </span>
          </div>

          <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-200">
            <span>No readiness assessment</span>
            <span className="text-slate-600"></span>
          </div>
        </div>
      </aside>
    </>
  );
}
