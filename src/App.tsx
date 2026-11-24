import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import {
  CalculatorInputs,
  DEFAULT_INPUTS,
  calculateProjection,
  exportScheduleToCsv,
  formatCurrency,
  formatPercent,
} from './utils/compoundMath';
import { ParameterPanel } from './components/ParameterPanel';
import { GrowthChart } from './components/GrowthChart';
import { ProjectionTable } from './components/ProjectionTable';

export default function App() {
  const [inputs, setInputs] = useState<CalculatorInputs>(DEFAULT_INPUTS);

  const summary = useMemo(() => calculateProjection(inputs), [inputs]);

  const initialShare =
    summary.finalBalance > 0 ? (summary.initialAmount / summary.finalBalance) * 100 : 0;
  const depositsShare =
    summary.finalBalance > 0 ? (summary.totalMonthlyDeposits / summary.finalBalance) * 100 : 0;
  const growthShare =
    summary.finalBalance > 0 ? (summary.totalGrowth / summary.finalBalance) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-8 px-6 py-3.5 lg:px-10">
          <a
            href="#top"
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            Meridian
          </a>

          <nav
            aria-label="Workspace sections"
            className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex"
          >
            <a
              href="#parameters"
              className="transition-colors hover:text-slate-900 whitespace-nowrap shrink-0"
            >
              Parameters
            </a>
            <a
              href="#growth-chart"
              className="transition-colors hover:text-slate-900 whitespace-nowrap shrink-0"
            >
              Growth Chart
            </a>
            <a
              href="#schedule"
              className="transition-colors hover:text-slate-900 whitespace-nowrap shrink-0"
            >
              Annual Schedule
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => exportScheduleToCsv(summary.schedule, inputs)}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Export CSV
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="mx-auto max-w-[1440px] px-6 py-8 lg:px-10">
        {/* Page Heading & Unboxed Context Metadata */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl text-balance">
              Compound Interest Calculator
            </h1>
            <p className="mt-1.5 text-sm text-slate-600">
              Model long-term investment growth and compare cumulative contributions against compounded returns.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-mono tabular-nums">
              {inputs.years}-Year Horizon
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {formatPercent(inputs.annualRate, 1)} Nominal ({formatPercent(summary.effectiveAnnualYield, 2)} APY)
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {formatPercent(inputs.inflationRate, 1)} Inflation ({formatPercent(summary.realAnnualYield, 2)} Real)
            </span>
            {inputs.annualFee > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {formatPercent(inputs.annualFee, 2)} Fee
                </span>
              </>
            )}
            {inputs.volatility > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {formatPercent(inputs.volatility, 1)} Volatility
                </span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span className="capitalize">{inputs.compoundingFrequency} Compounding</span>
          </div>
        </div>

        {/* Summary KPI Strip (Single-elevation surface with hairline dividers) */}
        <section
          aria-label="Projected Investment Summary"
          className="mt-6 rounded-xl border border-slate-200 bg-white"
        >
          <div className="grid grid-cols-1 divide-y divide-slate-200 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4">
            <div className="p-5 sm:p-6">
              <span className="block text-xs font-medium text-slate-500">
                Projected Future Value
              </span>
              <span className="mt-1.5 block font-mono text-2xl font-semibold tracking-tight text-slate-900 tabular-nums sm:text-3xl">
                {formatCurrency(summary.finalBalance)}
              </span>
              <span className="mt-1.5 block text-xs text-slate-600 tabular-nums">
                Real Value:{' '}
                <span className="font-mono font-semibold text-sky-700">
                  {formatCurrency(summary.realFinalBalance)}
                </span>{' '}
                in today&apos;s $
              </span>
            </div>

            <div className="p-5 sm:border-l sm:border-slate-200 sm:p-6">
              <span className="block text-xs font-medium text-slate-500">
                Total Contributions
              </span>
              <span className="mt-1.5 block font-mono text-2xl font-semibold tracking-tight text-slate-800 tabular-nums sm:text-3xl">
                {formatCurrency(summary.totalContributions)}
              </span>
              <span className="mt-1.5 block text-xs text-slate-500 tabular-nums">
                {formatPercent(summary.contributionsShare, 1)} of final value · {formatCurrency(summary.initialAmount)} initial
              </span>
            </div>

            <div className="p-5 sm:border-t sm:border-slate-200 sm:p-6 lg:border-l lg:border-t-0">
              <span className="block text-xs font-medium text-slate-500">
                Total Compound Growth
              </span>
              <span className="mt-1.5 block font-mono text-2xl font-semibold tracking-tight text-emerald-700 tabular-nums sm:text-3xl">
                {formatCurrency(summary.totalGrowth)}
              </span>
              <span className="mt-1.5 block text-xs text-slate-500 tabular-nums">
                {formatPercent(summary.growthShare, 1)} of final value · Interest earned
              </span>
            </div>

            <div className="p-5 sm:border-l sm:border-t sm:border-slate-200 sm:p-6 lg:border-t-0">
              <span className="block text-xs font-medium text-slate-500">
                Capital Growth Multiple
              </span>
              <span className="mt-1.5 block font-mono text-2xl font-semibold tracking-tight text-slate-900 tabular-nums sm:text-3xl">
                {summary.growthMultiple > 0 ? `${summary.growthMultiple.toFixed(2)}×` : '—'}
              </span>
              <span className="mt-1.5 block text-xs text-slate-500 tabular-nums">
                {summary.crossoverYear !== null
                  ? `Growth exceeds deposits in Yr ${summary.crossoverYear}`
                  : 'Contributions exceed growth over period'}
              </span>
            </div>
          </div>

          {/* Composition Proportion Bar */}
          <div className="border-t border-slate-100 px-5 py-3.5 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
              <span className="font-medium text-slate-700">Final Balance Composition</span>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 tabular-nums">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-xs bg-slate-900" aria-hidden="true" />
                  Initial {formatPercent(initialShare, 1)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-xs bg-slate-500" aria-hidden="true" />
                  Monthly Deposits {formatPercent(depositsShare, 1)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-xs bg-emerald-600" aria-hidden="true" />
                  Compound Growth {formatPercent(growthShare, 1)}
                </span>
              </div>
            </div>

            <div
              className="mt-2 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
              role="img"
              aria-label={`Balance composition: ${formatPercent(initialShare, 1)} initial principal, ${formatPercent(depositsShare, 1)} monthly deposits, and ${formatPercent(growthShare, 1)} compound growth.`}
            >
              {initialShare > 0 && (
                <div
                  className="bg-slate-900 transition-all duration-200"
                  style={{ width: `${initialShare}%` }}
                />
              )}
              {depositsShare > 0 && (
                <div
                  className="bg-slate-500 transition-all duration-200"
                  style={{ width: `${depositsShare}%` }}
                />
              )}
              {growthShare > 0 && (
                <div
                  className="bg-emerald-600 transition-all duration-200"
                  style={{ width: `${growthShare}%` }}
                />
              )}
            </div>
          </div>
        </section>

        {/* Main 2-Column Calculator Workspace */}
        <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <ParameterPanel
              inputs={inputs}
              onChange={setInputs}
              effectiveAnnualYield={summary.effectiveAnnualYield}
              realAnnualYield={summary.realAnnualYield}
            />
          </div>

          <div className="space-y-6 lg:col-span-8">
            <GrowthChart
              schedule={summary.schedule}
              initialAmount={inputs.initialAmount}
              inflationRate={inputs.inflationRate}
              volatility={inputs.volatility}
              crossoverYear={summary.crossoverYear}
            />

            {/* Key Compounding Milestones Strip */}
            <section
              aria-label="Compounding Milestones"
              className="grid grid-cols-1 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0"
            >
              <div className="p-5">
                <span className="block text-xs font-medium text-slate-500">
                  {inputs.volatility > 0
                    ? '10th–90th Percentile Range'
                    : inputs.annualFee > 0
                      ? 'Cumulative Fees Paid'
                      : 'Inflation-Adjusted Value'}
                </span>
                <span className="mt-1 block font-mono text-lg font-semibold text-sky-700 tabular-nums">
                  {inputs.volatility > 0
                    ? `${formatCurrency(summary.p10FinalBalance)} – ${formatCurrency(summary.p90FinalBalance)}`
                    : inputs.annualFee > 0
                      ? formatCurrency(summary.totalFees)
                      : formatCurrency(summary.realFinalBalance)}
                </span>
                <span className="mt-1 block text-xs text-slate-500 tabular-nums">
                  {inputs.volatility > 0
                    ? `Median outcome: ${formatCurrency(summary.medianFinalBalance)}`
                    : inputs.annualFee > 0
                      ? `At ${formatPercent(inputs.annualFee, 2)} annual expense ratio`
                      : summary.finalBalance > 0
                        ? `${formatPercent((summary.realFinalBalance / summary.finalBalance) * 100, 1)} purchasing power vs. nominal`
                        : 'Today’s purchasing power equivalent'}
                </span>
              </div>

              <div className="p-5">
                <span className="block text-xs font-medium text-slate-500">
                  Growth Crossover Point
                </span>
                <span className="mt-1 block font-mono text-lg font-semibold text-emerald-700 tabular-nums">
                  {summary.crossoverYear !== null ? `Year ${summary.crossoverYear}` : 'Beyond Horizon'}
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  {summary.crossoverYear !== null
                    ? 'Cumulative returns overtake total contributions'
                    : 'Extend horizon or rate to reach crossover'}
                </span>
              </div>

              <div className="p-5">
                <span className="block text-xs font-medium text-slate-500">
                  Annual Interest Inflection
                </span>
                <span className="mt-1 block font-mono text-lg font-semibold text-slate-900 tabular-nums">
                  {summary.inflectionYear !== null ? `Year ${summary.inflectionYear}` : 'Beyond Horizon'}
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  {summary.inflectionYear !== null
                    ? 'Yearly interest exceeds yearly contributions'
                    : 'Yearly deposits remain higher than yearly interest'}
                </span>
              </div>
            </section>
          </div>
        </div>

        {/* Full-Width Annual Projection Schedule */}
        <div className="mt-6">
          <ProjectionTable
            schedule={summary.schedule}
            crossoverYear={summary.crossoverYear}
            inflectionYear={summary.inflectionYear}
            showFees={inputs.annualFee > 0}
          />
        </div>
      </main>

      <footer className="mx-auto mt-6 max-w-[1440px] border-t border-slate-200 px-6 py-6 text-xs text-slate-500 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span>Meridian · Compound Interest Projection Tool</span>
          <span>
            Projections use discrete compounding with optional inflation, fee drag, and 250-path return volatility; taxes are excluded.
          </span>
        </div>
      </footer>
    </div>
  );
}
