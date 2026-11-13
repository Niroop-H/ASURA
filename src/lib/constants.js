/* ─── ASURA Design Constants ─── */

export const DOMAINS = {
  ai:       { label: 'AI Gateway',      icon: 'Brain',       color: '#a78bfa' },
  search:   { label: 'Search',          icon: 'Search',      color: '#60a5fa' },
  news:     { label: 'News / OSINT',    icon: 'Newspaper',   color: '#f472b6' },
  geo:      { label: 'Geospatial',      icon: 'Globe',       color: '#34d399' },
  aviation: { label: 'Aviation',        icon: 'Plane',       color: '#fbbf24' },
  maritime: { label: 'Maritime',        icon: 'Ship',        color: '#38bdf8' },
  weather:  { label: 'Weather',         icon: 'CloudSun',    color: '#fb923c' },
  database: { label: 'Database',        icon: 'Database',    color: '#c084fc' },
  app:      { label: 'Application',     icon: 'Settings',    color: '#94a3b8' },
  defense:  { label: 'Autonomous Defense Engine', icon: 'ShieldCheck', color: '#0284c7' },
};

export const QUERY_STAGES = [
  { key: 'understanding',   label: 'Understanding request' },
  { key: 'discovering',     label: 'Discovering sources' },
  { key: 'retrieving',      label: 'Retrieving data' },
  { key: 'extracting',      label: 'Extracting records' },
  { key: 'crosschecking',   label: 'Cross-checking evidence' },
  { key: 'preparing',       label: 'Preparing findings' },
  { key: 'completed',       label: 'Completed' },
];

export const PRIORITY_BADGES = {
  required:    { label: 'Required',    className: 'bg-red-500/20 text-red-400 border-red-500/30' },
  recommended: { label: 'Recommended', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  optional:    { label: 'Optional',    className: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
};

export const STATUS_COLORS = {
  ok:      'text-emerald-400',
  warning: 'text-amber-400',
  error:   'text-red-400',
  offline: 'text-gray-500',
};
