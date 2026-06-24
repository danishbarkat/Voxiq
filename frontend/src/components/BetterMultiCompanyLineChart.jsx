import { useMemo, useState } from 'react';

const TREND_COLORS = ['#22c55e', '#38bdf8', '#f59e0b', '#f43f5e', '#8b5cf6', '#14b8a6'];

export default function BetterMultiCompanyLineChart({ series = [] }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  const chartCompanies = useMemo(() => {
    const unique = new Map();
    series.forEach(point => {
      (point.companies || []).forEach(company => {
        if (!unique.has(company.accountId)) {
          unique.set(company.accountId, {
            accountId: company.accountId,
            companyName: company.companyName,
            color: TREND_COLORS[unique.size % TREND_COLORS.length],
          });
        }
      });
    });
    return [...unique.values()];
  }, [series]);

  const maxCallsRaw = Math.max(
    ...series.flatMap(point => (point.companies || []).map(company => company.calls || 0)),
    1,
  );
  const maxCalls = Math.max(4, Math.ceil(maxCallsRaw / 4) * 4);

  const width = 860;
  const height = 320;
  const padding = { top: 26, right: 28, bottom: 52, left: 52 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const stepX = series.length > 1 ? innerWidth / (series.length - 1) : innerWidth / 2;

  const getX = index => padding.left + (series.length > 1 ? index * stepX : innerWidth / 2);
  const getY = value => padding.top + innerHeight - ((value || 0) / maxCalls) * innerHeight;

  const pointsByCompany = useMemo(() => (
    chartCompanies.map(company => ({
      ...company,
      points: series.map((point, index) => {
        const match = (point.companies || []).find(item => item.accountId === company.accountId);
        return {
          x: getX(index),
          y: getY(match?.calls || 0),
          value: match?.calls || 0,
          label: point.label,
        };
      }),
    }))
  ), [chartCompanies, series, maxCalls]);

  const activeIndex = hoverIndex ?? series.length - 1;
  const activeLabel = series[activeIndex]?.label;

  const buildLinePath = (points) => points.map((point, index, arr) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const prev = arr[index - 1];
    const cp1x = prev.x + (point.x - prev.x) / 2;
    const cp1y = prev.y;
    const cp2x = prev.x + (point.x - prev.x) / 2;
    const cp2y = point.y;
    return `C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${point.x} ${point.y}`;
  }).join(' ');

  const buildAreaPath = (points) => {
    if (!points.length) return '';
    const linePath = buildLinePath(points);
    const last = points[points.length - 1];
    const first = points[0];
    const baseline = padding.top + innerHeight;
    return `${linePath} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`;
  };

  const yTicks = Array.from({ length: 5 }, (_, idx) => Math.round((maxCalls / 4) * idx));

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {pointsByCompany.map(company => {
          const activePoint = company.points[activeIndex] || company.points[company.points.length - 1];
          return (
            <div
              key={company.accountId}
              style={{
                display: 'grid',
                gap: 3,
                minWidth: 140,
                padding: '10px 12px',
                borderRadius: 14,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: 999, background: company.color, boxShadow: `0 0 0 4px ${company.color}18` }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{company.companyName}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{activePoint?.value ?? 0}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>{activeLabel || 'Latest'}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          borderRadius: 22,
          padding: 18,
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)',
          border: '1px solid #dbe4f0',
          boxShadow: '0 20px 40px rgba(15,23,42,0.08)',
        }}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: 'auto', display: 'block' }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            {pointsByCompany.map(company => (
              <linearGradient key={`gradient-${company.accountId}`} id={`trend-fill-${company.accountId}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={company.color} stopOpacity="0.26" />
                <stop offset="100%" stopColor={company.color} stopOpacity="0.02" />
              </linearGradient>
            ))}
          </defs>

          {yTicks.map((tick, idx) => {
            const y = getY(tick);
            return (
              <g key={idx}>
                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#d7e3f0" strokeDasharray="5 7" />
                <text x={padding.left - 14} y={y + 4} textAnchor="end" fill="#7c8da1" fontSize="11" fontWeight="600">
                  {tick}
                </text>
              </g>
            );
          })}

          {series.map((point, index) => {
            const x = getX(index);
            const bandWidth = series.length > 1 ? Math.max(36, stepX) : 72;
            const isActive = index === activeIndex;
            return (
              <g key={point.key || point.label}>
                <rect
                  x={x - bandWidth / 2}
                  y={padding.top}
                  width={bandWidth}
                  height={innerHeight}
                  fill={isActive ? 'rgba(59,130,246,0.08)' : 'transparent'}
                  rx="14"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoverIndex(index)}
                />
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={padding.top + innerHeight}
                  stroke={isActive ? '#9ec5ff' : '#edf2f7'}
                  strokeDasharray={isActive ? '0' : '4 10'}
                />
                <text
                  x={x}
                  y={height - 16}
                  textAnchor="middle"
                  fill={isActive ? '#0f172a' : '#7c8da1'}
                  fontSize="11"
                  fontWeight={isActive ? '700' : '600'}
                >
                  {point.label}
                </text>
              </g>
            );
          })}

          {pointsByCompany.map(company => {
            const linePath = buildLinePath(company.points);
            const areaPath = buildAreaPath(company.points);
            return (
              <g key={company.accountId}>
                <path d={areaPath} fill={`url(#trend-fill-${company.accountId})`} />
                <path d={linePath} fill="none" stroke={company.color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                {company.points.map((point, index) => {
                  const isActive = index === activeIndex;
                  return (
                    <g key={`${company.accountId}-${point.label}`}>
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={isActive ? '6.5' : '4.5'}
                        fill={company.color}
                        stroke="#ffffff"
                        strokeWidth={isActive ? '3' : '2.5'}
                        style={{ filter: isActive ? 'drop-shadow(0 8px 14px rgba(15,23,42,0.18))' : 'none' }}
                      />
                      <title>{`${company.companyName} - ${point.label}: ${point.value} calls`}</title>
                    </g>
                  );
                })}
              </g>
            );
          })}

          <line
            x1={padding.left}
            y1={padding.top + innerHeight}
            x2={width - padding.right}
            y2={padding.top + innerHeight}
            stroke="#b9c7d6"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    </div>
  );
}
