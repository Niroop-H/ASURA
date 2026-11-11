'use client';
import { useEffect, useMemo, useRef, useState } from 'react';

const DOMAINS = [
  { id: 'flights', name: 'Aircraft', color: '#0284c7' },
  { id: 'earthquakes', name: 'Earthquakes', color: '#f97316' },
  { id: 'events', name: 'Natural events', color: '#65a30d' },
  { id: 'weather', name: 'Weather', color: '#eab308' },
];
const REGIONS = {
  bengaluru: { name: 'Bengaluru', coords: [12.9716, 77.5946] },
  london: { name: 'London', coords: [51.47, -0.4543] },
  singapore: { name: 'Singapore', coords: [1.3644, 103.9915] },
  newyork: { name: 'New York', coords: [40.6413, -73.7781] },
  dubai: { name: 'Dubai', coords: [25.2532, 55.3657] },
};
const when = value => {
  if (!value) return 'Not supplied';
  const time = new Date(value);
  return Number.isNaN(time.getTime()) ? 'Not supplied' : time.toLocaleString();
};
const display = (value, unit = '') => value !== null && value !== undefined && value !== ''
  ? String(value) + unit : 'Not reported';
const kmh = knots => Number.isFinite(knots) ? Math.round(knots * 1.852) : null;
const valid = r => Number.isFinite(r.lat) && Number.isFinite(r.lon)
  && Math.abs(r.lat) <= 90 && Math.abs(r.lon) <= 180;
const planeSVG = '<svg aria-hidden="true" viewBox="0 0 32 36" width="31" height="35" xmlns="http://www.w3.org/2000/svg"><path d="M16 1 C14.7 1 13.8 2.6 13.8 5 L13.8 13.3 2 21 L2 25.3 13.8 21.8 13.8 29.6 9.1 32 9.1 35 16 33.1 22.9 35 22.9 32 18.2 29.6 18.2 21.8 30 25.3 30 21 18.2 13.3 18.2 5 C18.2 2.6 17.3 1 16 1Z" fill="#0284c7" stroke="#ffffff" stroke-width="1.4" stroke-linejoin="round"/></svg>';
function airplaneIcon(L, heading, highlight) {
  const degrees = Number.isFinite(heading) ? ((heading % 360) + 360) % 360 : 0;
  const size = highlight ? 40 : 32;
  return L.divIcon({
    className: 'asura-aircraft',
    html: '<div style="width:' + size + 'px;height:' + size + 'px;display:grid;place-items:center;transform:rotate(' + degrees +
      'deg);filter:drop-shadow(0 1px 3px #082f49);' +
      (highlight ? 'background:rgba(56,189,248,.20);border:2px solid #0ea5e9;border-radius:50%;' : '') + '">' +
      planeSVG + '</div>',
    iconSize: [size, size], iconAnchor: [size / 2, size / 2], popupAnchor: [0, -size / 2],
  });
}
function initializeLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (window.__asuraLeaflet) return window.__asuraLeaflet;
  window.__asuraLeaflet = new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';
    css.crossOrigin = 'anonymous';
    css.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    document.head.appendChild(css);
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js';
    script.crossOrigin = 'anonymous';
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error('Map library failed to load'));
    document.head.appendChild(script);
  });
  return window.__asuraLeaflet;
}
function Datum({ label, value }) {
  return <div className="rounded border border-slate-200 p-2 min-w-0">
    <div className="text-[10px] text-slate-500 uppercase">{label}</div>
    <div className="text-sm font-medium break-words">{value}</div>
  </div>;
}
export default function LiveGeoMap({ initialRegion = 'bengaluru' }) {
  const target = useRef(null), mapRef = useRef(null), tileRef = useRef({}), layerRef = useRef(null), markersRef = useRef(new Map());
  const [region, setRegion] = useState(initialRegion);
  const [basemap, setBasemap] = useState('street');
  const [providerChoice, setProviderChoice] = useState('flights');
  const [layers, setLayers] = useState(['flights', 'earthquakes', 'events', 'weather']);
  const [responses, setResponses] = useState({});
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [lastChecked, setLastChecked] = useState(null);
  const flightData = responses[providerChoice];
  const flights = useMemo(() => flightData?.success ? flightData.records.filter(valid) : [], [flightData]);
  const visibleFlights = useMemo(() => {
    const search = filter.trim().toLowerCase();
    return flights.filter(r => !search || [r.title, r.registration, r.aircraftType, r.origin, r.destination, r.icao24].some(value =>
      value && String(value).toLowerCase().includes(search)));
  }, [flights, filter]);
  const current = selected?.source === 'flights'
    ? flights.find(r => r.id === selected.id)
    : responses[selected?.source]?.records?.find(r => r.id === selected?.id);

  useEffect(() => {
    let mounted = true;
    initializeLeaflet().then(L => {
      if (!mounted || !target.current || mapRef.current) return;
      const map = L.map(target.current, { zoomControl: true, worldCopyJump: true, preferCanvas: true })
        .setView(REGIONS[initialRegion]?.coords || REGIONS.bengaluru.coords, 8);
      mapRef.current = map;
      tileRef.current = {
        street: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19, attribution: '© OpenStreetMap contributors',
        }),
        satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19, attribution: 'Imagery © Esri, Vantor, Earthstar Geographics and GIS User Community',
        }),
      };
      tileRef.current.street.addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      setMapReady(true);
      requestAnimationFrame(() => map.invalidateSize());
    }).catch(error => { if (mounted) setMapError(error.message); });
    return () => {
      mounted = false;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
      markersRef.current = new Map();
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    mapRef.current.flyTo(REGIONS[region]?.coords || REGIONS.bengaluru.coords, 8, { duration: .4 });
  }, [region, mapReady]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    Object.values(tileRef.current).forEach(tile => { if (map.hasLayer(tile)) map.removeLayer(tile); });
    tileRef.current[basemap].addTo(map);
  }, [basemap, mapReady]);

  useEffect(() => {
    let active = true;
    const feedNames = [providerChoice, 'earthquakes', 'events', 'weather'];
    const poll = async () => {
      await Promise.all(feedNames.map(async id => {
        try {
          const url = '/api/live/' + id + ((id === 'flights' || id === 'flightaware') ? '?region=' + region : '');
          const response = await fetch(url, { cache: 'no-store' });
          const data = await response.json();
          if (active) setResponses(prev => ({ ...prev, [id]: data }));
        } catch (error) {
          if (active) setResponses(prev => ({ ...prev, [id]: { success: false, error: error.message, records: [] } }));
        }
      }));
      if (active) setLastChecked(new Date().toISOString());
    };
    setSelected(null);
    setResponses({});
    poll();
    // Polling, not websocket streaming; data timestamps show genuine positions.
    const interval = setInterval(poll, providerChoice === 'flightaware' ? 120000 : 60000);
    return () => { active = false; clearInterval(interval); };
  }, [providerChoice, region, refresh]);

  useEffect(() => {
    if (!mapReady || !window.L || !layerRef.current) return;
    const L = window.L, group = layerRef.current;
    group.clearLayers();
    const byId = new Map();
    const enabled = layers.includes('flights') ? [{ id: 'flights', records: flights }] : [];
    for (const d of DOMAINS.filter(d => d.id !== 'flights' && layers.includes(d.id))) {
      enabled.push({ id: d.id, records: responses[d.id]?.success ? responses[d.id].records : [] });
    }
    for (const d of enabled) {
      for (const r of d.records.filter(valid).slice(0, 240)) {
        const key = d.id + ':' + r.id;
        const highlight = selected?.source === d.id && selected?.id === r.id;
        const marker = d.id === 'flights'
          ? L.marker([r.lat, r.lon], { icon: airplaneIcon(L, r.heading, highlight), zIndexOffset: highlight ? 1000 : 200 })
          : L.circleMarker([r.lat, r.lon], {
            radius: highlight ? 9 : 6, color: '#fff', weight: 2, fillOpacity: .94,
            fillColor: DOMAINS.find(x => x.id === d.id)?.color || '#f59e0b',
          });
        const popup = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = r.title;
        popup.appendChild(title);
        for (const line of [
          r.source,
          r.description,
          d.id === 'flights' && r.registration ? 'Registration: ' + r.registration : null,
          d.id === 'flights' && r.aircraftType ? 'Aircraft: ' + r.aircraftType : null,
          d.id === 'flights' && Number.isFinite(r.altitudeFeet) ? 'Altitude: ' + Math.round(r.altitudeFeet).toLocaleString() + ' ft' : null,
          d.id === 'flights' && Number.isFinite(r.speedKnots) ? 'Ground speed: ' + Math.round(r.speedKnots) + ' knots' : null,
          'Position time: ' + when(r.observedAt),
        ].filter(Boolean)) {
          const p = document.createElement('div');
          p.textContent = String(line);
          p.style.marginTop = '3px';
          popup.appendChild(p);
        }
        marker.bindPopup(popup);
        marker.on('click', () => setSelected({ source: d.id, id: r.id }));
        marker.addTo(group);
        byId.set(key, marker);
      }
    }
    markersRef.current = byId;
  }, [mapReady, responses, providerChoice, flights, layers, selected]);

  const selectAircraft = r => {
    setSelected({ source: 'flights', id: r.id });
    const marker = markersRef.current.get('flights:' + r.id);
    if (marker) {
      mapRef.current?.flyTo([r.lat, r.lon], Math.max(9, mapRef.current.getZoom()), { duration: .5 });
      marker.openPopup();
    }
  };
  const counts = DOMAINS.map(d => ({
    ...d, data: d.id === 'flights' ? flightData : responses[d.id],
  }));
  return <section className="defense-card overflow-hidden">
    <div className="p-4 space-y-4 border-b border-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">Live Air Traffic & Geographic Map</h2>
          <p className="text-xs text-slate-500">Aircraft-shaped markers rotate with reported heading; positions update from the selected data provider.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setBasemap('street')} type="button" className={'px-3 py-2 rounded border text-xs ' + (basemap === 'street' ? 'bg-slate-900 text-white' : 'bg-white')}>Street</button>
          <button onClick={() => setBasemap('satellite')} type="button" className={'px-3 py-2 rounded border text-xs ' + (basemap === 'satellite' ? 'bg-slate-900 text-white' : 'bg-white')}>Satellite</button>
          <button onClick={() => setRefresh(n => n + 1)} type="button" className="px-3 py-2 rounded border text-xs">Refresh feeds</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-4 items-center">
        <label className="text-xs font-medium">Airspace
          <select value={region} onChange={e => setRegion(e.target.value)} className="ml-2 rounded border border-slate-300 bg-white p-2">
            {Object.entries(REGIONS).map(([key, value]) => <option key={key} value={key}>{value.name}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium">Aircraft data
          <select value={providerChoice} onChange={e => setProviderChoice(e.target.value)} className="ml-2 rounded border border-slate-300 bg-white p-2">
            <option value="flights">Public ADS-B (connected)</option>
            <option value="flightaware">FlightAware AeroAPI (licensed)</option>
          </select>
        </label>
        <span className="text-xs text-slate-500">Checked: {when(lastChecked)}</span>
      </div>
      <div className="flex flex-wrap gap-4">
        {counts.map(d => <label key={d.id} className="flex gap-2 items-center text-xs">
          <input type="checkbox" checked={layers.includes(d.id)}
            onChange={e => setLayers(old => e.target.checked ? [...old, d.id] : old.filter(x => x !== d.id))}/>
          <span className="rounded-full h-2.5 w-2.5" style={{ background: d.color }} />
          {d.name} ({d.data?.success ? d.data.count : d.data ? 'unavailable' : 'loading'})
        </label>)}
      </div>
      {flightData && !flightData.success && <p role="alert" className="text-xs rounded bg-amber-50 text-amber-900 p-3">
        {providerChoice === 'flightaware' ? 'FlightAware is not connected: ' : 'Aircraft feed unavailable: '}
        {flightData.error}
      </p>}
      {flightData?.success && <p className="text-xs text-slate-600">
        <strong>Source: {flightData.provider}</strong> · {flightData.count} reported aircraft · Feed collected {when(flightData.retrievedAt)}
        {flightData.coverage ? ' · ' + flightData.coverage : ''}
      </p>}
    </div>
    <div className="grid grid-cols-1 xl:grid-cols-3">
      <div className="xl:col-span-2 min-w-0">
        {mapError && <p role="alert" className="text-red-700 text-sm p-3">{mapError}</p>}
        <div ref={target} style={{ height: 590 }} className="w-full bg-slate-900" aria-label="Interactive street or satellite map displaying aircraft-shaped live observation markers" />
      </div>
      <aside className="min-w-0 border-l border-slate-200 flex flex-col">
        <div className="p-4 border-b space-y-2">
          <h3 className="font-semibold text-sm">Aircraft in {REGIONS[region]?.name}</h3>
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search callsign, registration, type…" aria-label="Search aircraft" className="w-full rounded border border-slate-300 p-2 text-sm"/>
          <p className="text-xs text-slate-500">{visibleFlights.length} matching records · Click one to locate it</p>
        </div>
        <div className="overflow-y-auto divide-y divide-slate-100" style={{ maxHeight: 452 }}>
          {visibleFlights.slice(0, 200).map(r => <button key={r.id} type="button" onClick={() => selectAircraft(r)}
            className={'w-full text-left p-3 hover:bg-slate-100 ' + (selected?.source === 'flights' && selected.id === r.id ? 'bg-sky-50' : '')}>
            <div className="flex justify-between gap-3">
              <span className="font-semibold text-sm text-slate-900">{r.title}</span>
              <span className="text-xs text-slate-500">{r.aircraftType || 'Type unavailable'}</span>
            </div>
            <div className="text-xs text-slate-600 mt-1">{r.registration || r.icao24 || 'Registration not reported'}
              {' · '}{Number.isFinite(r.altitudeFeet) ? Math.round(r.altitudeFeet).toLocaleString() + ' ft' : 'Altitude unavailable'}
            </div>
            <div className="text-xs text-slate-500">{Number.isFinite(r.speedKnots) ? Math.round(r.speedKnots) + ' kt' : 'Speed unavailable'} · {when(r.observedAt)}</div>
          </button>)}
          {!visibleFlights.length && <div className="p-4 text-sm text-slate-500">{flightData?.success ? 'No matching aircraft in the current feed.' : 'No verified aircraft records available.'}</div>}
        </div>
      </aside>
    </div>
    <div className="p-4 border-t border-slate-200">
      <h3 className="font-semibold text-sm mb-3">Selected observation</h3>
      {current ? <>
        <div className="flex flex-wrap gap-3 items-start justify-between mb-3">
          <div>
            <div className="font-bold text-lg">{current.title}</div>
            <div className="text-xs text-slate-500">{current.source} · Last provider observation {when(current.observedAt)}</div>
          </div>
          {current.url && <a target="_blank" rel="noopener noreferrer" className="text-xs text-sky-700 underline" href={current.url}>View source record</a>}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          <Datum label="Flight / callsign" value={display(current.title)}/>
          <Datum label="Registration" value={display(current.registration)}/>
          <Datum label="Aircraft type" value={display(current.aircraftType)}/>
          <Datum label="ICAO hex" value={display(current.icao24)}/>
          <Datum label="Altitude" value={display(Number.isFinite(current.altitudeFeet) ? Math.round(current.altitudeFeet).toLocaleString() : null, current.altitudeFeet != null ? ' ft' : '')}/>
          <Datum label="Ground speed" value={display(Number.isFinite(current.speedKnots) ? Math.round(current.speedKnots) : null, current.speedKnots != null ? ' kt' : '')}/>
          <Datum label="Speed (km/h)" value={display(kmh(current.speedKnots), current.speedKnots != null ? ' km/h' : '')}/>
          <Datum label="Heading" value={display(current.heading, current.heading != null ? '°' : '')}/>
          <Datum label="Vertical rate" value={display(current.verticalRateFpm, current.verticalRateFpm != null ? ' ft/min' : '')}/>
          <Datum label="Origin" value={display(current.origin)}/>
          <Datum label="Destination" value={display(current.destination)}/>
          <Datum label="Position age at retrieval" value={display(current.ageSeconds, current.ageSeconds != null ? ' s' : '')}/>
          <Datum label="Squawk" value={display(current.squawk)}/>
          <Datum label="Latitude" value={current.lat.toFixed(5)}/>
          <Datum label="Longitude" value={current.lon.toFixed(5)}/>
          <Datum label="Last position" value={when(current.observedAt)}/>
        </div>
        {current.faFlightId && <p className="text-xs text-slate-500 mt-3">FlightAware flight ID: {current.faFlightId}</p>}
      </> : <p className="text-sm text-slate-500">Select an aircraft silhouette or an item from the aircraft list to see details. Only fields the provider supplies will be shown.</p>}
    </div>
    <div className="px-4 pb-4 text-xs text-slate-500">
      Aircraft silhouettes are original ASURA icons, not FlightAware artwork. Position updates are periodic and may be delayed; this is not a safety-critical air traffic system. Map imagery and flight telemetry come from separate providers.
    </div>
  </section>;
}
