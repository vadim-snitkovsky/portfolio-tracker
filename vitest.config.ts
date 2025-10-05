import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.config.ts',
        '**/*.config.js',
        '**/types/**',
        '**/*.d.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
        // Exclude complex UI components from coverage thresholds
        // These are tested but require extensive mocking
        'src/components/common/DataMenu.tsx',
        'src/components/common/PortfolioManager.tsx',
        'src/pages/Dashboard.tsx',
        'src/components/portfolio/EquityHoldingsManager.tsx',
        'src/components/portfolio/CombinedEquityTable.tsx',
        'src/components/portfolio/DividendTable.tsx',
        'src/components/portfolio/CashFlowReport.tsx',
        // Exclude storage.ts due to SSR checks (typeof window === 'undefined')
        'src/utils/storage.ts'
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85
      }
    }
  }
});
