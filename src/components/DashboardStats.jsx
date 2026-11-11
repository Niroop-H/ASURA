'use client';

import {
  Globe, Plane, Ship, Brain, Newspaper, Database, Settings, CloudSun,
  Activity, Shield, Eye, Search, Radio, Zap, AlertTriangle, CheckCircle,
  XCircle, Clock, TrendingUp, TrendingDown, Hash, Layers, Target, Key, Map,
  LayoutDashboard, MessageSquare, Send, RefreshCw, Wifi, WifiOff, Info,
} from 'lucide-react';

const iconMap = {
  Globe, Plane, Ship, Brain, Newspaper, Database, Settings, CloudSun,
  Activity, Shield, Eye, Search, Radio, Zap, AlertTriangle, CheckCircle,
  XCircle, Clock, TrendingUp, Hash, Layers, Target, Key, Map,
  LayoutDashboard, MessageSquare, Send, RefreshCw, Wifi, WifiOff, Info,
};

const colorMap = {
  cyan: 'text-sky-700 bg-sky-50 border-sky-200',
  emerald: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  amber: 'text-amber-700 bg-amber-50 border-amber-200',
  red: 'text-rose-700 bg-rose-50 border-rose-200',
  purple: 'text-purple-700 bg-purple-50 border-purple-200',
  blue: 'text-blue-700 bg-blue-50 border-blue-200',
};

export default function DashboardStats({ stats = [] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, idx) => {
        const IconComponent = typeof stat.icon === 'string' ? iconMap[stat.icon] : stat.icon;
        const colorClasses = colorMap[stat.color] || colorMap.cyan;

        return (
          <div
            key={idx}
            className="defense-card p-5 defense-card-hover"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2.5 rounded-lg border ${colorClasses}`}>
                {IconComponent ? <IconComponent size={18} /> : null}
              </div>
              {stat.trend != null && (
                <div
                  className={`flex items-center gap-0.5 text-xs font-mono font-medium ${
                    stat.trend >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {stat.trend >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  <span>{Math.abs(stat.trend)}%</span>
                </div>
              )}
            </div>

            <p className="text-2xl font-bold font-mono tracking-tight text-slate-900 mb-0.5">
              {stat.value}
            </p>
            <p className="text-xs text-slate-500 font-sans">
              {stat.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}
