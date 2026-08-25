'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

interface TrendPoint {
  date: string;
  count: number;
}

interface TrendAreaChartProps {
  data: TrendPoint[];
  height?: number;
}

const MARGIN = { top: 16, right: 16, bottom: 24, left: 8 };

/** Single-series line+area chart with crosshair/tooltip — daily download counts. */
export function TrendAreaChart({ data, height = 220 }: TrendAreaChartProps) {
  const tc = useTranslations('common');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const width = 720;

  const { points, plotWidth, plotHeight } = useMemo(() => {
    const plotWidth = width - MARGIN.left - MARGIN.right;
    const plotHeight = height - MARGIN.top - MARGIN.bottom;
    const maxValue = Math.max(1, ...data.map((d) => d.count));
    const stepX = data.length > 1 ? plotWidth / (data.length - 1) : 0;
    const points = data.map((d, i) => ({
      x: MARGIN.left + i * stepX,
      y: MARGIN.top + plotHeight - (d.count / maxValue) * plotHeight,
      ...d,
    }));
    return { points, maxValue, plotWidth, plotHeight };
  }, [data, height]);

  if (data.length === 0) {
    return <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">{tc('noData')}</div>;
  }

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${MARGIN.top + plotHeight} L ${points[0].x} ${MARGIN.top + plotHeight} Z`;

  const gridLines = [0, 0.5, 1].map((frac) => MARGIN.top + plotHeight * frac);
  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  const handleMove = (e: React.MouseEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * width;
    let closest = 0;
    let closestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - relX);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    });
    setHoverIndex(closest);
  };

  return (
    <div className="relative w-full" style={{ color: 'hsl(var(--chart-1))' }}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
        {gridLines.map((y, i) => (
          <line key={i} x1={MARGIN.left} x2={width - MARGIN.right} y1={y} y2={y} stroke="hsl(var(--border))" strokeWidth={1} />
        ))}
        <path d={areaPath} fill="currentColor" opacity={0.1} stroke="none" />
        <path d={linePath} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {/* end marker + direct label */}
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={4} fill="currentColor" stroke="hsl(var(--card))" strokeWidth={2} />
        <text
          x={points[points.length - 1].x}
          y={points[points.length - 1].y - 10}
          textAnchor="end"
          className="fill-foreground text-[11px] font-medium"
        >
          {points[points.length - 1].count.toLocaleString()}
        </text>

        {hovered && (
          <g>
            <line x1={hovered.x} x2={hovered.x} y1={MARGIN.top} y2={MARGIN.top + plotHeight} stroke="hsl(var(--muted-foreground))" strokeWidth={1} strokeDasharray="2 2" />
            <circle cx={hovered.x} cy={hovered.y} r={4} fill="currentColor" stroke="hsl(var(--card))" strokeWidth={2} />
          </g>
        )}

        <rect
          x={MARGIN.left}
          y={0}
          width={plotWidth}
          height={height}
          fill="transparent"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIndex(null)}
        />
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md"
          style={{
            left: `${(hovered.x / width) * 100}%`,
            top: 4,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="text-muted-foreground">{hovered.date}</div>
          <div className="font-medium">{hovered.count.toLocaleString()} {tc('downloadsUnit')}</div>
        </div>
      )}
    </div>
  );
}
