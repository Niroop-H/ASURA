'use client';

import { Clock, ShieldAlert, CheckCircle2, Radio, Info } from 'lucide-react';

const dotColors = {
  query: 'bg-sky-600',
  source: 'bg-emerald-600',
  error: 'bg-rose-600',
  system: 'bg-slate-400',
};

function relativeTime(timestamp) {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = Math.max(0, Math.floor((now - then) / 1000));

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ActivityFeed({ activities = [] }) {
  if (activities.length === 0) {
    return (
      <div className="defense-card p-5">
        <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2 font-mono">
          <Clock size={15} className="text-slate-400" />
          Real-Time Operational Audit Feed
        </h3>
        <p className="text-xs text-slate-400 text-center py-6 font-mono">No recent activity logged</p>
      </div>
    );
  }

  return (
    <div className="defense-card p-5 space-y-3">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-2 font-mono">
          <Clock size={15} className="text-sky-600" />
          Real-Time Operational Audit Feed
        </h3>
        <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
          <Radio size={11} className="text-emerald-600 animate-pulse" /> Live Stream
        </span>
      </div>

      <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
        {activities.map((activity) => {
          const color = dotColors[activity.type] || dotColors.system;
          return (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <div className="pt-1">
                <span className={`w-2 h-2 rounded-full ${color} block`} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-800 leading-snug font-sans font-medium">{activity.message}</p>
                <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-slate-400">
                  <span>{relativeTime(activity.timestamp)}</span>
                  <span>•</span>
                  <span className="uppercase text-slate-500">{activity.type}</span>
                </div>
              </div>

              {activity.status && (
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    activity.status === 'success'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : activity.status === 'error'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {activity.status}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
