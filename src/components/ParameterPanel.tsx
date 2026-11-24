import React, { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import {
  CalculatorInputs,
  CompoundingFrequency,
  ContributionTiming,
  DEFAULT_INPUTS,
} from '../utils/compoundMath';

interface ParameterPanelProps {
  inputs: CalculatorInputs;
  onChange: (next: CalculatorInputs) => void;
  effectiveAnnualYield: number;
  realAnnualYield: number;
}

interface NumericFieldConfig {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  sliderMax: number;
  step: number;
  prefix?: string;
  suffix?: string;
  minLabel: string;
  maxLabel: string;
  allowDecimal?: boolean;
  onUpdate: (val: number) => void;
}

function ParameterControl({
  id,
  label,
  value,
  min,
  max,
  sliderMax,
  step,
  prefix,
  suffix,
  minLabel,
  maxLabel,
  allowDecimal = false,
  onUpdate,
}: NumericFieldConfig) {
  const [rawText, setRawText] = useState<string>(String(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setRawText(allowDecimal ? String(value) : value.toLocaleString('en-US'));
    }
  }, [value, isFocused, allowDecimal]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextRaw = e.target.value;
    setRawText(nextRaw);

    const cleaned = nextRaw.replace(/[^0-9.]/g, '');
    if (cleaned === '' || cleaned === '.') return;

    const parsed = allowDecimal ? parseFloat(cleaned) : parseInt(cleaned, 10);
    if (Number.isFinite(parsed)) {
      const clamped = Math.min(max, Math.max(min, parsed));
      onUpdate(clamped);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    setRawText(String(value));
  };

  const handleBlur = () => {
    setIsFocused(false);
    const cleaned = rawText.replace(/[^0-9.]/g, '');
    const parsed = allowDecimal ? parseFloat(cleaned) : parseInt(cleaned, 10);
    if (Number.isFinite(parsed)) {
      const clamped = Math.min(max, Math.max(min, parsed));
      onUpdate(clamped);
      setRawText(allowDecimal ? String(clamped) : clamped.toLocaleString('en-US'));
    } else {
      setRawText(allowDecimal ? String(value) : value.toLocaleString('en-US'));
    }
  };

  const sliderVal = Math.min(sliderMax, Math.max(min, value));
  const fillPercent = sliderMax > min ? ((sliderVal - min) / (sliderMax - min)) * 100 : 0;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
        </label>
        <div className="relative flex items-center">
          {prefix && (
            <span className="pointer-events-none absolute left-3 font-mono text-sm text-slate-400">
              {prefix}
            </span>
          )}
          <input
            id={id}
            type="text"
            inputMode={allowDecimal ? 'decimal' : 'numeric'}
            value={rawText}
            onChange={handleTextChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            aria-label={label}
            className={`w-36 rounded-md border border-slate-200 bg-slate-50 py-1.5 font-mono text-sm font-medium text-slate-900 tabular-nums transition-colors focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/15 ${
              prefix ? 'pl-7' : 'pl-3'
            } ${suffix ? 'pr-9 text-right' : 'pr-3 text-right'}`}
          />
          {suffix && (
            <span className="pointer-events-none absolute right-3 font-mono text-xs text-slate-500">
              {suffix}
            </span>
          )}
        </div>
      </div>

      <div>
        <input
          type="range"
          min={min}
          max={sliderMax}
          step={step}
          value={sliderVal}
          onChange={(e) => onUpdate(parseFloat(e.target.value))}
          aria-label={`${label} slider`}
          className="precision-slider w-full"
          style={{
            background: `linear-gradient(to right, #059669 0%, #059669 ${fillPercent}%, #e2e8f0 ${fillPercent}%, #e2e8f0 100%)`,
          }}
        />
        <div className="mt-1 flex items-center justify-between font-mono text-[11px] text-slate-400 tabular-nums">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      </div>
    </div>
  );
}

const PRESETS: Array<{ label: string; rate: number; years: number; monthly: number; initial: number }> = [
  { label: 'Conservative 5%', initial: 25000, monthly: 600, rate: 5.0, years: 20 },
  { label: 'Market Avg 8%', initial: 25000, monthly: 750, rate: 8.0, years: 25 },
  { label: 'Growth 10%', initial: 50000, monthly: 1200, rate: 10.0, years: 30 },
];

const FREQUENCIES: Array<{ value: CompoundingFrequency; label: string }> = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
  { value: 'daily', label: 'Daily' },
];

const TIMINGS: Array<{ value: ContributionTiming; label: string }> = [
  { value: 'end', label: 'End of Month' },
  { value: 'beginning', label: 'Start of Month' },
];

export function ParameterPanel({
  inputs,
  onChange,
  effectiveAnnualYield,
  realAnnualYield,
}: ParameterPanelProps) {
  const isDefault =
    inputs.initialAmount === DEFAULT_INPUTS.initialAmount &&
    inputs.monthlyContribution === DEFAULT_INPUTS.monthlyContribution &&
    inputs.annualRate === DEFAULT_INPUTS.annualRate &&
    inputs.inflationRate === DEFAULT_INPUTS.inflationRate &&
    inputs.years === DEFAULT_INPUTS.years &&
    inputs.compoundingFrequency === DEFAULT_INPUTS.compoundingFrequency &&
    inputs.contributionTiming === DEFAULT_INPUTS.contributionTiming;

  return (
    <section
      id="parameters"
      aria-label="Investment Parameters"
      className="rounded-xl border border-slate-200 bg-white p-6"
    >
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight text-slate-900">
            Investment Parameters
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Effective{' '}
            <span className="font-mono font-medium text-slate-700 tabular-nums">
              {effectiveAnnualYield.toFixed(2)}% APY
            </span>
            <span aria-hidden="true"> · </span>
            Real{' '}
            <span className="font-mono font-medium text-sky-700 tabular-nums">
              {realAnnualYield.toFixed(2)}%
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => onChange(DEFAULT_INPUTS)}
          disabled={isDefault}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap shrink-0"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Reset
        </button>
      </div>

      {/* Scenario Quick-Fills */}
      <div className="mt-4">
        <span className="block text-xs font-medium text-slate-500">Quick Scenarios</span>
        <div className="mt-2 grid grid-cols-3 gap-1.5 rounded-lg bg-slate-100 p-1">
          {PRESETS.map((preset) => {
            const active =
              inputs.annualRate === preset.rate &&
              inputs.years === preset.years &&
              inputs.monthlyContribution === preset.monthly &&
              inputs.initialAmount === preset.initial;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() =>
                  onChange({
                    ...inputs,
                    initialAmount: preset.initial,
                    monthlyContribution: preset.monthly,
                    annualRate: preset.rate,
                    years: preset.years,
                  })
                }
                className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors whitespace-nowrap truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                  active
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Core 4 Calculator Inputs */}
      <div className="mt-6 space-y-6">
        <ParameterControl
          id="initial-amount"
          label="Initial Amount"
          value={inputs.initialAmount}
          min={0}
          max={100000000}
          sliderMax={250000}
          step={1000}
          prefix="$"
          minLabel="$0"
          maxLabel="$250k+"
          onUpdate={(val) => onChange({ ...inputs, initialAmount: val })}
        />

        <ParameterControl
          id="monthly-contribution"
          label="Monthly Contribution"
          value={inputs.monthlyContribution}
          min={0}
          max={1000000}
          sliderMax={10000}
          step={50}
          prefix="$"
          minLabel="$0/mo"
          maxLabel="$10k+/mo"
          onUpdate={(val) => onChange({ ...inputs, monthlyContribution: val })}
        />

        <ParameterControl
          id="interest-rate"
          label="Annual Interest Rate"
          value={inputs.annualRate}
          min={0}
          max={50}
          sliderMax={20}
          step={0.1}
          suffix="%"
          minLabel="0%"
          maxLabel="20%+"
          allowDecimal
          onUpdate={(val) => onChange({ ...inputs, annualRate: val })}
        />

        <ParameterControl
          id="inflation-rate"
          label="Annual Inflation Rate"
          value={inputs.inflationRate}
          min={0}
          max={25}
          sliderMax={10}
          step={0.1}
          suffix="%"
          minLabel="0%"
          maxLabel="10%+"
          allowDecimal
          onUpdate={(val) => onChange({ ...inputs, inflationRate: val })}
        />

        <ParameterControl
          id="time-period"
          label="Time Period"
          value={inputs.years}
          min={1}
          max={60}
          sliderMax={50}
          step={1}
          suffix="yrs"
          minLabel="1 yr"
          maxLabel="50 yrs"
          onUpdate={(val) => onChange({ ...inputs, years: Math.round(val) })}
        />
      </div>

      {/* Compounding & Deposit Timing */}
      <div className="mt-7 space-y-4 border-t border-slate-100 pt-5">
        <div>
          <span className="block text-xs font-medium text-slate-600">Compounding Frequency</span>
          <div className="mt-2 grid grid-cols-4 gap-1 rounded-lg bg-slate-100 p-1">
            {FREQUENCIES.map((freq) => {
              const active = inputs.compoundingFrequency === freq.value;
              return (
                <button
                  key={freq.value}
                  type="button"
                  onClick={() => onChange({ ...inputs, compoundingFrequency: freq.value })}
                  className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {freq.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span className="block text-xs font-medium text-slate-600">Contribution Timing</span>
          <div className="mt-2 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
            {TIMINGS.map((timing) => {
              const active = inputs.contributionTiming === timing.value;
              return (
                <button
                  key={timing.value}
                  type="button"
                  onClick={() => onChange({ ...inputs, contributionTiming: timing.value })}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {timing.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
