import React, { useState } from 'react';

// Pure SVG US State Bubble Map - zero dependencies
// Positions are tuned to approximate geographic layout
const STATE_POSITIONS = {
    ME: [862, 88], NH: [836, 108], VT: [805, 98], MA: [852, 128], RI: [866, 144],
    CT: [840, 150], NY: [793, 140], NJ: [820, 168], PA: [775, 158], DE: [823, 180],
    MD: [800, 190], VA: [782, 210], WV: [758, 200], NC: [768, 228], SC: [778, 254],
    GA: [753, 268], FL: [738, 308], AL: [728, 268], MS: [698, 268], TN: [720, 236],
    KY: [738, 210], OH: [738, 180], IN: [708, 185], MI: [713, 148],
    WI: [682, 140], MN: [638, 124], IA: [642, 168], IL: [682, 185],
    MO: [658, 210], AR: [648, 244], LA: [648, 280], TX: [598, 278],
    OK: [598, 244], KS: [588, 213], NE: [578, 178], SD: [552, 148],
    ND: [542, 113], MT: [458, 103], WY: [488, 158], CO: [518, 203],
    NM: [503, 248], AZ: [452, 258], UT: [452, 203], ID: [433, 148],
    NV: [398, 208], CA: [352, 228], OR: [368, 148], WA: [378, 113],
    AK: [335, 335], HI: [478, 335],
};

const STATE_ABBREVS = Object.keys(STATE_POSITIONS);

// Color gradient: grey → yellow → orange → red
function getColor(value, min, max) {
    if (value === 0) return '#cbd5e1'; // grey for 0
    if (max === min) return '#ef4444'; // all same = red
    const t = (value - min) / (max - min);

    // gradient stops: yellow(t=0) → orange(t=0.5) → red(t=1)
    let r, g, b;
    if (t < 0.5) {
        const s = t * 2;
        r = Math.round(250 + (249 - 250) * s);  // 250→249
        g = Math.round(204 + (115 - 204) * s);  // 204→115
        b = Math.round(21 + (22 - 21) * s);  // 21→22
    } else {
        const s = (t - 0.5) * 2;
        r = Math.round(249 + (220 - 249) * s);  // 249→220
        g = Math.round(115 + (38 - 115) * s);  // 115→38
        b = Math.round(22 + (38 - 22) * s);  // 22→38
    }
    return `rgb(${r},${g},${b})`;
}

export default function StateMap({ data = [] }) {
    const [tooltip, setTooltip] = useState(null);

    const lookup = {};
    data.forEach(d => { lookup[d.id] = d.value; });

    const nonZeroValues = data.filter(d => d.value > 0).map(d => d.value);
    const min = nonZeroValues.length > 0 ? Math.min(...nonZeroValues) : 0;
    const max = nonZeroValues.length > 0 ? Math.max(...nonZeroValues) : 1;

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <svg viewBox="280 70 620 310" style={{ width: '100%', height: 'auto', maxHeight: '380px' }}>
                {STATE_ABBREVS.map(abbr => {
                    const [cx, cy] = STATE_POSITIONS[abbr];
                    const val = lookup[abbr] || 0;
                    const fill = getColor(val, min, max);
                    const textColor = val === 0 ? '#94a3b8' : (val / (max || 1) > 0.4 ? 'white' : '#1e293b');

                    return (
                        <g key={abbr}
                            onMouseEnter={e => setTooltip({ abbr, val, x: e.clientX, y: e.clientY })}
                            onMouseLeave={() => setTooltip(null)}
                            style={{ cursor: 'pointer' }}>
                            <circle cx={cx} cy={cy} r={16} fill={fill} stroke="white" strokeWidth={1.5} opacity={0.93} />
                            {/* State abbreviation */}
                            <text x={cx} y={val > 0 ? cy - 3 : cy + 1}
                                textAnchor="middle" dominantBaseline="middle"
                                style={{ fontSize: '8px', fontWeight: 700, fill: textColor, pointerEvents: 'none', userSelect: 'none' }}>
                                {abbr}
                            </text>
                            {/* Call count below abbreviation */}
                            {val > 0 && (
                                <text x={cx} y={cy + 7}
                                    textAnchor="middle" dominantBaseline="middle"
                                    style={{ fontSize: '7px', fontWeight: 800, fill: textColor, pointerEvents: 'none', userSelect: 'none' }}>
                                    {val}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>

            {/* Hover tooltip */}
            {tooltip && (
                <div style={{
                    position: 'fixed', left: tooltip.x + 12, top: tooltip.y - 8,
                    background: '#1e293b', color: 'white', padding: '6px 10px',
                    borderRadius: 6, fontSize: '0.78rem', pointerEvents: 'none', zIndex: 9999,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}>
                    <strong>{tooltip.abbr}</strong>: {tooltip.val} call{tooltip.val !== 1 ? 's' : ''}
                </div>
            )}

            {/* Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', marginTop: '0.75rem' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#cbd5e1', border: '1px solid #94a3b8' }} />
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>0 calls</span>
                <div style={{ width: 80, height: 8, background: 'linear-gradient(to right, #facc15, #f97316, #dc2626)', borderRadius: 4, margin: '0 4px' }} />
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Low → High</span>
            </div>
        </div>
    );
}
