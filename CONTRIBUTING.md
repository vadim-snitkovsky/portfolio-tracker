# Contributing to Portfolio Tracker

Thank you for your interest in contributing to Portfolio Tracker! This document provides guidelines and instructions for contributing.

## 🤝 Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- Git

### Setup Development Environment

1. **Fork the repository**
   ```bash
   # Click the "Fork" button on GitHub
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/portfolio-tracker.git
   cd portfolio-tracker
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/portfolio-tracker.git
   ```

4. **Install dependencies**
   ```bash
   npm install
   ```

5. **Copy environment variables**
   ```bash
   cp .env.sample .env
   # Edit .env and add your Polygon.io API key
   ```

6. **Run the development server**
   ```bash
   npm run dev
   ```

## 📝 Development Workflow

### 1. Create a Branch

Always create a new branch for your work:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `test/` - Test additions or updates
- `refactor/` - Code refactoring

### 2. Make Your Changes

- Write clean, readable code
- Follow the existing code style
- Add comments for complex logic
- Update documentation if needed

### 3. Write Tests

All new features and bug fixes should include tests:

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch
```

**Coverage Requirements:**
- Lines: 85%+
- Functions: 85%+
- Branches: 85%+
- Statements: 85%+

### 4. Lint Your Code

```bash
npm run lint
```

Fix any linting errors before committing.

### 5. Commit Your Changes

Use clear, descriptive commit messages:

```bash
git add .
git commit -m "feat: add dividend yield calculation"
```

**Commit Message Format:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Test additions/updates
- `refactor:` - Code refactoring
- `style:` - Code style changes (formatting, etc.)
- `chore:` - Maintenance tasks

### 6. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 7. Create a Pull Request

1. Go to your fork on GitHub
2. Click "New Pull Request"
3. Select your branch
4. Fill out the PR template with:
   - Description of changes
   - Related issue number (if applicable)
   - Screenshots (for UI changes)
   - Testing performed

## 🧪 Testing Guidelines

### Writing Tests

- Place tests next to the code they test (e.g., `Component.test.tsx` next to `Component.tsx`)
- Use descriptive test names: `it('should calculate total dividends correctly', ...)`
- Test edge cases and error conditions
- Mock external dependencies (API calls, localStorage, etc.)

### Test Structure

```typescript
describe('ComponentName', () => {
  it('should render without crashing', () => {
    // Test implementation
  });

  it('should handle user interaction', () => {
    // Test implementation
  });

  it('should display error state', () => {
    // Test implementation
  });
});
```

## 📐 Code Style Guidelines

### TypeScript

- Use TypeScript for all new code
- Define interfaces for all props and data structures
- Avoid `any` type - use proper types or `unknown`
- Use type inference where possible

### React Components

- Use function components with hooks
- Keep components small and focused (single responsibility)
- Extract reusable logic into custom hooks
- Use meaningful prop names

```typescript
// Good
interface ButtonProps {
  variant: 'primary' | 'secondary';
  onClick: () => void;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ variant, onClick, children }) => {
  return <button className={`btn-${variant}`} onClick={onClick}>{children}</button>;
};
```

### File Organization

```
src/
├── components/
│   ├── common/          # Reusable UI components
│   └── portfolio/       # Portfolio-specific components
├── hooks/               # Custom React hooks
├── store/               # Zustand state management
├── services/            # API services
├── utils/               # Utility functions
├── types/               # TypeScript type definitions
└── styles/              # Global styles
```

## 🐛 Reporting Bugs

When reporting bugs, please include:

1. **Description** - Clear description of the bug
2. **Steps to Reproduce** - Detailed steps to reproduce the issue
3. **Expected Behavior** - What you expected to happen
4. **Actual Behavior** - What actually happened
5. **Screenshots** - If applicable
6. **Environment** - Browser, OS, Node version, etc.

## 💡 Suggesting Features

When suggesting features, please include:

1. **Use Case** - Why is this feature needed?
2. **Proposed Solution** - How should it work?
3. **Alternatives** - Other solutions you've considered
4. **Additional Context** - Screenshots, mockups, etc.

## 📚 Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for complex functions
- Update type definitions
- Include examples in documentation

## ✅ Pull Request Checklist

Before submitting a PR, ensure:

- [ ] Code follows the project's style guidelines
- [ ] All tests pass (`npm test`)
- [ ] Test coverage meets requirements (85%+)
- [ ] No linting errors (`npm run lint`)
- [ ] Documentation is updated
- [ ] Commit messages are clear and descriptive
- [ ] PR description explains the changes
- [ ] Related issue is linked (if applicable)

## 🔄 Keeping Your Fork Updated

```bash
# Fetch upstream changes
git fetch upstream

# Merge upstream changes into your main branch
git checkout main
git merge upstream/main

# Push updates to your fork
git push origin main
```

## 📞 Getting Help

- Open an issue for questions
- Check existing issues and PRs
- Review the README.md and documentation

## 🙏 Thank You!

Your contributions make this project better for everyone. We appreciate your time and effort!

