# Dividend Portfolio Command Center

[![CI](https://github.com/vadim-snitkovsky/portfolio-tracker/workflows/CI/badge.svg)](https://github.com/vadim-snitkovsky/portfolio-tracker/actions)
[![codecov](https://codecov.io/gh/vadim-snitkovsky/portfolio-tracker/branch/main/graph/badge.svg?token=0daabe2c-a1a4-46fd-abf6-bd317bf499af)](https://codecov.io/gh/vadim-snitkovsky/portfolio-tracker)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.1-61dafb.svg)](https://reactjs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

A modern React 18 + TypeScript web app for monitoring income-oriented equity portfolios. Track performance, dividend cash flow, NAV erosion, and manage multiple portfolios with ease.

## ✨ Key Features

### 📊 Multi-Portfolio Management
- **Create & Save** unlimited portfolios with custom names
- **Switch** between portfolios instantly
- **Rename** portfolios on the fly
- **Export/Import** individual portfolios as JSON
- Active portfolio name displayed in dashboard header

### 📈 Performance Tracking
- **Portfolio Overview** - Cost basis, market value, total return (dividends included), ROI
- **Equity Performance Table** - 13 sortable columns including:
  - Unrealized P&L and ROI
  - NAV Peak, Current NAV, and NAV Erosion %
  - Total dividends received and yield on cost
  - Last dividend date and amount
- **Expandable Holdings** - Click any equity to see individual purchase lots with dates and prices

### 💰 Cash Flow Analysis
- **Monthly Cash Flow Report** - Track investments and dividend income over time
- **Expandable Months** - Click any month to see:
  - Individual dividend transactions with shares owned at payment date
  - Purchase transactions with price per share and total cost
  - Average purchase price and total invested per equity
- **Delete Dividends** - Remove incorrect dividend entries directly from the table
- **Cumulative Tracking** - See running totals of invested capital and dividend income

### 🔄 Live Market Data (Polygon.io)
- **One-click price refresh** - Updates all positions with latest market prices
- **Automatic NAV history** - Fetches 12 months of monthly price data for erosion tracking
- **One-click dividend refresh** - Pulls last 12 months of dividend history automatically
- **Error handling** - Graceful fallback if symbols can't be fetched

### 📝 Holdings Management
- **Add purchase lots** - Track individual buys with ticker, shares, date, and price
- **Edit lots** - Update any purchase details inline
- **Delete lots** - Remove positions (auto-cleanup when shares reach zero)
- **Blended cost basis** - Automatically calculates weighted average cost
- **Lot-level history** - Expand any equity to see all underlying purchases

### 💾 Data Management
- **Import/Export** - JSON format for easy backup and restore
- **Auto-persistence** - All changes saved to localStorage automatically
- **Clear storage** - Reset to sample data with confirmation
- **Portfolio naming** - Exported files use portfolio name for easy identification

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand
- **Styling**: Vanilla CSS
- **Testing**: Vitest + React Testing Library
- **Market Data**: Polygon.io API

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18.0.0
- npm >= 8.0.0
- Polygon.io API key (free tier available at https://polygon.io/)

### Environment Setup

1. **Copy the sample environment file**:
```bash
cp .env.sample .env
```

2. **Add your Polygon.io API key** to `.env`:
```env
VITE_POLYGON_API_KEY=your_actual_api_key_here
VITE_POLYGON_BASE_URL=https://api.polygon.io
```

> **Note**: The `.env` file contains sensitive API keys and is excluded from version control via `.gitignore`. Never commit your actual API keys to the repository.

### Local Development

```bash
# Install dependencies
npm install

# Start the development server
npm run dev

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Type-check and build for production
npm run build
```

Then open http://localhost:5174 (or the URL shown in your terminal) to explore the dashboard.

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

Docker Compose automatically reads environment variables from your `.env` file, making deployment simple and secure.

**1. Setup environment variables**:
```bash
# Copy the sample environment file
cp .env.sample .env

# Edit .env and add your Polygon.io API key
# VITE_POLYGON_API_KEY=your_actual_api_key_here
```

**2. Build and run with Docker Compose**:
```bash
# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

Then open http://localhost:4173 in your browser.

### Using Docker (Manual)

If you prefer to use Docker directly without Compose:

```bash
# Build the Docker image (pass env vars as build args)
docker build \
  --build-arg VITE_POLYGON_API_KEY=$(grep VITE_POLYGON_API_KEY .env | cut -d '=' -f2) \
  --build-arg VITE_POLYGON_BASE_URL=$(grep VITE_POLYGON_BASE_URL .env | cut -d '=' -f2) \
  -t portfolio-tracker .

# Run the container
docker run -d -p 4173:4173 --name portfolio-tracker portfolio-tracker

# View logs
docker logs -f portfolio-tracker

# Stop the container
docker stop portfolio-tracker
```

Then open http://localhost:4173 in your browser.

### Docker Commands Reference

```bash
# Rebuild after code changes
docker-compose build

# Restart the container
docker-compose restart

# Remove container and volumes
docker-compose down -v

# Check container status
docker-compose ps
```

## 📁 Project Structure

```
portfolio-tracker/
├── src/
│   ├── components/
│   │   ├── common/           # Shared UI (DataMenu, PortfolioManager)
│   │   └── portfolio/        # Portfolio-specific components
│   ├── data/                 # Sample portfolio seed data
│   ├── pages/                # Dashboard page
│   ├── services/             # API services (marketData.ts)
│   ├── store/                # Zustand state management
│   ├── types/                # TypeScript type definitions
│   └── utils/                # Utility functions (formatters, storage)
├── tests/                    # Test files (mirrors src structure)
├── .env.sample              # Environment variable template
├── .env                     # Your local environment (gitignored)
├── docker-compose.yml       # Docker Compose configuration
├── Dockerfile               # Multi-stage Docker build
├── vite.config.ts           # Vite configuration
└── vitest.config.ts         # Test configuration
```

## 📖 User Guide

### Managing Multiple Portfolios

1. **Create a new portfolio**:
   - Click the hamburger menu (☰) in the top-right
   - Select "Manage portfolios"
   - Enter a portfolio name and click "Create New Portfolio"

2. **Switch portfolios**:
   - Open "Manage portfolios"
   - Click "Load" next to any saved portfolio
   - The dashboard updates instantly

3. **Rename a portfolio**:
   - Open "Manage portfolios"
   - Click "Rename" next to the portfolio
   - Enter new name and press Enter or click "Save"

4. **Delete a portfolio**:
   - Open "Manage portfolios"
   - Click "Delete" next to the portfolio
   - Confirm the deletion

### Importing & Exporting Data

**Export a portfolio**:
1. Open the hamburger menu (☰)
2. Click "Export..."
3. A JSON file downloads with the portfolio name (e.g., `my-retirement-2025-01-15.json`)

**Import a portfolio**:
1. Open the hamburger menu (☰)
2. Click "Import..."
3. Select a previously exported JSON file
4. The portfolio loads immediately with all lots and dividend history

### Refreshing Market Data

**Update prices and NAV history**:
1. Open the hamburger menu (☰)
2. Click "Refresh market prices"
3. Automatically fetches:
   - Latest market prices for all holdings
   - 12 months of monthly NAV history for erosion tracking
4. View results in the Equity Performance table:
   - NAV Peak (highest price in last 12 months)
   - Current NAV (latest market price)
   - NAV Erosion % (decline from peak)

**Update dividend history**:
1. Open the hamburger menu (☰)
2. Click "Refresh dividends (12mo)"
3. Automatically fetches last 12 months of dividend payments
4. Perfect for monthly payers (MSTY, JEPI, JEPQ, etc.)
5. Dividend data includes:
   - Ex-dividend dates
   - Cash amount per share
   - Automatically calculated with shares owned at payment date

### Managing Holdings

**Add a purchase lot**:
1. Go to the "Holdings Manager" tab
2. Fill in the form:
   - Ticker symbol (e.g., AAPL)
   - Number of shares
   - Trade date
   - Price per share
3. Click "Add Lot"
4. The position updates automatically with blended cost basis

**View lot details**:
1. In the Holdings Manager table, click the ▶ arrow next to any equity
2. See all individual purchase lots with:
   - Trade date
   - Shares purchased
   - Price per share
   - Total cost
3. Edit or delete individual lots inline

**Edit a lot**:
1. Expand the equity row
2. Click "Edit" next to the lot
3. Modify shares, date, or price
4. Click "Save" - cost basis recalculates instantly

**Delete a lot**:
1. Expand the equity row
2. Click "Delete" next to the lot
3. Confirm deletion
4. Position auto-removes if shares reach zero

### Analyzing Cash Flow

**View monthly breakdown**:
1. Go to the "Monthly Cash Flow" tab
2. See monthly summary of:
   - Cash invested (purchases)
   - Dividends received
   - Net cash flow
   - Cumulative totals

**View transaction details**:
1. Click any month row to expand
2. See all transactions for that month:
   - **Dividend rows**: Shows dividend per share, total dividend, average purchase price, and total invested
   - **Purchase rows**: Shows individual purchase price and cost
3. Delete incorrect dividend entries with the "Delete" button

### Clearing Storage

**Reset to sample data**:
1. Open the hamburger menu (☰)
2. Click "Clear all storage"
3. Confirm the action
4. **Warning**: This deletes ALL portfolios and data
5. **Tip**: Export portfolios first to preserve your data
6. Page reloads with fresh sample portfolio

## 📊 Dashboard Tabs

### 1. Portfolio Overview
- **Key Metrics**: Market value, cost basis, total return, ROI
- **Dividend Summary**: Total received, yield on cost, recent payments
- **Recent Activity**: Last 10 dividend payments with dates and amounts

### 2. Equity Performance
13 sortable columns per holding:
- Symbol, Name, Shares, Average Cost, Current Price
- Market Value, Cost Basis, Unrealized P&L, ROI %
- NAV Peak, Current NAV, NAV Erosion %
- Total Dividends, Yield on Cost, Last Dividend Date, Last Dividend Amount

Click ▶ to expand and see individual purchase lots.

### 3. Monthly Cash Flow
Monthly breakdown of:
- Cash Invested (purchases)
- Dividends Received
- Net Cash Flow
- Cumulative totals

Click any month to see:
- Individual dividend transactions (with delete option)
- Individual purchase transactions
- Aggregated purchase data per equity

### 4. Holdings Manager
- Add new purchase lots
- View all lots grouped by equity
- Edit lot details (shares, date, price)
- Delete lots (auto-removes zero-share positions)
- See blended cost basis calculations

## 🧪 Testing

The project includes comprehensive test coverage:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Generate coverage report
npm test -- --coverage

# View coverage in browser
open coverage/index.html
```

**Coverage target**: 85%+ across all modules

**Test Statistics**:
- 223 comprehensive tests
- 93.5% line coverage
- 96.1% function coverage
- 85.55% branch coverage

## 🎨 Development Tools

### Code Quality & Formatting
- **Prettier** - Automatic code formatting on save
- **ESLint** - Code linting with auto-fix
- **Husky** - Git hooks for pre-commit checks
- **lint-staged** - Run linters only on staged files

```bash
npm run format          # Format all code
npm run format:check    # Check formatting
npm run lint            # Run linter
npm run lint:fix        # Fix linting issues
npm run type-check      # TypeScript type checking
```

### Deployment Ready
- **Vercel** configuration (`vercel.json`)
- **Docker** support (Dockerfile, docker-compose.yml)
- **GitHub Actions** CI/CD pipeline
- **Codecov** integration for coverage tracking

## 🔧 Development Notes

### API Rate Limits
- Polygon.io free tier: 5 API calls/minute
- The app batches requests efficiently
- Consider upgrading for production use

### Data Persistence
- All data stored in browser localStorage
- Portfolios persist across sessions
- Clear browser data to reset completely

### Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript enabled
- localStorage support required

## 🚀 Deployment

### Quick Start with Docker Compose

```bash
# 1. Clone and navigate to the project
git clone <your-repo-url>
cd portfolio-tracker

# 2. Set up environment variables
cp .env.sample .env
# Edit .env and add your Polygon.io API key

# 3. Start the application
docker-compose up -d

# 4. Open in browser
open http://localhost:4173
```

### Production Build
```bash
npm run build
```
Output in `dist/` directory - deploy to any static hosting service.

### Hosting Options
- **Vercel**: Zero-config deployment
- **GitHub Pages**: Free static hosting
- **Docker**: Use included Dockerfile

### Environment Variables
Set these in your hosting platform:
- `VITE_POLYGON_API_KEY` - Your Polygon.io API key
- `VITE_POLYGON_BASE_URL` - API base URL (default: https://api.polygon.io)

## 📝 License

MIT License - feel free to use for personal or commercial projects.

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Ensure all tests pass
5. Submit a pull request

## 💡 Future Enhancements

- **Charts**: Income trends, allocation pie charts, NAV erosion graphs
- **DRIP Tracking**: Automatic dividend reinvestment calculations
- **Tax Reports**: Capital gains/losses, dividend income summaries
- **Mobile App**: React Native version
- **Real-time Updates**: WebSocket integration for live prices
- **Multi-currency**: Support for international portfolios
- **Benchmarking**: Compare against S&P 500, sector indices
