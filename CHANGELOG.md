# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release of Portfolio Tracker
- Multi-portfolio management with create, rename, delete, and switch functionality
- Real-time stock quotes via Polygon.io API
- Dividend tracking and history
- NAV (Net Asset Value) history and peak decay analysis
- Custom purchase lot tracking with FIFO/LIFO support
- Expandable monthly cash flow report showing transactions
- Portfolio performance metrics (ROI, yield on cost, total return)
- Import/Export portfolio data as JSON
- Comprehensive test suite with 85%+ coverage
- Docker support for easy deployment
- Responsive UI design

### Features

#### Portfolio Management
- Create and manage multiple portfolios
- Rename portfolios with inline editing
- Delete portfolios with confirmation
- Switch between portfolios seamlessly
- Auto-save to localStorage

#### Investment Tracking
- Track equity positions with real-time prices
- Monitor dividend payments and history
- View NAV history and peak decay
- Calculate cost basis and unrealized gains
- Track total return and ROI

#### Cash Flow Analysis
- Monthly cash flow breakdown
- Expandable months showing individual transactions
- Dividend and purchase transaction details
- Aggregated purchase data per equity

#### Data Management
- Export portfolio data with portfolio name in filename
- Import portfolio snapshots from JSON
- Backup and restore functionality
- Sample portfolio for quick start

### Technical

#### Testing
- 223 comprehensive tests
- 93.56% line coverage
- 95.16% function coverage
- 85.55% branch coverage
- 93.56% statement coverage

#### Infrastructure
- React 18 with TypeScript
- Zustand for state management
- Vite for fast development and builds
- Vitest for testing
- Docker support
- GitHub Actions CI/CD

## [1.0.0] - 2025-01-XX

### Initial Release
- First stable release of Portfolio Tracker

---

## Release Types

- **Added** - New features
- **Changed** - Changes in existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Security improvements

