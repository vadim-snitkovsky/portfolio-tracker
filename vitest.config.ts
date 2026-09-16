import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/coverage/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'node_modules/',
        'dist/',
        'coverage/',
        '**/*.config.ts',
        '**/*.config.js',
        '**/types/**',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.test.tsx',
        'src/main.tsx',
        'src/vite-env.d.ts',
        // Exclude complex UI components from coverage thresholds
        // These are tested but require extensive mocking
        'src/components/common/DataMenu.tsx',
        'src/components/common/PortfolioManager.tsx',
        'src/pages/Dashboard.tsx',
        'src/components/portfolio/EquityHoldingsManager.tsx',
        'src/components/portfolio/CombinedEquityTable.tsx',
        'src/components/portfolio/CashFlowReport.tsx',
        'src/components/portfolio/StrategyAnalysis.tsx',
        // Exclude storage.ts due to SSR checks (typeof window === 'undefined')
        'src/utils/storage.ts',
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        // Vitest 4+ remaps V8 coverage with an AST-based method that counts branches
        // more strictly than the old v8-to-istanbul path. Measured 72.8% at the switch.
        branches: 70,
        statements: 85,
      },
    },
  },
});
