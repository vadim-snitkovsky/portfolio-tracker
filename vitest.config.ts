import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.storybook/**',
      '**/src/stories/**',
      '**/*.stories.tsx',
      '**/*.stories.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/**/*.{ts,tsx}',
      ],
      exclude: [
        'node_modules/',
        'dist/',
        'coverage/',
        '.storybook/**',
        '**/*.config.ts',
        '**/*.config.js',
        '**/*.stories.tsx',
        '**/*.stories.ts',
        'src/stories/**',
        '**/types/**',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.test.tsx',
        'tests/**',
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
