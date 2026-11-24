# Meridian — Compound Interest Calculator

An interactive compound interest and investment growth calculator built with React, TypeScript, Vite, and Tailwind CSS. Model long-term portfolio compounding, compare cumulative contributions against investment returns, adjust projections for annual inflation, and export year-by-year schedules to CSV.

## Features

- **Interactive Parameter Controls**: Synchronized numeric inputs and range sliders for Initial Amount, Monthly Contribution, Annual Interest Rate, Annual Inflation Rate, and Time Horizon (1–60 years).
- **Exact Discrete Compounding & Deposit Timing**: Supports `Daily` (365-day simulation), `Monthly`, `Quarterly`, and `Annually` compounding boundaries alongside `End of Month` or `Start of Month` deposits, plus one-click scenario presets (`Conservative`, `Market Avg`, `Growth`).
- **Fees & Return Volatility Modeling**: Optional **Annual Fee (ER %)** drag and **Return Volatility ($\sigma$ %)** simulation (250 deterministic log-normal paths) rendering a 10th–90th percentile outcome range band.
- **Inflation-Adjusted ("Real") Projections**: Calculates both nominal future value and purchasing-power-adjusted real value in today's dollars, along with net effective APY and Fisher-adjusted real annual yield.
- **Interactive SVG Growth Chart**:
  - Toggle between **Cumulative Curve** (stacked area chart with Real Value, Initial Principal, and optional 10th–90th percentile band overlays) and **Annual Bars** (stacked column breakdown with Real Value markers).
  - Scrub with mouse, touch, or keyboard (`ArrowLeft` / `ArrowRight` / `Escape`) to inspect exact yearly balances, contributions, and interest earned.
- **Milestone Detection**: Automatically identifies the **Growth Crossover Point** (when cumulative returns exceed total contributions) and the **Annual Interest Inflection** (when yearly net interest exceeds yearly deposits).
- **Annual Compounding Schedule & CSV Export**: Inspect every year or filter to 5-year milestones, and download the complete nominal, real, fee, and percentile projection ledger via **Export CSV**.

## Calculation Methodology

For nominal annual rate $r$, annual fee $f$, compounding periods per year $n \in \{1, 4, 12, 365\}$, volatility $\sigma$, and inflation rate $\pi$:

- **Discrete Compounding Schedule**:
  - **Daily**: Simulates each day of a 365-day year, compounding at $r/365 - f/365$ with deposits applied on the first or last day of each month.
  - **Monthly / Quarterly / Annually**: Accrues monthly periodic interest and fees at $r/12$ and $f/12$, capitalizing accrued net interest strictly at the chosen compounding boundary (every 1, 3, or 12 months).
- **Net Effective Annual Yield**:
  $$\text{APY}_{\text{net}} = \left(1 + \frac{r}{n}\right)^n - 1 - f$$
- **Real Annual Yield (Fisher Equation)**:
  $$r_{\text{real}} = \frac{1 + \text{APY}_{\text{net}}}{1 + \pi} - 1$$
- **Real Future Value at Year $t$**:
  $$\text{FV}_{\text{real}}(t) = \frac{\text{FV}_{\text{nominal}}(t)}{(1 + \pi)^t}$$
- **Return Volatility Band ($\sigma > 0$)**: Simulates 250 deterministic seeded log-normal return paths with drift $\mu = \ln(1 + \text{APY}_{\text{net}}) - \frac{1}{2}\sigma^2$ to report the 10th, 50th (median), and 90th percentile outcomes.

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 8
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React

## Project Structure

```text
├── index.html                  # Document entry, metadata, and Google Fonts
├── src/
│   ├── main.tsx                # React root mount
│   ├── index.css               # Tailwind CSS v4 theme and slider styling
│   ├── App.tsx                 # Main layout, KPI summary, composition bar, and milestones
│   ├── utils/
│   │   └── compoundMath.ts     # Compounding engine, inflation adjustment, formatters, CSV export
│   └── components/
│       ├── ParameterPanel.tsx  # Inputs, sliders, presets, compounding & timing controls
│       ├── GrowthChart.tsx     # Responsive SVG area/bar chart with interactive crosshair
│       └── ProjectionTable.tsx # Yearly ledger table with milestone filter
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Getting Started

### Prerequisites

- Node.js 18+ (or Bun)

### Installation & Development

```bash
# Install dependencies
npm install

# Start the development server (http://localhost:3000)
npm run dev
```

### Other Scripts

```bash
# Type-check with TypeScript
npm run lint

# Build for production
npm run build

# Preview the production build locally
npm run preview
```
