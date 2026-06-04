import { useState } from 'react';

// Equirectangular projection: x = (lon+180)*(W/360), y = (90-lat)*(H/180)
const W = 960, H = 480;
const project = (lat, lon) => [
  Math.round((lon + 180) * (W / 360)),
  Math.round((90 - lat) * (H / 180)),
];

// Major countries: [name, iso2, lat, lon]
const COUNTRIES = [
  ['United States',   'US',  38,   -97  ],
  ['Canada',          'CA',  60,   -95  ],
  ['Mexico',          'MX',  23,  -102  ],
  ['Brazil',          'BR', -10,   -55  ],
  ['Argentina',       'AR', -34,   -64  ],
  ['Colombia',        'CO',   4,   -74  ],
  ['Chile',           'CL', -33,   -71  ],
  ['Peru',            'PE',  -9,   -75  ],
  ['Venezuela',       'VE',   8,   -66  ],
  ['United Kingdom',  'GB',  54,    -2  ],
  ['France',          'FR',  46,     2  ],
  ['Germany',         'DE',  51,    10  ],
  ['Italy',           'IT',  41,    13  ],
  ['Spain',           'ES',  40,    -4  ],
  ['Netherlands',     'NL',  52,     5  ],
  ['Poland',          'PL',  52,    20  ],
  ['Sweden',          'SE',  62,    16  ],
  ['Ukraine',         'UA',  49,    32  ],
  ['Russia',          'RU',  60,   100  ],
  ['Turkey',          'TR',  39,    35  ],
  ['Saudi Arabia',    'SA',  24,    45  ],
  ['UAE',             'AE',  24,    54  ],
  ['Kuwait',          'KW',  29,    47  ],
  ['Qatar',           'QA',  25,    51  ],
  ['Israel',          'IL',  31,    35  ],
  ['Iraq',            'IQ',  33,    44  ],
  ['Iran',            'IR',  32,    53  ],
  ['Pakistan',        'PK',  30,    70  ],
  ['India',           'IN',  20,    78  ],
  ['Bangladesh',      'BD',  23,    90  ],
  ['Sri Lanka',       'LK',   7,    81  ],
  ['China',           'CN',  35,   105  ],
  ['Japan',           'JP',  36,   138  ],
  ['South Korea',     'KR',  37,   127  ],
  ['Taiwan',          'TW',  23,   121  ],
  ['Vietnam',         'VN',  16,   108  ],
  ['Thailand',        'TH',  15,   101  ],
  ['Malaysia',        'MY',   4,   109  ],
  ['Singapore',       'SG',   1,   104  ],
  ['Indonesia',       'ID',  -5,   120  ],
  ['Philippines',     'PH',  13,   122  ],
  ['Australia',       'AU', -25,   133  ],
  ['New Zealand',     'NZ', -41,   174  ],
  ['Egypt',           'EG',  27,    30  ],
  ['Nigeria',         'NG',  10,     8  ],
  ['South Africa',    'ZA', -29,    25  ],
  ['Kenya',           'KE',   0,    37  ],
  ['Ethiopia',        'ET',   9,    40  ],
  ['Morocco',         'MA',  32,    -6  ],
  ['Ghana',           'GH',   8,    -1  ],
  ['Tanzania',        'TZ',  -6,    35  ],
  ['Algeria',         'DZ',  28,     3  ],
  ['Portugal',        'PT',  39,    -8  ],
  ['Greece',          'GR',  39,    22  ],
  ['Romania',         'RO',  46,    25  ],
  ['Belgium',         'BE',  50,     4  ],
  ['Austria',         'AT',  47,    14  ],
  ['Switzerland',     'CH',  47,     8  ],
  ['Czech Republic',  'CZ',  50,    16  ],
  ['Hungary',         'HU',  47,    19  ],
  ['Denmark',         'DK',  56,    10  ],
  ['Norway',          'NO',  62,    15  ],
  ['Finland',         'FI',  62,    26  ],
  ['Ireland',         'IE',  53,    -8  ],
  ['Afghanistan',     'AF',  33,    65  ],
  ['Jordan',          'JO',  31,    36  ],
  ['Lebanon',         'LB',  33,    35  ],
  ['Oman',            'OM',  21,    57  ],
  ['Yemen',           'YE',  15,    48  ],
  ['Myanmar',         'MM',  17,    96  ],
  ['Cambodia',        'KH',  12,   105  ],
  ['Nepal',           'NP',  28,    84  ],
  ['Kazakhstan',      'KZ',  48,    68  ],
  ['Uzbekistan',      'UZ',  41,    64  ],
];

function getColor(value, max) {
  if (!value || value === 0) return null;
  const t = Math.min(value / max, 1);
  if (t < 0.33) return `rgb(${Math.round(250)},${Math.round(204 - t * 3 * 89)},${Math.round(21)})`;
  if (t < 0.66) return `rgb(249,${Math.round(115 - (t - 0.33) * 3 * 77)},22)`;
  return `rgb(${Math.round(249 - (t - 0.66) * 3 * 29)},38,38)`;
}

function getBubbleSize(value, max) {
  if (!value || value === 0) return 0;
  return Math.max(6, Math.min(28, 6 + (value / max) * 22));
}

// Simplified continent SVG paths (very rough outlines for background)
const CONTINENTS = `
  M 0,0 L ${W},0 L ${W},${H} L 0,${H} Z
`;

export default function WorldMap({ data = [] }) {
  const [tooltip, setTooltip] = useState(null);

  const lookup = {};
  data.forEach(d => { lookup[d.id] = d.value; });

  const maxVal = Math.max(...data.map(d => d.value || 0), 1);

  const countryDots = COUNTRIES.map(([name, iso, lat, lon]) => {
    const [x, y] = project(lat, lon);
    const value = lookup[iso] || 0;
    const r = getBubbleSize(value, maxVal);
    const color = getColor(value, maxVal);
    return { name, iso, x, y, value, r, color };
  });

  return (
    <div style={{ position: 'relative', userSelect: 'none' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', borderRadius: 10, display: 'block' }}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Ocean background */}
        <rect width={W} height={H} fill="#dbeafe" rx="8" />

        {/* Grid lines */}
        {[-60, -30, 0, 30, 60].map(lat => {
          const [, y] = project(lat, 0);
          return <line key={lat} x1={0} y1={y} x2={W} y2={y} stroke="#bfdbfe" strokeWidth="0.5" />;
        })}
        {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map(lon => {
          const [x] = project(0, lon);
          return <line key={lon} x1={x} y1={0} x2={x} y2={H} stroke="#bfdbfe" strokeWidth="0.5" />;
        })}

        {/* Equator */}
        {(() => { const [, y] = project(0, 0); return <line x1={0} y1={y} x2={W} y2={y} stroke="#93c5fd" strokeWidth="1" strokeDasharray="4,4" />; })()}

        {/* Country dots — grey for no data, colored for data */}
        {countryDots.map(({ name, iso, x, y, value, r, color }) => (
          <g key={iso}>
            {/* Grey background dot always visible */}
            <circle cx={x} cy={y} r={5} fill="#cbd5e1" opacity={0.6} />
            {/* Colored bubble if has calls */}
            {value > 0 && (
              <>
                <circle
                  cx={x} cy={y} r={r}
                  fill={color}
                  opacity={0.85}
                  stroke="#fff"
                  strokeWidth={1.5}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={e => setTooltip({ name, iso, value, x, y })}
                />
                {r > 14 && (
                  <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle"
                    fontSize={9} fontWeight="700" fill="#fff" pointerEvents="none">
                    {iso}
                  </text>
                )}
              </>
            )}
          </g>
        ))}

        {/* Tooltip */}
        {tooltip && (() => {
          const tx = Math.min(tooltip.x + 12, W - 120);
          const ty = Math.max(tooltip.y - 36, 8);
          return (
            <g>
              <rect x={tx} y={ty} width={110} height={36} rx={6} fill="#1f2937" opacity={0.95} />
              <text x={tx + 8} y={ty + 13} fontSize={11} fontWeight="700" fill="#fff">{tooltip.name}</text>
              <text x={tx + 8} y={ty + 26} fontSize={10} fill="#9ca3af">{tooltip.value.toLocaleString()} calls</text>
            </g>
          );
        })()}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 11, color: '#6b7280' }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#cbd5e1' }} /> No calls
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgb(250,204,21)', marginLeft: 8 }} /> Low
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgb(249,115,22)' }} /> Medium
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgb(220,38,38)' }} /> High
        <span style={{ marginLeft: 'auto', fontStyle: 'italic' }}>Hover for details</span>
      </div>
    </div>
  );
}
