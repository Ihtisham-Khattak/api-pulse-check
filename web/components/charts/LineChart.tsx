'use client';

import { useEffect, useRef, useState } from 'react';
import { fmtDur } from '@/lib/format';

export interface ChartSeries {
  name: string;
  data: { x: number; y: number }[];
  /** Filled area under the line. */
  area?: boolean;
}

interface LineChartProps {
  series: ChartSeries[];
  label: string;
  xMax?: number;
  yFmt?: (v: number) => string;
  limit?: { y: number; label: string };
  height?: number;
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

export function LineChart({ series, label, xMax, yFmt, limit, height = 230 }: LineChartProps) {
  const host = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(520);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const update = () => setWidth(Math.max(240, Math.round(el.clientWidth)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const m = { l: 56, r: 12, t: 14, b: 28 };
  const iw = width - m.l - m.r;
  const ih = height - m.t - m.b;
  const all = series.flatMap((s) => s.data);
  const maxX = xMax ?? Math.max(1, ...all.map((p) => p.x));
  let top = Math.max(1, ...all.map((p) => p.y));
  if (limit) top = Math.max(top, limit.y * 1.15);
  const maxY = niceMax(top);
  // Five steps for 5, 50, 500 so counts of users stay whole numbers.
  const ySteps = maxY / Math.pow(10, Math.floor(Math.log10(maxY))) === 5 ? 5 : 4;
  const xSteps = width < 440 ? 2 : 4;
  const fmtY = yFmt ?? ((v: number) => (maxY <= 5 && !Number.isInteger(v) ? v.toFixed(1) : String(Math.round(v))));
  const X = (x: number) => m.l + (x / maxX) * iw;
  const Y = (y: number) => m.t + ih - (y / maxY) * ih;

  return (
    <div className="chart" ref={host}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
        <g className="grid">
          {Array.from({ length: ySteps + 1 }, (_, i) => {
            const y = (maxY / ySteps) * i;
            return (
              <g key={i}>
                <line x1={m.l} x2={width - m.r} y1={Y(y)} y2={Y(y)} />
                <text x={m.l - 8} y={Y(y) + 4} textAnchor="end">{fmtY(y)}</text>
              </g>
            );
          })}
        </g>
        {Array.from({ length: xSteps + 1 }, (_, i) => (
          <text key={i} x={X((maxX / xSteps) * i)} y={height - 8} textAnchor={i === 0 ? 'start' : i === xSteps ? 'end' : 'middle'}>
            {fmtDur((maxX / xSteps) * i)}
          </text>
        ))}
        {series.map((s, i) => {
          if (!s.data.length) return null;
          const d = s.data.map((p, j) => `${j ? 'L' : 'M'}${X(p.x).toFixed(1)} ${Y(p.y).toFixed(1)}`).join('');
          const first = s.data[0];
          const last = s.data[s.data.length - 1];
          return (
            <g key={s.name}>
              {s.area && <path className={`area a${i + 1}`} d={`${d}L${X(last.x).toFixed(1)} ${Y(0)}L${X(first.x).toFixed(1)} ${Y(0)}Z`} />}
              <path className={`line l${i + 1}`} d={d} />
            </g>
          );
        })}
        {limit && (
          <g>
            <line className="limit" x1={m.l} x2={width - m.r} y1={Y(limit.y)} y2={Y(limit.y)} />
            <text className="limit-label" x={width - m.r} y={Y(limit.y) - 6} textAnchor="end">{limit.label}</text>
          </g>
        )}
      </svg>
      <div className="legend">
        {series.map((s, i) => (<span key={s.name}><i className={`l${i + 1}`} />{s.name}</span>))}
        {limit && <span><i className="lim" />Threshold</span>}
      </div>
    </div>
  );
}
