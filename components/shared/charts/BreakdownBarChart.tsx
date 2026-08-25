'use client';

import { useTranslations } from 'next-intl';

interface BarDatum {
  label: string;
  value: number;
  colorVar?: string; // e.g. '--chart-1' — omit for single-hue magnitude charts
}

interface BreakdownBarChartProps {
  data: BarDatum[];
  /** Show a legend + colored bars (identity). Omit for single-hue magnitude charts. */
  showLegend?: boolean;
}

const BAR_THICKNESS = 22;
const GAP = 10;

/** Horizontal bar chart — value labels always visible (relief for sub-3:1 palette slots). */
export function BreakdownBarChart({ data, showLegend = false }: BreakdownBarChartProps) {
  const tc = useTranslations('common');

  if (data.length === 0) {
    return <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">{tc('noData')}</div>;
  }

  const maxValue = Math.max(1, ...data.map((d) => d.value));
  const height = data.length * (BAR_THICKNESS + GAP) + GAP;
  const labelWidth = 120;
  const width = 560;
  const plotWidth = width - labelWidth - 48;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
        {data.map((d, i) => {
          const y = GAP + i * (BAR_THICKNESS + GAP);
          const barWidth = Math.max(2, (d.value / maxValue) * plotWidth);
          const color = d.colorVar ? `hsl(var(${d.colorVar}))` : 'hsl(var(--chart-1))';
          return (
            <g key={d.label}>
              <text x={labelWidth - 8} y={y + BAR_THICKNESS / 2 + 4} textAnchor="end" className="fill-muted-foreground text-[11px]">
                {d.label}
              </text>
              <rect x={labelWidth} y={y} width={barWidth} height={BAR_THICKNESS} rx={4} fill={color} />
              <text x={labelWidth + barWidth + 6} y={y + BAR_THICKNESS / 2 + 4} className="fill-foreground text-[11px] font-medium">
                {d.value.toLocaleString()}
              </text>
            </g>
          );
        })}
      </svg>

      {showLegend && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {data.map((d) => (
            <div key={d.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: d.colorVar ? `hsl(var(${d.colorVar}))` : 'hsl(var(--chart-1))' }}
              />
              {d.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
