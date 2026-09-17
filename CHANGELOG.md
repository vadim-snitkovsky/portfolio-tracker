# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Product spec in docs/product-spec.md covering the purpose, the data model, and how every number is computed
- Trailing 12-month dividends and yield on the Strategy Analysis tab and in Recent Payouts
- Tests for every screen and module, with coverage thresholds of 95% lines, 95% functions, 90% branches, and 95% statements enforced in CI
- Strategy Analysis tab comparing the current reinvestment strategy against collecting dividends as cash, with a funding source (seed, dividend, or external) on each purchase lot
- Editable initial seed amount and date on the Cash Flow report, persisted in the snapshot and included in export/import
- Dividend ROI, True ROI, and Current Cash Balance tiles on the Cash Flow report
- Cash and money market positions (CASH, SPAXX, FDRXX, FCASH) are tracked manually and skipped during Polygon refreshes
- Prettier, Husky, and lint-staged for formatting and pre-commit checks

### Changed

- Test tooling moves to Vitest 5 with AST-based coverage remapping
- True ROI is (market value + cash - contributed capital) / contributed capital, where contributed capital is the seed plus externally funded lots. Cash balance and dividend ROI use the same contributed capital, and the cash flow and strategy tabs share one implementation
- A lot earns a dividend only when it was bought before the ex-dividend date. A purchase on the ex-date no longer counts
- Snapshots without a seed no longer default to the sample's $90,000. The tiles ask for a seed instead
- Strategy classification only lets seed-funded lots draw down the seed, so an explicitly labeled dividend or external lot no longer changes how later unlabeled lots are classified
- Portfolio snapshots store positions under equityMetadata instead of equities. Old snapshots and imports migrate automatically
- Dividend refresh looks back to the earliest lot trade date or seed date instead of a fixed 12 months
- Application title renamed from "Dividend Portfolio Command Center" to "Dividend Portfolio Facts"
- Node 24 is the minimum supported runtime. The Docker image, CI, and .nvmrc use Node 24 as well

### Fixed

- Overview tiles and Recent Payouts sized every dividend by today's share count instead of the shares owned on the payment date, overstating income for positions built over time
- Save As creates a new saved portfolio instead of renaming the active one
- Clear all storage also removes saved portfolios and the active portfolio id
- Editing a lot loads the price with two decimals, so the cents-based price field no longer shifts digits
- Lots match snapshot symbols regardless of letter case, and a symbol with lots but no quote is priced at its most recent trade
- React no longer warns about missing keys on the expandable rows of the equity, cash flow, and holdings tables
- Import parser now restores seed amount, seed date, and last-update timestamps from exported JSON
- Percent formatting no longer divides by 100 twice on the Cash Flow report

### Removed

- Storybook and Netlify configuration (unused)
- Secret reference from vercel.json

## [1.0.0] - 2025-10-05

### Added

- Multi-portfolio management with create, rename, delete, and switch functionality
- Real-time stock quotes via Polygon.io API
- Dividend tracking and history
- NAV (Net Asset Value) history and peak decay analysis
- Custom purchase lot tracking
- Expandable monthly cash flow report showing transactions
- Portfolio performance metrics (ROI, yield on cost, total return)
- Import/Export portfolio data as JSON
- Test suite with 85% coverage thresholds enforced in CI
- Docker support for easy deployment
- Responsive UI design

### Technical

- React 19 with TypeScript
- Zustand for state management
- Vite for fast development and builds
- Vitest for testing
- Docker support
- GitHub Actions CI/CD
