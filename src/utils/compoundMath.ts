export type CompoundingFrequency = 'daily' | 'monthly' | 'quarterly' | 'annually';
export type ContributionTiming = 'end' | 'beginning';

export interface CalculatorInputs {
  initialAmount: number;
  monthlyContribution: number;
  annualRate: number;
  inflationRate: number;
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
  totalContributions: number;
  cumulativeDeposits: number;
  totalGrowth: number;
  endingBalance: number;
  realEndingBalance: number;
}

export interface ProjectionSummary {
  finalBalance: number;
  realFinalBalance: number;
  totalContributions: number;
  initialAmount: number;
  totalMonthlyDeposits: number;
  totalGrowth: number;
  contributionsShare: number;
  growthShare: number;
  growthMultiple: number;
  effectiveAnnualYield: number;
  realAnnualYield: number;
  crossoverYear: number | null;
  inflectionYear: number | null;
  schedule: YearlyDataPoint[];
}

export const DEFAULT_INPUTS: CalculatorInputs = {
  initialAmount: 25000,
  monthlyContribution: 750,
  annualRate: 8.0,
  inflationRate: 2.5,
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

export function calculateProjection(inputs: CalculatorInputs): ProjectionSummary {
  const initial = Math.max(0, Number.isFinite(inputs.initialAmount) ? inputs.initialAmount : 0);
  const monthly = Math.max(0, Number.isFinite(inputs.monthlyContribution) ? inputs.monthlyContribution : 0);
  const ratePct = Math.max(0, Number.isFinite(inputs.annualRate) ? inputs.annualRate : 0);
  const inflationPct = Math.max(0, Number.isFinite(inputs.inflationRate) ? inputs.inflationRate : 0);
  const years = Math.max(1, Math.min(60, Math.round(Number.isFinite(inputs.years) ? inputs.years : 1)));

  const r = ratePct / 100;
  const inf = inflationPct / 100;
  const n = COMPOUNDING_PERIODS[inputs.compoundingFrequency];

  // Effective monthly rate equivalent to the chosen nominal rate & compounding frequency
  const monthlyRate = r === 0 ? 0 : Math.pow(1 + r / n, n / 12) - 1;
  const effectiveAnnualYield = r === 0 ? 0 : (Math.pow(1 + r / n, n) - 1) * 100;
  const realAnnualYield = ((1 + effectiveAnnualYield / 100) / (1 + inf) - 1) * 100;

  const baseCalendarYear = new Date().getFullYear();

  const schedule: YearlyDataPoint[] = [
    {
      year: 0,
      calendarYear: baseCalendarYear,
      startingBalance: initial,
      annualContributions: 0,
      annualInterest: 0,
      totalContributions: initial,
      cumulativeDeposits: 0,
      totalGrowth: 0,
      endingBalance: initial,
      realEndingBalance: initial,
    },
  ];

  let balance = initial;
  let totalContributions = initial;
  let cumulativeDeposits = 0;
  let crossoverYear: number | null = null;
  let inflectionYear: number | null = null;

  for (let y = 1; y <= years; y++) {
    const startingBalance = balance;
    let annualContributions = 0;
    let annualInterest = 0;

    for (let m = 0; m < 12; m++) {
      if (inputs.contributionTiming === 'beginning') {
        balance += monthly;
        annualContributions += monthly;
        const interest = balance * monthlyRate;
        balance += interest;
        annualInterest += interest;
      } else {
        const interest = balance * monthlyRate;
        balance += interest;
        annualInterest += interest;
        balance += monthly;
        annualContributions += monthly;
      }
    }

    totalContributions += annualContributions;
    cumulativeDeposits += annualContributions;
    const totalGrowth = Math.max(0, balance - totalContributions);

    if (crossoverYear === null && totalGrowth > totalContributions) {
      crossoverYear = y;
    }

    if (inflectionYear === null && annualContributions > 0 && annualInterest > annualContributions) {
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
      totalContributions,
      cumulativeDeposits,
      totalGrowth,
      endingBalance: balance,
      realEndingBalance,
    });
  }

  const finalPoint = schedule[schedule.length - 1];
  const finalBalance = finalPoint.endingBalance;
  const realFinalBalance = finalPoint.realEndingBalance;
  const totalGrowth = finalPoint.totalGrowth;

  const contributionsShare = finalBalance > 0 ? (finalPoint.totalContributions / finalBalance) * 100 : 100;
  const growthShare = finalBalance > 0 ? (totalGrowth / finalBalance) * 100 : 0;
  const growthMultiple =
    finalPoint.totalContributions > 0 ? finalBalance / finalPoint.totalContributions : 1;

  return {
    finalBalance,
    realFinalBalance,
    totalContributions: finalPoint.totalContributions,
    initialAmount: initial,
    totalMonthlyDeposits: cumulativeDeposits,
    totalGrowth,
    contributionsShare,
    growthShare,
    growthMultiple,
    effectiveAnnualYield,
    realAnnualYield,
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
  const headers = [
    'Year',
    'Calendar Year',
    'Starting Balance ($)',
    'Annual Contributions ($)',
    'Annual Interest Earned ($)',
    'Cumulative Contributions ($)',
    'Cumulative Growth ($)',
    'Ending Balance ($)',
    'Real Ending Balance (Today $)',
  ];

  const rows = schedule.map((row) => [
    row.year,
    row.calendarYear,
    row.startingBalance.toFixed(2),
    row.annualContributions.toFixed(2),
    row.annualInterest.toFixed(2),
    row.totalContributions.toFixed(2),
    row.totalGrowth.toFixed(2),
    row.endingBalance.toFixed(2),
    row.realEndingBalance.toFixed(2),
  ]);

  const meta = [
    `# Meridian Compound Interest Projection`,
    `# Initial Amount: ${inputs.initialAmount}, Monthly Contribution: ${inputs.monthlyContribution}, Annual Rate: ${inputs.annualRate}%, Inflation Rate: ${inputs.inflationRate}%, Years: ${inputs.years}, Compounding: ${inputs.compoundingFrequency}, Timing: ${inputs.contributionTiming}`,
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
