export type CompoundingFrequency = 'daily' | 'monthly' | 'quarterly' | 'annually';
export type ContributionTiming = 'end' | 'beginning';

export interface CalculatorInputs {
  initialAmount: number;
  monthlyContribution: number;
  annualRate: number;
  inflationRate: number;
  annualFee: number;
  volatility: number;
  years: number;
  compoundingFrequency: CompoundingFrequency;
  contributionTiming: ContributionTiming;
}

export interface YearlyDataPoint {
  year: number;
  calendarYear: number;
  startingBalance: number;
  annualContributions: number;
  annualInterest: number;
  annualFees: number;
  totalContributions: number;
  cumulativeDeposits: number;
  totalGrowth: number;
  totalFees: number;
  endingBalance: number;
  realEndingBalance: number;
  p10Balance: number;
  medianBalance: number;
  p90Balance: number;
}

export interface ProjectionSummary {
  finalBalance: number;
  realFinalBalance: number;
  totalContributions: number;
  initialAmount: number;
  totalMonthlyDeposits: number;
  totalGrowth: number;
  totalFees: number;
  contributionsShare: number;
  growthShare: number;
  growthMultiple: number;
  effectiveAnnualYield: number;
  realAnnualYield: number;
  p10FinalBalance: number;
  medianFinalBalance: number;
  p90FinalBalance: number;
  crossoverYear: number | null;
  inflectionYear: number | null;
  schedule: YearlyDataPoint[];
}

export const DEFAULT_INPUTS: CalculatorInputs = {
  initialAmount: 25000,
  monthlyContribution: 750,
  annualRate: 8.0,
  inflationRate: 2.5,
  annualFee: 0.0,
  volatility: 0.0,
  years: 25,
  compoundingFrequency: 'monthly',
  contributionTiming: 'end',
};

const COMPOUNDING_PERIODS: Record<CompoundingFrequency, number> = {
  daily: 365,
  monthly: 12,
  quarterly: 4,
  annually: 1,
};

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// Deterministic Mulberry32 PRNG for stable, flicker-free volatility bands
function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleStandardNormal(rng: () => number): number {
  const u1 = Math.max(1e-12, rng());
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function quantile(sortedValues: number[], q: number): number {
  if (sortedValues.length === 0) return 0;
  const pos = (sortedValues.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sortedValues[base + 1] !== undefined) {
    return sortedValues[base] + rest * (sortedValues[base + 1] - sortedValues[base]);
  }
  return sortedValues[base];
}

export function calculateProjection(inputs: CalculatorInputs): ProjectionSummary {
  const initial = Math.max(0, Number.isFinite(inputs.initialAmount) ? inputs.initialAmount : 0);
  const monthly = Math.max(0, Number.isFinite(inputs.monthlyContribution) ? inputs.monthlyContribution : 0);
  const ratePct = Math.max(0, Number.isFinite(inputs.annualRate) ? inputs.annualRate : 0);
  const inflationPct = Math.max(0, Number.isFinite(inputs.inflationRate) ? inputs.inflationRate : 0);
  const feePct = Math.max(0, Math.min(10, Number.isFinite(inputs.annualFee) ? inputs.annualFee : 0));
  const volPct = Math.max(0, Math.min(50, Number.isFinite(inputs.volatility) ? inputs.volatility : 0));
  const years = Math.max(1, Math.min(60, Math.round(Number.isFinite(inputs.years) ? inputs.years : 1)));

  const r = ratePct / 100;
  const inf = inflationPct / 100;
  const fee = feePct / 100;
  const sigma = volPct / 100;
  const n = COMPOUNDING_PERIODS[inputs.compoundingFrequency];

  // Net effective annual yield accounting for discrete compounding and annual fee drag
  const grossEffectiveAnnual = r === 0 ? 0 : Math.pow(1 + r / n, n) - 1;
  const netEffectiveAnnual = Math.max(-0.99, grossEffectiveAnnual - fee);
  const effectiveAnnualYield = netEffectiveAnnual * 100;
  const realAnnualYield = ((1 + netEffectiveAnnual) / (1 + inf) - 1) * 100;

  const baseCalendarYear = new Date().getFullYear();

  const schedule: YearlyDataPoint[] = [
    {
      year: 0,
      calendarYear: baseCalendarYear,
      startingBalance: initial,
      annualContributions: 0,
      annualInterest: 0,
      annualFees: 0,
      totalContributions: initial,
      cumulativeDeposits: 0,
      totalGrowth: 0,
      totalFees: 0,
      endingBalance: initial,
      realEndingBalance: initial,
      p10Balance: initial,
      medianBalance: initial,
      p90Balance: initial,
    },
  ];

  // Deterministic path simulation using exact discrete compounding boundaries
  let balance = initial;
  let totalContributions = initial;
  let cumulativeDeposits = 0;
  let totalFees = 0;
  let crossoverYear: number | null = null;
  let inflectionYear: number | null = null;

  for (let y = 1; y <= years; y++) {
    const startingBalance = balance;
    let annualContributions = 0;
    let annualInterest = 0;
    let annualFees = 0;

    let accruedUncompoundedInterest = 0;
    let accruedUncompoundedFees = 0;

    for (let m = 0; m < 12; m++) {
      if (inputs.compoundingFrequency === 'daily') {
        const days = DAYS_IN_MONTH[m];
        const dailyRate = r / 365;
        const dailyFeeRate = fee / 365;

        for (let d = 0; d < days; d++) {
          if (inputs.contributionTiming === 'beginning' && d === 0) {
            balance += monthly;
            annualContributions += monthly;
          }

          const interest = balance * dailyRate;
          const feeCharge = balance * dailyFeeRate;
          balance = Math.max(0, balance + interest - feeCharge);
          annualInterest += interest;
          annualFees += feeCharge;

          if (inputs.contributionTiming === 'end' && d === days - 1) {
            balance += monthly;
            annualContributions += monthly;
          }
        }
      } else {
        const monthlySimpleRate = r / 12;
        const monthlyFeeRate = fee / 12;

        if (inputs.contributionTiming === 'beginning') {
          balance += monthly;
          annualContributions += monthly;
        }

        const monthInterest = balance * monthlySimpleRate;
        const monthFee = balance * monthlyFeeRate;
        accruedUncompoundedInterest += monthInterest;
        accruedUncompoundedFees += monthFee;
        annualInterest += monthInterest;
        annualFees += monthFee;

        const isCompoundingBoundary =
          inputs.compoundingFrequency === 'monthly' ||
          (inputs.compoundingFrequency === 'quarterly' && (m + 1) % 3 === 0) ||
          (inputs.compoundingFrequency === 'annually' && m === 11);

        if (isCompoundingBoundary) {
          balance = Math.max(0, balance + accruedUncompoundedInterest - accruedUncompoundedFees);
          accruedUncompoundedInterest = 0;
          accruedUncompoundedFees = 0;
        }

        if (inputs.contributionTiming === 'end') {
          balance += monthly;
          annualContributions += monthly;
        }
      }
    }

    totalContributions += annualContributions;
    cumulativeDeposits += annualContributions;
    totalFees += annualFees;
    const totalGrowth = balance - totalContributions;

    if (crossoverYear === null && totalGrowth > totalContributions && totalGrowth > 0) {
      crossoverYear = y;
    }

    if (inflectionYear === null && annualContributions > 0 && annualInterest - annualFees > annualContributions) {
      inflectionYear = y;
    }

    const discountFactor = Math.pow(1 + inf, y);
    const realEndingBalance = discountFactor > 0 ? balance / discountFactor : balance;

    schedule.push({
      year: y,
      calendarYear: baseCalendarYear + y,
      startingBalance,
      annualContributions,
      annualInterest,
      annualFees,
      totalContributions,
      cumulativeDeposits,
      totalGrowth,
      totalFees,
      endingBalance: balance,
      realEndingBalance,
      p10Balance: balance,
      medianBalance: balance,
      p90Balance: balance,
    });
  }

  // Optional sequence-of-returns volatility simulation (250 deterministic log-normal paths)
  if (sigma > 0) {
    const numPaths = 250;
    const rng = createSeededRng(20261123);
    const paths = new Float64Array(numPaths).fill(initial);

    // Log-normal drift calibrated so E[1 + R] = 1 + netEffectiveAnnual
    const expectedFactor = Math.max(0.05, 1 + netEffectiveAnnual);
    const mu = Math.log(expectedFactor) - 0.5 * sigma * sigma;
    const annualDeposit = monthly * 12;

    for (let y = 1; y <= years; y++) {
      const yearBalances: number[] = new Array(numPaths);

      for (let p = 0; p < numPaths; p++) {
        const z = sampleStandardNormal(rng);
        const growthFactor = Math.exp(mu + sigma * z);
        const timingWeight = inputs.contributionTiming === 'beginning' ? 0.54 : 0.46;

        // Apply half-year weighted growth to intra-year monthly deposits
        const prior = paths[p];
        const nextBalance = Math.max(
          0,
          prior * growthFactor + annualDeposit * (1 + (growthFactor - 1) * timingWeight)
        );
        paths[p] = nextBalance;
        yearBalances[p] = nextBalance;
      }

      yearBalances.sort((a, b) => a - b);
      schedule[y].p10Balance = quantile(yearBalances, 0.1);
      schedule[y].medianBalance = quantile(yearBalances, 0.5);
      schedule[y].p90Balance = quantile(yearBalances, 0.9);
    }
  }

  const finalPoint = schedule[schedule.length - 1];
  const finalBalance = finalPoint.endingBalance;
  const realFinalBalance = finalPoint.realEndingBalance;
  const totalGrowth = finalPoint.totalGrowth;

  const positiveGrowth = Math.max(0, totalGrowth);
  const contributionsShare =
    finalBalance > 0 ? Math.min(100, (finalPoint.totalContributions / finalBalance) * 100) : 100;
  const growthShare = finalBalance > 0 ? Math.max(0, (positiveGrowth / finalBalance) * 100) : 0;
  const growthMultiple =
    finalPoint.totalContributions > 0 ? finalBalance / finalPoint.totalContributions : 0;

  return {
    finalBalance,
    realFinalBalance,
    totalContributions: finalPoint.totalContributions,
    initialAmount: initial,
    totalMonthlyDeposits: cumulativeDeposits,
    totalGrowth,
    totalFees,
    contributionsShare,
    growthShare,
    growthMultiple,
    effectiveAnnualYield,
    realAnnualYield,
    p10FinalBalance: finalPoint.p10Balance,
    medianFinalBalance: finalPoint.medianBalance,
    p90FinalBalance: finalPoint.p90Balance,
    crossoverYear,
    inflectionYear,
    schedule,
  };
}

export function formatCurrency(value: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatCompactCurrency(value: number): string {
  if (value >= 1_000_000_000_000) {
    return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
  }
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(value >= 10_000_000 ? 1 : 2)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(value >= 100_000 ? 0 : 1)}k`;
  }
  return `$${Math.round(value)}`;
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function exportScheduleToCsv(schedule: YearlyDataPoint[], inputs: CalculatorInputs): void {
  const includeVol = inputs.volatility > 0;
  const headers = [
    'Year',
    'Calendar Year',
    'Starting Balance ($)',
    'Annual Contributions ($)',
    'Annual Interest Earned ($)',
    'Annual Fees ($)',
    'Cumulative Contributions ($)',
    'Cumulative Growth ($)',
    'Ending Balance ($)',
    'Real Ending Balance (Today $)',
    ...(includeVol ? ['10th Percentile ($)', 'Median ($)', '90th Percentile ($)'] : []),
  ];

  const rows = schedule.map((row) => [
    row.year,
    row.calendarYear,
    row.startingBalance.toFixed(2),
    row.annualContributions.toFixed(2),
    row.annualInterest.toFixed(2),
    row.annualFees.toFixed(2),
    row.totalContributions.toFixed(2),
    row.totalGrowth.toFixed(2),
    row.endingBalance.toFixed(2),
    row.realEndingBalance.toFixed(2),
    ...(includeVol
      ? [row.p10Balance.toFixed(2), row.medianBalance.toFixed(2), row.p90Balance.toFixed(2)]
      : []),
  ]);

  const meta = [
    `# Meridian Compound Interest Projection`,
    `# Initial Amount: ${inputs.initialAmount}, Monthly Contribution: ${inputs.monthlyContribution}, Annual Rate: ${inputs.annualRate}%, Inflation Rate: ${inputs.inflationRate}%, Annual Fee: ${inputs.annualFee}%, Volatility: ${inputs.volatility}%, Years: ${inputs.years}, Compounding: ${inputs.compoundingFrequency}, Timing: ${inputs.contributionTiming}`,
  ];

  const csvContent = [...meta, headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `meridian-compound-projection-${inputs.years}yr.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
