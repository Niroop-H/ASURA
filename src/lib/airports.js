/**
 * OurAirports public-domain airport directory.
 * Community-maintained facility metadata; not live airport operations.
 * The whole global directory is scanned server-side and served in search pages.
 */
const URL = 'https://davidmegginson.github.io/ourairports-data/airports.csv';
let latest = null;
let loadedAt = 0;
let loading = null;
const DAY = 24 * 60 * 60 * 1000;

function parseCSV(input) {
  const rows = [];
  let row = [], value = '', quoted = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '"') {
      if (quoted && input[i + 1] === '"') { value += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === ',' && !quoted) {
      row.push(value); value = '';
    } else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && input[i + 1] === '\n') i++;
      row.push(value); value = '';
      if (row.length > 2) rows.push(row);
      row = [];
    } else value += ch;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  return rows;
}
function prepare(text) {
  const [header, ...rows] = parseCSV(text);
  if (!header?.includes('ident') || !header.includes('latitude_deg')) throw new Error('Invalid OurAirports CSV');
  const lookup = Object.fromEntries(header.map((name, i) => [name, i]));
  const get = (row, name) => row[lookup[name]] || '';
  return rows.map(row => {
    const lat = Number(get(row, 'latitude_deg')), lon = Number(get(row, 'longitude_deg'));
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    return {
      id: get(row, 'ident'), icao: get(row, 'icao_code') || get(row, 'gps_code') || '',
      iata: get(row, 'iata_code'), name: get(row, 'name'), type: get(row, 'type'),
      city: get(row, 'municipality'), country: get(row, 'iso_country'),
      region: get(row, 'iso_region'), lat, lon,
      scheduled: get(row, 'scheduled_service') === 'yes',
      home: get(row, 'home_link')?.startsWith('https://') ? get(row, 'home_link') : null,
    };
  }).filter(Boolean);
}
export async function loadAirportDirectory() {
  if (latest && Date.now() - loadedAt < DAY) return latest;
  if (!loading) {
    loading = (async () => {
      const response = await fetch(URL, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(18000) });
      if (!response.ok) throw new Error('OurAirports directory HTTP ' + response.status);
      const rows = prepare(await response.text());
      if (rows.length < 20000) throw new Error('Airport directory incomplete; refusing partial listing');
      latest = rows;
      loadedAt = Date.now();
      return rows;
    })().finally(() => { loading = null; });
  }
  try { return await loading; }
  catch (error) {
    if (latest) return latest; // Only previously retrieved real data; never fake directory rows.
    throw error;
  }
}
const priority = a => (a.scheduled ? 10 : 0) +
  (a.type === 'large_airport' ? 4 : a.type === 'medium_airport' ? 3 : a.type === 'small_airport' ? 2 : 0);
export async function searchAirports({ q = '', country = '', offset = 0, limit = 40 } = {}) {
  const list = await loadAirportDirectory();
  const keyword = q.trim().toLowerCase(), iso = country.trim().toUpperCase();
  const matches = list.filter(a =>
    (!iso || a.country === iso) &&
    (!keyword || [a.name, a.id, a.icao, a.iata, a.city, a.country, a.region]
      .some(v => (v || '').toLowerCase().includes(keyword))));
  matches.sort((a,b) =>
    priority(b) - priority(a) ||
    a.name.localeCompare(b.name));
  return {
    provider: 'OurAirports community-maintained public-domain directory',
    retrievedAt: new Date(loadedAt).toISOString(),
    totalAirports: list.length,
    matches: matches.length,
    offset, limit, airports: matches.slice(offset, offset + limit),
  };
}
