# Setup Guide - Optional Enhancements

This guide covers the setup and configuration of all optional enhancements that have been added to the project.

## ✅ What's Been Automated

All of the following have been **automatically configured** for you:

1. ✅ **Prettier** - Code formatting
2. ✅ **Husky + lint-staged** - Git hooks for pre-commit checks
3. ✅ **Storybook** - Component documentation
4. ✅ **Codecov** - Code coverage visualization
5. ✅ **Vercel/Netlify** - Deployment configurations

## 📦 Installed Packages

The following packages have been installed:

```json
{
  "devDependencies": {
    "prettier": "^3.x",
    "husky": "^9.x",
    "lint-staged": "^15.x",
    "@storybook/react": "^9.x",
    "@storybook/addon-*": "^9.x"
  }
}
```

## 🎨 1. Prettier - Code Formatting

### Configuration Files Created:
- `.prettierrc` - Prettier configuration
- `.prettierignore` - Files to ignore

### Usage:

```bash
# Format all files
npm run format

# Check formatting without making changes
npm run format:check
```

### VS Code Integration:
The `.vscode/settings.json` has been configured to:
- Format on save
- Use Prettier as the default formatter

## 🪝 2. Husky + lint-staged - Git Hooks

### Configuration Files Created:
- `.husky/pre-commit` - Pre-commit hook
- `package.json` - lint-staged configuration

### How It Works:
When you commit code, the pre-commit hook will automatically:
1. Run ESLint and fix issues
2. Format code with Prettier
3. Only on staged files (fast!)

### Setup (One-time):
After you initialize git:

```bash
git init
npm run prepare
```

### Testing:
```bash
# Stage some files
git add src/components/common/Card.tsx

# Try to commit (will auto-format and lint)
git commit -m "test: verify pre-commit hook"
```

## 📚 3. Storybook - Component Documentation

### Configuration Files Created:
- `.storybook/main.ts` - Storybook configuration
- `.storybook/preview.ts` - Preview configuration
- `src/components/common/*.stories.tsx` - Example stories

### Usage:

```bash
# Start Storybook development server
npm run storybook

# Build Storybook for production
npm run build-storybook
```

### Creating Stories:
Create a `.stories.tsx` file next to your component:

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { YourComponent } from './YourComponent';

const meta = {
  title: 'Components/YourComponent',
  component: YourComponent,
  tags: ['autodocs'],
} satisfies Meta<typeof YourComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    // Your component props
  },
};
```

### Accessing Storybook:
After running `npm run storybook`, open http://localhost:6006

## 📊 4. Codecov - Code Coverage Visualization

### Configuration Files Created:
- `codecov.yml` - Codecov configuration
- `.github/workflows/ci.yml` - Updated with Codecov upload

### Setup Steps:

1. **Sign up for Codecov**:
   - Go to https://codecov.io/
   - Sign in with your GitHub account
   - Add your repository

2. **Get Codecov Token**:
   - Go to your repository settings on Codecov
   - Copy the upload token

3. **Add Token to GitHub Secrets**:
   - Go to your GitHub repository
   - Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `CODECOV_TOKEN`
   - Value: Paste your Codecov token

4. **Add Badge to README**:
   ```markdown
   [![codecov](https://codecov.io/gh/vadim-snitkovsky/portfolio-tracker/branch/main/graph/badge.svg)](https://codecov.io/gh/vadim-snitkovsky/portfolio-tracker)
   ```

### How It Works:
- Every push/PR triggers the CI workflow
- Tests run with coverage
- Coverage report uploads to Codecov
- Codecov comments on PRs with coverage changes

## 🚀 5. Vercel Deployment

### Configuration Files Created:
- `vercel.json` - Vercel configuration

### Setup Steps:

1. **Sign up for Vercel**:
   - Go to https://vercel.com/
   - Sign in with your GitHub account

2. **Import Project**:
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Vite

3. **Configure Environment Variables**:
   - In Vercel project settings
   - Add environment variable:
     - Name: `VITE_POLYGON_API_KEY`
     - Value: Your Polygon.io API key

4. **Deploy**:
   - Click "Deploy"
   - Your app will be live at `https://your-project.vercel.app`

### Automatic Deployments:
- Every push to `main` → Production deployment
- Every PR → Preview deployment

## 🌐 6. Netlify Deployment

### Configuration Files Created:
- `netlify.toml` - Netlify configuration

### Setup Steps:

1. **Sign up for Netlify**:
   - Go to https://netlify.com/
   - Sign in with your GitHub account

2. **Import Project**:
   - Click "Add new site" → "Import an existing project"
   - Choose GitHub and select your repository

3. **Configure Build Settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - (These are already in netlify.toml)

4. **Configure Environment Variables**:
   - In Netlify site settings → Environment variables
   - Add:
     - Name: `VITE_POLYGON_API_KEY`
     - Value: Your Polygon.io API key

5. **Deploy**:
   - Click "Deploy site"
   - Your app will be live at `https://your-project.netlify.app`

### Custom Domain:
- In Netlify: Domain settings → Add custom domain
- Follow DNS configuration instructions

## 🧪 Testing Everything

### 1. Test Prettier:
```bash
npm run format:check
npm run format
```

### 2. Test Linting:
```bash
npm run lint
npm run lint:fix
```

### 3. Test Pre-commit Hook:
```bash
git add .
git commit -m "test: verify hooks"
```

### 4. Test Storybook:
```bash
npm run storybook
# Open http://localhost:6006
```

### 5. Test Build:
```bash
npm run build
npm run preview
```

### 6. Test All Tests:
```bash
npm test -- --run
npm run test:coverage
```

## 📋 New NPM Scripts

All available scripts:

```bash
# Development
npm run dev              # Start dev server
npm run storybook        # Start Storybook

# Building
npm run build            # Build for production
npm run build-storybook  # Build Storybook
npm run preview          # Preview production build

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run format           # Format code with Prettier
npm run format:check     # Check formatting
npm run type-check       # TypeScript type checking

# Testing
npm test                 # Run tests in watch mode
npm run test:coverage    # Run tests with coverage
npm run test:ui          # Run tests with UI
```

## 🎯 Recommended Workflow

1. **Before Starting Work**:
   ```bash
   git checkout -b feature/my-feature
   npm run dev
   ```

2. **During Development**:
   - Write code
   - Write tests
   - Check Storybook for UI components
   - VS Code will auto-format on save

3. **Before Committing**:
   ```bash
   npm run lint
   npm test -- --run
   npm run type-check
   ```

4. **Commit** (hooks will auto-format):
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

5. **Push and Create PR**:
   ```bash
   git push origin feature/my-feature
   # Create PR on GitHub
   # CI will run automatically
   ```

## 🔧 Troubleshooting

### Husky not working?
```bash
# Reinitialize husky
rm -rf .husky
npm run prepare
```

### Prettier conflicts with ESLint?
The configuration is already set up to work together. If you see conflicts:
```bash
npm run lint:fix
npm run format
```

### Storybook not starting?
```bash
# Clear cache and reinstall
rm -rf node_modules .storybook-cache
npm install
npm run storybook
```

### Build failing on Vercel/Netlify?
- Check environment variables are set
- Check build logs for errors
- Verify `npm run build` works locally

## 📚 Additional Resources

- [Prettier Docs](https://prettier.io/docs/en/)
- [Husky Docs](https://typicode.github.io/husky/)
- [Storybook Docs](https://storybook.js.org/docs)
- [Codecov Docs](https://docs.codecov.com/)
- [Vercel Docs](https://vercel.com/docs)
- [Netlify Docs](https://docs.netlify.com/)

---

**All enhancements are now configured and ready to use! 🎉**

