import { useMemo } from "react";

interface LineSeries {
  points: { x: number; y: number }[];
  color: string;
  label?: string;
  dashed?: boolean;
  width?: number;
}

interface Band {
  points: { x: number; yLow: number; yHigh: number }[];
  color: string;
}

interface ScatterPoint {
  x: number;
  y: number;
  color?: string;
  label?: string;
}

interface ScatterSeries {
  points: ScatterPoint[];
  color: string;
  label?: string;
}

interface BarGroup {
  label: string;
  values: { value: number; color: string; label?: string }[];
}

interface LineChartProps {
  series: LineSeries[];
  bands?: Band[];
  xLabel?: string;
  yLabel?: string;
  height?: number;
  yFormat?: (v: number) => string;
  xFormat?: (v: number) => string;
  showLegend?: boolean;
}

const MARGIN = { top: 16, right: 24, bottom: 40, left: 56 };

function scale(
  value: number,
  domain: [number, number],
  range: [number, number]
): number {
  const t = (value - domain[0]) / (domain[1] - domain[0] || 1);
  return range[0] + t * (range[1] - range[0]);
}

function niceTicks(min: number, max: number, count = 5): number[] {
  const span = max - min;
  if (span === 0) return [min];
  const step = Math.pow(10, Math.floor(Math.log10(span / count)));
  const err = (count / span) * step;
  let m = 1;
  if (err <= 0.15) m = 10;
  else if (err <= 0.35) m = 5;
  else if (err <= 0.75) m = 2;
  const niceMin = Math.floor(min / (m * step)) * (m * step);
  const niceMax = Math.ceil(max / (m * step)) * (m * step);
  const ticks: number[] = [];
  for (let v = niceMin; v <= niceMax + 1e-9; v += m * step) {
    if (v >= min - step * 0.5 && v <= max + step * 0.5) ticks.push(Number(v.toFixed(6)));
  }
  return ticks;
}

export function LineChart({
  series,
  bands = [],
  xLabel,
  yLabel,
  height = 320,
  yFormat = (v) => v.toFixed(1),
  xFormat = (v) => v.toFixed(0),
  showLegend = true,
}: LineChartProps) {
  const width = 760;
  const innerW = width - MARGIN.left - MARGIN.right;
  const innerH = height - MARGIN.top - MARGIN.bottom;

  const { xDomain, yDomain } = useMemo(() => {
    const allX: number[] = [];
    const allY: number[] = [];
    for (const s of series) for (const p of s.points) { allX.push(p.x); allY.push(p.y); }
    for (const b of bands) for (const p of b.points) { allX.push(p.x); allY.push(p.yLow, p.yHigh); }
    if (allX.length === 0) return { xDomain: [0, 1] as [number, number], yDomain: [0, 1] as [number, number] };
    const xMin = Math.min(...allX);
    const xMax = Math.max(...allX);
    const yMin = Math.min(...allY);
    const yMax = Math.max(...allY);
    const yPad = (yMax - yMin) * 0.08 || 1;
    return {
      xDomain: [xMin, xMax] as [number, number],
      yDomain: [yMin - yPad, yMax + yPad] as [number, number],
    };
  }, [series, bands]);

  const xTicks = niceTicks(xDomain[0], xDomain[1], 6);
  const yTicks = niceTicks(yDomain[0], yDomain[1], 5);

  const toX = (v: number) => scale(v, xDomain, [MARGIN.left, MARGIN.left + innerW]);
  const toY = (v: number) => scale(v, yDomain, [MARGIN.top + innerH, MARGIN.top]);

  const pathFor = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"}${toX(p.x).toFixed(1)},${toY(p.y).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img">
      {/* Grid + Y ticks */}
      {yTicks.map((t) => (
        <g key={`y-${t}`}>
          <line
            x1={MARGIN.left}
            x2={MARGIN.left + innerW}
            y1={toY(t)}
            y2={toY(t)}
            stroke="#e5e7eb"
            strokeWidth={1}
          />
          <text
            x={MARGIN.left - 8}
            y={toY(t) + 4}
            textAnchor="end"
            fontSize={11}
            fill="#6b7280"
          >
            {yFormat(t)}
          </text>
        </g>
      ))}
      {/* X ticks */}
      {xTicks.map((t) => (
        <g key={`x-${t}`}>
          <line
            x1={toX(t)}
            x2={toX(t)}
            y1={MARGIN.top}
            y2={MARGIN.top + innerH}
            stroke="#f3f4f6"
            strokeWidth={1}
          />
          <text
            x={toX(t)}
            y={MARGIN.top + innerH + 18}
            textAnchor="middle"
            fontSize={11}
            fill="#6b7280"
          >
            {xFormat(t)}
          </text>
        </g>
      ))}
      {/* Confidence bands */}
      {bands.map((b, i) => {
        const top = b.points.map((p) => ({ x: p.x, y: p.yHigh }));
        const bottom = [...b.points].reverse().map((p) => ({ x: p.x, y: p.yLow }));
        const d = `${pathFor(top)} L${bottom.map((p) => `${toX(p.x).toFixed(1)},${toY(p.y).toFixed(1)}`).join(" ")} Z`;
        return (
          <path key={`band-${i}`} d={d} fill={b.color} opacity={0.15} stroke="none" />
        );
      })}
      {/* Series */}
      {series.map((s, i) => (
        <path
          key={`s-${i}`}
          d={pathFor(s.points)}
          fill="none"
          stroke={s.color}
          strokeWidth={s.width ?? 2}
          strokeDasharray={s.dashed ? "6 4" : undefined}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
      {/* Axis labels */}
      {xLabel && (
        <text
          x={MARGIN.left + innerW / 2}
          y={height - 6}
          textAnchor="middle"
          fontSize={12}
          fill="#374151"
          fontWeight={500}
        >
          {xLabel}
        </text>
      )}
      {yLabel && (
        <text
          transform={`translate(14, ${MARGIN.top + innerH / 2}) rotate(-90)`}
          textAnchor="middle"
          fontSize={12}
          fill="#374151"
          fontWeight={500}
        >
          {yLabel}
        </text>
      )}
      {/* Legend */}
      {showLegend && series.some((s) => s.label) && (
        <g transform={`translate(${MARGIN.left + 8}, ${MARGIN.top + 4})`}>
          {series.filter((s) => s.label).map((s, i) => (
            <g key={`leg-${i}`} transform={`translate(${i * 140}, 0)`}>
              <line x1={0} x2={18} y1={0} y2={0} stroke={s.color} strokeWidth={2} strokeDasharray={s.dashed ? "6 4" : undefined} />
              <text x={24} y={4} fontSize={11} fill="#374151">{s.label}</text>
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}

interface ScatterChartProps {
  series: ScatterSeries[];
  xLabel?: string;
  yLabel?: string;
  height?: number;
  xFormat?: (v: number) => string;
  yFormat?: (v: number) => string;
}

export function ScatterChart({
  series,
  xLabel,
  yLabel,
  height = 320,
  xFormat = (v) => v.toFixed(1),
  yFormat = (v) => v.toFixed(1),
}: ScatterChartProps) {
  const width = 760;
  const innerW = width - MARGIN.left - MARGIN.right;
  const innerH = height - MARGIN.top - MARGIN.bottom;

  const { xDomain, yDomain } = useMemo(() => {
    const allX: number[] = [];
    const allY: number[] = [];
    for (const s of series) for (const p of s.points) { allX.push(p.x); allY.push(p.y); }
    if (allX.length === 0) return { xDomain: [0, 1] as [number, number], yDomain: [0, 1] as [number, number] };
    const xPad = (Math.max(...allX) - Math.min(...allX)) * 0.08 || 1;
    const yPad = (Math.max(...allY) - Math.min(...allY)) * 0.08 || 1;
    return {
      xDomain: [Math.min(...allX) - xPad, Math.max(...allX) + xPad] as [number, number],
      yDomain: [Math.min(...allY) - yPad, Math.max(...allY) + yPad] as [number, number],
    };
  }, [series]);

  const xTicks = niceTicks(xDomain[0], xDomain[1], 6);
  const yTicks = niceTicks(yDomain[0], yDomain[1], 5);
  const toX = (v: number) => scale(v, xDomain, [MARGIN.left, MARGIN.left + innerW]);
  const toY = (v: number) => scale(v, yDomain, [MARGIN.top + innerH, MARGIN.top]);

  // Regression line across all points.
  const allPoints = series.flatMap((s) => s.points);
  let regLine: { x1: number; y1: number; x2: number; y2: number } | null = null;
  if (allPoints.length > 2) {
    const n = allPoints.length;
    const mx = allPoints.reduce((s, p) => s + p.x, 0) / n;
    const my = allPoints.reduce((s, p) => s + p.y, 0) / n;
    let sxx = 0, sxy = 0;
    for (const p of allPoints) { sxx += (p.x - mx) ** 2; sxy += (p.x - mx) * (p.y - my); }
    if (sxx > 0) {
      const slope = sxy / sxx;
      const intercept = my - slope * mx;
      const x1 = xDomain[0];
      const x2 = xDomain[1];
      regLine = { x1, y1: slope * x1 + intercept, x2, y2: slope * x2 + intercept };
    }
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img">
      {yTicks.map((t) => (
        <g key={`y-${t}`}>
          <line x1={MARGIN.left} x2={MARGIN.left + innerW} y1={toY(t)} y2={toY(t)} stroke="#e5e7eb" strokeWidth={1} />
          <text x={MARGIN.left - 8} y={toY(t) + 4} textAnchor="end" fontSize={11} fill="#6b7280">{yFormat(t)}</text>
        </g>
      ))}
      {xTicks.map((t) => (
        <g key={`x-${t}`}>
          <line x1={toX(t)} x2={toX(t)} y1={MARGIN.top} y2={MARGIN.top + innerH} stroke="#f3f4f6" strokeWidth={1} />
          <text x={toX(t)} y={MARGIN.top + innerH + 18} textAnchor="middle" fontSize={11} fill="#6b7280">{xFormat(t)}</text>
        </g>
      ))}
      {regLine && (
        <line
          x1={toX(regLine.x1)}
          y1={toY(regLine.y1)}
          x2={toX(regLine.x2)}
          y2={toY(regLine.y2)}
          stroke="#9ca3af"
          strokeWidth={1.5}
          strokeDasharray="5 4"
        />
      )}
      {series.map((s, i) =>
        s.points.map((p, j) => (
          <circle
            key={`p-${i}-${j}`}
            cx={toX(p.x)}
            cy={toY(p.y)}
            r={3.5}
            fill={p.color ?? s.color}
            opacity={0.7}
          />
        ))
      )}
      {xLabel && (
        <text x={MARGIN.left + innerW / 2} y={height - 6} textAnchor="middle" fontSize={12} fill="#374151" fontWeight={500}>{xLabel}</text>
      )}
      {yLabel && (
        <text transform={`translate(14, ${MARGIN.top + innerH / 2}) rotate(-90)`} textAnchor="middle" fontSize={12} fill="#374151" fontWeight={500}>{yLabel}</text>
      )}
      {series.some((s) => s.label) && (
        <g transform={`translate(${MARGIN.left + 8}, ${MARGIN.top + 4})`}>
          {series.filter((s) => s.label).map((s, i) => (
            <g key={`leg-${i}`} transform={`translate(${i * 140}, 0)`}>
              <circle cx={6} cy={0} r={4} fill={s.color} />
              <text x={16} y={4} fontSize={11} fill="#374151">{s.label}</text>
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}

interface BarChartProps {
  groups: BarGroup[];
  height?: number;
  yLabel?: string;
  yFormat?: (v: number) => string;
}

export function BarChart({
  groups,
  height = 320,
  yLabel,
  yFormat = (v) => v.toFixed(1),
}: BarChartProps) {
  const width = 760;
  const innerW = width - MARGIN.left - MARGIN.right;
  const innerH = height - MARGIN.top - MARGIN.bottom;
  const yMax = Math.max(...groups.flatMap((g) => g.values.map((v) => v.value)), 0);
  const yMin = Math.min(...groups.flatMap((g) => g.values.map((v) => v.value)), 0);
  const yDomain: [number, number] = [yMin > 0 ? 0 : yMin, yMax < 0 ? 0 : yMax];
  const padTop = (yDomain[1] - yDomain[0]) * 0.08 || 1;
  yDomain[1] += padTop;
  const yTicks = niceTicks(yDomain[0], yDomain[1], 5);
  const toY = (v: number) => scale(v, yDomain, [MARGIN.top + innerH, MARGIN.top]);
  const groupWidth = innerW / groups.length;
  const barWidth = Math.min(48, (groupWidth * 0.7) / Math.max(1, ...groups.map((g) => g.values.length)));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img">
      {yTicks.map((t) => (
        <g key={`y-${t}`}>
          <line x1={MARGIN.left} x2={MARGIN.left + innerW} y1={toY(t)} y2={toY(t)} stroke="#e5e7eb" strokeWidth={1} />
          <text x={MARGIN.left - 8} y={toY(t) + 4} textAnchor="end" fontSize={11} fill="#6b7280">{yFormat(t)}</text>
        </g>
      ))}
      {groups.map((g, gi) => {
        const groupX = MARGIN.left + gi * groupWidth + groupWidth / 2;
        const totalBars = g.values.length;
        return g.values.map((v, bi) => {
          const x = groupX - (totalBars * barWidth) / 2 + bi * barWidth + barWidth / 2;
          const y0 = toY(0);
          const y1 = toY(v.value);
          return (
            <g key={`bar-${gi}-${bi}`}>
              <rect
                x={x - barWidth / 2}
                y={Math.min(y0, y1)}
                width={barWidth - 2}
                height={Math.abs(y1 - y0)}
                fill={v.color}
                rx={2}
              />
            </g>
          );
        });
      })}
      {groups.map((g, gi) => {
        const groupX = MARGIN.left + gi * groupWidth + groupWidth / 2;
        return (
          <text key={`lbl-${gi}`} x={groupX} y={MARGIN.top + innerH + 18} textAnchor="middle" fontSize={11} fill="#6b7280">{g.label}</text>
        );
      })}
      {yLabel && (
        <text transform={`translate(14, ${MARGIN.top + innerH / 2}) rotate(-90)`} textAnchor="middle" fontSize={12} fill="#374151" fontWeight={500}>{yLabel}</text>
      )}
    </svg>
  );
}

interface HeatmapProps {
  matrix: number[][];
  rowLabels: string[];
  colLabels: string[];
  colorScale?: (v: number) => string;
  height?: number;
}

export function Heatmap({
  matrix,
  rowLabels,
  colLabels,
  colorScale,
  height = 280,
}: HeatmapProps) {
  const width = 760;
  const left = 70;
  const top = 24;
  const right = 60;
  const bottom = 28;
  const innerW = width - left - right;
  const innerH = height - top - bottom;
  const rows = matrix.length;
  const cols = matrix[0]?.length ?? 0;
  const cellW = innerW / cols;
  const cellH = innerH / rows;

  const flat = matrix.flat();
  const min = Math.min(...flat);
  const max = Math.max(...flat);

  const defaultScale = (v: number) => {
    const t = (v - min) / (max - min || 1);
    // diverging blue -> white -> red
    if (t < 0.5) {
      const k = 1 - t * 2;
      return `rgb(${Math.round(239 + (255 - 239) * (1 - k))}, ${Math.round(68 + (255 - 68) * (1 - k))}, ${Math.round(68 + (255 - 68) * (1 - k))})`;
    }
    const k = (t - 0.5) * 2;
    return `rgb(${Math.round(59 + (239 - 59) * k)}, ${Math.round(130 + (68 - 130) * k)}, ${Math.round(246 + (68 - 246) * k)})`;
  };
  const scaleFn = colorScale ?? defaultScale;

  // Tick years - show ~8 evenly spaced
  const tickIdx: number[] = [];
  const desired = 8;
  const step = Math.max(1, Math.floor(cols / desired));
  for (let i = 0; i < cols; i += step) tickIdx.push(i);
  if (tickIdx[tickIdx.length - 1] !== cols - 1) tickIdx.push(cols - 1);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img">
      {matrix.map((row, ri) =>
        row.map((v, ci) => (
          <rect
            key={`c-${ri}-${ci}`}
            x={left + ci * cellW}
            y={top + ri * cellH}
            width={cellW + 0.5}
            height={cellH + 0.5}
            fill={scaleFn(v)}
            stroke="#fff"
            strokeWidth={0.5}
          />
        ))
      )}
      {rowLabels.map((lbl, ri) => (
        <text key={`r-${ri}`} x={left - 6} y={top + ri * cellH + cellH / 2 + 4} textAnchor="end" fontSize={11} fill="#374151">{lbl}</text>
      ))}
      {tickIdx.map((ci) => (
        <text key={`t-${ci}`} x={left + ci * cellW + cellW / 2} y={top + rows * cellH + 16} textAnchor="middle" fontSize={10} fill="#6b7280">{colLabels[ci]}</text>
      ))}
      {/* Legend */}
      {Array.from({ length: 20 }).map((_, i) => {
        const t = i / 19;
        const v = min + t * (max - min);
        return (
          <rect key={`lg-${i}`} x={width - right + 12} y={top + i * (innerH / 20)} width={12} height={innerH / 20 + 0.5} fill={defaultScale(v)} />
        );
      })}
      <text x={width - right + 6} y={top - 6} textAnchor="middle" fontSize={10} fill="#6b7280">{max.toFixed(1)}</text>
      <text x={width - right + 6} y={top + innerH + 14} textAnchor="middle" fontSize={10} fill="#6b7280">{min.toFixed(1)}</text>
    </svg>
  );
}
