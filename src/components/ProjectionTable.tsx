import React, { useMemo, useState } from 'react';
import { YearlyDataPoint, formatCurrency } from '../utils/compoundMath';

interface ProjectionTableProps {
  schedule: YearlyDataPoint[];
  crossoverYear: number | null;
  inflectionYear: number | null;
  showFees?: boolean;
}

type TableDensity = 'all' | 'milestones';

export function ProjectionTable({
  schedule,
  crossoverYear,
  inflectionYear,
  showFees = false,
}: ProjectionTableProps) {
  const [density, setDensity] = useState<TableDensity>('all');

  const visibleRows = useMemo(() => {
    if (density === 'all') return schedule;
    const lastYear = schedule[schedule.length - 1]?.year ?? 0;
    return schedule.filter(
      (row) =>
        row.year === 0 ||
        row.year === 1 ||
        row.year % 5 === 0 ||
        row.year === lastYear ||
        row.year === crossoverYear ||
        row.year === inflectionYear
    );
  }, [schedule, density, crossoverYear, inflectionYear]);

  return (
    <section
      id="schedule"
      aria-label="Annual Compounding Schedule"
      className="scroll-mt-20 rounded-xl border border-slate-200 bg-white"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight text-slate-900">
            Annual Compounding Schedule
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Year-by-year ledger of principal, deposits, interest earned, and cumulative growth
          </p>
        </div>

        <div
          role="group"
          aria-label="Schedule row filter"
          className="flex items-center gap-1 rounded-lg bg-slate-100 p-1"
        >
          <button
            type="button"
            onClick={() => setDensity('all')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
              density === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Years ({schedule.length})
          </button>
          <button
            type="button"
            onClick={() => setDensity('milestones')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
              density === 'milestones'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            5-Year Milestones
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
              <th scope="col" className="py-3 pl-6 pr-3 whitespace-nowrap">
                Year
              </th>
              <th scope="col" className="px-3 py-3 text-right whitespace-nowrap">
                Starting Balance
              </th>
              <th scope="col" className="px-3 py-3 text-right whitespace-nowrap">
                Annual Deposits
              </th>
              <th scope="col" className="px-3 py-3 text-right whitespace-nowrap">
                Annual Interest
              </th>
              {showFees && (
                <th scope="col" className="px-3 py-3 text-right whitespace-nowrap">
                  Annual Fees
                </th>
              )}
              <th scope="col" className="px-3 py-3 text-right whitespace-nowrap">
                Total Contributions
              </th>
              <th scope="col" className="px-3 py-3 text-right whitespace-nowrap">
                Compound Growth
              </th>
              <th scope="col" className="px-3 py-3 text-right whitespace-nowrap">
                Ending Balance
              </th>
              <th scope="col" className="py-3 pl-3 pr-6 text-right whitespace-nowrap">
                Real Value (Today&apos;s $)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleRows.map((row) => {
              const isCrossover = crossoverYear !== null && row.year === crossoverYear;
              const isInflection = inflectionYear !== null && row.year === inflectionYear;

              return (
                <tr
                  key={row.year}
                  className={`transition-colors hover:bg-slate-50 ${
                    isCrossover ? 'bg-emerald-50/40' : ''
                  }`}
                >
                  <td className="py-2.5 pl-6 pr-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
                        Yr {row.year}
                      </span>
                      <span className="font-mono text-xs text-slate-400 tabular-nums">
                        {row.calendarYear}
                      </span>
                      {isCrossover && (
                        <span className="text-[11px] font-medium text-emerald-700">
                          · Growth &gt; Contributions
                        </span>
                      )}
                      {!isCrossover && isInflection && (
                        <span className="text-[11px] font-medium text-slate-600">
                          · Interest &gt; Deposits
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-600 tabular-nums">
                    {formatCurrency(row.startingBalance)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-600 tabular-nums">
                    {formatCurrency(row.annualContributions)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs font-medium text-emerald-700 tabular-nums">
                    {row.year === 0 ? '$0' : `+${formatCurrency(row.annualInterest)}`}
                  </td>
                  {showFees && (
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-rose-700 tabular-nums">
                      {row.year === 0 ? '$0' : `-${formatCurrency(row.annualFees)}`}
                    </td>
                  )}
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-800 tabular-nums">
                    {formatCurrency(row.totalContributions)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs font-medium text-emerald-700 tabular-nums">
                    {formatCurrency(row.totalGrowth)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums">
                    {formatCurrency(row.endingBalance)}
                  </td>
                  <td className="py-2.5 pl-3 pr-6 text-right font-mono text-xs font-medium text-sky-700 tabular-nums">
                    {formatCurrency(row.realEndingBalance)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
