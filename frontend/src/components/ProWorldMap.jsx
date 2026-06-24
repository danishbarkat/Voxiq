import { useEffect, useMemo, useState } from 'react';
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Popup,
  TileLayer,
  Tooltip,
  ZoomControl,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const COUNTRIES_GEOJSON_URL = 'https://cdn.jsdelivr.net/gh/johan/world.geo.json@master/countries.geo.json';

const COUNTRY_NAMES = {
  US: 'United States', GB: 'United Kingdom', PK: 'Pakistan', IN: 'India', CN: 'China',
  AU: 'Australia', CA: 'Canada', DE: 'Germany', FR: 'France', JP: 'Japan', BR: 'Brazil',
  MX: 'Mexico', SA: 'Saudi Arabia', AE: 'United Arab Emirates', NG: 'Nigeria', ZA: 'South Africa',
  RU: 'Russia', TR: 'Turkey', IT: 'Italy', ES: 'Spain', KR: 'South Korea', ID: 'Indonesia',
  PH: 'Philippines', BD: 'Bangladesh', EG: 'Egypt', IR: 'Iran', IQ: 'Iraq', KW: 'Kuwait',
  QA: 'Qatar', JO: 'Jordan', LB: 'Lebanon', SG: 'Singapore', MY: 'Malaysia', TH: 'Thailand',
  VN: 'Vietnam', NL: 'Netherlands', BE: 'Belgium', SE: 'Sweden', NO: 'Norway', DK: 'Denmark',
  FI: 'Finland', PL: 'Poland', UA: 'Ukraine', RO: 'Romania', GR: 'Greece', PT: 'Portugal',
  AT: 'Austria', CH: 'Switzerland', IL: 'Israel', NZ: 'New Zealand', AR: 'Argentina',
  CL: 'Chile', CO: 'Colombia', PE: 'Peru', VE: 'Venezuela', NP: 'Nepal', AF: 'Afghanistan',
  LK: 'Sri Lanka', MM: 'Myanmar', KH: 'Cambodia', KE: 'Kenya', ET: 'Ethiopia', GH: 'Ghana',
  TZ: 'Tanzania', UG: 'Uganda', ZM: 'Zambia', ZW: 'Zimbabwe', MA: 'Morocco', DZ: 'Algeria',
  TN: 'Tunisia', LY: 'Libya',
};

const COUNTRY_CENTERS = {
  US: [39.8, -98.6],
  CA: [56.1, -106.3],
  MX: [23.6, -102.5],
  BR: [-10.8, -52.9],
  AR: [-38.4, -63.6],
  CL: [-35.7, -71.5],
  CO: [4.6, -74.1],
  PE: [-9.1, -75.0],
  VE: [7.0, -66.2],
  GB: [54.5, -2.5],
  FR: [46.2, 2.2],
  DE: [51.2, 10.4],
  IT: [41.9, 12.6],
  ES: [40.4, -3.7],
  NL: [52.1, 5.3],
  BE: [50.8, 4.5],
  PL: [52.0, 19.1],
  SE: [60.1, 18.6],
  NO: [60.5, 8.5],
  DK: [56.2, 9.5],
  FI: [64.0, 26.0],
  UA: [49.0, 31.3],
  RU: [61.5, 105.3],
  TR: [39.0, 35.2],
  SA: [23.9, 45.1],
  AE: [24.3, 54.3],
  KW: [29.4, 47.7],
  QA: [25.3, 51.2],
  IL: [31.0, 35.0],
  IQ: [33.3, 43.7],
  IR: [32.4, 53.7],
  PK: [30.4, 69.4],
  IN: [22.9, 79.0],
  BD: [23.7, 90.3],
  LK: [7.8, 80.7],
  CN: [35.9, 104.2],
  JP: [36.2, 138.2],
  KR: [36.5, 127.9],
  TW: [23.7, 121.0],
  VN: [14.1, 108.3],
  TH: [15.8, 100.9],
  MY: [4.2, 102.0],
  SG: [1.35, 103.8],
  ID: [-2.2, 117.3],
  PH: [12.9, 121.8],
  AU: [-25.3, 133.8],
  NZ: [-40.9, 174.9],
  EG: [26.8, 30.8],
  NG: [9.1, 8.7],
  ZA: [-30.6, 22.9],
  KE: [0.2, 37.9],
  ET: [9.1, 40.5],
  MA: [31.8, -7.1],
  GH: [7.9, -1.0],
  TZ: [-6.3, 34.8],
  DZ: [28.0, 1.7],
  PT: [39.6, -8.0],
  GR: [39.1, 22.9],
  RO: [45.9, 24.9],
  AT: [47.6, 14.1],
  CH: [46.8, 8.2],
  CZ: [49.8, 15.5],
  HU: [47.2, 19.4],
  AF: [33.9, 67.7],
  JO: [31.2, 36.4],
  LB: [33.9, 35.8],
  OM: [21.5, 55.9],
  YE: [15.6, 48.5],
  MM: [21.9, 95.9],
  KH: [12.6, 104.9],
  NP: [28.4, 84.1],
  KZ: [48.0, 67.0],
  UZ: [41.3, 64.6],
  ZM: [-13.1, 27.8],
  ZW: [-19.0, 29.2],
  UG: [1.3, 32.3],
  TN: [33.9, 9.6],
  LY: [26.3, 17.2],
};

const FLAG_COLORS = {
  US: '#2563eb',
  GB: '#1d4ed8',
  PK: '#15803d',
  IN: '#ea580c',
  CN: '#dc2626',
  CA: '#dc2626',
  FR: '#2563eb',
  DE: '#111827',
  IT: '#16a34a',
  JP: '#e11d48',
  BR: '#16a34a',
  AU: '#2563eb',
  AE: '#059669',
  SA: '#15803d',
  RU: '#2563eb',
  TR: '#dc2626',
  ES: '#f59e0b',
  ZA: '#0f766e',
  MX: '#15803d',
  KR: '#2563eb',
};

const FALLBACK_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#ea580c', '#7c3aed', '#0f766e'];

const NAME_LABELS = {
  US: 'USA',
  GB: 'UK',
  PK: 'Pakistan',
  IN: 'India',
  CN: 'China',
  AU: 'Australia',
  CA: 'Canada',
  DE: 'Germany',
  FR: 'France',
  JP: 'Japan',
  BR: 'Brazil',
  MX: 'Mexico',
};

const flag = iso2 => (iso2
  ? [...iso2.toUpperCase()].map(char => String.fromCodePoint(char.charCodeAt(0) + 127397)).join('')
  : '');

function getColor(iso2) {
  if (!iso2) return '#2563eb';
  return FLAG_COLORS[iso2]
    || FALLBACK_COLORS[(iso2.charCodeAt(0) + iso2.charCodeAt(1)) % FALLBACK_COLORS.length];
}

function getRadius(value, maxValue) {
  if (!value || value <= 0) return 6;
  const intensity = Math.min(value / maxValue, 1);
  return 10 + intensity * 20;
}

function getFillOpacity(value, maxValue) {
  if (!value || value <= 0) return 0.1;
  const intensity = Math.min(value / maxValue, 1);
  return 0.16 + intensity * 0.16;
}

function MapLegend() {
  return (
    <div
      style={{
        position: 'absolute',
        left: 14,
        bottom: 14,
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        padding: '8px 12px',
        borderRadius: 12,
        background: 'rgba(7,16,28,0.84)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: '#dbeafe',
        backdropFilter: 'blur(10px)',
        fontSize: 11,
      }}
    >
      <span style={{ width: 10, height: 10, borderRadius: 999, background: '#2563eb' }} />
      <span>Country activity</span>
      <span style={{ color: '#94a3b8' }}>Wheel zoom works like a real map now</span>
    </div>
  );
}

export default function ProWorldMap({ data = [], compact = false }) {
  const [countryShapes, setCountryShapes] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetch(COUNTRIES_GEOJSON_URL)
      .then(response => response.json())
      .then(json => {
        if (!cancelled) setCountryShapes(json);
      })
      .catch(() => {
        if (!cancelled) setCountryShapes({ type: 'FeatureCollection', features: [] });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const enriched = useMemo(() => {
    return data
      .filter(item => COUNTRY_CENTERS[item.id])
      .map(item => ({
        ...item,
        name: COUNTRY_NAMES[item.id] || item.id,
        center: COUNTRY_CENTERS[item.id],
        color: getColor(item.id),
      }))
      .sort((a, b) => (b.value || 0) - (a.value || 0));
  }, [data]);

  const maxValue = Math.max(...enriched.map(item => item.value || 0), 1);
  const topCountries = enriched.slice(0, 5);
  const enrichedLookup = useMemo(
    () => Object.fromEntries(enriched.map(country => [country.id, country])),
    [enriched],
  );
  const activeCountryIds = useMemo(() => new Set(enriched.map(country => country.id)), [enriched]);

  const overlayFeatures = useMemo(() => {
    if (!countryShapes?.features?.length) return null;

    return {
      type: 'FeatureCollection',
      features: countryShapes.features.filter(feature => {
        const iso2 = feature.id || feature.properties?.iso_a2 || feature.properties?.iso2;
        return iso2 && activeCountryIds.has(iso2);
      }),
    };
  }, [activeCountryIds, countryShapes]);

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 18,
        overflow: 'hidden',
        border: '1px solid rgba(148,163,184,0.18)',
        background: '#dbeafe',
        boxShadow: '0 20px 50px rgba(15,23,42,0.08)',
      }}
    >
      {topCountries.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            zIndex: 500,
            minWidth: compact ? 150 : 190,
            maxWidth: compact ? 'calc(100% - 24px)' : 'none',
            borderRadius: 14,
            padding: compact ? '8px 10px' : '10px 12px',
            background: 'rgba(7,16,28,0.84)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div style={{ color: '#94a3b8', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            Top Countries
          </div>
          {topCountries.map(country => (
            <div key={country.id} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
              <span style={{ fontSize: 14 }}>{flag(country.id)}</span>
              <span style={{ color: '#e2e8f0', fontSize: 12, flex: 1 }}>{country.name}</span>
              <span style={{ color: country.color, fontSize: 12, fontWeight: 800 }}>{country.value}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ height: compact ? '260px' : 'clamp(280px, 36vw, 430px)', width: '100%' }}>
        <MapContainer
          center={[20, 15]}
          zoom={2}
          minZoom={2}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          worldCopyJump
        >
          <ZoomControl position="topright" />
          <TileLayer
            attribution='&copy; OpenStreetMap contributors &copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
          />
          <TileLayer
            attribution='&copy; OpenStreetMap contributors &copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
            pane="overlayPane"
          />

          {overlayFeatures?.features?.length > 0 && (
            <GeoJSON
              key={overlayFeatures.features.length}
              data={overlayFeatures}
              style={feature => {
                const iso2 = feature?.id || feature?.properties?.iso_a2 || feature?.properties?.iso2;
                const country = iso2 ? enrichedLookup[iso2] : null;
                return {
                  color: country?.color || '#2563eb',
                  weight: 2.2,
                  opacity: 0.95,
                  fillColor: country?.color || '#2563eb',
                  fillOpacity: getFillOpacity(country?.value || 0, maxValue),
                };
              }}
            />
          )}

          {enriched.map(country => (
            <CircleMarker
              key={country.id}
              center={country.center}
              radius={getRadius(country.value, maxValue)}
              pathOptions={{
                color: country.color,
                weight: 3,
                fillColor: country.color,
                fillOpacity: 0.5,
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                <div style={{ minWidth: 140 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>
                    {flag(country.id)} {country.name}
                  </div>
                  <div style={{ fontSize: 12, color: '#475569' }}>{country.value?.toLocaleString?.() || 0} calls</div>
                </div>
              </Tooltip>
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>
                    {flag(country.id)} {country.name}
                  </div>
                  <div>Calls: {(country.value || 0).toLocaleString()}</div>
                  <div>Code: {country.id}</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {topCountries.map(country => (
            <CircleMarker
              key={`${country.id}-label`}
              center={country.center}
              radius={0}
              pathOptions={{ opacity: 0, fillOpacity: 0 }}
            >
              <Tooltip
                permanent
                direction="center"
                interactive={false}
                opacity={1}
                className="world-map-country-label"
              >
                <div
                  style={{
                    padding: '3px 9px',
                    borderRadius: 999,
                    background: country.color,
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 700,
                    border: '1px solid rgba(255,255,255,0.75)',
                    boxShadow: '0 8px 20px rgba(15,23,42,0.22)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {NAME_LABELS[country.id] || country.name}
                </div>
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      <MapLegend />
    </div>
  );
}
