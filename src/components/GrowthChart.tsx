import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  YearlyDataPoint,
  formatCompactCurrency,
  formatCurrency,
} from '../utils/compoundMath';

interface GrowthChartProps {
  schedule: YearlyDataPoint[];
  initialAmount: number;
  inflationRate: number;
  crossoverYear: number | null;
}

type ChartMode = 'area' | 'bars';

export function GrowthChart({
  schedule,
  initialAmount,
  inflationRate,
  crossoverYear,
}: GrowthChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [chartMode, setChartMode] = useState<ChartMode>('area');
  const [dimensions, setDimensions] = useState({ width: 760, height: 390 });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) {
        setDimensions({
          width: Math.round(rect.width),
          height: rect.width < 640 ? 310 : 390,
        });
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const margin = useMemo(
    () => ({
      top: 24,
      right: 20,
      bottom: 36,
      left: dimensions.width < 520 ? 54 : 68,
    }),
    [dimensions.width]
  );

  const innerWidth = Math.max(100, dimensions.width - margin.left - margin.right);
  const innerHeight = Math.max(120, dimensions.height - margin.top - margin.bottom);

  const maxYear = schedule[schedule.length - 1]?.year ?? 1;

  const { yMax, yTicks } = useMemo(() => {
    const rawMax = Math.max(
      1000,
      ...schedule.map((d) => Math.max(d.endingBalance, d.realEndingBalance))
    );
    // Nice step calculation for 5 ticks
    const roughStep = rawMax / 4;
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
    const normalized = roughStep / magnitude;
    let niceNormalized = 1;
    if (normalized <= 1) niceNormalized = 1;
    else if (normalized <= 2) niceNormalized = 2;
    else if (normalized <= 2.5) niceNormalized = 2.5;
    else if (normalized <= 5) niceNormalized = 5;
    else niceNormalized = 10;

    const step = niceNormalized * magnitude;
    const computedMax = Math.ceil(rawMax / step) * step;
    const ticks: number[] = [];
    for (let v = 0; v <= computedMax + step * 0.01; v += step) {
      ticks.push(Math.round(v));
    }
    return { yMax: computedMax, yTicks: ticks };
  }, [schedule]);

  const xTicks = useMemo(() => {
    const total = maxYear;
    const maxLabels = dimensions.width < 520 ? 5 : 8;
    const step = Math.max(1, Math.ceil(total / maxLabels));
    const ticks: number[] = [0];
    for (let y = step; y < total; y += step) {
      ticks.push(y);
    }
    if (ticks[ticks.length - 1] !== total) {
      // Avoid crowding near final tick
      if (total - ticks[ticks.length - 1] < step * 0.45 && ticks.length > 1) {
        ticks.pop();
      }
      ticks.push(total);
    }
    return ticks;
  }, [maxYear, dimensions.width]);

  const getX = (year: number) => {
    if (chartMode === 'bars') {
      const slotWidth = innerWidth / schedule.length;
      return year * slotWidth + slotWidth / 2;
    }
    return maxYear === 0 ? 0 : (year / maxYear) * innerWidth;
  };

  const getY = (value: number) => {
    if (yMax <= 0) return innerHeight;
    return innerHeight - (value / yMax) * innerHeight;
  };

  // Build SVG paths for stacked area mode
  const paths = useMemo(() => {
    if (schedule.length === 0) {
      return { totalLine: '', contribLine: '', realLine: '', contribArea: '', growthArea: '' };
    }

    const totalPts = schedule.map((d) => `${getX(d.year).toFixed(1)},${getY(d.endingBalance).toFixed(1)}`);
    const contribPts = schedule.map((d) => `${getX(d.year).toFixed(1)},${getY(d.totalContributions).toFixed(1)}`);
    const realPts = schedule.map((d) => `${getX(d.year).toFixed(1)},${getY(d.realEndingBalance).toFixed(1)}`);
    const contribReversed = [...schedule]
      .reverse()
      .map((d) => `${getX(d.year).toFixed(1)},${getY(d.totalContributions).toFixed(1)}`);

    const firstX = getX(schedule[0].year).toFixed(1);
    const lastX = getX(schedule[schedule.length - 1].year).toFixed(1);
    const baseY = innerHeight.toFixed(1);

    return {
      totalLine: `M ${totalPts.join(' L ')}`,
      contribLine: `M ${contribPts.join(' L ')}`,
      realLine: `M ${realPts.join(' L ')}`,
      contribArea: `M ${firstX},${baseY} L ${contribPts.join(' L ')} L ${lastX},${baseY} Z`,
      growthArea: `M ${totalPts.join(' L ')} L ${contribReversed.join(' L ')} Z`,
    };
  }, [schedule, innerWidth, innerHeight, yMax, chartMode]);

  const activeIndex = hoveredIndex !== null && hoveredIndex < schedule.length ? hoveredIndex : schedule.length - 1;
  const activePoint = schedule[activeIndex] ?? schedule[schedule.length - 1];
  const isInspecting = hoveredIndex !== null && hoveredIndex < schedule.length;

  const handlePointerMove = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relX = clientX - rect.left - margin.left;
    const clampedX = Math.max(0, Math.min(innerWidth, relX));

    if (chartMode === 'bars') {
      const slotWidth = innerWidth / schedule.length;
      const idx = Math.min(schedule.length - 1, Math.max(0, Math.floor(clampedX / slotWidth)));
      setHoveredIndex(idx);
    } else {
      const ratio = innerWidth > 0 ? clampedX / innerWidth : 0;
      const idx = Math.min(schedule.length - 1, Math.max(0, Math.round(ratio * maxYear)));
      setHoveredIndex(idx);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<SVGSVGElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setHoveredIndex((prev) => {
        const cur = prev ?? schedule.length - 1;
        return Math.min(schedule.length - 1, cur + 1);
      });
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setHoveredIndex((prev) => {
        const cur = prev ?? schedule.length - 1;
        return Math.max(0, cur - 1);
      });
    } else if (e.key === 'Escape') {
      setHoveredIndex(null);
    }
  };

  const activeX = getX(activePoint.year);
  const activeTotalY = getY(activePoint.endingBalance);
  const activeRealY = getY(activePoint.realEndingBalance);
  const activeContribY = getY(activePoint.totalContributions);
  const activeGrowthPct =
    activePoint.endingBalance > 0
      ? (activePoint.totalGrowth / activePoint.endingBalance) * 100
      : 0;
  const activeContribPct = 100 - activeGrowthPct;
  const showRealOverlay = inflationRate > 0;

  const barSlotWidth = innerWidth / Math.max(1, schedule.length);
  const barWidth = Math.max(3, Math.min(28, barSlotWidth * 0.68));

  return (
    <section
      id="growth-chart"
      aria-label="Investment Growth Chart"
      className="rounded-xl border border-slate-200 bg-white p-6"
    >
      {/* Chart Header & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <h2 className="font-display text-lg font-semibold tracking-tight text-slate-900">
              Contributions vs. Compound Growth
            </h2>
            <span className="text-xs text-slate-500">
              {isInspecting
                ? `Inspecting Year ${activePoint.year} (${activePoint.calendarYear})`
                : `Hover chart to inspect Year 0–${maxYear}`}
            </span>
          </div>

          {/* Clean Legend */}
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-xs bg-emerald-600" aria-hidden="true" />
              <span>Compound Growth</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-xs bg-slate-800" aria-hidden="true" />
              <span>Total Contributions</span>
            </div>
            {showRealOverlay && chartMode === 'area' && (
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-4 border-t-2 border-dashed border-sky-600"
                  aria-hidden="true"
                />
                <span>Real Value (Today&apos;s $)</span>
              </div>
            )}
            {initialAmount > 0 && chartMode === 'area' && (
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-4 border-t border-dashed border-slate-400"
                  aria-hidden="true"
                />
                <span>Initial Principal ({formatCompactCurrency(initialAmount)})</span>
              </div>
            )}
          </div>
        </div>

        {/* Segmented View Toggle */}
        <div
          role="group"
          aria-label="Chart visualization mode"
          className="flex items-center gap-1 rounded-lg bg-slate-100 p-1"
        >
          <button
            type="button"
            onClick={() => setChartMode('area')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
              chartMode === 'area'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cumulative Curve
          </button>
          <button
            type="button"
            onClick={() => setChartMode('bars')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
              chartMode === 'bars'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Annual Bars
          </button>
        </div>
      </div>

      {/* Live Year Readout Strip (Always Stable, Zero Layout Shift) */}
      <div className="mt-4 grid grid-cols-2 gap-4 border-y border-slate-100 py-3 sm:grid-cols-4">
        <div>
          <span className="block text-xs text-slate-500">
            Year {activePoint.year} · {activePoint.calendarYear} (Nominal)
          </span>
          <span className="mt-0.5 block font-mono text-base font-semibold text-slate-900 tabular-nums">
            {formatCurrency(activePoint.endingBalance)}
          </span>
        </div>
        <div>
          <span className="block text-xs text-slate-500">
            Real Value (Today&apos;s $)
          </span>
          <span className="mt-0.5 block font-mono text-base font-semibold text-sky-700 tabular-nums">
            {formatCurrency(activePoint.realEndingBalance)}
          </span>
        </div>
        <div>
          <span className="block text-xs text-slate-500">
            Total Contributions ({activeContribPct.toFixed(1)}%)
          </span>
          <span className="mt-0.5 block font-mono text-base font-semibold text-slate-800 tabular-nums">
            {formatCurrency(activePoint.totalContributions)}
          </span>
        </div>
        <div>
          <span className="block text-xs text-slate-500">
            Compound Growth ({activeGrowthPct.toFixed(1)}%)
          </span>
          <span className="mt-0.5 block font-mono text-base font-semibold text-emerald-700 tabular-nums">
            {formatCurrency(activePoint.totalGrowth)}
          </span>
        </div>
      </div>

      {/* Interactive SVG Canvas */}
      <div ref={containerRef} className="relative mt-4 w-full select-none">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          role="img"
          tabIndex={0}
          aria-label={`Interactive compound interest chart over ${maxYear} years. Use left and right arrow keys to inspect individual years.`}
          onKeyDown={handleKeyDown}
          onMouseMove={(e) => handlePointerMove(e.clientX)}
          onMouseLeave={() => setHoveredIndex(null)}
          onTouchStart={(e) => {
            if (e.touches[0]) handlePointerMove(e.touches[0].clientX);
          }}
          onTouchMove={(e) => {
            if (e.touches[0]) handlePointerMove(e.touches[0].clientX);
          }}
          className="block w-full touch-pan-y cursor-crosshair focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 rounded-lg"
        >
          <defs>
            <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.26" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.06" />
            </linearGradient>
            <linearGradient id="contribGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#334155" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#334155" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Horizontal Gridlines & Y-Axis Labels */}
            {yTicks.map((tick) => {
              const y = getY(tick);
              return (
                <g key={tick}>
                  <line
                    x1={0}
                    x2={innerWidth}
                    y1={y}
                    y2={y}
                    stroke={tick === 0 ? '#cbd5e1' : '#f1f5f9'}
                    strokeWidth={1}
                  />
                  <text
                    x={-10}
                    y={y}
                    dy="0.32em"
                    textAnchor="end"
                    className="fill-slate-400 font-mono text-[11px] tabular-nums"
                  >
                    {formatCompactCurrency(tick)}
                  </text>
                </g>
              );
            })}

            {/* Area Mode */}
            {chartMode === 'area' && (
              <>
                <path d={paths.contribArea} fill="url(#contribGradient)" />
                <path d={paths.growthArea} fill="url(#growthGradient)" />

                {/* Initial Principal Baseline */}
                {initialAmount > 0 && initialAmount <= yMax && (
                  <line
                    x1={0}
                    x2={innerWidth}
                    y1={getY(initialAmount)}
                    y2={getY(initialAmount)}
                    stroke="#94a3b8"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                )}

                {/* Crossover Year Marker */}
                {crossoverYear !== null && crossoverYear <= maxYear && (
                  <g>
                    <line
                      x1={getX(crossoverYear)}
                      x2={getX(crossoverYear)}
                      y1={0}
                      y2={innerHeight}
                      stroke="#10b981"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      opacity={0.55}
                    />
                    <text
                      x={Math.min(innerWidth - 6, Math.max(6, getX(crossoverYear) + 6))}
                      y={12}
                      textAnchor={getX(crossoverYear) > innerWidth * 0.72 ? 'end' : 'start'}
                      className="fill-emerald-700 font-sans text-[11px] font-medium"
                    >
                      Growth &gt; Contributions (Yr {crossoverYear})
                    </text>
                  </g>
                )}

                {/* Crisp Stroke Curves */}
                <path
                  d={paths.contribLine}
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth={2}
                  strokeLinejoin="round"
                />
                {showRealOverlay && (
                  <path
                    d={paths.realLine}
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    strokeLinejoin="round"
                  />
                )}
                <path
                  d={paths.totalLine}
                  fill="none"
                  stroke="#059669"
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                />
              </>
            )}

            {/* Stacked Bar Mode */}
            {chartMode === 'bars' &&
              schedule.map((d, idx) => {
                const cx = getX(d.year);
                const x = cx - barWidth / 2;
                const contribHeight = Math.max(0, innerHeight - getY(d.totalContributions));
                const totalHeight = Math.max(0, innerHeight - getY(d.endingBalance));
                const growthHeight = Math.max(0, totalHeight - contribHeight);
                const contribY = innerHeight - contribHeight;
                const growthY = innerHeight - totalHeight;
                const isSelected = isInspecting && idx === activeIndex;
                const dimOthers = isInspecting && idx !== activeIndex;

                return (
                  <g key={d.year} opacity={dimOthers ? 0.55 : 1}>
                    {/* Contributions Base Bar */}
                    <rect
                      x={x}
                      y={contribY}
                      width={barWidth}
                      height={contribHeight}
                      rx={growthHeight <= 1 ? 2 : 0}
                      fill={isSelected ? '#0f172a' : '#334155'}
                    />
                    {/* Compound Growth Top Bar */}
                    {growthHeight > 0.5 && (
                      <rect
                        x={x}
                        y={growthY}
                        width={barWidth}
                        height={growthHeight}
                        rx={2}
                        fill={isSelected ? '#047857' : '#10b981'}
                      />
                    )}
                  </g>
                );
              })}

            {/* X-Axis Labels */}
            {xTicks.map((yr) => {
              const x = getX(yr);
              return (
                <g key={yr} transform={`translate(${x}, ${innerHeight})`}>
                  <line y1={0} y2={5} stroke="#cbd5e1" strokeWidth={1} />
                  <text
                    y={19}
                    textAnchor={
                      yr === 0 && chartMode === 'area'
                        ? 'start'
                        : yr === maxYear && chartMode === 'area'
                          ? 'end'
                          : 'middle'
                    }
                    className="fill-slate-500 font-mono text-[11px] tabular-nums"
                  >
                    Yr {yr}
                  </text>
                </g>
              );
            })}

            {/* Active Crosshair & Point Markers */}
            {isInspecting && (
              <g pointerEvents="none">
                <line
                  x1={activeX}
                  x2={activeX}
                  y1={0}
                  y2={innerHeight}
                  stroke="#64748b"
                  strokeWidth={1}
                />
                <circle
                  cx={activeX}
                  cy={activeContribY}
                  r={4.5}
                  fill="#1e293b"
                  stroke="#ffffff"
                  strokeWidth={2}
                />
                {showRealOverlay && chartMode === 'area' && (
                  <circle
                    cx={activeX}
                    cy={activeRealY}
                    r={4.5}
                    fill="#0284c7"
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                )}
                <circle
                  cx={activeX}
                  cy={activeTotalY}
                  r={5.5}
                  fill="#059669"
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              </g>
            )}
          </g>
        </svg>

        {/* Smart Floating Tooltip during Hover/Focus Inspection */}
        {isInspecting && (
          <div
            className="pointer-events-none absolute top-3 z-10 w-60 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-md backdrop-blur-xs"
            style={{
              left:
                activeX > innerWidth * 0.55
                  ? Math.max(8, margin.left + activeX - 256)
                  : Math.min(dimensions.width - 248, margin.left + activeX + 16),
            }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <span className="font-display text-xs font-semibold text-slate-900">
                Year {activePoint.year}
              </span>
              <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                {activePoint.calendarYear}
              </span>
            </div>
            <div className="mt-2 space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-600">Nominal Value</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {formatCurrency(activePoint.endingBalance)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="h-2 w-2 rounded-xs bg-sky-600" aria-hidden="true" />
                  Real Value
                </span>
                <span className="font-mono font-medium text-sky-700 tabular-nums">
                  {formatCurrency(activePoint.realEndingBalance)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="h-2 w-2 rounded-xs bg-emerald-600" aria-hidden="true" />
                  Growth
                </span>
                <span className="font-mono font-medium text-emerald-700 tabular-nums">
                  {formatCurrency(activePoint.totalGrowth)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="h-2 w-2 rounded-xs bg-slate-800" aria-hidden="true" />
                  Contributions
                </span>
                <span className="font-mono font-medium text-slate-800 tabular-nums">
                  {formatCurrency(activePoint.totalContributions)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
