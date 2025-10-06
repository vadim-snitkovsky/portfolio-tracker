# Prettier, Husky & lint-staged Setup

## ✅ Installation Complete

All code quality tools are now installed and configured:

- ✅ **Prettier** - Code formatting
- ✅ **Husky** - Git hooks
- ✅ **lint-staged** - Pre-commit linting and formatting

---

## 📦 Installed Packages

```json
{
  "devDependencies": {
    "prettier": "^3.6.2",
    "husky": "^9.1.7",
    "lint-staged": "^16.2.3"
  }
}
```

---

## 🎨 Prettier Configuration

### Configuration File: `.prettierrc`

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

### Ignored Files: `.prettierignore`

- `node_modules/`
- `dist/`
- `coverage/`
- `.env` files
- Lock files (`package-lock.json`, etc.)

### Available Scripts

```bash
# Format all files
npm run format

# Check formatting without making changes
npm run format:check
```

---

## 🪝 Husky Git Hooks

### Pre-commit Hook: `.husky/pre-commit`

Automatically runs `lint-staged` before every commit.

```bash
npx lint-staged
```

### How It Works

1. You stage files: `git add .`
2. You commit: `git commit -m "message"`
3. **Husky intercepts** the commit
4. **lint-staged** runs on staged files:
   - Runs ESLint and auto-fixes issues
   - Runs Prettier and formats code
5. If successful, commit proceeds
6. If errors, commit is blocked

---

## 🎯 lint-staged Configuration

### Configuration in `package.json`

```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,css,md}": [
      "prettier --write"
    ]
  }
}
```

### What It Does

- **TypeScript/JavaScript files**: Lint with ESLint, then format with Prettier
- **JSON/CSS/Markdown files**: Format with Prettier only

---

## 🚀 Usage

### Daily Development

1. **Write code** as usual
2. **Stage changes**: `git add .`
3. **Commit**: `git commit -m "your message"`
4. **Automatic**: Husky runs lint-staged
5. **Auto-fix**: Code is linted and formatted automatically
6. **Commit proceeds** if no errors

### Manual Formatting

```bash
# Format all files in src/
npm run format

# Check if files are formatted
npm run format:check

# Lint and fix
npm run lint:fix
```

### VS Code Integration

The project includes `.vscode/settings.json` with:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

**Install VS Code Extension**: `esbenp.prettier-vscode`

---

## 🔧 How Pre-commit Hook Works

### Example Workflow

```bash
# 1. Make changes to a file
echo "const x=1" > src/test.ts

# 2. Stage the file
git add src/test.ts

# 3. Commit
git commit -m "add test file"

# 4. Husky runs automatically:
# ✓ Running lint-staged...
# ✓ eslint --fix src/test.ts
# ✓ prettier --write src/test.ts
# ✓ Commit successful!
```

### If There Are Errors

```bash
git commit -m "add broken code"

# Husky runs:
# ✗ ESLint found errors
# ✗ Commit blocked!
# Fix the errors and try again
```

---

## 📋 What Gets Checked

### On Every Commit (Staged Files Only)

- ✅ **ESLint**: Code quality and style
- ✅ **Prettier**: Code formatting
- ✅ **TypeScript**: Type checking (via ESLint)

### Full Project Checks (Manual)

```bash
# Lint entire project
npm run lint

# Type check entire project
npm run type-check

# Format entire project
npm run format

# Run all tests
npm test
```

---

## 🎯 Benefits

### 1. **Consistent Code Style**
- All code follows the same formatting rules
- No more debates about semicolons, quotes, etc.

### 2. **Catch Errors Early**
- ESLint catches issues before they reach CI
- TypeScript errors caught locally

### 3. **Automatic Fixes**
- Most issues are auto-fixed
- No manual formatting needed

### 4. **Team Collaboration**
- Everyone's code looks the same
- Easier code reviews
- Fewer merge conflicts

### 5. **CI/CD Integration**
- Pre-commit checks match CI checks
- Fewer failed CI builds

---

## 🔍 Troubleshooting

### Pre-commit Hook Not Running?

```bash
# Reinitialize Husky
npm run prepare

# Check hook exists
ls -la .husky/pre-commit

# Make sure it's executable
chmod +x .husky/pre-commit
```

### Prettier Not Formatting?

```bash
# Check Prettier is installed
npm list prettier

# Run manually
npx prettier --write src/

# Check VS Code extension is installed
code --list-extensions | grep prettier
```

### Want to Skip Pre-commit Hook?

```bash
# Not recommended, but possible:
git commit -m "message" --no-verify
```

---

## 📚 Additional Resources

- [Prettier Documentation](https://prettier.io/docs/en/)
- [Husky Documentation](https://typicode.github.io/husky/)
- [lint-staged Documentation](https://github.com/okonet/lint-staged)
- [ESLint Documentation](https://eslint.org/docs/latest/)

---

## ✨ Summary

**Before**:
- ❌ Inconsistent code formatting
- ❌ Manual linting required
- ❌ Errors caught in CI

**After**:
- ✅ Automatic code formatting
- ✅ Pre-commit linting and fixing
- ✅ Errors caught before commit
- ✅ Consistent code style across team

**Your code is now automatically formatted and linted on every commit! 🎉**

