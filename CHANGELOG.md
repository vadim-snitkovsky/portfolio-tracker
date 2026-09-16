# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Strategy Analysis tab comparing the current reinvestment strategy against collecting dividends as cash, with a funding source (seed, dividend, or external) on each purchase lot
- Editable initial seed amount and date on the Cash Flow report, persisted in the snapshot and included in export/import
- Dividend ROI, True ROI, and Current Cash Balance tiles on the Cash Flow report
- Cash and money market positions (CASH, SPAXX, FDRXX, FCASH) are tracked manually and skipped during Polygon refreshes
- Prettier, Husky, and lint-staged for formatting and pre-commit checks

### Changed

- Portfolio snapshots store positions under equityMetadata instead of equities. Old snapshots and imports migrate automatically
- Dividend refresh looks back to the earliest lot trade date or seed date instead of a fixed 12 months
- Application title renamed from "Dividend Portfolio Command Center" to "Dividend Portfolio Facts"
- CI runs on Node 20 only

### Fixed

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
